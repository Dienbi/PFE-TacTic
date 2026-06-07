"""
Groq API client helpers.
"""

import json
import logging
import os
import urllib.request
from typing import List

logger = logging.getLogger(__name__)


class GroqClient:
    """Minimal Groq client for optional skill extraction."""

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
        self.base_url = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
        self.timeout_seconds = int(os.getenv("GROQ_TIMEOUT_SECONDS", "20"))

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def extract_skills(self, text: str, skill_catalog: List[str], max_skills: int = 12) -> List[str]:
        """
        Extract relevant skills from text, constrained to a provided catalog.
        Returns an empty list if the client is not configured.
        """
        if not self.is_configured:
            return []

        if not text or not skill_catalog:
            return []

        catalog_preview = ", ".join(skill_catalog[:200])
        prompt = (
            "You are an HR assistant. From the following text, select only skills "
            "that appear in the provided catalog. Return a JSON array of skill names.\n\n"
            f"Text: {text}\n\n"
            f"Catalog: {catalog_preview}\n\n"
            f"Return up to {max_skills} skills as JSON array only."
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "Return valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }

        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.base_url,
                data=data,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as response:
                raw = response.read().decode("utf-8")
            result = json.loads(raw)
            content = result["choices"][0]["message"]["content"].strip()
            skills = json.loads(content)
            if not isinstance(skills, list):
                return []

            normalized_catalog = {s.strip().lower(): s for s in skill_catalog}
            selected = []
            for item in skills:
                if not isinstance(item, str):
                    continue
                key = item.strip().lower()
                if key in normalized_catalog:
                    selected.append(normalized_catalog[key])
            return selected[:max_skills]
        except Exception as exc:
            logger.warning("Groq extraction failed: %s", exc)
            return []
