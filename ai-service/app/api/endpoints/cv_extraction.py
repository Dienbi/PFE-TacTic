import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models.cv_extraction import CvExtractionRequest, CvExtractionResponse
from app.services.docx_text_extractor import DocxTextExtractor
from app.services.pdf_text_extractor import PdfTextExtractor
from app.services.prompt_builder import PromptBuilder
from app.services.response_validator import ResponseValidator
from app.services.unified_ai_client import UnifiedAIClient

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
unified_ai_client = UnifiedAIClient()
prompt_builder = PromptBuilder()
response_validator = ResponseValidator()
pdf_extractor = PdfTextExtractor()
docx_extractor = DocxTextExtractor()


@router.post("/cv/extract", response_model=CvExtractionResponse)
async def extract_cv_skills(request: CvExtractionRequest) -> CvExtractionResponse:
    """
    Extract skills from CV file using Gemini AI.
    
    This endpoint accepts a file path and returns structured skills data including:
    - Technical skills with categories and confidence levels
    - Soft skills with confidence levels
    - Languages spoken
    - Certifications
    """
    try:
        logger.info(f"Received CV extraction request for file: {request.file_path}")

        # Validate file exists
        file_path = Path(request.file_path)
        if not file_path.exists():
            logger.error(f"File not found: {request.file_path}")
            raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")

        logger.info(f"File exists: {request.file_path}")

        # Detect file type and extract text
        file_extension = file_path.suffix.lower()
        logger.info(f"Detected file extension: {file_extension}")

        if file_extension == '.pdf':
            logger.info("Extracting text from PDF")
            cv_text = await pdf_extractor.extract(str(file_path))
        elif file_extension == '.docx':
            logger.info("Extracting text from DOCX")
            cv_text = await docx_extractor.extract(str(file_path))
        else:
            logger.error(f"Unsupported file type: {file_extension}")
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_extension}")

        logger.info(f"Extracted text length: {len(cv_text)} characters")
        logger.info(f"Extracted text preview: {cv_text[:200]}...")

        # Validate extracted text length
        if len(cv_text) < 10:
            logger.error(f"Extracted text too short: {len(cv_text)} characters")
            raise HTTPException(status_code=400, detail="Extracted text is too short for skill extraction")

        # Format CV text with system prompt
        formatted_text = prompt_builder.format_cv_text(cv_text)
        logger.info("Text formatted with prompt")

        # Extract skills using AI (with fallback)
        logger.info("Calling AI for skill extraction")
        response_data = await unified_ai_client.extract_skills(formatted_text)
        logger.info(f"AI response received: {response_data}")

        # Validate response structure
        try:
            validated_response = response_validator.validate_response(response_data)
            logger.info("Response validated successfully")
            return validated_response
        except ValueError as validation_error:
            logger.warning(f"Initial response validation failed, retrying with stricter prompt: {validation_error}")

            # Retry with stricter prompt
            stricter_prompt = prompt_builder.build_retry_prompt()
            retry_response = await unified_ai_client.extract_with_stricter_prompt(
                cv_text,
                stricter_prompt
            )

            # Validate retry response
            validated_response = response_validator.validate_response(retry_response)
            logger.info("Retry response validated successfully")
            return validated_response

    except ValueError as e:
        logger.error(f"CV extraction failed after retry: {e}")
        raise HTTPException(status_code=422, detail=f"Invalid AI response: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CV extraction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"CV extraction failed: {str(e)}")
