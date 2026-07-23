from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class FiscalExtractionRequest(BaseModel):
    file_path: str


class FiscalExtractionResponse(BaseModel):
    cnss_employee_rate: Optional[float] = None
    cnss_employer_rate: Optional[float] = None
    cnss_monthly_ceiling: Optional[float] = None
    css_rate: Optional[float] = None
    css_exempt_threshold: Optional[float] = None
    prof_expense_rate: Optional[float] = None
    prof_expense_cap: Optional[float] = None
    min_annual_tax: Optional[float] = None
    irpp_brackets: list = []
    family_deductions: list = []
    message: str = "Fiscal rules extraction not yet implemented - returning mock data"


@router.post("/fiscal/extract", response_model=FiscalExtractionResponse)
async def extract_fiscal_rules(request: FiscalExtractionRequest) -> FiscalExtractionResponse:
    """
    Extract fiscal rules from PDF file.
    
    This is a stub implementation that returns mock data.
    Full AI extraction will be implemented in a future update.
    """
    try:
        logger.info(f"Received fiscal extraction request for file: {request.file_path}")
        
        # Validate file exists
        file_path = Path(request.file_path)
        if not file_path.exists():
            logger.error(f"File not found: {request.file_path}")
            raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")
        
        logger.info(f"File exists: {request.file_path}")
        
        # Return mock data for now
        # TODO: Implement actual AI extraction using similar pattern to CV extraction
        return FiscalExtractionResponse(
            cnss_employee_rate=0.0975,
            cnss_employer_rate=0.1675,
            cnss_monthly_ceiling=5000.0,
            css_rate=0.01,
            css_exempt_threshold=5000.0,
            prof_expense_rate=0.10,
            prof_expense_cap=2000.0,
            min_annual_tax=25.0,
            irpp_brackets=[
                {"min": 0, "max": 5000, "rate": 0.0},
                {"min": 5000, "max": 20000, "rate": 0.26},
                {"min": 20000, "max": 50000, "rate": 0.28},
                {"min": 50000, "max": None, "rate": 0.32},
            ],
            family_deductions=[
                {"type": "head_of_household", "amount": 150.0, "max_count": 1},
                {"type": "child", "amount": 75.0, "max_count": 3},
                {"type": "disabled_child", "amount": 150.0, "max_count": None},
            ],
            message="Fiscal rules extraction not yet implemented - returning mock data"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fiscal extraction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Fiscal extraction failed: {str(e)}")
