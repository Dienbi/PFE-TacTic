from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.schemas import MatchRequest, MatchResponse
from app.services.prediction_service import PredictionService
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
    Generate AI-based candidate recommendations for a job post.
    
    Uses the trained neural matching model if available,
    falls back to rule-based scoring otherwise.
    """
    try:
        logger.info(f"Matching candidates for job post {request.job_post_id}")
        
        service = PredictionService(db)
        result = service.match_candidates(request.job_post_id)
        
        logger.info(
            f"Matched {result['total_candidates']} candidates "
            f"for job post {request.job_post_id} "
            f"(model: {result.get('model_used', 'unknown')})"
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
