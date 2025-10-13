# MediConnect Pro

> Enterprise-grade telemedicine platform with AI-powered risk prediction and remote patient monitoring

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

## 🎭 Live Demo

> **Try it now!** Experience the platform without installing anything.

🔗 **[View Live Demo](DEMO.md)** | 📚 **[API Documentation](#)** (Coming Soon)

**Demo Credentials:**
- Doctor: `dr.smith@mediconnect.demo` / `Demo2024!Doctor`
- Patient: `john.doe@mediconnect.demo` / `Demo2024!Patient`
- Admin: `admin@mediconnect.demo` / `Demo2024!Admin`

See [DEMO.md](DEMO.md) for complete demo guide and all credentials.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

MediConnect Pro is a comprehensive healthcare platform that enables:

- **Real-time Patient Monitoring**: IoT device integration for continuous vital signs tracking
- **AI-Powered Risk Assessment**: Machine learning models predict patient health risks
- **Video Consultations**: Secure, HIPAA-compliant telemedicine sessions
- **Analytics Dashboard**: Real-time insights for healthcare providers
- **Multi-tenant Architecture**: Support for multiple healthcare organizations
- **Mobile & Web Access**: Cross-platform accessibility for patients and doctors

## ✨ Features

### For Healthcare Providers
- 📊 Real-time patient vital signs monitoring
- 🎥 HD video/audio consultations with screen sharing
- 🤖 AI-driven risk prediction and alerts
- 📈 Comprehensive analytics and reporting
- 📱 Mobile app for on-the-go access
- 🔔 Intelligent alert system for critical conditions

### For Patients
- 💊 Medication reminders and tracking
- 📅 Easy appointment scheduling
- 🏥 Access to medical history
- 💬 Secure messaging with healthcare providers
- 📊 Personal health dashboard
- 🔗 IoT device integration (smartwatches, BP monitors, glucose meters)

### Technical Features
- 🔐 Bank-grade security & HIPAA compliance
- ⚡ Real-time data processing with Kafka
- 🌐 Scalable microservices architecture
- 🐳 Docker & Kubernetes ready
- 📡 WebSocket for real-time updates
- 🧪 Comprehensive test coverage
- 📝 OpenAPI/Swagger documentation

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │   Web App        │              │   Mobile App     │        │
│  │   (Next.js 14)   │              │   (React Native) │        │
│  └────────┬─────────┘              └────────┬─────────┘        │
└───────────┼──────────────────────────────────┼─────────────────┘
            │                                  │
            └──────────────┬───────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      API GATEWAY                                │
│              (Express.js - Port 3000)                           │
│   • Authentication • Rate Limiting • Request Routing            │
└───────┬─────────┬──────────┬───────────┬──────────┬───────────┘
        │         │          │           │          │
┌───────▼───┐ ┌──▼──────┐ ┌─▼────────┐ ┌▼─────────┐ ┌▼──────────┐
│   Auth    │ │ Patient │ │  Vitals  │ │Consulta- │ │    ML     │
│  Service  │ │ Service │ │ Service  │ │   tion   │ │  Service  │
│ (NestJS)  │ │(NestJS) │ │(NestJS)  │ │ Service  │ │ (FastAPI) │
│ Port 3001 │ │Port 3002│ │Port 3003 │ │Port 3004 │ │ Port 8000 │
└─────┬─────┘ └────┬────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘
      │            │           │            │             │
┌─────▼────────────▼───────────▼────────────▼─────────────▼──────┐
│                    MESSAGE BROKER (Kafka)                       │
│     Topics: vitals-events, alerts, consultations, notifications │
└─────────────────────────────────────────────────────────────────┘
      │            │           │            │             │
┌─────▼──────┐ ┌──▼──────┐ ┌─▼─────────┐ ┌▼──────────┐ ┌▼────────┐
│PostgreSQL  │ │PostgreSQL│ │ MongoDB  │ │TimescaleDB│ │  Redis  │
│  (Auth)    │ │(Patients)│ │ (Vitals) │ │(TimeSeries│ │ (Cache) │
│Port 5432   │ │Port 5432 │ │Port 27017│ │ Port 5433 │ │Port 6379│
└────────────┘ └──────────┘ └──────────┘ └───────────┘ └─────────┘
```

### Microservices Overview

| Service | Technology | Port | Database | Purpose |
|---------|-----------|------|----------|---------|
| **API Gateway** | Express.js | 3000 | Redis | Request routing, auth, rate limiting |
| **Auth Service** | NestJS | 3001 | PostgreSQL | User authentication & authorization |
| **Patient Service** | NestJS | 3002 | PostgreSQL | Patient management & medical history |
| **Vitals Service** | NestJS | 3003 | MongoDB | Real-time vital signs storage |
| **Consultation Service** | NestJS | 3004 | PostgreSQL | Video consultation management |
| **ML Service** | FastAPI (Python) | 8000 | - | Risk prediction & analytics |

### Data Flow

1. **Real-time Vitals Monitoring**
   ```
   IoT Device → Kafka → Vitals Service → MongoDB → ML Service → Risk Alert → Notification
   ```

2. **User Authentication**
   ```
   Client → API Gateway → Auth Service → PostgreSQL → JWT Token → Client
   ```

3. **Video Consultation**
   ```
   Client → Consultation Service → Twilio API → WebRTC Stream → Participants
   ```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5.3+
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Data Visualization**: D3.js, ECharts
- **Maps**: Leaflet.js
- **Real-time**: Socket.io Client
- **Forms**: React Hook Form + Zod

### Backend - Node.js Services
- **API Gateway**: Express.js
- **Microservices**: NestJS
- **Validation**: class-validator, class-transformer
- **ORM**: TypeORM (PostgreSQL), Mongoose (MongoDB)
- **Authentication**: Passport.js, JWT
- **Real-time**: Socket.io
- **Message Queue**: KafkaJS

### Backend - Python Service
- **Framework**: FastAPI
- **ML Libraries**: TensorFlow, PyTorch, scikit-learn
- **Data Processing**: Pandas, NumPy
- **API Docs**: Swagger/OpenAPI

### Databases
- **PostgreSQL**: User data, patients, consultations
- **MongoDB**: Vital signs, real-time data
- **TimescaleDB**: Time-series analytics
- **Redis**: Caching, sessions, real-time data

### DevOps & Infrastructure
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Cloud**: AWS (EC2, S3, RDS, ElastiCache)
- **Monitoring**: DataDog, Sentry, New Relic
- **Logging**: Winston, ELK Stack

### Third-party Integrations
- **Video**: Twilio Video API / Agora.io
- **Email**: SendGrid / AWS SES
- **SMS**: Twilio
- **Storage**: AWS S3
- **Maps**: Google Maps API
- **Payments**: Stripe

## 📁 Project Structure

```
mediconnect-pro/
├── services/                    # Microservices
│   ├── api-gateway/            # Express.js API Gateway
│   │   ├── src/
│   │   │   ├── config/         # Configuration files
│   │   │   ├── middleware/     # Auth, logging, error handling
│   │   │   ├── routes/         # Route definitions
│   │   │   ├── utils/          # Utility functions
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── app.ts          # Express app setup
│   │   │   └── index.ts        # Entry point
│   │   ├── tests/              # Unit & integration tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── auth-service/           # NestJS Authentication
│   │   ├── src/
│   │   │   ├── auth/           # Auth module
│   │   │   ├── users/          # Users module
│   │   │   ├── database/       # Database config
│   │   │   ├── common/         # Shared guards, decorators
│   │   │   └── main.ts         # Bootstrap
│   │   ├── test/
│   │   ├── migrations/         # TypeORM migrations
│   │   └── package.json
│   │
│   ├── patient-service/        # NestJS Patient Management
│   ├── vitals-service/         # NestJS Vitals Monitoring
│   ├── consultation-service/   # NestJS Video Consultation
│   └── ml-service/             # Python FastAPI ML Service
│
├── frontend/                    # Frontend applications
│   ├── web/                    # Next.js Web App
│   │   ├── src/
│   │   │   ├── app/            # App router pages
│   │   │   ├── components/     # Reusable components
│   │   │   ├── lib/            # Utilities, API clients
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── store/          # Redux store
│   │   │   └── types/          # TypeScript types
│   │   ├── public/             # Static assets
│   │   └── package.json
│   │
│   └── mobile/                 # React Native Mobile App
│
├── shared/                      # Shared packages
│   ├── types/                  # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── user.types.ts
│   │   │   ├── vitals.types.ts
│   │   │   ├── alert.types.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── utils/                  # Shared utility functions
│       ├── src/
│       └── package.json
│
├── infrastructure/              # Infrastructure as Code
│   ├── docker/                 # Docker configurations
│   │   ├── docker-compose.yml
│   │   ├── Dockerfile.gateway
│   │   ├── Dockerfile.auth
│   │   └── ...
│   │
│   ├── kubernetes/             # K8s manifests
│   │   ├── deployments/
│   │   ├── services/
│   │   ├── configmaps/
│   │   └── ingress/
│   │
│   └── terraform/              # Terraform IaC
│       ├── aws/
│       └── modules/
│
├── docs/                        # Documentation
│   ├── architecture/           # Architecture diagrams
│   ├── api/                    # API documentation
│   └── deployment/             # Deployment guides
│
├── scripts/                     # Utility scripts
│   ├── setup.sh               # Initial setup
│   ├── seed.ts                # Database seeding
│   └── migrate.sh             # Migration runner
│
├── tests/                       # E2E tests
│   └── e2e/
│
├── .github/                     # GitHub workflows
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── package.json                 # Root package.json
├── tsconfig.base.json          # Base TypeScript config
├── tsconfig.json               # Root TypeScript config
├── .gitignore
├── .env.example
└── README.md
```

## 🚀 Quick Start

**Get MediConnect Pro running in 3 commands:**

```bash
git clone https://github.com/Federicojaviermartino/mediconnect-pro.git
cd mediconnect-pro
docker-compose up -d
```

Then visit **http://localhost** in your browser! 🎉

For detailed instructions, see **[QUICKSTART.md](QUICKSTART.md)**

### Automated Setup (Recommended)

**Windows:**
```bash
scripts\setup.bat
```

**Mac/Linux:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The setup script will:
- ✅ Check prerequisites
- ✅ Create environment files
- ✅ Start all services
- ✅ Verify health endpoints
- ✅ Display access URLs

### Manual Setup

#### Prerequisites

- **Docker Desktop** 20.10+ - [Download](https://www.docker.com/products/docker-desktop)
- **Docker Compose** 2.0+ (included with Docker Desktop)
- **8GB RAM minimum** (16GB recommended)
- **20GB disk space**

#### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Federicojaviermartino/mediconnect-pro.git
   cd mediconnect-pro
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # The default values work out of the box for local development
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Wait for services to initialize** (2-3 minutes on first run)
   ```bash
   docker-compose logs -f
   ```

5. **Verify services are running**
   ```bash
   docker-compose ps
   ```

### 🌐 Access Points

Once running, access the application at:

| Service | URL | Description |
|---------|-----|-------------|
| **Web App** | http://localhost | Main application (via Nginx) |
| **Web App (direct)** | http://localhost:3100 | Direct access to frontend |
| **API Gateway** | http://localhost:3000 | REST API endpoint |
| **API Docs** | http://localhost:3000/api-docs | Swagger documentation |

#### Service Endpoints

| Service | URL | Swagger Docs |
|---------|-----|--------------|
| Auth Service | http://localhost:3001 | http://localhost:3001/api-docs |
| Patient Service | http://localhost:3002 | http://localhost:3002/api-docs |
| Vitals Service | http://localhost:3003 | http://localhost:3003/api-docs |
| Consultation Service | http://localhost:3004 | http://localhost:3004/api-docs |
| ML Service | http://localhost:8000 | http://localhost:8000/docs |

### 🧪 Quick API Test

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "DOCTOR"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "SecurePass123!"
  }'
```

### 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Detailed quick start guide with troubleshooting
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment instructions
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing guidelines
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guide

## 💻 Development

### Running Individual Services

```bash
# API Gateway
npm run dev:gateway

# Auth Service
npm run dev:auth

# Patient Service
npm run dev:patient

# Web Frontend
npm run dev:web
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Type checking
npm run type-check
```

### Database Migrations

```bash
# Create a new migration
cd services/auth-service
npm run migration:create -- CreateUsersTable

# Run migrations
npm run migrations:run

# Revert last migration
npm run migrations:revert
```

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e
```

## 📦 Building for Production

```bash
# Build all services
npm run build

# Build specific service
npm run build:gateway
npm run build:services
npm run build:frontend
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build Docker images
npm run docker:build

# Push to registry
docker-compose push

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
npm run k8s:deploy

# Check deployment status
kubectl get pods -n mediconnect

# View logs
kubectl logs -f deployment/api-gateway -n mediconnect
```

### AWS Deployment

See [docs/deployment/aws.md](docs/deployment/aws.md) for detailed AWS deployment instructions.

## 📚 API Documentation

API documentation is available via Swagger UI:

- **API Gateway**: http://localhost:3000/api-docs
- **Auth Service**: http://localhost:3001/api-docs
- **Patient Service**: http://localhost:3002/api-docs

## 🔒 Security

- All sensitive data is encrypted at rest and in transit
- HIPAA compliance measures implemented
- Regular security audits
- Rate limiting on all endpoints
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

## 📊 Monitoring & Logging

- **Application Monitoring**: DataDog APM
- **Error Tracking**: Sentry
- **Log Aggregation**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Metrics**: Prometheus + Grafana
- **Uptime Monitoring**: Pingdom

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and inquiries, please open an issue in the repository.

---

**Built with ❤️ for better healthcare**
