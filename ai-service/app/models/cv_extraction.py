from pydantic import BaseModel, Field
from typing import List, Optional
from pydantic import ConfigDict


class TechnicalSkill(BaseModel):
    name: str
    category: str = Field(..., pattern="^(programming_language|framework|tool|database|cloud_platform|other)$")
    confidence: str = Field(..., pattern="^(high|medium|low)$")


class SoftSkill(BaseModel):
    name: str
    confidence: str = Field(..., pattern="^(high|medium|low)$")


class Language(BaseModel):
    language: str
    proficiency: Optional[str] = None


class Certification(BaseModel):
    name: str
    issuer: Optional[str] = None


class CvExtractionRequest(BaseModel):
    file_path: str
    user_id: Optional[str] = None


class CvExtractionResponse(BaseModel):
    technical_skills: List[TechnicalSkill]
    soft_skills: List[SoftSkill]
    languages_spoken: List[Language]
    certifications: List[Certification]

    model_config = ConfigDict(protected_namespaces=())
