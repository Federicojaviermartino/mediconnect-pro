from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from datetime import datetime
from uuid import uuid4
from loguru import logger

from app.schemas.prediction import (
    RiskPredictionRequest,
    RiskPredictionResponse,
    HeartDiseaseRiskRequest,
    DiabetesRiskRequest,
    StrokeRiskRequest,
    VitalsTrendAnalysisRequest,
    VitalsTrendAnalysisResponse,
)
from app.ml.risk_predictor import (
    GeneralRiskPredictor,
    HeartDiseasePredictor,
    DiabetesPredictor,
    StrokePredictor,
)
from app.ml.vitals_analyzer import VitalsAnalyzer

router = APIRouter()

# Initialize predictors
general_predictor = GeneralRiskPredictor()
heart_predictor = HeartDiseasePredictor()
diabetes_predictor = DiabetesPredictor()
stroke_predictor = StrokePredictor()
vitals_analyzer = VitalsAnalyzer()


@router.post("/comprehensive", response_model=RiskPredictionResponse)
async def predict_comprehensive_risk(request: RiskPredictionRequest):
    """
    Comprehensive health risk assessment
    Analyzes multiple risk factors including cardiovascular, diabetes, and stroke
    """
    try:
        logger.info(f"Comprehensive risk prediction for patient: {request.patientId}")

        # Convert request to dict format
        patient_data = request.patientHistory.dict()
        patient_data["patientId"] = request.patientId

        vitals_data = [v.dict() for v in request.recentVitals]

        # Perform prediction
        result = general_predictor.predict_comprehensive_risk(
            patient_data, vitals_data
        )

        # Create response
        response = RiskPredictionResponse(
            patientId=request.patientId,
            predictionId=str(uuid4()),
            timestamp=datetime.utcnow(),
            riskLevel=result["riskLevel"],
            riskScore=result["riskScore"],
            confidence=result["confidence"],
            riskFactors=result["riskFactors"],
            primaryConcerns=result["primaryConcerns"],
            recommendations=result["recommendations"] if request.includeRecommendations else None,
            modelVersion="1.0.0",
            metadata={
                "vitalSignsCount": len(vitals_data),
                "analysisDate": datetime.utcnow().isoformat(),
            },
        )

        logger.info(
            f"Prediction complete: {response.riskLevel} (score: {response.riskScore:.2f})"
        )

        return response

    except Exception as e:
        logger.error(f"Error in comprehensive risk prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/heart-disease")
async def predict_heart_disease_risk(request: HeartDiseaseRiskRequest):
    """
    Heart disease risk prediction
    Based on cardiovascular risk factors and clinical data
    """
    try:
        logger.info(f"Heart disease prediction for patient: {request.patientId}")

        data = request.dict()
        risk_score, confidence, risk_factors = heart_predictor.predict(data)

        risk_level = heart_predictor.determine_risk_level(risk_score)

        return RiskPredictionResponse(
            patientId=request.patientId,
            predictionId=str(uuid4()),
            timestamp=datetime.utcnow(),
            riskLevel=risk_level,
            riskScore=risk_score,
            confidence=confidence,
            riskFactors=risk_factors,
            primaryConcerns=["Cardiovascular health assessment"],
            recommendations=None,
            modelVersion="heart_disease_v1.0",
        )

    except Exception as e:
        logger.error(f"Error in heart disease prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/diabetes")
async def predict_diabetes_risk(request: DiabetesRiskRequest):
    """
    Diabetes risk prediction
    Analyzes metabolic risk factors
    """
    try:
        logger.info(f"Diabetes prediction for patient: {request.patientId}")

        data = request.dict()
        risk_score, confidence, risk_factors = diabetes_predictor.predict(data)

        risk_level = diabetes_predictor.determine_risk_level(risk_score)

        return RiskPredictionResponse(
            patientId=request.patientId,
            predictionId=str(uuid4()),
            timestamp=datetime.utcnow(),
            riskLevel=risk_level,
            riskScore=risk_score,
            confidence=confidence,
            riskFactors=risk_factors,
            primaryConcerns=["Diabetes risk assessment"],
            recommendations=None,
            modelVersion="diabetes_v1.0",
        )

    except Exception as e:
        logger.error(f"Error in diabetes prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stroke")
async def predict_stroke_risk(request: StrokeRiskRequest):
    """
    Stroke risk prediction
    Evaluates cerebrovascular risk factors
    """
    try:
        logger.info(f"Stroke prediction for patient: {request.patientId}")

        data = request.dict()
        risk_score, confidence, risk_factors = stroke_predictor.predict(data)

        risk_level = stroke_predictor.determine_risk_level(risk_score)

        return RiskPredictionResponse(
            patientId=request.patientId,
            predictionId=str(uuid4()),
            timestamp=datetime.utcnow(),
            riskLevel=risk_level,
            riskScore=risk_score,
            confidence=confidence,
            riskFactors=risk_factors,
            primaryConcerns=["Stroke risk assessment"],
            recommendations=None,
            modelVersion="stroke_v1.0",
        )

    except Exception as e:
        logger.error(f"Error in stroke prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/vitals-trend", response_model=VitalsTrendAnalysisResponse)
async def analyze_vitals_trend(request: VitalsTrendAnalysisRequest):
    """
    Analyze vital signs trends over time
    Detects anomalies and provides forecast
    """
    try:
        logger.info(
            f"Vitals trend analysis for patient: {request.patientId}, "
            f"vital: {request.vitalType}, days: {request.days}"
        )

        # In production, fetch vitals from database or Vitals Service
        # For now, using mock data
        vitals = []  # Would fetch from database

        # Perform analysis
        analysis = vitals_analyzer.analyze_trend(
            vitals, request.vitalType, request.days
        )

        return VitalsTrendAnalysisResponse(
            patientId=request.patientId,
            vitalType=request.vitalType,
            period={
                "days": request.days,
                "startDate": (datetime.utcnow()).isoformat(),
                "endDate": datetime.utcnow().isoformat(),
            },
            statistics=analysis["statistics"],
            trend=analysis["trend"],
            anomalies=analysis["anomalies"],
            forecast=analysis["forecast"],
            riskAssessment=analysis["riskAssessment"],
        )

    except Exception as e:
        logger.error(f"Error in vitals trend analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{patient_id}")
async def get_prediction_history(patient_id: str, limit: int = 10):
    """
    Get patient's prediction history
    """
    try:
        logger.info(f"Fetching prediction history for patient: {patient_id}")

        # In production, fetch from database
        # For now, return empty list
        return {
            "patientId": patient_id,
            "predictions": [],
            "count": 0,
        }

    except Exception as e:
        logger.error(f"Error fetching prediction history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
