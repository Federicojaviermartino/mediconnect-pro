# Patient Service

> Comprehensive patient management, medical records, and appointment scheduling for MediConnect Pro

## 📋 Overview

The Patient Service manages all patient-related data including:
- **Patient Profiles**: Personal information, medical history, allergies, chronic conditions
- **Medical Records**: Diagnoses, prescriptions, lab results, procedures, vaccinations
- **Appointments**: Scheduling, status management, conflict detection
- **Device Management**: IoT device registration for remote monitoring

---

## ✨ Features

### Patient Management
- ✅ Complete patient profiles with medical history
- ✅ Automatic Medical Record Number (MRN) generation
- ✅ Allergy and chronic condition tracking
- ✅ Emergency contact management
- ✅ Insurance information storage
- ✅ Doctor assignment
- ✅ IoT device registration
- ✅ BMI calculation
- ✅ Age calculation from date of birth

### Medical Records
- ✅ Multiple record types (consultation, diagnosis, prescription, lab results, etc.)
- ✅ ICD-10 diagnosis coding
- ✅ Prescription management with dosage tracking
- ✅ Lab result storage with normal ranges
- ✅ File attachment support (S3/cloud storage)
- ✅ Tagging system
- ✅ Critical/confidential flags
- ✅ Audit trail (created by, updated by)

### Appointments
- ✅ Multi-type appointments (in-person, video, phone, home visit)
- ✅ Status workflow (scheduled → confirmed → in-progress → completed)
- ✅ Conflict detection for doctor scheduling
- ✅ Cancellation management with reasons
- ✅ Reminder system (email, SMS, push)
- ✅ Duration calculation
- ✅ Integration with Consultation Service

---

## 📡 API Endpoints

### Patients (`/api/v1/patients`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create new patient | Yes |
| GET | `/` | List patients (with filters) | Yes |
| GET | `/statistics` | Get patient statistics | Yes (Admin) |
| GET | `/:id` | Get patient by ID | Yes |
| GET | `/user/:userId` | Get patient by user ID | Yes |
| GET | `/mrn/:mrn` | Get patient by MRN | Yes |
| PATCH | `/:id` | Update patient | Yes |
| DELETE | `/:id` | Soft delete patient | Yes |
| PATCH | `/:id/assign-doctor/:doctorId` | Assign doctor | Yes |
| POST | `/:id/devices/:deviceId` | Add IoT device | Yes |
| DELETE | `/:id/devices/:deviceId` | Remove IoT device | Yes |

### Appointments (`/api/v1/appointments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create appointment | Yes |
| GET | `/` | List appointments (with filters) | Yes |
| GET | `/:id` | Get appointment by ID | Yes |
| PATCH | `/:id/status` | Update status | Yes |
| POST | `/:id/cancel` | Cancel appointment | Yes |

### Medical Records (`/api/v1/medical-records`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create medical record | Yes (Doctor) |
| GET | `/` | List records (with filters) | Yes |
| GET | `/:id` | Get record by ID | Yes |
| GET | `/patient/:patientId` | Get all records for patient | Yes |

### Health (`/health`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Full health check |
| GET | `/health/ready` | Readiness probe |
| GET | `/health/live` | Liveness probe |

---

## 🗄️ Database Schema

### Patient Entity
```typescript
{
  id: uuid
  userId: uuid (FK to Auth Service)
  medicalRecordNumber: string (auto-generated)
  firstName: string
  lastName: string
  email: string
  dateOfBirth: date
  gender: enum
  phoneNumber: string?
  address: jsonb
  bloodType: enum
  height: decimal (cm)
  weight: decimal (kg)
  allergies: jsonb[]
  chronicConditions: jsonb[]
  emergencyContacts: jsonb[]
  insuranceInfo: jsonb
  assignedDoctorId: uuid?
  deviceIds: string[]
  isActive: boolean
  notes: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Medical Record Entity
```typescript
{
  id: uuid
  patientId: uuid (FK)
  type: enum (consultation, diagnosis, prescription, lab_result, etc.)
  title: string
  description: text
  status: enum
  recordDate: timestamp
  doctorId: uuid?
  consultationId: uuid?
  diagnosis: jsonb
  prescription: jsonb
  labResults: jsonb
  attachments: string[]
  tags: string[]
  isCritical: boolean
  isConfidential: boolean
  notes: text
  createdAt: timestamp
  updatedAt: timestamp
  createdBy: uuid
  updatedBy: uuid?
}
```

### Appointment Entity
```typescript
{
  id: uuid
  patientId: uuid (FK)
  doctorId: uuid
  type: enum (in_person, video_call, phone_call, home_visit)
  status: enum (scheduled, confirmed, in_progress, completed, cancelled)
  scheduledStart: timestamp
  scheduledEnd: timestamp
  actualStart: timestamp?
  actualEnd: timestamp?
  reason: string
  symptoms: text?
  notes: text?
  doctorNotes: text?
  consultationId: uuid?
  medicalRecordId: uuid?
  reminder: jsonb
  cancellationReason: text?
  cancelledBy: uuid?
  cancelledAt: timestamp?
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose
- Auth Service running

### Installation

```bash
# From project root
npm install

# Or from service directory
cd services/patient-service
npm install
```

### Configuration

Ensure `.env` file in project root has:
```env
# Patient Service
PATIENT_SERVICE_PORT=3002

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=mediconnect_admin
POSTGRES_PASSWORD=dev_password_123
```

### Database Setup

```bash
# Create database
docker exec -it mediconnect-postgres psql -U mediconnect_admin -d mediconnect_db
CREATE DATABASE mediconnect_patient;
\q
```

### Run Service

```bash
# From project root
npm run dev:patient

# Or from service directory
cd services/patient-service
npm run dev
```

Service available at:
- **API**: http://localhost:3002/api/v1
- **Health**: http://localhost:3002/health
- **Swagger**: http://localhost:3002/api/docs

---

## 📝 Example Requests

### Create Patient

```bash
curl -X POST http://localhost:3002/api/v1/patients \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-from-auth-service",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@email.com",
    "dateOfBirth": "1985-05-15",
    "gender": "male",
    "phoneNumber": "+1234567890",
    "bloodType": "O+",
    "height": 180,
    "weight": 75,
    "allergies": [{
      "name": "Penicillin",
      "severity": "severe",
      "reaction": "Anaphylaxis"
    }],
    "emergencyContacts": [{
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phoneNumber": "+0987654321",
      "isPrimary": true
    }]
  }'
```

### Create Appointment

```bash
curl -X POST http://localhost:3002/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "doctorId": "doctor-uuid",
    "type": "video_call",
    "scheduledStart": "2025-10-15T10:00:00Z",
    "scheduledEnd": "2025-10-15T10:30:00Z",
    "reason": "Follow-up consultation",
    "symptoms": "Headache, fatigue"
  }'
```

### Create Medical Record

```bash
curl -X POST http://localhost:3002/api/v1/medical-records \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "type": "diagnosis",
    "title": "Hypertension Diagnosis",
    "description": "Patient diagnosed with stage 1 hypertension",
    "recordDate": "2025-10-10T14:30:00Z",
    "doctorId": "doctor-uuid",
    "diagnosis": {
      "code": "I10",
      "name": "Essential (primary) hypertension",
      "severity": "moderate"
    },
    "isCritical": false,
    "tags": ["hypertension", "cardiovascular"],
    "createdBy": "doctor-uuid"
  }'
```

---

## 🔍 Query Filters

### List Patients
```
GET /api/v1/patients?page=1&limit=10&assignedDoctorId=<uuid>&search=john
```

### List Appointments
```
GET /api/v1/appointments?patientId=<uuid>&doctorId=<uuid>&status=scheduled&startDate=2025-10-01&endDate=2025-10-31
```

### List Medical Records
```
GET /api/v1/medical-records?patientId=<uuid>&type=diagnosis&isCritical=true
```

---

## 🏗️ Architecture

```
Patient Service (Port 3002)
│
├── Patients Module
│   ├── Controller (REST endpoints)
│   ├── Service (Business logic)
│   └── Entity (TypeORM model)
│
├── Appointments Module
│   ├── Controller
│   ├── Service (includes conflict detection)
│   └── Entity
│
├── Medical Records Module
│   ├── Controller
│   ├── Service
│   └── Entity
│
├── Health Module
│   └── Controller (health checks)
│
└── Database Module (PostgreSQL + TypeORM)
```

---

## 🔗 Integration Points

- **Auth Service**: User authentication and authorization
- **Vitals Service**: Patient vital signs data
- **Consultation Service**: Video appointment management
- **API Gateway**: Request routing and rate limiting

---

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## 📦 Build

```bash
# Development build
npm run build

# Production build
NODE_ENV=production npm run build
npm run start:prod
```

---

## 🐳 Docker

```bash
# Build image
docker build -t mediconnect/patient-service:latest .

# Run container
docker run -p 3002:3002 --env-file .env mediconnect/patient-service:latest
```

---

## 📊 Monitoring

Health endpoints for Kubernetes/monitoring tools:
- **Liveness**: `/health/live`
- **Readiness**: `/health/ready`
- **Full Health**: `/health`

---

## 🔒 Security

- ✅ Input validation with class-validator
- ✅ SQL injection prevention (TypeORM parameterized queries)
- ✅ CORS configuration
- ✅ Soft deletes (data retention)
- ✅ Audit trail for medical records
- ✅ HIPAA compliance measures

---

## 📚 Related Documentation

- [Auth Service](../auth-service/README.md)
- [Shared Types](../../shared/types/README.md)
- [API Gateway](../api-gateway/README.md)

---

**Version**: 1.0.0
**Last Updated**: 2025-10-10
**Maintainer**: MediConnect Pro Team
