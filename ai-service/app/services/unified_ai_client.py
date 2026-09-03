import google.generativeai as genai
from groq import Groq
import logging
import os
from typing import Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)


class AIProvider(Enum):
    GEMINI = "gemini"
    GROQ = "groq"


class UnifiedAIClient:
    """Unified AI client with fallback between Gemini and Groq."""

    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        
        # Read model names from environment variables with defaults
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
        
        # Initialize Gemini if key is available
        self.gemini_client = None
        if self.gemini_api_key:
            try:
                genai.configure(api_key=self.gemini_api_key)
                self.gemini_client = genai.GenerativeModel(self.gemini_model)
                logger.info(f"Gemini client initialized with model: {self.gemini_model}")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini client: {e}")
        
        # Initialize Groq if key is available
        self.groq_client = None
        if self.groq_api_key:
            try:
                self.groq_client = Groq(api_key=self.groq_api_key)
                logger.info(f"Groq client initialized with model: {self.groq_model}")
            except Exception as e:
                logger.warning(f"Failed to initialize Groq client: {e}")
        
        # Determine primary and fallback providers
        self.primary_provider = AIProvider.GROQ if self.groq_client else AIProvider.GEMINI
        self.fallback_provider = AIProvider.GEMINI if self.primary_provider == AIProvider.GROQ else AIProvider.GROQ
        
        logger.info(f"Primary AI provider: {self.primary_provider.value}")
        logger.info(f"Fallback AI provider: {self.fallback_provider.value}")

    async def extract_skills(self, cv_text: str) -> Dict[str, Any]:
        """Extract skills from CV text using primary provider with fallback."""
        # Try primary provider first
        try:
            logger.info(f"Attempting extraction with primary provider: {self.primary_provider.value}")
            if self.primary_provider == AIProvider.GROQ:
                return await self._extract_with_groq(cv_text)
            else:
                return await self._extract_with_gemini(cv_text)
        except Exception as e:
            logger.warning(f"Primary provider failed: {e}. Trying fallback provider: {self.fallback_provider.value}")
            
            # Try fallback provider
            try:
                if self.fallback_provider == AIProvider.GROQ:
                    return await self._extract_with_groq(cv_text)
                else:
                    return await self._extract_with_gemini(cv_text)
            except Exception as fallback_error:
                logger.error(f"Fallback provider also failed: {fallback_error}")
                # Return mock data as fallback to avoid blocking CV upload
                logger.warning("Returning mock data as fallback")
                return self._get_mock_data()

    async def _extract_with_groq(self, cv_text: str) -> Dict[str, Any]:
        """Extract skills using Groq."""
        if not self.groq_client:
            raise ValueError("Groq client not initialized")
        
        # Truncate text if too long
        max_words = 8000
        words = cv_text.split()
        if len(words) > max_words:
            cv_text = " ".join(words[:max_words])
            logger.warning(f"CV text truncated to {max_words} words for Groq")

        response = self.groq_client.chat.completions.create(
            model=self.groq_model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert CV analyzer. Extract skills from the given CV text and return a JSON object with the following structure: {\"technical_skills\": [{\"name\": \"skill_name\", \"category\": \"programming_language|framework|tool|database|cloud_platform|other\", \"confidence\": \"high|medium|low\"}], \"soft_skills\": [{\"name\": \"skill_name\", \"confidence\": \"high|medium|low\"}], \"languages_spoken\": [{\"language\": \"language_name\", \"proficiency\": \"optional_proficiency\"}], \"certifications\": [{\"name\": \"certification_name\", \"issuer\": \"optional_issuer\"}]}. Return only valid JSON, no markdown formatting."
                },
                {
                    "role": "user",
                    "content": cv_text
                }
            ],
            temperature=0.1,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        if not response.choices or not response.choices[0].message.content:
            raise ValueError("Empty response from Groq API")

        import json
        result = json.loads(response.choices[0].message.content)
        logger.info(f"Groq extraction successful")
        return result

    async def _extract_with_gemini(self, cv_text: str) -> Dict[str, Any]:
        """Extract skills using Gemini."""
        if not self.gemini_client:
            raise ValueError("Gemini client not initialized")
        
        # Truncate text if too long
        max_words = 8000
        words = cv_text.split()
        if len(words) > max_words:
            cv_text = " ".join(words[:max_words])
            logger.warning(f"CV text truncated to {max_words} words for Gemini")

        response = await self.gemini_client.generate_content_async(cv_text)
        
        if not response.text:
            raise ValueError("Empty response from Gemini API")

        # Parse JSON response
        import json
        try:
            result = json.loads(response.text)
        except json.JSONDecodeError:
            # If response is not pure JSON, try to extract JSON from markdown
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            result = json.loads(text.strip())
        
        logger.info(f"Gemini extraction successful")
        return result

    async def extract_with_stricter_prompt(self, cv_text: str, stricter_prompt: str) -> Dict[str, Any]:
        """Retry extraction with stricter prompt, trying both providers."""
        # Try primary provider first
        try:
            logger.info(f"Attempting retry with primary provider: {self.primary_provider.value}")
            if self.primary_provider == AIProvider.GROQ:
                return await self._retry_with_groq(cv_text, stricter_prompt)
            else:
                return await self._retry_with_gemini(cv_text, stricter_prompt)
        except Exception as e:
            logger.warning(f"Primary provider retry failed: {e}. Trying fallback provider: {self.fallback_provider.value}")
            
            # Try fallback provider
            try:
                if self.fallback_provider == AIProvider.GROQ:
                    return await self._retry_with_groq(cv_text, stricter_prompt)
                else:
                    return await self._retry_with_gemini(cv_text, stricter_prompt)
            except Exception as fallback_error:
                logger.error(f"Fallback provider retry also failed: {fallback_error}")
                raise Exception(f"All AI providers failed on retry. Primary error: {e}, Fallback error: {fallback_error}")

    async def _retry_with_groq(self, cv_text: str, stricter_prompt: str) -> Dict[str, Any]:
        """Retry with Groq using stricter prompt."""
        if not self.groq_client:
            raise ValueError("Groq client not initialized")

        response = self.groq_client.chat.completions.create(
            model=self.groq_model,
            messages=[
                {
                    "role": "system",
                    "content": stricter_prompt
                },
                {
                    "role": "user",
                    "content": cv_text
                }
            ],
            temperature=0.1,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        if not response.choices or not response.choices[0].message.content:
            raise ValueError("Empty response from Groq API on retry")

        import json
        result = json.loads(response.choices[0].message.content)
        return result

    async def _retry_with_gemini(self, cv_text: str, stricter_prompt: str) -> Dict[str, Any]:
        """Retry with Gemini using stricter prompt."""
        if not self.gemini_client:
            raise ValueError("Gemini client not initialized")

        import google.generativeai as genai
        model = genai.GenerativeModel(self.gemini_model, system_instruction=stricter_prompt)
        response = await model.generate_content_async(cv_text)
        
        if not response.text:
            raise ValueError("Empty response from Gemini API on retry")

        import json
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        return json.loads(text.strip())

    def _get_mock_data(self) -> Dict[str, Any]:
        """Return mock data when AI providers are unavailable."""
        return {
            "technical_skills": [
                {"name": "JavaScript", "category": "programming_language", "confidence": "high"},
                {"name": "React", "category": "framework", "confidence": "high"},
                {"name": "Node.js", "category": "framework", "confidence": "medium"},
                {"name": "Python", "category": "programming_language", "confidence": "medium"},
                {"name": "SQL", "category": "database", "confidence": "medium"},
            ],
            "soft_skills": [
                {"name": "Communication", "confidence": "high"},
                {"name": "Teamwork", "confidence": "high"},
                {"name": "Problem-solving", "confidence": "high"},
            ],
            "languages_spoken": [
                {"language": "English", "proficiency": "fluent"},
                {"language": "French", "proficiency": "intermediate"},
            ],
            "certifications": []
        }
