# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MediConnect Pro** is an enterprise-grade telemedicine platform with AI-powered risk prediction and remote patient monitoring. The project has a **dual architecture**:

1. **Full Microservices Architecture** (planned/scaffolded) - in `services/` directory
2. **Demo Application** (currently functional) - in `demo-app/` directory with a single Express server

The live demo at https://mediconnect-pro.onrender.com runs the **demo application** (server.js), not the microservices.

## Architecture Understanding

### Current Implementation (Demo App)
- **Single Express.js server** at `server.js` (port 3000)
- **JSON file-based database** at `demo-app/database/database.json`
- **Static HTML/CSS/JS frontend** served from `public/`
- **Routes organized by feature** in `demo-app/routes/`:
  - `auth.js` - Authentication (login/logout/session)
  - `api.js` - Patient data, vitals, stats
  - `appointments.js` - Appointment management
  - `prescriptions.js` - Prescription management
  - `ai.js` - AI assistant (GPT-4 & Claude integration)

### Planned Architecture (Microservices)
The `services/` directory contains scaffolding for:
- `api-gateway/` - Express.js API Gateway (port 3000)
- `auth-service/` - NestJS Authentication (port 3001)
- `patient-service/` - NestJS Patient Management (port 3002)
- `vitals-service/` - NestJS Vitals Monitoring (port 3003)
- `consultation-service/` - NestJS Video Consultations (port 3004)
- `ml-service/` - FastAPI Python ML Service (port 8000)

**Important**: The microservices are **scaffolds only** and not currently functional.

## Database Schema (JSON File)

Located at `demo-app/database/database.json`:

```javascript
{
  users: [],          // User accounts with bcrypt passwords
  patients: [],       // Patient medical records
  vitalSigns: [],     // Vital signs history
  appointments: [],   // Scheduled appointments
  prescriptions: [],  // Medication prescriptions
  messages: []        // Patient-doctor messaging
}
```

The database module (`demo-app/database/init.js`) provides:
- `getUserByEmail(email)`, `getUserById(userId)`
- `getPatientById(patientId)`, `getAllPatients()`
- `getVitalsByPatientId(patientId)`
- `getAppointments(userId, role)`, `createAppointment(data)`
- `getPrescriptions(userId, role)`, `createPrescription(data)`

**Critical**: Always use defensive checks for array existence (appointments/prescriptions) as per commit f286769.

## Key Commands

### Running the Application

```bash
# Start the demo server (production mode)
npm start

# Build (just runs npm install --production)
npm run build

# Run tests (placeholder)
npm test
```

### Docker Commands (for full microservices - not currently used)

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart specific service
docker-compose up -d --build auth-service
```

### Database Management

The database auto-initializes with demo users on first run:
- **Admin**: `admin@mediconnect.demo` / `Demo2024!Admin`
- **Doctor**: `dr.smith@mediconnect.demo` / `Demo2024!Doctor`
- **Patient**: `john.doe@mediconnect.demo` / `Demo2024!Patient`

The database persists to `demo-app/database/database.json` and auto-saves on changes.

## Frontend Architecture

The frontend uses **vanilla JavaScript** with **no framework**:

### Dashboard Files
- `public/dashboard-admin.html` - Admin dashboard
- `public/dashboard-doctor.html` - Doctor dashboard
- `public/dashboard-patient.html` - Patient dashboard

### Shared Resources
- `public/dashboard-interactive.js` - Main dashboard logic, data fetching, event handlers
- `public/dashboard-styles.css` - Shared styling for all dashboards
- `public/ai-assistant.js` - AI medical assistant modal and functionality

### Key JavaScript Patterns

**Session Management**: Uses `fetch('/api/auth/me')` to get current user
**Data Fetching**: All API calls use `fetch()` with credentials
**AI Assistant**: Global `showTriageForm()` function accessible from all dashboards

```javascript
// Example API call pattern
async function loadData() {
  const response = await fetch('/api/endpoint', {
    credentials: 'include' // Required for session cookies
  });
  const data = await response.json();
  // Handle data...
}
```

## AI Integration

The AI assistant (`demo-app/routes/ai.js`) integrates with:

1. **OpenAI GPT-4** - Medical transcription, note generation, reports
2. **Anthropic Claude** - Triage assessment, differential diagnosis

Environment variables required:
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

API endpoints:
- `POST /api/ai/transcribe` - Transcribe consultation audio
- `POST /api/ai/generate-notes` - Generate medical notes
- `POST /api/ai/generate-report` - Generate medical report
- `POST /api/ai/triage` - AI-powered triage assessment
- `GET /api/ai/status` - Check AI service availability

**Important**: AI features gracefully degrade if API keys are not set.

## Authentication & Session Management

- **Session-based auth** using `express-session`
- Sessions stored in memory (not Redis in demo)
- Login sets `req.session.userId` and `req.session.userRole`
- Auth middleware in `demo-app/middleware/auth.js`
- All protected routes use `requireAuth` middleware

## Deployment

### Current Deployment: Render.com
- Live at: https://mediconnect-pro.onrender.com
- Uses `render.yaml` for configuration
- Runs `npm start` command (server.js)
- Health check endpoint: `/health`

### Environment Setup
```bash
# Copy example env file
cp .env.example .env

# Required for production
NODE_ENV=production
PORT=3000
SESSION_SECRET=<generate-secure-key>

# Optional for AI features
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Code Style & Conventions

### JavaScript
- ES6+ syntax with async/await
- CommonJS modules (`require`/`module.exports`)
- bcrypt for password hashing (10 rounds)
- Express.js with middleware pattern

### Security Practices
- Passwords hashed with bcrypt before storage
- Session cookies with httpOnly, sameSite: 'lax'
- CORS not enabled (same-origin only)
- Trust proxy enabled for Render deployment

### Error Handling
- API routes return JSON with `{ error: 'message' }` on failure
- Database operations use try/catch with console logging
- Defensive checks for undefined arrays (appointments, prescriptions)

## Important Files to Review

1. **server.js** - Main entry point, route setup, session config
2. **demo-app/database/init.js** - Database schema and operations
3. **demo-app/routes/*.js** - API endpoint implementations
4. **public/dashboard-interactive.js** - Frontend application logic
5. **public/ai-assistant.js** - AI features frontend

## Known Limitations

1. **No real database** - JSON file storage (not suitable for production scale)
2. **In-memory sessions** - Sessions lost on server restart
3. **No video consultation** - Video features are UI mockups only
4. **No real-time features** - WebSocket/Socket.io not implemented
5. **No email/SMS** - Notification features are placeholders
6. **Microservices not functional** - Only demo app works

## Recent Changes (from git log)

- **Oct 15**: Added AI Assistant to all dashboards with defensive checks
- **Oct 15**: Implemented AI medical assistant (GPT-4 & Claude)
- **Oct 13**: Added comprehensive proposal for advanced features
- **Oct 13**: Production fixes for undefined database arrays

## Testing the Application

```bash
# Start server
npm start

# In another terminal, test health endpoint
curl http://localhost:3000/health

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dr.smith@mediconnect.demo","password":"Demo2024!Doctor"}'

# Test protected endpoint (with session cookie)
curl http://localhost:3000/api/patients \
  -H "Cookie: connect.sid=<session-id-from-login>"
```

## Next Steps for Development

Based on ADVANCED_FEATURES_PROPOSAL.md, future enhancements should focus on:

1. **AI Clinical Assistant** - Real-time symptom analysis, drug interaction checks
2. **Insurance Integration** - Eligibility verification, claims submission
3. **Pharmacy Integration** - E-prescriptions to pharmacies
4. **Wearable Devices** - Apple Health, Google Fit, CGM integration
5. **FHIR/HL7 Compliance** - Healthcare interoperability standards
6. **Analytics Dashboard** - KPIs for clinics (revenue, utilization, satisfaction)

## Working with This Codebase

When modifying the demo application:
1. **Always test session/auth flow** after route changes
2. **Check database operations** - ensure arrays exist before filtering
3. **Test across all three dashboards** (admin, doctor, patient)
4. **Verify AI fallbacks work** when API keys not configured
5. **Test health endpoint** before deployment (`/health`)

When adding microservices:
1. They are currently **scaffolds** - implement one service at a time
2. Start with database connections (PostgreSQL/MongoDB)
3. Implement health checks for all services
4. Use docker-compose for local development
5. Migrate features from demo-app incrementally
