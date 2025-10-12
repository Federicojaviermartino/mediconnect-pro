# MediConnect Pro - ML Service

Machine Learning service for medical risk prediction, vital signs analysis, and anomaly detection powered by Python, FastAPI, and scikit-learn.

## Features

- **Risk Prediction Models**
  - Comprehensive health risk assessment
  - Heart disease risk prediction
  - Diabetes risk prediction
  - Stroke risk prediction
  - Multi-factor analysis with confidence scores

- **Vital Signs Analysis**
  - Time-series trend analysis
  - Statistical analysis (mean, std, quartiles, variance)
  - Anomaly detection (Z-score, IQR methods)
  - Forecasting with confidence intervals
  - Risk assessment based on normal ranges

- **Anomaly Detection**
  - Univariate anomaly detection
  - Multivariate anomaly detection
  - Sudden change detection
  - Correlation-based alerts

- **Model Management**
  - Model versioning and registry
  - Performance monitoring
  - Retraining capabilities
  - A/B testing support

## Architecture

```
┌─────────────────────────────────────────┐
│         FastAPI Application             │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  Prediction  │    │  Anomaly     │  │
│  │  Endpoints   │    │  Detection   │  │
│  └──────┬───────┘    └──────┬───────┘  │
│         │                   │           │
│  ┌──────▼───────────────────▼───────┐  │
│  │     ML Engine & Models           │  │
│  │  - Risk Predictors               │  │
│  │  - Vitals Analyzer               │  │
│  │  - Anomaly Detector              │  │
│  └──────────────────────────────────┘  │
│                 │                       │
│  ┌──────────────▼──────────────────┐   │
│  │  External Services Client       │   │
│  │  - Patient Service              │   │
│  │  - Vitals Service               │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
           │
           │ HTTP/REST
           ▼
┌─────────────────────────────────────────┐
│     Other Microservices                 │
│  - Patient Service                      │
│  - Vitals Service                       │
└─────────────────────────────────────────┘
```

## Technologies

- **FastAPI** - Modern Python web framework
- **Python 3.11+** - Programming language
- **scikit-learn** - Machine learning library
- **TensorFlow/PyTorch** - Deep learning frameworks
- **pandas** - Data analysis
- **numpy** - Numerical computing
- **scipy** - Scientific computing
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **MongoDB** - Prediction storage
- **PostgreSQL** - Read-only access to other services

## Installation

### Prerequisites

- Python 3.11+
- pip or conda
- Virtual environment (recommended)

### Setup

```bash
# Navigate to service directory
cd services/ml-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

### Environment Variables

```env
# Server
ENVIRONMENT=development
PORT=8000
DEBUG=true

# API Security
API_KEY=your-secret-api-key

# MongoDB (for storing predictions)
MONGODB_URI=mongodb://localhost:27017/mediconnect_ml

# External Services
PATIENT_SERVICE_URL=http://localhost:3002
VITALS_SERVICE_URL=http://localhost:3003

# Model Configuration
MODEL_PATH=./models
RETRAIN_INTERVAL_HOURS=24
MIN_TRAINING_SAMPLES=1000

# Risk Thresholds
RISK_LOW_THRESHOLD=0.3
RISK_MEDIUM_THRESHOLD=0.6
RISK_HIGH_THRESHOLD=0.8

# Logging
LOG_LEVEL=INFO
LOG_FILE=./logs/ml-service.log
```

## Running the Service

### Development

```bash
# With auto-reload
uvicorn app.main:app --reload --port 8000

# Or with script
python -m app.main
```

### Production

```bash
# With Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# With Gunicorn + Uvicorn workers
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### Docker

```bash
# Build image
docker build -t mediconnect/ml-service:1.0.0 .

# Run container
docker run -p 8000:8000 \
  -e MONGODB_URI=mongodb://mongo:27017/mediconnect_ml \
  mediconnect/ml-service:1.0.0
```

## API Documentation

Once running, access interactive API documentation:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

### API Endpoints

#### Health Checks

**Health Check**
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "ml-service",
  "version": "1.0.0",
  "uptime": "3600.5",
  "memory": {
    "used_mb": 256.8,
    "percent": 3.2
  },
  "cpu_percent": 12.5
}
```

#### Risk Predictions

**Comprehensive Risk Assessment**
```http
POST /api/v1/predictions/comprehensive
Content-Type: application/json

{
  "patientId": "uuid",
  "patientHistory": {
    "age": 55,
    "gender": "male",
    "bloodType": "O+",
    "allergies": ["penicillin"],
    "chronicConditions": ["hypertension"],
    "medications": ["lisinopril"],
    "familyHistory": ["heart disease"],
    "smokingStatus": "former",
    "alcoholConsumption": "moderate",
    "bmi": 28.5
  },
  "recentVitals": [
    {
      "type": "heartRate",
      "value": 88,
      "unit": "bpm",
      "timestamp": "2025-10-11T10:00:00Z"
    },
    {
      "type": "bloodPressureSystolic",
      "value": 145,
      "unit": "mmHg",
      "timestamp": "2025-10-11T10:00:00Z"
    }
  ],
  "symptoms": ["chest pain", "shortness of breath"],
  "includeRecommendations": true
}
```

Response:
```json
{
  "patientId": "uuid",
  "predictionId": "pred-abc123",
  "timestamp": "2025-10-11T10:30:00Z",
  "riskLevel": "medium",
  "riskScore": 0.65,
  "confidence": 0.85,
  "riskFactors": [
    {
      "factor": "High Blood Pressure",
      "impact": 0.3,
      "description": "Blood pressure 145 mmHg is elevated"
    },
    {
      "factor": "Elevated BMI",
      "impact": 0.2,
      "description": "BMI of 28.5 increases cardiovascular risk"
    }
  ],
  "primaryConcerns": [
    "Elevated cardiovascular disease risk"
  ],
  "recommendations": [
    {
      "category": "Cardiovascular Health",
      "priority": "medium",
      "description": "Improve heart health through lifestyle changes",
      "actionItems": [
        "Engage in 30 minutes of moderate exercise daily",
        "Reduce sodium intake to less than 2,300mg per day",
        "Monitor blood pressure regularly"
      ]
    }
  ],
  "modelVersion": "1.0.0"
}
```

**Heart Disease Risk**
```http
POST /api/v1/predictions/heart-disease
Content-Type: application/json

{
  "patientId": "uuid",
  "age": 55,
  "gender": "male",
  "chestPainType": 2,
  "restingBP": 145,
  "cholesterol": 240,
  "fastingBloodSugar": false,
  "restingECG": 0,
  "maxHeartRate": 150,
  "exerciseInducedAngina": false,
  "oldpeak": 1.5,
  "slope": 1,
  "numMajorVessels": 0,
  "thalassemia": 2
}
```

**Diabetes Risk**
```http
POST /api/v1/predictions/diabetes

{
  "patientId": "uuid",
  "age": 50,
  "gender": "female",
  "bmi": 32.5,
  "glucoseLevel": 140,
  "bloodPressure": 88,
  "insulin": 85,
  "skinThickness": 25,
  "diabetesPedigreeFunction": 0.5,
  "pregnancies": 2
}
```

**Stroke Risk**
```http
POST /api/v1/predictions/stroke

{
  "patientId": "uuid",
  "age": 65,
  "gender": "male",
  "hypertension": true,
  "heartDisease": false,
  "avgGlucoseLevel": 110,
  "bmi": 27.5,
  "smokingStatus": "formerly smoked",
  "workType": "private",
  "residenceType": "urban"
}
```

#### Vitals Analysis

**Trend Analysis**
```http
POST /api/v1/predictions/vitals-trend

{
  "patientId": "uuid",
  "vitalType": "heartRate",
  "days": 7
}
```

Response:
```json
{
  "patientId": "uuid",
  "vitalType": "heartRate",
  "period": {
    "days": 7,
    "startDate": "2025-10-04T00:00:00Z",
    "endDate": "2025-10-11T00:00:00Z"
  },
  "statistics": {
    "mean": 75.5,
    "median": 74.0,
    "std": 8.2,
    "min": 62.0,
    "max": 95.0,
    "q25": 70.0,
    "q75": 80.0,
    "count": 168,
    "coefficient_of_variation": 10.8
  },
  "trend": "stable",
  "anomalies": [
    {
      "timestamp": "2025-10-09T14:30:00Z",
      "value": 95.0,
      "severity": "medium",
      "reason": "Z-score: 3.2 (>3 SD)",
      "deviation": 3.2
    }
  ],
  "forecast": [
    {
      "period": 1,
      "value": 76.2,
      "confidence_lower": 68.0,
      "confidence_upper": 84.4
    }
  ],
  "riskAssessment": {
    "riskLevel": "low",
    "message": "Vital signs within normal range",
    "normalRange": {
      "min": 60,
      "max": 100,
      "unit": "bpm"
    },
    "averageValue": 75.5,
    "deviation": 5.5
  }
}
```

#### Anomaly Detection

**Detect Anomalies**
```http
POST /api/v1/anomalies/detect

{
  "patientId": "uuid",
  "vitalType": "heartRate",
  "values": [72, 75, 78, 150, 74, 76],
  "timestamps": [
    "2025-10-11T10:00:00Z",
    "2025-10-11T11:00:00Z",
    "2025-10-11T12:00:00Z",
    "2025-10-11T13:00:00Z",
    "2025-10-11T14:00:00Z",
    "2025-10-11T15:00:00Z"
  ],
  "threshold": 0.2
}
```

**Multivariate Anomaly Detection**
```http
POST /api/v1/anomalies/multivariate

{
  "patientId": "uuid",
  "vitalsData": {
    "heartRate": [
      {"value": 120, "timestamp": "2025-10-11T10:00:00Z"}
    ],
    "oxygenSaturation": [
      {"value": 88, "timestamp": "2025-10-11T10:00:00Z"}
    ]
  }
}
```

Response:
```json
{
  "patientId": "uuid",
  "anomaliesDetected": 1,
  "anomalies": [
    {
      "type": "multivariate",
      "vitals": ["heartRate", "oxygenSaturation"],
      "severity": "high",
      "description": "High heart rate with low oxygen saturation",
      "recommendation": "Immediate medical attention recommended"
    }
  ],
  "vitalsAnalyzed": ["heartRate", "oxygenSaturation"]
}
```

#### Model Management

**List Models**
```http
GET /api/v1/models/list
```

**Get Model Info**
```http
GET /api/v1/models/heart_disease/info
```

**Get Model Performance**
```http
GET /api/v1/models/heart_disease/performance?days=30
```

**Trigger Retraining**
```http
POST /api/v1/models/heart_disease/retrain
```

## Machine Learning Models

### Risk Prediction Models

#### 1. Heart Disease Predictor

**Algorithm**: Random Forest Classifier
**Features**:
- Age, gender, chest pain type
- Resting blood pressure
- Cholesterol levels
- Fasting blood sugar
- ECG results
- Maximum heart rate
- Exercise-induced angina

**Accuracy**: ~85%

#### 2. Diabetes Predictor

**Algorithm**: Gradient Boosting Classifier
**Features**:
- Age, gender, BMI
- Glucose level
- Blood pressure
- Insulin levels
- Skin thickness
- Diabetes pedigree function

**Accuracy**: ~82%

#### 3. Stroke Predictor

**Algorithm**: XGBoost Classifier
**Features**:
- Age, gender
- Hypertension status
- Heart disease history
- Average glucose level
- BMI, smoking status
- Work type, residence type

**Accuracy**: ~80%

### Vital Signs Analyzer

**Methods**:
- **Statistical Analysis**: Mean, median, std, quartiles
- **Trend Detection**: Linear regression with significance testing
- **Anomaly Detection**: Z-score and IQR methods
- **Forecasting**: Moving average with trend adjustment
- **Risk Assessment**: Comparison against normal ranges

### Anomaly Detector

**Techniques**:
- **Univariate**: Statistical outlier detection
- **Multivariate**: Correlation-based detection
- **Temporal**: Sudden change detection
- **Pattern-based**: Rule-based clinical alerts

## Model Training

### Training Pipeline

```python
# Example training script
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib

# Load data
X_train, X_test, y_train, y_test = load_and_split_data()

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
accuracy = model.score(X_test, y_test)
print(f"Accuracy: {accuracy:.2f}")

# Save model
joblib.dump(model, 'models/heart_disease.joblib')
```

### Retraining

Models can be retrained:
- **Scheduled**: Every 24 hours (configurable)
- **On-demand**: Via API endpoint
- **Triggered**: When performance drops below threshold

## Integration with Other Services

### Patient Service

Fetch patient demographic and medical history:

```python
from app.services.external_client import ExternalServiceClient

client = ExternalServiceClient()
patient_data = await client.get_patient_data(patient_id)
medical_history = await client.get_medical_history(patient_id)
```

### Vitals Service

Fetch real-time vital signs:

```python
vitals = await client.get_patient_vitals(patient_id, days=7)
trends = await client.get_vital_trends(patient_id, "heartRate", days=30)
```

## Performance Optimization

### Caching

- Cache model predictions for 5 minutes
- Cache patient data for 10 minutes
- Use Redis for distributed caching

### Model Serving

- Load models at startup
- Keep models in memory
- Use model versioning

### Async Processing

- Use async HTTP clients
- Parallel feature extraction
- Background retraining jobs

## Monitoring

### Metrics Tracked

- Prediction latency
- Model accuracy
- API request rate
- Error rate
- Memory usage
- CPU utilization

### Logging

Structured logging with Loguru:

```python
logger.info(f"Prediction complete: risk={risk_level} score={risk_score:.2f}")
logger.error(f"Model prediction failed: {error}")
```

## Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/test_risk_predictor.py
```

### Example Test

```python
def test_heart_disease_prediction():
    predictor = HeartDiseasePredictor()
    data = {
        "age": 55,
        "gender": "male",
        "restingBP": 140,
        "cholesterol": 220,
        # ... other features
    }
    risk_score, confidence, factors = predictor.predict(data)

    assert 0 <= risk_score <= 1
    assert 0 <= confidence <= 1
    assert len(factors) > 0
```

## Deployment

### Docker Compose

```yaml
ml-service:
  build: ./services/ml-service
  ports:
    - "8000:8000"
  environment:
    - MONGODB_URI=mongodb://mongo:27017/mediconnect_ml
    - PATIENT_SERVICE_URL=http://patient-service:3002
    - VITALS_SERVICE_URL=http://vitals-service:3003
  volumes:
    - ./models:/app/models
    - ./logs:/app/logs
  depends_on:
    - mongodb
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: ml-service
        image: mediconnect/ml-service:1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: ml-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8000
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8000
```

## Security

- **API Key Authentication**: Required for all endpoints
- **Input Validation**: Pydantic schemas validate all inputs
- **Rate Limiting**: Prevent abuse
- **CORS**: Configured allowed origins
- **Data Privacy**: Patient data not stored permanently
- **Model Security**: Models stored securely, version controlled

## Troubleshooting

### Model Not Loading

```bash
# Check model files exist
ls -la models/

# Check file permissions
chmod 644 models/*.joblib

# Check logs
tail -f logs/ml-service.log
```

### High Memory Usage

```bash
# Monitor memory
watch -n 1 'free -h'

# Reduce model complexity or use quantization
# Implement model pruning
# Use batch prediction instead of real-time
```

### Slow Predictions

- Profile code with cProfile
- Check database query performance
- Optimize feature extraction
- Use caching
- Scale horizontally

## Future Enhancements

- [ ] Deep learning models (LSTM for time series)
- [ ] Explainable AI (SHAP values)
- [ ] Federated learning
- [ ] Real-time model updates
- [ ] GPU acceleration
- [ ] AutoML for hyperparameter tuning
- [ ] A/B testing framework
- [ ] Model ensemble strategies

## License

Proprietary - MediConnect Pro

## Support

For issues and questions, contact the ML team.
