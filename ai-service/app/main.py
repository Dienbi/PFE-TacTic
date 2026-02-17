from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import matching
from app.models.schemas import HealthResponse
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Job Matching AI Service",
    description="AI-powered candidate matching system for job postings",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(matching.router, prefix="/api", tags=["matching"])


@app.get("/", response_model=HealthResponse)
def root():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="Job Matching AI Service"
    )


@app.get("/health", response_model=HealthResponse)
def health_check():
    """Detailed health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="Job Matching AI Service"
    )
