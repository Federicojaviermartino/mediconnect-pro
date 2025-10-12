from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Server
    environment: str = "development"
    port: int = 8000
    debug: bool = True

    # API Security
    api_key: str = "your-secret-api-key"

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017/mediconnect_ml"

    # PostgreSQL (read-only)
    patient_db_uri: str = "postgresql://user:password@localhost:5432/mediconnect_patients"
    vitals_db_uri: str = "postgresql://user:password@localhost:5432/mediconnect_vitals"

    # Kafka
    kafka_brokers: List[str] = ["localhost:9092"]
    kafka_group_id: str = "ml-service"

    # External Services
    auth_service_url: str = "http://localhost:3001"
    patient_service_url: str = "http://localhost:3002"
    vitals_service_url: str = "http://localhost:3003"

    # Model Configuration
    model_path: str = "./models"
    retrain_interval_hours: int = 24
    min_training_samples: int = 1000

    # Risk Prediction Thresholds
    risk_low_threshold: float = 0.3
    risk_medium_threshold: float = 0.6
    risk_high_threshold: float = 0.8

    # Logging
    log_level: str = "INFO"
    log_file: str = "./logs/ml-service.log"

    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
