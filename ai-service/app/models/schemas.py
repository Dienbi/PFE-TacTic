from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


# ──────────────────────────────────────────────────────────────
# Matching Schemas
# ──────────────────────────────────────────────────────────────

class MatchRequest(BaseModel):
    """Request model for job matching"""
    job_post_id: int = Field(..., description="ID of the job post to match candidates for")


class SkillDetail(BaseModel):
    """Details about a skill match"""
    competence_id: Optional[int] = None
    competence_nom: Optional[str] = None
    nom: Optional[str] = None
    niveau_requis: int
    niveau_candidat: Optional[int] = None
    match: bool


class CandidateDetails(BaseModel):
    """Detailed breakdown of candidate scoring"""
    skill_match_percentage: Optional[float] = None
    skill_overlap_ratio: Optional[float] = None
    weighted_skill_match: Optional[float] = None
    experience_score: Optional[float] = None
    availability_score: Optional[float] = None
    attendance_score: Optional[float] = None
    workload_score: Optional[float] = None
    tenure_years: Optional[float] = None
    years_experience: Optional[float] = None
    availability: Optional[float] = None
    matching_skills: List[dict] = Field(default_factory=list)
    missing_skills: List[dict] = Field(default_factory=list)
    current_team: Optional[str] = None
    team_current_members: int = 0


class CandidateRecommendation(BaseModel):
    """A recommended candidate for a job post"""
    utilisateur_id: int
    nom: str
    prenom: str
    matricule: str
    email: str
    score: float = Field(..., ge=0, le=100, description="Overall match score 0-100")
    details: dict = Field(default_factory=dict)


class MatchResponse(BaseModel):
    """Response model for job matching"""
    job_post_id: int
    job_post_titre: str
    total_candidates: int = Field(..., description="Total number of candidates analyzed")
    recommendations: List[CandidateRecommendation] = Field(default_factory=list)
    model_used: Optional[str] = None
    generated_at: datetime = Field(default_factory=datetime.now)


# ──────────────────────────────────────────────────────────────
# Prediction Schemas
# ──────────────────────────────────────────────────────────────

class DailyForecast(BaseModel):
    """Single day attendance prediction"""
    date: str
    day_name: str
    presence_probability: float
    absence_probability: float
    risk_level: str


class AttendancePrediction(BaseModel):
    """Attendance prediction for a single employee"""
    utilisateur_id: int
    nom: str
    prenom: str
    matricule: str
    predictions: List[DailyForecast]
    avg_absence_risk: float
    generated_at: str


class AttendanceSummary(BaseModel):
    """Summary attendance prediction for dashboard"""
    utilisateur_id: int
    nom: str
    prenom: str
    matricule: str
    avg_absence_risk: float
    risk_level: str
    next_day_absence_prob: float


class PerformanceResult(BaseModel):
    """Performance score for an employee"""
    utilisateur_id: int
    nom: str
    prenom: str
    matricule: str
    performance_score: float
    grade: str
    breakdown: Optional[dict] = None
    attendance_rate: Optional[float] = None
    skill_count: Optional[int] = None
    generated_at: Optional[str] = None


class DashboardKPIs(BaseModel):
    """AI-powered dashboard KPIs"""
    generated_at: str
    attendance_predictions: Optional[dict] = None
    performance_scores: Optional[dict] = None


# ──────────────────────────────────────────────────────────────
# Training Schemas
# ──────────────────────────────────────────────────────────────

class TrainingResult(BaseModel):
    """Result of a model training run"""
    status: str
    model: str
    result: dict


class TrainingStatus(BaseModel):
    """Current training status"""
    training_in_progress: bool
    models: dict
    last_checked: str


# ──────────────────────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    timestamp: datetime = Field(default_factory=datetime.now)
