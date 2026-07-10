from groq import Groq
import logging
import os
from typing import Dict, Any

logger = logging.getLogger(__name__)


class GroqClient:
    """Service for interacting with Groq API."""

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set")
        
        self.client = Groq(api_key=self.api_key)
        self.model = "llama3-70b-8192"

    async def extract_skills(self, cv_text: str) -> Dict[str, Any]:
        """Extract skills from CV text using Groq API."""
        try:
            # Truncate text if too long (token budget handling)
            max_words = 8000
            words = cv_text.split()
            if len(words) > max_words:
                cv_text = " ".join(words[:max_words])
                logger.warning(f"CV text truncated to {max_words} words")

            response = self.client.chat.completions.create(
                model=self.model,
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

            # Parse JSON response
            import json
            result = json.loads(response.choices[0].message.content)
            return result

        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise
