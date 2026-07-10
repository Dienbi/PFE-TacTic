import logging

logger = logging.getLogger(__name__)


class TextValidator:
    """Service for validating extracted text."""

    def validate_length(self, text: str, min_chars: int = 50) -> bool:
        """Validate that text meets minimum length requirement."""
        return len(text) >= min_chars

    def sanitize_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Remove excessive whitespace
        text = " ".join(text.split())
        
        # Remove null characters
        text = text.replace("\x00", "")
        
        return text.strip()
