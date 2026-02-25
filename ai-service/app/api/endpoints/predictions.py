"""
Prediction API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.prediction_service import PredictionService
from app.utils.database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/predictions/attendance/all")
async def predict_attendance_all(db: Session = Depends(get_db)):
    """Get attendance forecasts for all active employees."""
    try:
        service = PredictionService(db)
        return service.predict_attendance_all()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Prediction failed")


@router.get("/predictions/attendance/{user_id}")
async def predict_attendance_user(user_id: int, db: Session = Depends(get_db)):
    """Get 7-day attendance forecast for a single employee."""
    try:
        service = PredictionService(db)
        return service.predict_attendance(user_id)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Prediction failed")


@router.get("/predictions/performance/all")
async def get_performance_all(db: Session = Depends(get_db)):
    """Get AI performance scores for all employees, ranked."""
    try:
        service = PredictionService(db)
        return service.get_performance_all()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Performance scores error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Scoring failed")


@router.get("/predictions/performance/{user_id}")
async def get_performance_user(user_id: int, db: Session = Depends(get_db)):
    """Get AI performance score for a single employee."""
    try:
        service = PredictionService(db)
        return service.get_performance_score(user_id)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Performance score error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Scoring failed")


@router.get("/predictions/dashboard-kpis")
async def get_dashboard_kpis(db: Session = Depends(get_db)):
    """Get aggregated AI-powered KPIs for the RH dashboard."""
    try:
        service = PredictionService(db)
        return service.get_dashboard_kpis()
    except Exception as e:
        logger.error(f"Dashboard KPIs error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate KPIs")
