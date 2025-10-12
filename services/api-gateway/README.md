# MediConnect Pro - API Gateway

The API Gateway is the single entry point for all client requests to the MediConnect Pro microservices. It handles authentication, authorization, rate limiting, request routing, and more.

## Features

- **Request Routing**: Proxy requests to appropriate microservices
- **Authentication & Authorization**: JWT-based auth with role-based access control (RBAC)
- **Rate Limiting**: Protects against abuse and DDoS attacks
- **Request Logging**: Comprehensive logging with Winston
- **Error Handling**: Centralized error handling with standardized responses
- **Input Validation**: Request validation and sanitization
- **Security**: Helmet, CORS, compression, and more
- **Health Checks**: Kubernetes-compatible health endpoints

## Tech Stack

- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT (jsonwebtoken)
- **Logging**: Winston
- **Security**: Helmet, CORS
- **Rate Limiting**: express-rate-limit
- **Proxy**: http-proxy-middleware

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

Create a `.env` file in the root directory (or use the existing one):

```env
# Server
API_GATEWAY_PORT=3000
API_GATEWAY_HOST=localhost
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Microservices URLs
AUTH_SERVICE_URL=http://localhost:3001
PATIENT_SERVICE_URL=http://localhost:3002
VITALS_SERVICE_URL=http://localhost:3003
CONSULTATION_SERVICE_URL=http://localhost:3004
ML_SERVICE_URL=http://localhost:8000

# CORS
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX_REQUESTS=5
```

### Running the Service

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start
```

The API Gateway will be available at `http://localhost:3000`

## API Endpoints

### Health Check

```http
GET /health              - Basic health check
GET /health/detailed     - Detailed health check with all services
GET /health/readiness    - Kubernetes readiness probe
GET /health/liveness     - Kubernetes liveness probe
GET /ping                - Simple ping endpoint
```

### Proxied Routes

All routes are prefixed with `/api/v1`:

#### Authentication (`/api/v1/auth`)

- `POST /auth/login` - User login (rate limited: 5 req/15min)
- `POST /auth/register` - User registration (rate limited: 5 req/hour)
- `POST /auth/password-reset` - Password reset (rate limited: 3 req/hour)
- `GET /auth/me` - Get current user (requires auth)
- `POST /auth/refresh` - Refresh access token (requires auth)

#### Patients (`/api/v1/patients`)

- All routes require authentication
- `GET /patients` - List patients
- `GET /patients/:id` - Get patient by ID
- `POST /patients` - Create patient (doctors/admins only)
- `PUT /patients/:id` - Update patient
- `DELETE /patients/:id` - Delete patient (admins only)

#### Vitals (`/api/v1/vitals`)

- All routes require authentication
- `GET /vitals` - List vital signs
- `GET /vitals/:id` - Get vital sign by ID
- `POST /vitals` - Record vital signs
- `GET /vitals/patient/:patientId` - Get patient vitals

#### Consultations (`/api/v1/consultations`)

- All routes require authentication
- `GET /consultations` - List consultations
- `GET /consultations/:id` - Get consultation by ID
- `POST /consultations` - Schedule consultation
- `PUT /consultations/:id` - Update consultation
- `POST /consultations/:id/start` - Start consultation
- `POST /consultations/:id/end` - End consultation

#### ML Predictions (`/api/v1/ml`)

- All routes require authentication
- Only doctors and admins can access
- `POST /ml/predict` - Get risk prediction
- `POST /ml/analyze` - Analyze patient data

## Middleware

### Authentication Middleware

```typescript
import { authenticate, authorize } from './middleware/auth.middleware';

// Require authentication
router.use(authenticate);

// Require specific roles
router.use(authorize('admin', 'doctor'));
```

### Rate Limiting

```typescript
import rateLimiters from './middleware/rateLimit.middleware';

// Apply rate limiter
router.use(rateLimiters.general);
router.use(rateLimiters.auth);
router.use(rateLimiters.passwordReset);
```

### Validation

```typescript
import { validate } from './middleware/validation.middleware';
import { body } from 'express-validator';

router.post(
  '/login',
  validate([
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
  ]),
  loginController
);
```

## Error Handling

All errors are handled centrally and returned in a standardized format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Invalid email address"
        }
      ]
    },
    "timestamp": "2025-01-01T00:00:00.000Z"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Logging

Logs are written to:
- Console (development)
- `logs/combined-YYYY-MM-DD.log` (all logs)
- `logs/error-YYYY-MM-DD.log` (errors only)

Log levels: `error`, `warn`, `info`, `debug`

## Docker

### Build Image

```bash
docker build -t mediconnect-api-gateway .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your_secret \
  mediconnect-api-gateway
```

## Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Security

- **Helmet**: Sets secure HTTP headers
- **CORS**: Configured for allowed origins only
- **Rate Limiting**: Prevents abuse
- **Input Validation**: All inputs are validated and sanitized
- **JWT**: Secure token-based authentication
- **HTTPS**: Always use HTTPS in production

## Performance

- **Compression**: Response compression enabled
- **Connection Pooling**: Efficient connection management
- **Caching**: Redis caching (when configured)
- **Load Balancing**: Supports horizontal scaling

## Monitoring

Health check endpoint can be used with monitoring tools:

```bash
# Check if service is healthy
curl http://localhost:3000/health

# Detailed service check
curl http://localhost:3000/health/detailed
```

## License

MIT
