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
- **JSON file-based database** at `demo-app/database/database.json` (with PostgreSQL adapter ready)
- **Static HTML/CSS/JS frontend** served from `public/`
- **Routes organized by feature** in `demo-app/routes/`:
  - `auth.js` - Authentication (login/logout/session) with rate limiting
  - `api.js` - Patient data, vitals, stats
  - `appointments.js` - Appointment management with validation
  - `prescriptions.js` - Prescription management with validation
  - `ai.js` - AI assistant (GPT-4 & Claude integration)
  - `insurance.js` - Insurance eligibility verification
  - `pharmacy.js` - E-prescription management
  - `vitals.js` - Vital signs monitoring

### Middleware Layer
- `demo-app/middleware/auth.js` - Authentication middleware (requireAuth, requireRole)
- `demo-app/middleware/validators.js` - Joi input validation schemas
- `demo-app/middleware/csrf.js` - CSRF protection middleware
- `demo-app/middleware/request-logger.js` - HTTP request logging

### Utilities
- `demo-app/utils/logger.js` - Winston structured logging
- `demo-app/utils/health-check.js` - System health monitoring
- `demo-app/utils/cache.js` - In-memory caching with TTL support

### Services
- `demo-app/services/ai-service.js` - AI integration (OpenAI/Anthropic)
- `demo-app/services/insurance-service.js` - Insurance API integration
- `demo-app/services/pharmacy-service.js` - Pharmacy integration
- `demo-app/services/vitals-monitoring.js` - Vitals processing

### Planned Architecture (Microservices)
The `services/` directory contains scaffolding for:
- `api-gateway/` - Express.js API Gateway (port 3000)
- `auth-service/` - NestJS Authentication (port 3001)
- `patient-service/` - NestJS Patient Management (port 3002)
- `vitals-service/` - NestJS Vitals Monitoring (port 3003)
- `consultation-service/` - NestJS Video Consultations (port 3004)
- `ml-service/` - FastAPI Python ML Service (port 8000)

**Important**: The microservices are **scaffolds only** and not currently functional.

## Database

### JSON File Storage (Default)
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

### PostgreSQL Support (Ready)
Set `USE_POSTGRES=true` or provide `DATABASE_URL` to use PostgreSQL:
- `demo-app/database/postgres-adapter.js` - PostgreSQL adapter
- `demo-app/database/migrate.js` - Database migrations

The database module (`demo-app/database/init.js`) provides:
- `getUserByEmail(email)`, `getUserById(userId)`
- `getPatientById(patientId)`, `getAllPatients()`
- `getVitalsByPatientId(patientId)`
- `getAppointments(userId, role)`, `createAppointment(data)`
- `getPrescriptions(userId, role)`, `createPrescription(data)`

**Critical**: Always use defensive checks for array existence (appointments/prescriptions).

## Key Commands

### Running the Application

```bash
# Start the demo server (production mode)
npm start

# Build (just runs npm install --production)
npm run build

# Run tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run tests for CI
npm run test:ci
```

### Database Commands

```bash
# Run migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Rollback migrations
npm run db:migrate:rollback

# Start PostgreSQL with Docker and run migrations
npm run db:setup
```

### Docker Commands (for full microservices - not currently used)

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Start PostgreSQL only
npm run docker:postgres
```

### Demo Users

The database auto-initializes with demo users on first run:
- **Admin**: `admin@mediconnect.demo` / `Demo2024!Admin`
- **Doctor**: `dr.smith@mediconnect.demo` / `Demo2024!Doctor`
- **Patient**: `john.doe@mediconnect.demo` / `Demo2024!Patient`

## Security Features

### Authentication & Authorization
- **Session-based auth** using `express-session`
- **Rate limiting** on login endpoint (5 attempts per 15 minutes)
- **Role-based access control** (admin, doctor, patient)
- Auth middleware in `demo-app/middleware/auth.js`

### Input Validation
- **Joi validation schemas** in `demo-app/middleware/validators.js`
- Validates: login, appointments, prescriptions, vitals
- Email validation supports `.demo` TLD for testing

### Security Headers
- **Helmet.js** for HTTP security headers
- **X-Content-Type-Options**: nosniff
- **X-Frame-Options**: DENY
- **Content-Security-Policy**: configured

### XSS Protection
- Frontend sanitization in `public/utils/sanitize.js`
- `escapeHtml()` function for user-generated content
- All dynamic content sanitized before DOM insertion

### CSRF Protection
- CSRF middleware in `demo-app/middleware/csrf.js`
- Token-based protection for state-changing requests

## Testing

### Test Infrastructure
- **Jest** for unit and integration tests
- **Supertest** for HTTP endpoint testing
- Tests located in `demo-app/__tests__/`

### Running Tests

```bash
# Run all tests with coverage
npm test

# Run specific test file
npx jest demo-app/__tests__/auth.test.js

# Run tests in watch mode
npm run test:watch
```

### Test Files
- `auth.test.js` - Authentication endpoints
- `database.test.js` - Database operations
- `appointments.test.js` - Appointment API
- `prescriptions.test.js` - Prescription API
- `ai.test.js` - AI service endpoints
- `pharmacy.test.js` - Pharmacy integration (skipped - needs mock data)
- `insurance.test.js` - Insurance integration (skipped - needs mock data)

### Coverage Thresholds
- Branches: 14%
- Functions: 20%
- Lines: 14%
- Statements: 14%

## Frontend Architecture

The frontend uses **vanilla JavaScript** with **no framework**:

### Dashboard Files
- `public/dashboard-admin.html` - Admin dashboard
- `public/dashboard-doctor.html` - Doctor dashboard
- `public/dashboard-patient.html` - Patient dashboard

### Shared Resources
- `public/dashboard-interactive.js` - Main dashboard logic
- `public/dashboard-styles.css` - Shared styling
- `public/ai-assistant.js` - AI medical assistant modal
- `public/utils/sanitize.js` - XSS protection utilities
- `public/utils/csrf.js` - CSRF token management
- `public/utils/lazy-load.js` - Lazy loading for images and components

### Key JavaScript Patterns

```javascript
// Example API call pattern with credentials
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

## Logging

### Winston Logger
Located at `demo-app/utils/logger.js`:
- **Development**: Pretty console output with colors
- **Production**: JSON format for log aggregation
- Log levels: error, warn, info, http, debug

### Helper Methods
- `logger.logRequest(req, res, duration)` - HTTP requests
- `logger.logAuth(event, userId, email, success)` - Auth events
- `logger.logSecurity(event, severity)` - Security events
- `logger.logApiError(error, req)` - API errors

## Health Checks

Located at `demo-app/utils/health-check.js`:

### Endpoints
- `GET /health` - Comprehensive health check
- `GET /health/live` - Liveness probe (Kubernetes)
- `GET /health/ready` - Readiness probe (Kubernetes)

### Health Response
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "ISO8601",
  "version": { "version": "1.0.0", "name": "mediconnect-pro" },
  "uptime": { "formatted": "0d 0h 5m 30s" },
  "memory": { "heapUsed": 50, "percentage": 25 },
  "components": {
    "database": { "status": "up" },
    "redis": { "status": "down", "fallback": "Using in-memory sessions" }
  }
}
```

## Performance Optimizations

### Response Compression
- **Gzip compression** enabled for all responses > 1KB
- Configurable compression level (default: 6)
- Automatic content-type detection

### Static Asset Caching
- **HTML**: `no-cache, must-revalidate` (always check for updates)
- **CSS/JS**: 1 week cache with `stale-while-revalidate` (production)
- **Images**: 1 month cache with `immutable` (production)
- **Fonts**: 1 year cache with `immutable` (production)
- **ETag support** for conditional requests

### In-Memory Caching
Located at `demo-app/utils/cache.js`:
- TTL-based caching (default: 30 seconds for API responses)
- Maximum 500 cache entries
- Automatic cleanup of expired entries
- Cache statistics endpoint: `GET /api/cache/stats`

### Lazy Loading
Located at `public/utils/lazy-load.js`:
- IntersectionObserver-based image lazy loading
- Component lazy loading support
- Fallback for older browsers

## Deployment

### Current Deployment: Render.com
- Live at: https://mediconnect-pro.onrender.com
- Uses `render.yaml` for configuration
- Runs `npm start` command (server.js)
- Health check endpoint: `/health`

### Environment Setup
```bash
# Required for production
NODE_ENV=production
PORT=3000
SESSION_SECRET=<generate-secure-key>

# Optional for AI features
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional for PostgreSQL
USE_POSTGRES=true
DATABASE_URL=postgres://user:pass@host:5432/db
```

## Code Style & Conventions

### JavaScript
- ES6+ syntax with async/await
- CommonJS modules (`require`/`module.exports`)
- bcrypt for password hashing (10 rounds)
- Express.js with middleware pattern

### Error Handling
- API routes return JSON with `{ error: 'message' }` on failure
- Database operations use try/catch with console logging
- Defensive checks for undefined arrays (appointments, prescriptions)

## Important Files to Review

1. **server.js** - Main entry point, route setup, session config
2. **demo-app/database/init.js** - Database schema and operations
3. **demo-app/routes/*.js** - API endpoint implementations
4. **demo-app/middleware/validators.js** - Input validation schemas
5. **demo-app/utils/logger.js** - Structured logging
6. **public/dashboard-interactive.js** - Frontend application logic

## Known Limitations

1. **JSON file storage by default** - Use PostgreSQL for production scale
2. **In-memory sessions** - Configure Redis for session persistence
3. **No video consultation** - Video features are UI mockups only
4. **No real-time features** - WebSocket/Socket.io not implemented
5. **No email/SMS** - Notification features are placeholders
6. **Microservices not functional** - Only demo app works

## Working with This Codebase

When modifying the demo application:
1. **Run tests** after changes: `npm test`
2. **Check database operations** - ensure arrays exist before filtering
3. **Test across all three dashboards** (admin, doctor, patient)
4. **Verify AI fallbacks work** when API keys not configured
5. **Test health endpoint** before deployment (`/health`)
6. **Validate inputs** using Joi schemas in validators.js

When adding microservices:
1. They are currently **scaffolds** - implement one service at a time
2. Start with database connections (PostgreSQL/MongoDB)
3. Implement health checks for all services
4. Use docker-compose for local development
5. Migrate features from demo-app incrementally
