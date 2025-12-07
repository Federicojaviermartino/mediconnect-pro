# MediConnect Pro Architecture

## System Overview

MediConnect Pro is a telemedicine platform built with a modular architecture that supports both a functional demo application and scaffolded microservices for future expansion.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Static HTML/CSS/JS                        │   │
│  │   login.html │ dashboard-admin │ dashboard-doctor │ ...   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS SERVER                           │
│                        (server.js)                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    MIDDLEWARE                            │    │
│  │  compression │ session │ security-headers │ rate-limit   │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      ROUTES                              │    │
│  │  auth │ api │ vitals │ appointments │ prescriptions │ai  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐    │
│  │  JSON Database │  │  Session Store │  │  External APIs  │    │
│  │ database.json  │  │ In-Memory/Redis│  │ OpenAI/Claude   │    │
│  └────────────────┘  └────────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Server Layer (server.js)

The main Express.js server orchestrates all application components:

```
server.js
├── Middleware Stack
│   ├── Security Headers (custom)
│   ├── Compression (gzip)
│   ├── Body Parser (JSON, URL-encoded)
│   ├── Cookie Parser
│   ├── Request Logger
│   └── Session Management
├── Route Handlers
│   ├── /api/auth/* (auth.js)
│   ├── /api/patients/* (api.js)
│   ├── /api/vitals/* (vitals.js)
│   ├── /api/appointments/* (appointments.js)
│   ├── /api/prescriptions/* (prescriptions.js)
│   ├── /api/ai/* (ai.js)
│   ├── /api/insurance/* (insurance.js)
│   └── /api/pharmacy/* (pharmacy.js)
├── Health Endpoints
│   ├── /health (comprehensive)
│   ├── /health/live (liveness)
│   └── /health/ready (readiness)
└── Error Handlers
    ├── JSON Parse Errors
    └── Global Error Handler
```

### Middleware Architecture

```
Request Flow:
─────────────────────────────────────────────────────────────────────
│ Request │
    ↓
┌─────────────────┐
│ Security Headers│  X-Content-Type-Options, X-Frame-Options, HSTS
└────────┬────────┘
         ↓
┌─────────────────┐
│  Compression    │  Gzip responses > 1KB
└────────┬────────┘
         ↓
┌─────────────────┐
│  Body Parser    │  JSON, URL-encoded
└────────┬────────┘
         ↓
┌─────────────────┐
│ Cookie Parser   │  Parse cookies
└────────┬────────┘
         ↓
┌─────────────────┐
│ Request Logger  │  Log all requests
└────────┬────────┘
         ↓
┌─────────────────┐
│    Session      │  Session management
└────────┬────────┘
         ↓
┌─────────────────┐
│  Rate Limiter   │  (auth endpoints only)
└────────┬────────┘
         ↓
┌─────────────────┐
│   requireAuth   │  Authentication check
└────────┬────────┘
         ↓
┌─────────────────┐
│   Validators    │  Input validation (Joi)
└────────┬────────┘
         ↓
│ Route Handler │
─────────────────────────────────────────────────────────────────────
```

### Database Architecture

The demo application uses a JSON file-based database with an adapter pattern:

```
Database Module (src/database/init.js)
├── Data Storage
│   └── database.json
│       ├── users[]
│       ├── patients[]
│       ├── vitalSigns[]
│       ├── appointments[]
│       ├── prescriptions[]
│       └── messages[]
├── Query Functions
│   ├── getUserByEmail(email)
│   ├── getUserById(userId)
│   ├── getPatientById(patientId)
│   ├── getAllPatients()
│   ├── getVitalsByPatientId(patientId)
│   ├── getAppointments(userId, role)
│   ├── createAppointment(data)
│   ├── getPrescriptions(userId, role)
│   └── createPrescription(data)
└── Auto-save on changes
```

### Security Architecture

```
Security Layers:
─────────────────────────────────────────────────────────────────────

1. Transport Security
   └── HSTS (production only)

2. Header Security
   ├── X-Content-Type-Options: nosniff
   ├── X-Frame-Options: DENY
   └── X-Powered-By: removed

3. Session Security
   ├── httpOnly cookies
   ├── sameSite: 'lax'
   ├── secure: true (production)
   └── 24-hour expiration

4. Authentication
   ├── bcrypt password hashing (10 rounds)
   ├── Session-based auth
   └── Role-based access control

5. Rate Limiting
   └── 5 requests/15min for auth endpoints

6. Input Validation
   ├── Joi schemas
   └── stripUnknown: true

7. CSRF Protection
   ├── Token generation (crypto.randomBytes)
   └── Constant-time comparison

8. XSS Protection
   └── DOMPurify (frontend)
```

### Caching Architecture

```
Cache System (src/utils/cache.js)
├── In-Memory Cache (MemoryCache class)
│   ├── Map-based storage
│   ├── TTL-based expiration
│   ├── Max size: 500 entries
│   ├── Automatic cleanup
│   └── LRU eviction
├── API Response Cache
│   ├── Default TTL: 30 seconds
│   ├── Key: method:url:userId:role
│   └── X-Cache header (HIT/MISS)
└── Static Asset Caching
    ├── HTML: no-cache
    ├── CSS/JS: 1 week (production)
    ├── Images: 1 month (production)
    └── Fonts: 1 year (production)
```

## Frontend Architecture

### Page Structure

```
public/
├── Login Flow
│   └── login.html → /api/auth/login → redirect to dashboard
├── Dashboards
│   ├── dashboard-admin.html (admin users)
│   ├── dashboard-doctor.html (doctor users)
│   └── dashboard-patient.html (patient users)
└── Shared Resources
    ├── dashboard-styles.css
    ├── dashboard-scripts.js
    ├── dashboard-interactive.js
    └── ai-assistant.js
```

### Frontend Module Structure

```
JavaScript Modules:
─────────────────────────────────────────────────────────────────────

dashboard-scripts.js
├── User session management
├── Navigation
├── Notification system
└── Logout handling

dashboard-interactive.js
├── Data fetching (fetch API)
├── Table population
├── Real-time updates
└── Form handling

ai-assistant.js
├── AI modal management
├── Triage form
├── API integration
└── Response rendering

utils/csrf.js
├── Token fetching
├── Request interceptor
└── Automatic token refresh

utils/lazy-load.js
├── IntersectionObserver
├── Image lazy loading
├── Component lazy loading
└── Resource hints
```

## API Design

### RESTful Conventions

```
Resource        Method    Endpoint                  Action
─────────────────────────────────────────────────────────────────────
Authentication  POST      /api/auth/login           Login
                POST      /api/auth/logout          Logout
                GET       /api/auth/me              Current user

Patients        GET       /api/patients             List all
                GET       /api/patients/:id         Get one

Vitals          GET       /api/vitals               List (patient)
                GET       /api/vitals/:patientId    List by patient
                POST      /api/vitals               Create

Appointments    GET       /api/appointments         List
                POST      /api/appointments         Create
                PUT       /api/appointments/:id     Update
                DELETE    /api/appointments/:id     Delete

Prescriptions   GET       /api/prescriptions        List
                POST      /api/prescriptions        Create

AI              POST      /api/ai/transcribe        Transcribe
                POST      /api/ai/generate-notes    Generate notes
                POST      /api/ai/triage            Triage
                GET       /api/ai/status            Status

Health          GET       /health                   Full check
                GET       /health/live              Liveness
                GET       /health/ready             Readiness
```

### Response Format

```json
// Success
{
  "success": true,
  "data": {...}
}

// Error
{
  "error": "Error message",
  "details": [...] // optional validation errors
}
```

## Deployment Architecture

### Render.com Configuration

```yaml
# render.yaml
services:
  - type: web
    name: mediconnect-pro
    env: node
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
```

### Health Check Flow

```
Kubernetes/Docker Orchestration:
─────────────────────────────────────────────────────────────────────

Liveness Probe (/health/live)
├── Checks: Process is running
├── Failure: Restart container
└── Interval: 10 seconds

Readiness Probe (/health/ready)
├── Checks: Database connected, dependencies ready
├── Failure: Remove from load balancer
└── Interval: 5 seconds

Full Health (/health)
├── System uptime
├── Memory usage
├── Database status
├── Redis status (if configured)
└── Response latency
```

## Technical Decisions

### Why JSON File Database?

- **Simplicity**: No external database setup required
- **Portability**: Single file, easy to backup/restore
- **Demo Mode**: Appropriate for demonstration purposes
- **Migration Path**: Adapter pattern allows PostgreSQL upgrade

### Why Session-Based Auth?

- **Simplicity**: Easier to implement than JWT
- **Security**: Server-side session invalidation
- **Cookies**: Automatic handling by browsers
- **CSRF Compatible**: Works with CSRF tokens

### Why Vanilla JavaScript?

- **No Build Step**: Simpler deployment
- **Performance**: No framework overhead
- **Learning**: Demonstrates core concepts
- **Compatibility**: Works everywhere

### Why In-Memory Caching?

- **Speed**: Fastest possible access
- **Simplicity**: No Redis required for demo
- **Sufficient**: Good enough for demo traffic
- **Upgrade Path**: Redis can be added later

## Future Architecture (Microservices)

The `services/` directory contains scaffolding for microservices:

```
Future Architecture:
─────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (3000)                          │
│              Express.js + Kong/Nginx                             │
└─────────┬───────────┬───────────┬───────────┬─────────┬────────┘
          │           │           │           │         │
    ┌─────▼────┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐ ┌──▼────┐
    │Auth (3001)│ │Patient │ │Vitals  │ │Consult │ │ML     │
    │ NestJS   │ │(3002)  │ │(3003)  │ │(3004)  │ │(8000) │
    │PostgreSQL│ │NestJS  │ │NestJS  │ │NestJS  │ │FastAPI│
    └──────────┘ │Postgres│ │MongoDB │ │Postgres│ │Python │
                 └────────┘ └────────┘ └────────┘ └───────┘
                        │           │           │
                        └─────┬─────┴───────────┘
                              │
                    ┌─────────▼──────────┐
                    │    Apache Kafka    │
                    │  Event Streaming   │
                    └────────────────────┘
```

This architecture enables:
- Independent scaling
- Technology flexibility
- Fault isolation
- Team autonomy
