# MediConnect Pro

> Enterprise-grade telemedicine platform with AI-powered medical assistance and remote patient monitoring

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue)](https://expressjs.com/)

## Live Demo

**[https://mediconnect-pro.onrender.com](https://mediconnect-pro.onrender.com)**

**Demo Credentials:**
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@mediconnect.demo` | `Demo2024!Admin` |
| Doctor | `dr.smith@mediconnect.demo` | `Demo2024!Doctor` |
| Patient | `john.doe@mediconnect.demo` | `Demo2024!Patient` |

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Future Roadmap](#future-roadmap)
- [License](#license)

## Overview

MediConnect Pro is a comprehensive healthcare platform that enables:

- **Patient Monitoring**: Track vital signs (heart rate, blood pressure, temperature, SpO2)
- **AI Medical Assistant**: GPT-4 and Claude-powered triage and medical documentation
- **Appointment Management**: Schedule and manage patient-doctor appointments
- **Prescription Management**: Digital prescription creation and tracking
- **Insurance Integration**: Eligibility verification and claims processing (simulated)
- **Pharmacy Integration**: E-prescription routing to pharmacies (simulated)
- **Role-Based Access**: Separate dashboards for Admin, Doctor, and Patient roles

## Features

### For Healthcare Providers (Doctors)
- Patient list with vital signs monitoring
- AI-powered medical transcription and note generation
- Appointment scheduling and management
- Digital prescription creation
- Clinical analytics dashboard

### For Patients
- Personal health dashboard with vital signs history
- Appointment booking and management
- Prescription history and refill requests
- AI triage assistant for symptom assessment
- Secure messaging with healthcare providers

### For Administrators
- User management across all roles
- System-wide analytics and statistics
- Appointment and prescription oversight
- Platform configuration

### Technical Features
- Session-based authentication with bcrypt password hashing
- Rate limiting on authentication endpoints
- CSRF protection for state-changing requests
- Input validation using Joi schemas
- Security headers (X-Content-Type-Options, X-Frame-Options, HSTS)
- Gzip compression for optimized response sizes
- Static asset caching with ETags
- In-memory API response caching
- Lazy loading for frontend resources
- Health check endpoints for monitoring

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18
- **Session Management**: express-session
- **Security**: bcryptjs, helmet, express-rate-limit
- **Validation**: Joi
- **Compression**: compression middleware
- **AI Integration**: OpenAI GPT-4, Anthropic Claude

### Frontend
- **Architecture**: Vanilla JavaScript (no framework)
- **Styling**: Custom CSS with responsive design
- **Components**: Modular dashboard components
- **Performance**: Lazy loading, IntersectionObserver

### Database
- **Storage**: JSON file-based (demo mode)
- **Optional**: PostgreSQL support via adapter pattern

### Deployment
- **Platform**: Render.com
- **Health Checks**: /health, /health/live, /health/ready

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Federicojaviermartino/mediconnect-pro.git
   cd mediconnect-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment** (optional)
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Open http://localhost:3000 in your browser
   - Login with demo credentials above

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `SESSION_SECRET` | Secret for session encryption | (auto-generated) |
| `OPENAI_API_KEY` | OpenAI API key for AI features | (optional) |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features | (optional) |
| `REDIS_HOST` | Redis host for session storage | (optional) |
| `REDIS_PORT` | Redis port | 6379 |

## API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/me` | GET | Get current user |

### Patients

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/patients` | GET | List all patients (doctor/admin) |
| `/api/patients/:id` | GET | Get patient details |

### Vitals

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vitals` | GET | Get vitals for current patient |
| `/api/vitals` | POST | Record new vital signs |
| `/api/vitals/:patientId` | GET | Get vitals by patient ID |

### Appointments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/appointments` | GET | List appointments |
| `/api/appointments` | POST | Create appointment |
| `/api/appointments/:id` | PUT | Update appointment |
| `/api/appointments/:id` | DELETE | Cancel appointment |

### Prescriptions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/prescriptions` | GET | List prescriptions |
| `/api/prescriptions` | POST | Create prescription |

### AI Assistant

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/transcribe` | POST | Transcribe medical audio |
| `/api/ai/generate-notes` | POST | Generate clinical notes |
| `/api/ai/generate-report` | POST | Generate medical report |
| `/api/ai/triage` | POST | AI-powered triage assessment |
| `/api/ai/status` | GET | Check AI service availability |

### Insurance (Simulated)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/insurance/providers` | GET | List insurance providers |
| `/api/insurance/verify-eligibility` | POST | Verify patient eligibility |
| `/api/insurance/submit-claim` | POST | Submit insurance claim |
| `/api/insurance/claim-status/:id` | GET | Check claim status |

### Pharmacy (Simulated)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pharmacy/network` | GET | List pharmacy network |
| `/api/pharmacy/send-prescription` | POST | Send e-prescription |
| `/api/pharmacy/track-order/:id` | GET | Track prescription order |

### Health & Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Comprehensive health check |
| `/health/live` | GET | Liveness probe |
| `/health/ready` | GET | Readiness probe |
| `/api/cache/stats` | GET | Cache statistics |

## Security

### Implemented Security Measures

| Feature | Implementation |
|---------|---------------|
| Password Hashing | bcrypt with 10 rounds |
| Session Security | httpOnly, sameSite: lax, secure in production |
| Rate Limiting | 5 requests/15min for auth endpoints |
| CSRF Protection | Token-based with crypto.timingSafeEqual |
| Input Validation | Joi schemas with stripUnknown |
| Security Headers | X-Content-Type-Options, X-Frame-Options, HSTS |
| XSS Protection | DOMPurify sanitization on frontend |

### Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains (production)
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

Current coverage thresholds:
- Branches: 14%
- Functions: 20%
- Lines: 14%
- Statements: 14%

## Deployment

### Render.com (Current)

The application is configured for deployment on Render.com using `render.yaml`:

```yaml
services:
  - type: web
    name: mediconnect-pro
    env: node
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /health
```

### Manual Deployment

1. Set environment variables
2. Install production dependencies: `npm install --production`
3. Start server: `npm start`

### Health Check Endpoints

- `/health` - Full system health with metrics
- `/health/live` - Kubernetes liveness probe
- `/health/ready` - Kubernetes readiness probe

## Project Structure

```
mediconnect-pro/
├── demo-app/                   # Demo application code
│   ├── database/              # Database operations
│   │   ├── database.json      # JSON data store
│   │   └── init.js            # Database initialization
│   ├── middleware/            # Express middleware
│   │   ├── auth.js            # Authentication
│   │   ├── csrf.js            # CSRF protection
│   │   ├── validators.js      # Input validation
│   │   └── request-logger.js  # Request logging
│   ├── routes/                # API route handlers
│   │   ├── auth.js            # Authentication routes
│   │   ├── api.js             # General API routes
│   │   ├── appointments.js    # Appointment management
│   │   ├── prescriptions.js   # Prescription management
│   │   ├── vitals.js          # Vital signs
│   │   ├── ai.js              # AI assistant
│   │   ├── insurance.js       # Insurance integration
│   │   └── pharmacy.js        # Pharmacy integration
│   └── utils/                 # Utility modules
│       ├── logger.js          # Logging utility
│       ├── cache.js           # In-memory cache
│       └── health-check.js    # Health check utilities
├── public/                     # Static frontend files
│   ├── login.html             # Login page
│   ├── dashboard-admin.html   # Admin dashboard
│   ├── dashboard-doctor.html  # Doctor dashboard
│   ├── dashboard-patient.html # Patient dashboard
│   ├── dashboard-styles.css   # Dashboard styling
│   ├── dashboard-scripts.js   # Dashboard logic
│   ├── dashboard-interactive.js # Interactive features
│   ├── ai-assistant.js        # AI assistant modal
│   └── utils/                 # Frontend utilities
│       ├── csrf.js            # CSRF token handling
│       └── lazy-load.js       # Lazy loading
├── services/                   # Microservices (scaffolded)
│   ├── api-gateway/           # Express.js API Gateway
│   ├── auth-service/          # NestJS Authentication
│   ├── patient-service/       # NestJS Patient Management
│   ├── vitals-service/        # NestJS Vitals Monitoring
│   ├── consultation-service/  # NestJS Video Consultation
│   └── ml-service/            # Python FastAPI ML Service
├── server.js                   # Main server entry point
├── jest.config.js             # Test configuration
├── render.yaml                # Render deployment config
├── CLAUDE.md                  # AI assistant instructions
└── package.json               # Dependencies and scripts
```

## Future Roadmap

### Planned Microservices Architecture

The `services/` directory contains scaffolding for a full microservices implementation:

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| API Gateway | Express.js | 3000 | Request routing, rate limiting |
| Auth Service | NestJS | 3001 | Authentication & authorization |
| Patient Service | NestJS | 3002 | Patient management |
| Vitals Service | NestJS | 3003 | Real-time vital signs |
| Consultation Service | NestJS | 3004 | Video consultations |
| ML Service | FastAPI | 8000 | Risk prediction & analytics |

### Upcoming Features

- Real-time video consultations with WebRTC
- Wearable device integration (Apple Health, Google Fit)
- FHIR/HL7 healthcare interoperability
- Advanced ML risk prediction models
- Mobile application (React Native)
- Real-time notifications with WebSocket

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built for better healthcare**
