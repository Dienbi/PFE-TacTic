import logging
from typing import Any, Dict

from app.models.cv_extraction import CvExtractionResponse

logger = logging.getLogger(__name__)


class ResponseValidator:
    """Service for validating AI responses."""

    def validate_response(self, response: Dict[str, Any]) -> CvExtractionResponse:
        """Validate response against Pydantic model."""
        try:
            return CvExtractionResponse(**response)
        except Exception as e:
            logger.error(f"Response validation failed: {e}")
            raise ValueError(f"Invalid AI response structure: {e}")

    def handle_validation_error(self, error: Exception) -> str:
        """Handle validation errors and return error message."""
        return str(error)
