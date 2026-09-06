import logging
import os
from typing import Any, Dict

import google.generativeai as genai

logger = logging.getLogger(__name__)


class GeminiClient:
    """Service for interacting with Google Gemini AI API."""

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")

        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-pro')

    async def extract_skills(self, cv_text: str) -> Dict[str, Any]:
        """Extract skills from CV text using Gemini AI."""
        try:
            # Truncate text if too long (token budget handling)
            max_words = 8000
            words = cv_text.split()
            if len(words) > max_words:
                cv_text = " ".join(words[:max_words])
                logger.warning(f"CV text truncated to {max_words} words")

            response = await self.model.generate_content_async(cv_text)

            if not response.text:
                raise ValueError("Empty response from Gemini API")

            # Parse JSON response
            import json
            try:
                result = json.loads(response.text)
                return result
            except json.JSONDecodeError:
                # If response is not pure JSON, try to extract JSON from markdown
                text = response.text.strip()
                if text.startswith("```json"):
                    text = text[7:]
                if text.startswith("```"):
                    text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                return json.loads(text.strip())

        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise

    def handle_rate_limit(self) -> None:
        """Handle rate limiting and retries."""
        # Gemini API handles rate limiting automatically
        # This method can be extended for custom rate limit handling
        pass
