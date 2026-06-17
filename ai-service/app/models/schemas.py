from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
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


class ScoreBreakdown(BaseModel):
    skills: float = 0
    attendance: float = 0
    tenure: float = 0
    availability: float = 0


class CandidateRecommendation(BaseModel):
    """A recommended candidate for a job post"""
    utilisateur_id: int
    nom: str
    prenom: str
    matricule: str
    email: str
    score: float = Field(..., ge=0, le=100, description="Overall match score 0-100")
    verdict: Optional[str] = None
    summary: Optional[str] = None
    reasons: List[str] = Field(default_factory=list)
    score_breakdown: Optional[dict] = None
    has_applied: bool = False
    details: dict = Field(default_factory=dict)


class MatchResponse(BaseModel):
    """Response model for job matching"""
    model_config = ConfigDict(protected_namespaces=())

    job_post_id: int
    job_post_titre: str
    total_candidates: int = Field(..., description="Total number of candidates analyzed")
    recommendations: List[CandidateRecommendation] = Field(default_factory=list)
    model_used: Optional[str] = None
    generated_at: datetime = Field(default_factory=datetime.now)


# ──────────────────────────────────────────────────────────────
# Prediction Schemas
# ──────────────────────────────────────────────────────────────

class AttendancePattern(BaseModel):
    type: str
    label: str
    confidence: float


class AlertDate(BaseModel):
    date: str
    day_name: str
    day_name_fr: Optional[str] = None
    absence_probability: float
    reason: str


class DailyForecast(BaseModel):
    """Single day attendance prediction"""
    date: str
    day_name: str
    day_name_fr: Optional[str] = None
    presence_probability: float
    absence_probability: float
    risk_level: str
    reason: Optional[str] = None
    is_planned_leave: bool = False


class AttendancePrediction(BaseModel):
    """Attendance prediction for a single employee"""
    utilisateur_id: int
    nom: str
    prenom: str
    matricule: str
    predictions: List[DailyForecast]
    avg_absence_risk: float
    risk_level: Optional[str] = None
    patterns: List[AttendancePattern] = Field(default_factory=list)
    primary_pattern: Optional[str] = None
    alert_dates: List[AlertDate] = Field(default_factory=list)
    recommendation: Optional[str] = None
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
    patterns: List[AttendancePattern] = Field(default_factory=list)
    primary_pattern: Optional[str] = None
    alert_dates: List[AlertDate] = Field(default_factory=list)
    recommendation: Optional[str] = None


class ScoreFactor(BaseModel):
    key: str
    label: str
    score: float
    weight: int
    status: str


class PerformanceResult(BaseModel):
    """Performance score for an employee"""
    utilisateur_id: int
    nom: str
    prenom: str
    matricule: str
    performance_score: float
    grade: str
    grade_label: Optional[str] = None
    summary: Optional[str] = None
    score_factors: List[dict] = Field(default_factory=list)
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
    model_config = ConfigDict(protected_namespaces=())

    status: str
    model: str
    result: dict


class TrainingStatus(BaseModel):
    """Current training status"""
    model_config = ConfigDict(protected_namespaces=())

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
