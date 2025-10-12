import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
from scipy import stats
from sklearn.preprocessing import StandardScaler
from loguru import logger


class VitalsAnalyzer:
    """Analyze vital signs trends and detect anomalies"""

    def __init__(self):
        self.scaler = StandardScaler()

    def analyze_trend(
        self, vitals: List[Dict], vital_type: str, days: int = 7
    ) -> Dict:
        """
        Analyze trend in vital signs over time
        Returns: statistics, trend direction, anomalies, forecast
        """
        if not vitals:
            return self._empty_analysis()

        # Convert to DataFrame
        df = pd.DataFrame(vitals)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values("timestamp")

        # Calculate statistics
        statistics = self._calculate_statistics(df["value"].values)

        # Determine trend
        trend = self._determine_trend(df["value"].values, df["timestamp"].values)

        # Detect anomalies
        anomalies = self._detect_anomalies(df)

        # Generate forecast
        forecast = self._generate_forecast(df["value"].values, periods=3)

        # Risk assessment
        risk_assessment = self._assess_vital_risk(
            vital_type, statistics, anomalies, trend
        )

        return {
            "statistics": statistics,
            "trend": trend,
            "anomalies": anomalies,
            "forecast": forecast,
            "riskAssessment": risk_assessment,
        }

    def _calculate_statistics(self, values: np.ndarray) -> Dict:
        """Calculate statistical measures"""
        return {
            "mean": float(np.mean(values)),
            "median": float(np.median(values)),
            "std": float(np.std(values)),
            "min": float(np.min(values)),
            "max": float(np.max(values)),
            "q25": float(np.percentile(values, 25)),
            "q75": float(np.percentile(values, 75)),
            "count": len(values),
            "variance": float(np.var(values)),
            "coefficient_of_variation": float(np.std(values) / np.mean(values) * 100)
            if np.mean(values) != 0
            else 0,
        }

    def _determine_trend(
        self, values: np.ndarray, timestamps: np.ndarray
    ) -> str:
        """Determine if trend is increasing, decreasing, or stable"""
        if len(values) < 3:
            return "insufficient_data"

        # Linear regression
        x = np.arange(len(values))
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, values)

        # Check significance
        if p_value > 0.05:
            return "stable"

        # Check direction
        if slope > 0:
            return "increasing"
        elif slope < 0:
            return "decreasing"
        else:
            return "stable"

    def _detect_anomalies(self, df: pd.DataFrame) -> List[Dict]:
        """Detect anomalous values using statistical methods"""
        anomalies = []

        values = df["value"].values
        mean = np.mean(values)
        std = np.std(values)

        # Z-score method
        z_scores = np.abs((values - mean) / std)

        # IQR method
        q1 = np.percentile(values, 25)
        q3 = np.percentile(values, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        for idx, row in df.iterrows():
            value = row["value"]
            timestamp = row["timestamp"]
            z_score = z_scores[df.index.get_loc(idx)]

            is_anomaly = False
            reason = []

            # Z-score threshold (3 standard deviations)
            if z_score > 3:
                is_anomaly = True
                reason.append(f"Z-score: {z_score:.2f} (>3 SD)")

            # IQR threshold
            if value < lower_bound or value > upper_bound:
                is_anomaly = True
                reason.append(f"Outside IQR bounds [{lower_bound:.1f}, {upper_bound:.1f}]")

            if is_anomaly:
                anomalies.append(
                    {
                        "timestamp": timestamp.isoformat(),
                        "value": float(value),
                        "severity": "high" if z_score > 4 else "medium",
                        "reason": "; ".join(reason),
                        "deviation": float(z_score),
                    }
                )

        return anomalies

    def _generate_forecast(
        self, values: np.ndarray, periods: int = 3
    ) -> List[Dict]:
        """Generate simple forecast using moving average"""
        if len(values) < 3:
            return []

        forecast = []
        window = min(7, len(values))

        # Simple moving average
        ma = np.mean(values[-window:])

        # Calculate trend
        x = np.arange(len(values))
        slope, intercept, _, _, _ = stats.linregress(x, values)

        for i in range(1, periods + 1):
            forecast_value = ma + (slope * i)
            forecast.append(
                {
                    "period": i,
                    "value": float(forecast_value),
                    "confidence_lower": float(forecast_value - np.std(values)),
                    "confidence_upper": float(forecast_value + np.std(values)),
                }
            )

        return forecast

    def _assess_vital_risk(
        self,
        vital_type: str,
        statistics: Dict,
        anomalies: List[Dict],
        trend: str,
    ) -> Dict:
        """Assess risk based on vital signs"""
        # Define normal ranges for different vital types
        normal_ranges = {
            "heartRate": {"min": 60, "max": 100, "unit": "bpm"},
            "bloodPressureSystolic": {"min": 90, "max": 120, "unit": "mmHg"},
            "bloodPressureDiastolic": {"min": 60, "max": 80, "unit": "mmHg"},
            "oxygenSaturation": {"min": 95, "max": 100, "unit": "%"},
            "temperature": {"min": 36.5, "max": 37.5, "unit": "°C"},
            "respiratoryRate": {"min": 12, "max": 20, "unit": "brpm"},
            "bloodGlucose": {"min": 70, "max": 140, "unit": "mg/dL"},
        }

        if vital_type not in normal_ranges:
            return {"riskLevel": "unknown", "message": "Unknown vital type"}

        normal_range = normal_ranges[vital_type]
        mean_value = statistics["mean"]

        # Determine risk level
        risk_level = "low"
        message = "Vital signs within normal range"

        if mean_value < normal_range["min"]:
            deviation = ((normal_range["min"] - mean_value) / normal_range["min"]) * 100
            if deviation > 20:
                risk_level = "high"
                message = f"Average {vital_type} significantly below normal"
            elif deviation > 10:
                risk_level = "medium"
                message = f"Average {vital_type} below normal"
        elif mean_value > normal_range["max"]:
            deviation = ((mean_value - normal_range["max"]) / normal_range["max"]) * 100
            if deviation > 20:
                risk_level = "high"
                message = f"Average {vital_type} significantly above normal"
            elif deviation > 10:
                risk_level = "medium"
                message = f"Average {vital_type} above normal"

        # Increase risk if many anomalies
        if len(anomalies) > 5:
            risk_level = "high"
            message += f"; {len(anomalies)} anomalies detected"
        elif len(anomalies) > 2:
            if risk_level == "low":
                risk_level = "medium"
            message += f"; {len(anomalies)} anomalies detected"

        # Consider trend
        if trend == "increasing" and mean_value > normal_range["max"]:
            message += "; increasing trend"
        elif trend == "decreasing" and mean_value < normal_range["min"]:
            message += "; decreasing trend"

        return {
            "riskLevel": risk_level,
            "message": message,
            "normalRange": normal_range,
            "averageValue": mean_value,
            "deviation": abs(mean_value - (normal_range["min"] + normal_range["max"]) / 2),
        }

    def _empty_analysis(self) -> Dict:
        """Return empty analysis when no data"""
        return {
            "statistics": {},
            "trend": "no_data",
            "anomalies": [],
            "forecast": [],
            "riskAssessment": {"riskLevel": "unknown", "message": "No data available"},
        }

    def compare_vitals(
        self,
        patient_vitals: List[Dict],
        population_stats: Optional[Dict] = None,
    ) -> Dict:
        """Compare patient vitals to population statistics"""
        if not patient_vitals:
            return {"comparison": "no_data"}

        df = pd.DataFrame(patient_vitals)
        patient_mean = df["value"].mean()

        if population_stats:
            pop_mean = population_stats.get("mean", patient_mean)
            pop_std = population_stats.get("std", df["value"].std())

            # Calculate z-score
            z_score = (patient_mean - pop_mean) / pop_std if pop_std != 0 else 0

            # Percentile
            percentile = stats.norm.cdf(z_score) * 100

            return {
                "patientMean": float(patient_mean),
                "populationMean": float(pop_mean),
                "zScore": float(z_score),
                "percentile": float(percentile),
                "comparison": self._interpret_comparison(z_score),
            }

        return {"patientMean": float(patient_mean), "comparison": "no_population_data"}

    def _interpret_comparison(self, z_score: float) -> str:
        """Interpret z-score comparison"""
        if abs(z_score) < 1:
            return "within_normal_range"
        elif abs(z_score) < 2:
            return "slightly_abnormal"
        else:
            return "significantly_abnormal"


class AnomalyDetector:
    """Advanced anomaly detection for medical data"""

    def __init__(self):
        pass

    def detect_multivariate_anomalies(
        self, vitals_data: pd.DataFrame
    ) -> List[Dict]:
        """Detect anomalies considering multiple vital signs together"""
        # This would use more sophisticated methods like:
        # - Isolation Forest
        # - One-Class SVM
        # - Autoencoders
        # For now, implementing a simple correlation-based detection

        anomalies = []

        # Check for unusual combinations
        if "heartRate" in vitals_data.columns and "oxygenSaturation" in vitals_data.columns:
            # High heart rate + low oxygen = concerning
            hr = vitals_data["heartRate"]
            o2 = vitals_data["oxygenSaturation"]

            concerning = (hr > 100) & (o2 < 92)
            if concerning.any():
                anomalies.append(
                    {
                        "type": "multivariate",
                        "vitals": ["heartRate", "oxygenSaturation"],
                        "severity": "high",
                        "description": "High heart rate with low oxygen saturation",
                        "recommendation": "Immediate medical attention recommended",
                    }
                )

        return anomalies

    def detect_sudden_changes(
        self, values: np.ndarray, timestamps: np.ndarray, threshold: float = 0.2
    ) -> List[Dict]:
        """Detect sudden changes in vital signs"""
        changes = []

        for i in range(1, len(values)):
            # Calculate percentage change
            pct_change = abs(values[i] - values[i - 1]) / values[i - 1]

            if pct_change > threshold:
                changes.append(
                    {
                        "timestamp": timestamps[i],
                        "previous_value": float(values[i - 1]),
                        "current_value": float(values[i]),
                        "change_percent": float(pct_change * 100),
                        "severity": "high" if pct_change > 0.3 else "medium",
                    }
                )

        return changes
