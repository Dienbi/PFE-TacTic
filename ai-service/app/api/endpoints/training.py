"""
Training API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.utils.database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Track ongoing training state
_training_in_progress = False


@router.post("/train/{model}")
async def train_model(
    model: str,
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
    
    return {
        'status': 'disabled',
        'model': model,
        'result': {
            'message': 'Model training is disabled. Scoring uses deterministic rules with live database data.',
        },
    }


@router.get("/train/status")
async def get_training_status():
    """Get last training status and metrics for all models."""
    return {
        'training_in_progress': _training_in_progress,
        'models': {},
        'last_checked': None,
        'status': 'disabled',
    }
