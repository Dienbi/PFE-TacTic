from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class MatchRequest(BaseModel):
    """Request model for job matching"""
    job_post_id: int = Field(..., description="ID of the job post to match candidates for")


class SkillDetail(BaseModel):
    """Details about a skill match"""
    competence_id: int
    competence_nom: str
    niveau_requis: int
    niveau_candidat: Optional[int] = None
    match: bool


class CandidateDetails(BaseModel):
    """Detailed breakdown of candidate scoring"""
    skill_match_percentage: float = Field(..., description="Percentage of skills matched")
    experience_score: float = Field(..., description="Score based on years of experience")
    availability_score: float = Field(..., description="Score based on availability status")
    workload_score: float = Field(..., description="Score based on current team workload")
    years_experience: float = Field(..., description="Years since hire date")
    matching_skills: List[SkillDetail] = Field(..., description="List of matching skills")
    missing_skills: List[SkillDetail] = Field(..., description="List of missing skills")
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
    details: CandidateDetails


class MatchResponse(BaseModel):
    """Response model for job matching"""
    job_post_id: int
    job_post_titre: str
    total_candidates: int = Field(..., description="Total number of candidates analyzed")
    recommendations: List[CandidateRecommendation] = Field(..., description="List of recommended candidates ordered by score")
    generated_at: datetime = Field(default_factory=datetime.now)


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    timestamp: datetime = Field(default_factory=datetime.now)
