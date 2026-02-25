"""
Training API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.services.training_service import TrainingService
from app.utils.database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Track ongoing training state
_training_in_progress = False


def _run_training(model: str, db_url: str):
    """Background task for model training."""
    global _training_in_progress
    _training_in_progress = True
    
    try:
        from app.utils.database import SessionLocal
        db = SessionLocal()
        try:
            service = TrainingService(db)
            
            if model == 'attendance':
                service.train_attendance_model()
            elif model == 'performance':
                service.train_performance_model()
            elif model == 'matching':
                service.train_matching_model()
            elif model == 'all':
                service.train_all()
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
    finally:
        _training_in_progress = False


@router.post("/train/{model}")
async def train_model(
    model: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Train a specific AI model or all models.
    
    Supported model values: attendance, performance, matching, all
    """
    global _training_in_progress
    
    valid_models = ['attendance', 'performance', 'matching', 'all']
    if model not in valid_models:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model. Choose from: {valid_models}"
        )
    
    if _training_in_progress:
        raise HTTPException(
            status_code=409,
            detail="Training already in progress. Please wait."
        )
    
    # Run training synchronously for single models, async for all
    try:
        service = TrainingService(db)
        
        if model == 'all':
            result = service.train_all()
        elif model == 'attendance':
            result = service.train_attendance_model()
        elif model == 'performance':
            result = service.train_performance_model()
        elif model == 'matching':
            result = service.train_matching_model()
        
        return {
            'status': 'completed',
            'model': model,
            'result': result,
        }
    except Exception as e:
        logger.error(f"Training error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/train/status")
async def get_training_status():
    """Get last training status and metrics for all models."""
    return {
        'training_in_progress': _training_in_progress,
        **TrainingService.get_training_status(),
    }
