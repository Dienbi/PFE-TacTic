from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import matching, predictions, training
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
    title="TacTic AI Service",
    description="AI-powered HR analytics: attendance prediction, performance scoring, and candidate matching",
    version="2.0.0"
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
app.include_router(predictions.router, prefix="/api", tags=["predictions"])
app.include_router(training.router, prefix="/api", tags=["training"])


@app.get("/", response_model=HealthResponse)
def root():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="TacTic AI Service"
    )


@app.get("/health", response_model=HealthResponse)
def health_check():
    """Detailed health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="TacTic AI Service"
    )


# ── Lifecycle events ──────────────────────────────────────────

@app.on_event("startup")
def on_startup():
    """Start the background scheduler on app startup."""
    import os
    if os.getenv("ENABLE_SCHEDULER", "true").lower() == "true":
        from app.services.scheduler import start_scheduler
        start_scheduler()
        logger.info("Background scheduler enabled")


@app.on_event("shutdown")
def on_shutdown():
    """Stop the scheduler on shutdown."""
    from app.services.scheduler import stop_scheduler
    stop_scheduler()
