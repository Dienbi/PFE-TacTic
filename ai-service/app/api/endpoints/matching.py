from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.schemas import MatchRequest, MatchResponse
from app.services.matching_service import MatchingService
from app.utils.database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/match", response_model=MatchResponse)
async def match_candidates(
    request: MatchRequest,
    db: Session = Depends(get_db)
):
    """
    Generate AI-based candidate recommendations for a job post
    
    Args:
        request: MatchRequest with job_post_id
        db: Database session
    
    Returns:
        MatchResponse with ranked candidate recommendations
        
    Raises:
        HTTPException: If job post not found or matching fails
    """
    try:
        logger.info(f"Matching candidates for job post {request.job_post_id}")
        
        matching_service = MatchingService(db)
        result = matching_service.match_candidates(request.job_post_id)
        
        logger.info(
            f"Successfully matched {result['total_candidates']} candidates "
            f"for job post {request.job_post_id}"
        )
        
        return result
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
        
    except Exception as e:
        logger.error(f"Error matching candidates: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while matching candidates"
        )
