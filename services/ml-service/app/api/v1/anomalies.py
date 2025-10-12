from fastapi import APIRouter, HTTPException
from typing import List, Dict
from datetime import datetime
from loguru import logger
from pydantic import BaseModel

from app.ml.vitals_analyzer import AnomalyDetector

router = APIRouter()

anomaly_detector = AnomalyDetector()


class AnomalyDetectionRequest(BaseModel):
    patientId: str
    vitalType: str
    values: List[float]
    timestamps: List[str]
    threshold: float = 0.2


class MultiVariateAnomalyRequest(BaseModel):
    patientId: str
    vitalsData: Dict[str, List[Dict]]  # {vitalType: [{value, timestamp}]}


@router.post("/detect")
async def detect_anomalies(request: AnomalyDetectionRequest):
    """
    Detect anomalies in single vital sign time series
    """
    try:
        logger.info(
            f"Anomaly detection for patient: {request.patientId}, "
            f"vital: {request.vitalType}"
        )

        import numpy as np

        values = np.array(request.values)
        timestamps = np.array(request.timestamps)

        # Detect sudden changes
        sudden_changes = anomaly_detector.detect_sudden_changes(
            values, timestamps, request.threshold
        )

        return {
            "patientId": request.patientId,
            "vitalType": request.vitalType,
            "anomaliesDetected": len(sudden_changes),
            "anomalies": sudden_changes,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error in anomaly detection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/multivariate")
async def detect_multivariate_anomalies(request: MultiVariateAnomalyRequest):
    """
    Detect anomalies across multiple vital signs
    Identifies concerning combinations of vitals
    """
    try:
        logger.info(f"Multivariate anomaly detection for patient: {request.patientId}")

        import pandas as pd

        # Convert to DataFrame
        # This is simplified - in production would properly align timestamps
        df_dict = {}
        for vital_type, values in request.vitalsData.items():
            if values:
                df_dict[vital_type] = [v["value"] for v in values]

        if not df_dict:
            return {
                "patientId": request.patientId,
                "anomalies": [],
                "message": "No data provided",
            }

        # Make all arrays same length (take minimum)
        min_length = min(len(v) for v in df_dict.values())
        for key in df_dict:
            df_dict[key] = df_dict[key][:min_length]

        df = pd.DataFrame(df_dict)

        # Detect multivariate anomalies
        anomalies = anomaly_detector.detect_multivariate_anomalies(df)

        return {
            "patientId": request.patientId,
            "anomaliesDetected": len(anomalies),
            "anomalies": anomalies,
            "vitalsAnalyzed": list(df_dict.keys()),
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error in multivariate anomaly detection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/{patient_id}")
async def get_active_alerts(patient_id: str):
    """
    Get active anomaly alerts for patient
    """
    try:
        logger.info(f"Fetching active alerts for patient: {patient_id}")

        # In production, fetch from database
        return {
            "patientId": patient_id,
            "activeAlerts": [],
            "count": 0,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error fetching alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
