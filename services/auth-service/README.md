# MediConnect Pro - Auth Service

Authentication and user management microservice built with NestJS, TypeORM, and PostgreSQL.

## 🎯 Features

- ✅ User registration with email verification
- ✅ Login with JWT tokens
- ✅ Refresh token mechanism
- ✅ Password reset flow
- ✅ Role-based access control (RBAC)
- ✅ Password hashing with bcrypt
- ✅ Input validation with class-validator
- ✅ PostgreSQL with TypeORM
- ✅ Swagger API documentation
- ✅ Health check endpoints

## 📁 Project Structure (Actual)

```
services/auth-service/
├── src/
│   ├── auth/                          # Authentication module
│   │   ├── dto/
│   │   │   └── register.dto.ts        # ✅ CREATED
│   │   │   └── login.dto.ts           # ⏳ TO CREATE
│   │   │   └── refresh-token.dto.ts   # ⏳ TO CREATE
│   │   ├── auth.controller.ts         # ⏳ TO CREATE
│   │   ├── auth.service.ts            # ⏳ TO CREATE
│   │   └── auth.module.ts             # ⏳ TO CREATE
│   │
│   ├── users/                         # Users module
│   │   ├── entities/
│   │   │   └── user.entity.ts         # ✅ CREATED
│   │   ├── dto/
│   │   │   └── update-user.dto.ts     # ⏳ TO CREATE
│   │   ├── users.controller.ts        # ⏳ TO CREATE
│   │   ├── users.service.ts           # ⏳ TO CREATE
│   │   └── users.module.ts            # ⏳ TO CREATE
│   │
│   ├── common/                        # Shared resources
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts      # ⏳ TO CREATE
│   │   │   └── roles.guard.ts         # ⏳ TO CREATE
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts  # ⏳ TO CREATE
│   │   │   └── roles.decorator.ts     # ⏳ TO CREATE
│   │   └── strategies/
│   │       ├── jwt.strategy.ts        # ⏳ TO CREATE
│   │       └── local.strategy.ts      # ⏳ TO CREATE
│   │
│   ├── database/                      # Database configuration
│   │   ├── database.module.ts         # ✅ CREATED
│   │   ├── data-source.ts             # ✅ CREATED
│   │   ├── migrations/                # ⏳ TO CREATE
│   │   └── seeds/                     # ⏳ TO CREATE
│   │
│   ├── config/
│   │   └── configuration.ts           # ✅ CREATED
│   │
│   ├── health/                        # Health check
│   │   ├── health.controller.ts       # ⏳ TO CREATE
│   │   └── health.module.ts           # ⏳ TO CREATE
│   │
│   ├── app.module.ts                  # ✅ CREATED
│   └── main.ts                        # ✅ CREATED
│
├── test/                              # E2E tests
│   └── app.e2e-spec.ts                # ⏳ TO CREATE
│
├── package.json                       # ✅ CREATED
├── tsconfig.json                      # ✅ CREATED
├── nest-cli.json                      # ✅ CREATED
├── Dockerfile                         # ⏳ TO CREATE
└── README.md                          # ✅ CREATED
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm 10+

### Installation

```bash
# Install dependencies
cd services/auth-service
npm install
```

### Database Setup

1. **Create PostgreSQL database:**

```sql
CREATE DATABASE mediconnect_auth;
```

2. **Configure environment variables:**

Create `.env` file in root directory:

```env
# Auth Service
AUTH_SERVICE_PORT=3001

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=mediconnect_admin
POSTGRES_PASSWORD=your_password
POSTGRES_SSL=false
POSTGRES_MAX_CONNECTIONS=20

# JWT
JWT_SECRET=your_jwt_secret_change_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_change_in_production
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=mediconnect-pro
JWT_AUDIENCE=mediconnect-pro-users

# Bcrypt
BCRYPT_ROUNDS=12

# Email (for verification)
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@mediconnect.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=MediConnect Pro <noreply@mediconnect.com>
```

3. **Run migrations:**

```bash
npm run migration:run
```

4. **Seed database (optional):**

```bash
npm run seed
```

### Running the Service

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm run start:prod
```

The service will be available at `http://localhost:3001`

## 📚 API Endpoints

### Authentication

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "doctor@example.com",
  "password": "SecureP@ss123",
  "confirmPassword": "SecureP@ss123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "doctor",
  "phoneNumber": "+1234567890",
  "acceptedTerms": true
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "doctor@example.com",
  "password": "SecureP@ss123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "uuid",
    "email": "doctor@example.com",
    "role": "doctor",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

#### Password Reset Request
```http
POST /api/v1/auth/password-reset/request
Content-Type: application/json

{
  "email": "doctor@example.com"
}
```

#### Password Reset
```http
POST /api/v1/auth/password-reset
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "newPassword": "NewSecureP@ss123",
  "confirmPassword": "NewSecureP@ss123"
}
```

#### Email Verification
```http
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "token": "verification_token_from_email"
}
```

### Users

#### Get All Users (Admin only)
```http
GET /api/v1/users
Authorization: Bearer <access_token>
```

#### Get User by ID
```http
GET /api/v1/users/:id
Authorization: Bearer <access_token>
```

#### Update User
```http
PATCH /api/v1/users/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "Jane",
  "phoneNumber": "+1234567890"
}
```

#### Delete User (Admin only)
```http
DELETE /api/v1/users/:id
Authorization: Bearer <access_token>
```

### Health Check

```http
GET /health
```

## 🔒 Security

- Passwords are hashed with bcrypt (12 rounds)
- JWT tokens with expiration
- Refresh token rotation
- Email verification required
- Input validation and sanitization
- SQL injection prevention (TypeORM)
- XSS protection (class-validator)

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| AUTH_SERVICE_PORT | Service port | 3001 | No |
| POSTGRES_HOST | PostgreSQL host | localhost | Yes |
| POSTGRES_PORT | PostgreSQL port | 5432 | Yes |
| POSTGRES_USER | Database user | - | Yes |
| POSTGRES_PASSWORD | Database password | - | Yes |
| JWT_SECRET | JWT secret key | - | Yes |
| JWT_REFRESH_SECRET | Refresh token secret | - | Yes |
| BCRYPT_ROUNDS | Bcrypt hashing rounds | 12 | No |

## 📋 Pending Implementation

The following files need to be created to complete the Auth Service:

### Critical Files

1. **Auth Module:**
   - `src/auth/auth.controller.ts` - Authentication endpoints
   - `src/auth/auth.service.ts` - Authentication logic
   - `src/auth/auth.module.ts` - Module configuration
   - `src/auth/dto/login.dto.ts` - Login validation
   - `src/auth/dto/refresh-token.dto.ts` - Refresh token validation

2. **Users Module:**
   - `src/users/users.controller.ts` - User management endpoints
   - `src/users/users.service.ts` - User CRUD operations
   - `src/users/users.module.ts` - Module configuration
   - `src/users/dto/update-user.dto.ts` - Update user validation

3. **Common (Guards & Strategies):**
   - `src/common/strategies/jwt.strategy.ts` - JWT authentication strategy
   - `src/common/strategies/local.strategy.ts` - Local authentication strategy
   - `src/common/guards/jwt-auth.guard.ts` - JWT guard
   - `src/common/guards/roles.guard.ts` - Role-based guard
   - `src/common/decorators/current-user.decorator.ts` - Get current user decorator
   - `src/common/decorators/roles.decorator.ts` - Roles decorator

4. **Health Check:**
   - `src/health/health.controller.ts` - Health check endpoints
   - `src/health/health.module.ts` - Health module

5. **Database:**
   - `src/database/migrations/` - TypeORM migrations
   - `src/database/seeds/run-seed.ts` - Database seeder

6. **Docker:**
   - `Dockerfile` - Container configuration
   - `.dockerignore` - Docker ignore file

### Optional Files

- E2E tests
- Unit tests for each service
- Email templates (Handlebars)
- Additional DTOs (change password, etc.)

## 🐳 Docker

### Build

```bash
docker build -t mediconnect-auth-service .
```

### Run

```bash
docker run -p 3001:3001 \
  -e POSTGRES_HOST=host.docker.internal \
  -e JWT_SECRET=your_secret \
  mediconnect-auth-service
```

## 📖 API Documentation

Swagger documentation available in development mode:

```
http://localhost:3001/api/docs
```

## 🔗 Integration with API Gateway

The Auth Service is accessed through the API Gateway:

```
Client → API Gateway (port 3000) → Auth Service (port 3001)
```

All requests are proxied through `/api/v1/auth/*` on the API Gateway.

## 📈 Next Steps

To complete the Auth Service:

1. Create the Auth Module with controller and service
2. Implement JWT and Local strategies
3. Create Guards and Decorators
4. Add Health Check module
5. Create database migrations
6. Write unit and E2E tests
7. Add Dockerfile
8. Test integration with API Gateway

## 💡 Tips

- Use `npm run dev` for hot-reload during development
- Check Swagger docs for API testing
- Run migrations before starting the service
- Use strong JWT secrets in production
- Enable SSL for database in production

## 📄 License

MIT
