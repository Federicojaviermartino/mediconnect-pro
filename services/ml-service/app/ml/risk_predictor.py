import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Tuple
import joblib
import os
from loguru import logger

from app.config import settings
from app.schemas.prediction import (
    RiskLevel,
    RiskFactor,
    Recommendation,
    RiskPredictionResponse,
)


class RiskPredictor:
    """Base class for risk prediction models"""

    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model = None
        self.scaler = StandardScaler()
        self.model_path = os.path.join(settings.model_path, f"{model_name}.joblib")
        self.scaler_path = os.path.join(settings.model_path, f"{model_name}_scaler.joblib")
        self.load_model()

    def load_model(self):
        """Load pre-trained model from disk"""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                self.scaler = joblib.load(self.scaler_path)
                logger.info(f"Loaded model: {self.model_name}")
            else:
                logger.warning(f"Model not found: {self.model_name}. Creating default model.")
                self.create_default_model()
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self.create_default_model()

    def create_default_model(self):
        """Create a default model for demo purposes"""
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        logger.info(f"Created default model: {self.model_name}")

    def save_model(self):
        """Save model to disk"""
        try:
            os.makedirs(settings.model_path, exist_ok=True)
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.scaler, self.scaler_path)
            logger.info(f"Saved model: {self.model_name}")
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")

    def determine_risk_level(self, risk_score: float) -> RiskLevel:
        """Convert risk score to risk level"""
        if risk_score < settings.risk_low_threshold:
            return RiskLevel.LOW
        elif risk_score < settings.risk_medium_threshold:
            return RiskLevel.MEDIUM
        elif risk_score < settings.risk_high_threshold:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL


class HeartDiseasePredictor(RiskPredictor):
    """Heart disease risk prediction"""

    def __init__(self):
        super().__init__("heart_disease")

    def predict(self, data: Dict) -> Tuple[float, float, List[RiskFactor]]:
        """
        Predict heart disease risk
        Returns: (risk_score, confidence, risk_factors)
        """
        # Feature engineering
        features = self._prepare_features(data)

        # Simple rule-based prediction for demo
        # In production, use trained ML model
        risk_score = self._calculate_risk_score(data)
        confidence = 0.85  # Model confidence

        # Identify risk factors
        risk_factors = self._identify_risk_factors(data, risk_score)

        return risk_score, confidence, risk_factors

    def _prepare_features(self, data: Dict) -> np.ndarray:
        """Prepare features for model"""
        features = [
            data.get("age", 50),
            1 if data.get("gender") == "male" else 0,
            data.get("chestPainType", 0),
            data.get("restingBP", 120),
            data.get("cholesterol", 200),
            1 if data.get("fastingBloodSugar") else 0,
            data.get("restingECG", 0),
            data.get("maxHeartRate", 150),
            1 if data.get("exerciseInducedAngina") else 0,
            data.get("oldpeak", 0),
            data.get("slope", 1),
            data.get("numMajorVessels", 0),
            data.get("thalassemia", 0),
        ]
        return np.array(features).reshape(1, -1)

    def _calculate_risk_score(self, data: Dict) -> float:
        """Calculate risk score based on clinical guidelines"""
        score = 0.0

        # Age factor
        age = data.get("age", 50)
        if age > 65:
            score += 0.3
        elif age > 55:
            score += 0.2
        elif age > 45:
            score += 0.1

        # Blood pressure
        bp = data.get("restingBP", 120)
        if bp > 140:
            score += 0.25
        elif bp > 130:
            score += 0.15

        # Cholesterol
        cholesterol = data.get("cholesterol", 200)
        if cholesterol > 240:
            score += 0.2
        elif cholesterol > 200:
            score += 0.1

        # Other factors
        if data.get("fastingBloodSugar"):
            score += 0.15

        if data.get("exerciseInducedAngina"):
            score += 0.2

        # Normalize to 0-1
        return min(score, 1.0)

    def _identify_risk_factors(self, data: Dict, risk_score: float) -> List[RiskFactor]:
        """Identify specific risk factors"""
        factors = []

        age = data.get("age", 50)
        if age > 55:
            factors.append(
                RiskFactor(
                    factor="Age",
                    impact=min((age - 55) / 30, 0.3),
                    description=f"Age {age} increases cardiovascular risk",
                )
            )

        bp = data.get("restingBP", 120)
        if bp > 130:
            factors.append(
                RiskFactor(
                    factor="High Blood Pressure",
                    impact=min((bp - 130) / 50, 0.3),
                    description=f"Blood pressure {bp} mmHg is elevated",
                )
            )

        cholesterol = data.get("cholesterol", 200)
        if cholesterol > 200:
            factors.append(
                RiskFactor(
                    factor="High Cholesterol",
                    impact=min((cholesterol - 200) / 100, 0.25),
                    description=f"Cholesterol level {cholesterol} mg/dL is high",
                )
            )

        if data.get("exerciseInducedAngina"):
            factors.append(
                RiskFactor(
                    factor="Exercise-Induced Angina",
                    impact=0.2,
                    description="Chest pain during exercise indicates cardiac stress",
                )
            )

        return factors


class DiabetesPredictor(RiskPredictor):
    """Diabetes risk prediction"""

    def __init__(self):
        super().__init__("diabetes")

    def predict(self, data: Dict) -> Tuple[float, float, List[RiskFactor]]:
        """Predict diabetes risk"""
        risk_score = self._calculate_risk_score(data)
        confidence = 0.82
        risk_factors = self._identify_risk_factors(data, risk_score)
        return risk_score, confidence, risk_factors

    def _calculate_risk_score(self, data: Dict) -> float:
        """Calculate diabetes risk score"""
        score = 0.0

        # BMI factor
        bmi = data.get("bmi", 25)
        if bmi > 30:
            score += 0.3
        elif bmi > 25:
            score += 0.15

        # Glucose level
        glucose = data.get("glucoseLevel", 100)
        if glucose > 126:
            score += 0.4
        elif glucose > 100:
            score += 0.2

        # Blood pressure
        bp = data.get("bloodPressure", 80)
        if bp > 90:
            score += 0.15

        # Age
        age = data.get("age", 40)
        if age > 45:
            score += 0.15

        return min(score, 1.0)

    def _identify_risk_factors(self, data: Dict, risk_score: float) -> List[RiskFactor]:
        """Identify diabetes risk factors"""
        factors = []

        bmi = data.get("bmi", 25)
        if bmi > 25:
            factors.append(
                RiskFactor(
                    factor="Elevated BMI",
                    impact=min((bmi - 25) / 15, 0.3),
                    description=f"BMI of {bmi:.1f} increases diabetes risk",
                )
            )

        glucose = data.get("glucoseLevel", 100)
        if glucose > 100:
            factors.append(
                RiskFactor(
                    factor="Elevated Glucose",
                    impact=min((glucose - 100) / 100, 0.4),
                    description=f"Fasting glucose {glucose} mg/dL is elevated",
                )
            )

        return factors


class StrokePredictor(RiskPredictor):
    """Stroke risk prediction"""

    def __init__(self):
        super().__init__("stroke")

    def predict(self, data: Dict) -> Tuple[float, float, List[RiskFactor]]:
        """Predict stroke risk"""
        risk_score = self._calculate_risk_score(data)
        confidence = 0.80
        risk_factors = self._identify_risk_factors(data, risk_score)
        return risk_score, confidence, risk_factors

    def _calculate_risk_score(self, data: Dict) -> float:
        """Calculate stroke risk score"""
        score = 0.0

        # Age
        age = data.get("age", 50)
        if age > 65:
            score += 0.3
        elif age > 55:
            score += 0.15

        # Hypertension
        if data.get("hypertension"):
            score += 0.25

        # Heart disease
        if data.get("heartDisease"):
            score += 0.25

        # Glucose level
        glucose = data.get("avgGlucoseLevel", 100)
        if glucose > 125:
            score += 0.15

        # BMI
        bmi = data.get("bmi", 25)
        if bmi > 30:
            score += 0.1

        # Smoking
        if data.get("smokingStatus") in ["formerly smoked", "smokes"]:
            score += 0.15

        return min(score, 1.0)

    def _identify_risk_factors(self, data: Dict, risk_score: float) -> List[RiskFactor]:
        """Identify stroke risk factors"""
        factors = []

        if data.get("hypertension"):
            factors.append(
                RiskFactor(
                    factor="Hypertension",
                    impact=0.25,
                    description="Hypertension significantly increases stroke risk",
                )
            )

        if data.get("heartDisease"):
            factors.append(
                RiskFactor(
                    factor="Heart Disease",
                    impact=0.25,
                    description="Existing heart disease increases stroke risk",
                )
            )

        if data.get("smokingStatus") in ["formerly smoked", "smokes"]:
            factors.append(
                RiskFactor(
                    factor="Smoking",
                    impact=0.15,
                    description="Smoking damages blood vessels and increases risk",
                )
            )

        return factors


class GeneralRiskPredictor:
    """General health risk assessment combining multiple predictors"""

    def __init__(self):
        self.heart_predictor = HeartDiseasePredictor()
        self.diabetes_predictor = DiabetesPredictor()
        self.stroke_predictor = StrokePredictor()

    def predict_comprehensive_risk(
        self, patient_data: Dict, vitals_data: List[Dict]
    ) -> RiskPredictionResponse:
        """Comprehensive risk assessment"""
        # Extract relevant data
        heart_risk, heart_conf, heart_factors = self._assess_heart_risk(
            patient_data, vitals_data
        )
        diabetes_risk, diabetes_conf, diabetes_factors = self._assess_diabetes_risk(
            patient_data, vitals_data
        )
        stroke_risk, stroke_conf, stroke_factors = self._assess_stroke_risk(
            patient_data, vitals_data
        )

        # Combine risks
        overall_risk = (heart_risk * 0.4 + diabetes_risk * 0.3 + stroke_risk * 0.3)
        overall_confidence = (heart_conf + diabetes_conf + stroke_conf) / 3

        # Combine risk factors
        all_factors = heart_factors + diabetes_factors + stroke_factors

        # Determine risk level
        risk_level = self.heart_predictor.determine_risk_level(overall_risk)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            risk_level, heart_risk, diabetes_risk, stroke_risk
        )

        return {
            "riskLevel": risk_level,
            "riskScore": overall_risk,
            "confidence": overall_confidence,
            "riskFactors": all_factors,
            "primaryConcerns": self._identify_primary_concerns(
                heart_risk, diabetes_risk, stroke_risk
            ),
            "recommendations": recommendations,
        }

    def _assess_heart_risk(
        self, patient_data: Dict, vitals_data: List[Dict]
    ) -> Tuple[float, float, List[RiskFactor]]:
        """Assess heart disease risk"""
        # Prepare data from patient history and vitals
        data = {
            "age": patient_data.get("age", 50),
            "gender": patient_data.get("gender", "male"),
            "restingBP": self._get_latest_vital(vitals_data, "bloodPressure", 120),
            "cholesterol": 200,  # Would fetch from lab results
            "fastingBloodSugar": False,
            "maxHeartRate": self._get_latest_vital(vitals_data, "heartRate", 150),
        }
        return self.heart_predictor.predict(data)

    def _assess_diabetes_risk(
        self, patient_data: Dict, vitals_data: List[Dict]
    ) -> Tuple[float, float, List[RiskFactor]]:
        """Assess diabetes risk"""
        data = {
            "age": patient_data.get("age", 40),
            "gender": patient_data.get("gender", "male"),
            "bmi": patient_data.get("bmi", 25),
            "glucoseLevel": self._get_latest_vital(vitals_data, "bloodGlucose", 100),
            "bloodPressure": self._get_latest_vital(vitals_data, "bloodPressure", 80),
        }
        return self.diabetes_predictor.predict(data)

    def _assess_stroke_risk(
        self, patient_data: Dict, vitals_data: List[Dict]
    ) -> Tuple[float, float, List[RiskFactor]]:
        """Assess stroke risk"""
        data = {
            "age": patient_data.get("age", 50),
            "gender": patient_data.get("gender", "male"),
            "hypertension": "hypertension" in patient_data.get("chronicConditions", []),
            "heartDisease": "heart disease" in patient_data.get("chronicConditions", []),
            "avgGlucoseLevel": self._get_latest_vital(vitals_data, "bloodGlucose", 100),
            "bmi": patient_data.get("bmi", 25),
            "smokingStatus": patient_data.get("smokingStatus", "never smoked"),
        }
        return self.stroke_predictor.predict(data)

    def _get_latest_vital(
        self, vitals_data: List[Dict], vital_type: str, default: float
    ) -> float:
        """Extract latest vital sign value"""
        for vital in vitals_data:
            if vital.get("type") == vital_type:
                return float(vital.get("value", default))
        return default

    def _identify_primary_concerns(
        self, heart_risk: float, diabetes_risk: float, stroke_risk: float
    ) -> List[str]:
        """Identify primary health concerns"""
        concerns = []
        if heart_risk > 0.6:
            concerns.append("Elevated cardiovascular disease risk")
        if diabetes_risk > 0.6:
            concerns.append("High diabetes risk")
        if stroke_risk > 0.6:
            concerns.append("Increased stroke risk")
        if not concerns:
            concerns.append("Overall health status is good")
        return concerns

    def _generate_recommendations(
        self, risk_level: RiskLevel, heart: float, diabetes: float, stroke: float
    ) -> List[Recommendation]:
        """Generate health recommendations"""
        recommendations = []

        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            recommendations.append(
                Recommendation(
                    category="Immediate Action",
                    priority="high",
                    description="Schedule consultation with healthcare provider",
                    actionItems=[
                        "Book appointment with primary care physician",
                        "Bring recent test results and medication list",
                        "Monitor symptoms closely",
                    ],
                )
            )

        if heart > 0.5:
            recommendations.append(
                Recommendation(
                    category="Cardiovascular Health",
                    priority="medium",
                    description="Improve heart health through lifestyle changes",
                    actionItems=[
                        "Engage in 30 minutes of moderate exercise daily",
                        "Reduce sodium intake to less than 2,300mg per day",
                        "Monitor blood pressure regularly",
                        "Consider stress reduction techniques",
                    ],
                )
            )

        if diabetes > 0.5:
            recommendations.append(
                Recommendation(
                    category="Metabolic Health",
                    priority="medium",
                    description="Reduce diabetes risk",
                    actionItems=[
                        "Maintain healthy weight (BMI < 25)",
                        "Limit refined carbohydrates and sugars",
                        "Monitor blood glucose levels",
                        "Increase fiber intake",
                    ],
                )
            )

        return recommendations
