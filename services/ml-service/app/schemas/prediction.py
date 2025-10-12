from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class VitalSignInput(BaseModel):
    type: str = Field(..., description="Type of vital sign")
    value: float = Field(..., description="Vital sign value")
    unit: str = Field(..., description="Unit of measurement")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PatientHistoryInput(BaseModel):
    age: int = Field(..., ge=0, le=150)
    gender: str = Field(..., pattern="^(male|female|other)$")
    bloodType: Optional[str] = None
    allergies: List[str] = Field(default_factory=list)
    chronicConditions: List[str] = Field(default_factory=list)
    medications: List[str] = Field(default_factory=list)
    familyHistory: List[str] = Field(default_factory=list)
    smokingStatus: Optional[str] = None
    alcoholConsumption: Optional[str] = None
    bmi: Optional[float] = None


class RiskPredictionRequest(BaseModel):
    patientId: str = Field(..., description="Patient UUID")
    patientHistory: PatientHistoryInput
    recentVitals: List[VitalSignInput] = Field(
        ..., description="Recent vital signs (last 7 days)"
    )
    symptoms: List[str] = Field(default_factory=list)
    includeRecommendations: bool = Field(default=True)


class RiskFactor(BaseModel):
    factor: str
    impact: float = Field(..., ge=0, le=1, description="Impact on risk (0-1)")
    description: str


class Recommendation(BaseModel):
    category: str
    priority: str
    description: str
    actionItems: List[str]


class RiskPredictionResponse(BaseModel):
    patientId: str
    predictionId: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    riskLevel: RiskLevel
    riskScore: float = Field(..., ge=0, le=1, description="Overall risk score (0-1)")
    confidence: float = Field(..., ge=0, le=1, description="Model confidence (0-1)")
    riskFactors: List[RiskFactor]
    primaryConcerns: List[str]
    recommendations: Optional[List[Recommendation]] = None
    modelVersion: str
    metadata: Optional[Dict[str, Any]] = None


class HeartDiseaseRiskRequest(BaseModel):
    patientId: str
    age: int = Field(..., ge=0, le=150)
    gender: str
    chestPainType: int = Field(..., ge=0, le=3)
    restingBP: float = Field(..., gt=0)
    cholesterol: float = Field(..., gt=0)
    fastingBloodSugar: bool
    restingECG: int = Field(..., ge=0, le=2)
    maxHeartRate: float = Field(..., gt=0)
    exerciseInducedAngina: bool
    oldpeak: float = Field(default=0.0)
    slope: int = Field(default=1, ge=0, le=2)
    numMajorVessels: int = Field(default=0, ge=0, le=3)
    thalassemia: int = Field(default=0, ge=0, le=3)


class DiabetesRiskRequest(BaseModel):
    patientId: str
    age: int = Field(..., ge=0, le=150)
    gender: str
    bmi: float = Field(..., gt=0)
    glucoseLevel: float = Field(..., gt=0)
    bloodPressure: float = Field(..., gt=0)
    insulin: Optional[float] = None
    skinThickness: Optional[float] = None
    diabetesPedigreeFunction: Optional[float] = None
    pregnancies: Optional[int] = Field(default=0, ge=0)


class StrokeRiskRequest(BaseModel):
    patientId: str
    age: int = Field(..., ge=0, le=150)
    gender: str
    hypertension: bool
    heartDisease: bool
    avgGlucoseLevel: float = Field(..., gt=0)
    bmi: float = Field(..., gt=0)
    smokingStatus: str
    workType: Optional[str] = None
    residenceType: Optional[str] = None


class VitalsTrendAnalysisRequest(BaseModel):
    patientId: str
    vitalType: str
    days: int = Field(default=7, ge=1, le=90)


class VitalsTrendAnalysisResponse(BaseModel):
    patientId: str
    vitalType: str
    period: Dict[str, Any]
    statistics: Dict[str, float]
    trend: str  # "increasing", "decreasing", "stable"
    anomalies: List[Dict[str, Any]]
    forecast: Optional[List[Dict[str, Any]]] = None
    riskAssessment: Optional[Dict[str, Any]] = None
