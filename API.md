# MediConnect Pro API Documentation

## Base URL

- **Local Development**: `http://localhost:3000`
- **Production**: `https://mediconnect-pro.onrender.com`

## Authentication

All protected endpoints require session-based authentication. Login first to obtain a session cookie.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "dr.smith@mediconnect.demo",
  "password": "Demo2024!Doctor"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 2,
    "email": "dr.smith@mediconnect.demo",
    "name": "Dr. Sarah Smith",
    "role": "doctor"
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid email or password"
}
```

### Logout

```http
POST /api/auth/logout
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Get Current User

```http
GET /api/auth/me
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 2,
    "email": "dr.smith@mediconnect.demo",
    "name": "Dr. Sarah Smith",
    "role": "doctor"
  }
}
```

---

## Patients

### List All Patients

*Requires: doctor or admin role*

```http
GET /api/patients
```

**Response (200 OK):**
```json
{
  "success": true,
  "patients": [
    {
      "id": 1,
      "userId": 3,
      "name": "John Doe",
      "email": "john.doe@mediconnect.demo",
      "dateOfBirth": "1985-03-15",
      "gender": "male",
      "phone": "+1-555-0123",
      "address": "123 Main St, Anytown, USA",
      "emergencyContact": {
        "name": "Jane Doe",
        "phone": "+1-555-0124",
        "relationship": "spouse"
      },
      "medicalHistory": {
        "allergies": ["Penicillin"],
        "conditions": ["Hypertension"],
        "medications": ["Lisinopril 10mg"]
      }
    }
  ]
}
```

### Get Patient by ID

```http
GET /api/patients/:id
```

**Response (200 OK):**
```json
{
  "success": true,
  "patient": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@mediconnect.demo",
    "dateOfBirth": "1985-03-15",
    "medicalHistory": {...}
  }
}
```

---

## Vital Signs

### Get Vitals (Current Patient)

*For patients: returns their own vitals*

```http
GET /api/vitals
```

**Response (200 OK):**
```json
{
  "success": true,
  "vitals": [
    {
      "id": 1,
      "patient_id": 1,
      "heart_rate": 72,
      "blood_pressure": "120/80",
      "temperature": 36.6,
      "oxygen_saturation": 98,
      "respiratory_rate": 16,
      "recorded_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Get Vitals by Patient ID

*Requires: doctor or admin role*

```http
GET /api/vitals/:patientId
```

### Record Vital Signs

*Requires: doctor or admin role*

```http
POST /api/vitals
Content-Type: application/json

{
  "patient_id": 1,
  "heart_rate": 75,
  "blood_pressure_systolic": 118,
  "blood_pressure_diastolic": 78,
  "temperature": 36.7,
  "oxygen_saturation": 99,
  "respiratory_rate": 15
}
```

**Validation Rules:**
- `heart_rate`: 30-220 bpm
- `blood_pressure_systolic`: 60-250 mmHg
- `blood_pressure_diastolic`: 40-150 mmHg
- `temperature`: 32-43°C
- `oxygen_saturation`: 0-100%
- `respiratory_rate`: 8-40 breaths/min

---

## Appointments

### List Appointments

```http
GET /api/appointments
```

**Response (200 OK):**
```json
{
  "success": true,
  "appointments": [
    {
      "id": 1,
      "patient_id": 1,
      "doctor_id": 2,
      "date": "2024-01-20",
      "time": "10:00",
      "reason": "Annual checkup",
      "status": "scheduled",
      "notes": "",
      "created_at": "2024-01-10T08:00:00Z"
    }
  ]
}
```

### Create Appointment

```http
POST /api/appointments
Content-Type: application/json

{
  "date": "2024-01-25",
  "time": "14:30",
  "reason": "Follow-up consultation",
  "doctor_id": 2
}
```

**Validation Rules:**
- `date`: ISO date format, must be in the future
- `time`: HH:MM format (24-hour)
- `reason`: 3-500 characters
- `doctor_id`: optional, positive integer

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Appointment scheduled successfully",
  "appointment": {
    "id": 5,
    "date": "2024-01-25",
    "time": "14:30",
    "status": "scheduled"
  }
}
```

### Update Appointment

```http
PUT /api/appointments/:id
Content-Type: application/json

{
  "status": "completed",
  "notes": "Patient reported improvement"
}
```

### Cancel Appointment

```http
DELETE /api/appointments/:id
```

---

## Prescriptions

### List Prescriptions

```http
GET /api/prescriptions
```

**Response (200 OK):**
```json
{
  "success": true,
  "prescriptions": [
    {
      "id": 1,
      "patient_id": 1,
      "doctor_id": 2,
      "medication": "Lisinopril",
      "dosage": "10mg once daily",
      "pharmacy": "CVS Pharmacy",
      "status": "active",
      "prescribed_at": "2024-01-15T09:00:00Z"
    }
  ]
}
```

### Create Prescription

*Requires: doctor role*

```http
POST /api/prescriptions
Content-Type: application/json

{
  "patient_id": 1,
  "medication": "Amoxicillin",
  "dosage": "500mg three times daily",
  "pharmacy": "Walgreens",
  "notes": "Take with food"
}
```

**Validation Rules:**
- `medication`: 2-200 characters
- `dosage`: 2-100 characters (optional)
- `pharmacy`: 2-200 characters
- `notes`: max 1000 characters (optional)

---

## AI Assistant

### Transcribe Audio

```http
POST /api/ai/transcribe
Content-Type: application/json

{
  "audio_url": "https://example.com/consultation.mp3"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "transcription": "Patient reports headache for the past 3 days..."
}
```

### Generate Clinical Notes

```http
POST /api/ai/generate-notes
Content-Type: application/json

{
  "transcription": "Patient reports persistent headache...",
  "patient_id": 1
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "notes": {
    "chief_complaint": "Persistent headache for 3 days",
    "history": "...",
    "assessment": "...",
    "plan": "..."
  }
}
```

### AI Triage Assessment

```http
POST /api/ai/triage
Content-Type: application/json

{
  "symptoms": "severe chest pain, shortness of breath",
  "duration": "30 minutes",
  "severity": "severe"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "triage": {
    "urgency": "emergency",
    "recommendation": "Seek immediate medical attention",
    "possible_conditions": ["Cardiac event", "Pulmonary embolism"],
    "disclaimer": "This is not a medical diagnosis..."
  }
}
```

### Check AI Status

```http
GET /api/ai/status
```

**Response (200 OK):**
```json
{
  "success": true,
  "openai": true,
  "anthropic": true,
  "message": "AI services are operational"
}
```

---

## Insurance (Simulated)

### List Providers

```http
GET /api/insurance/providers
```

**Response (200 OK):**
```json
{
  "success": true,
  "providers": [
    {
      "id": "BCBS001",
      "name": "Blue Cross Blue Shield",
      "type": "PPO",
      "network": "National"
    }
  ]
}
```

### Verify Eligibility

```http
POST /api/insurance/verify-eligibility
Content-Type: application/json

{
  "patient_id": 1,
  "provider_id": "BCBS001",
  "member_id": "ABC123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "eligibility": {
    "status": "active",
    "coverage_start": "2024-01-01",
    "coverage_end": "2024-12-31",
    "copay": 25,
    "deductible": 500,
    "deductible_met": 250
  }
}
```

### Submit Claim

```http
POST /api/insurance/submit-claim
Content-Type: application/json

{
  "patient_id": 1,
  "provider_id": "BCBS001",
  "service_date": "2024-01-15",
  "diagnosis_codes": ["J06.9"],
  "procedure_codes": ["99213"],
  "amount": 150.00
}
```

---

## Pharmacy (Simulated)

### List Network Pharmacies

```http
GET /api/pharmacy/network
```

### Send E-Prescription

```http
POST /api/pharmacy/send-prescription
Content-Type: application/json

{
  "prescription_id": 1,
  "pharmacy_id": "CVS001"
}
```

### Track Order

```http
GET /api/pharmacy/track-order/:orderId
```

---

## Health & Monitoring

### Health Check

```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00Z",
  "uptime": 86400,
  "memory": {
    "used": 52428800,
    "total": 134217728
  },
  "database": "connected",
  "redis": "not configured"
}
```

### Liveness Probe

```http
GET /health/live
```

**Response (200 OK):**
```json
{
  "status": "alive",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### Readiness Probe

```http
GET /health/ready
```

**Response (200 OK):**
```json
{
  "status": "ready",
  "database": true
}
```

### Cache Statistics

```http
GET /api/cache/stats
```

**Response (200 OK):**
```json
{
  "success": true,
  "cache": {
    "size": 15,
    "maxSize": 500,
    "hits": 120,
    "misses": 45,
    "hitRate": "72.73%",
    "defaultTTL": 30000
  }
}
```

---

## Error Responses

### Validation Error (400)

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### Unauthorized (401)

```json
{
  "error": "Authentication required"
}
```

### Forbidden (403)

```json
{
  "error": "Insufficient permissions"
}
```

### Not Found (404)

```json
{
  "error": "Resource not found"
}
```

### Rate Limited (429)

```json
{
  "error": "Too many login attempts from this IP, please try again after 15 minutes"
}
```

### Server Error (500)

```json
{
  "error": "An error occurred while processing your request"
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 5 requests | 15 minutes |
| All other endpoints | No limit | - |

---

## CSRF Protection

For state-changing requests (POST, PUT, DELETE), include the CSRF token:

1. Get token:
```http
GET /api/csrf-token
```

2. Include in subsequent requests:
```http
POST /api/appointments
X-CSRF-Token: <token>
Content-Type: application/json

{...}
```
