# MediConnect Pro - PostgreSQL Database Guide

This guide explains how to set up, migrate, and manage the PostgreSQL database for MediConnect Pro.

## Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [Database Schema](#database-schema)
- [Migration Commands](#migration-commands)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Database Operations](#database-operations)
- [Troubleshooting](#troubleshooting)

## Overview

MediConnect Pro uses PostgreSQL as its primary database for production environments, with an optional JSON file database for quick demos and development.

### Key Features
- **Connection Pooling**: Efficient connection management with configurable pool sizes
- **Automatic Migrations**: Track and execute database schema changes
- **SSL Support**: Secure connections for cloud deployments
- **ACID Transactions**: Data integrity for critical healthcare operations
- **Indexes**: Optimized for common query patterns
- **Audit Logging**: Track important system events for compliance

### Technology Stack
- **PostgreSQL 15**: Latest stable version with advanced features
- **node-postgres (pg)**: Robust PostgreSQL client for Node.js
- **Docker**: Easy local development setup

## Quick Start

### 1. Start PostgreSQL with Docker

```bash
# Start PostgreSQL container
npm run docker:postgres

# Or manually with docker-compose
docker-compose --profile postgres up -d
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure PostgreSQL settings:

```bash
# For local development
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mediconnect
POSTGRES_USER=mediconnect_user
POSTGRES_PASSWORD=dev_password_2024

# Enable PostgreSQL (instead of JSON file)
USE_POSTGRES=true
```

### 3. Run Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Or manually
node src/database/migrate.js run
```

### 4. Start the Application

```bash
npm start
```

## Database Schema

### Core Tables

#### `users`
Stores authentication and basic user information for all roles (admin, doctor, patient).

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- bcrypt hashed
    role VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);
```

#### `patients`
Extended medical information for patient users.

```sql
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    blood_type VARCHAR(5),
    allergies TEXT,
    conditions TEXT,
    insurance_provider VARCHAR(255),
    insurance_member_id VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    -- ... more fields
);
```

#### `vital_signs`
Time-series vital sign measurements from devices or manual entry.

```sql
CREATE TABLE vital_signs (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    heart_rate INTEGER,
    blood_pressure VARCHAR(20),
    temperature DECIMAL(4, 2),
    oxygen_saturation INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    device_source VARCHAR(100),
    -- ... more fields
);
```

#### `appointments`
Scheduled consultations between doctors and patients.

```sql
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    doctor_id INTEGER NOT NULL REFERENCES users(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    type VARCHAR(100) DEFAULT 'Consultation',
    status VARCHAR(50) DEFAULT 'scheduled',
    pre_authorization JSONB, -- Insurance data
    -- ... more fields
);
```

#### `prescriptions`
Medication prescriptions issued by doctors.

```sql
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    doctor_id INTEGER NOT NULL REFERENCES users(id),
    medication VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    pharmacy_id VARCHAR(100),
    -- ... more fields
);
```

### Additional Tables

- **messages**: Patient-doctor secure messaging
- **medical_records**: Clinical notes and medical history
- **sessions**: User session storage
- **audit_log**: Security and compliance audit trail
- **notifications**: System notifications (email, SMS, push)

### Database Views

#### `patient_summary`
Patient information joined with user data for convenient queries.

#### `upcoming_appointments`
Scheduled appointments with patient and doctor names.

#### `active_prescriptions`
Currently active prescriptions with user information.

## Migration Commands

### Run Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Rollback all migrations (DEVELOPMENT ONLY!)
npm run db:migrate:rollback
```

### Manual Migration Commands

```bash
# Run all migrations
node src/database/migrate.js run

# Run a specific migration
node src/database/migrate.js specific 001_initial_schema.sql

# Check which migrations have been executed
node src/database/migrate.js status

# Rollback (drops all tables - dev only)
node src/database/migrate.js rollback
```

### Migration Files

Migrations are stored in `src/database/migrations/`:

- `001_initial_schema.sql` - Creates all tables, indexes, views, and triggers
- `002_seed_demo_data.sql` - Populates database with demo users and sample data

## Local Development

### Option 1: Docker (Recommended)

```bash
# 1. Start PostgreSQL and Redis
npm run docker:postgres

# 2. Set environment variables
cp .env.example .env
# Edit .env and set USE_POSTGRES=true

# 3. Run migrations
npm run db:migrate

# 4. Start application
npm start
```

### Option 2: Local PostgreSQL Installation

```bash
# 1. Install PostgreSQL 15
# macOS: brew install postgresql@15
# Ubuntu: apt-get install postgresql-15

# 2. Create database and user
psql postgres
CREATE DATABASE mediconnect;
CREATE USER mediconnect_user WITH PASSWORD 'dev_password_2024';
GRANT ALL PRIVILEGES ON DATABASE mediconnect TO mediconnect_user;
\q

# 3. Configure .env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mediconnect
POSTGRES_USER=mediconnect_user
POSTGRES_PASSWORD=dev_password_2024
USE_POSTGRES=true

# 4. Run migrations
npm run db:migrate

# 5. Start application
npm start
```

## Production Deployment

### Render.com (PostgreSQL Managed Service)

1. **Create PostgreSQL Database**:
   - Go to Render Dashboard → New → PostgreSQL
   - Choose plan (Starter $7/month recommended)
   - Note the `External Database URL`

2. **Configure Environment Variables** in Render:
   ```
   DATABASE_URL=postgresql://user:password@hostname:port/database
   POSTGRES_SSL=true
   USE_POSTGRES=true
   ```

3. **Run Migrations** (one-time setup):
   ```bash
   # From local machine with DATABASE_URL set
   npm run db:migrate

   # Or via Render Shell
   # Dashboard → Service → Shell → npm run db:migrate
   ```

### Heroku

1. **Add PostgreSQL Addon**:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

2. **Heroku automatically sets `DATABASE_URL`**. Add:
   ```bash
   heroku config:set POSTGRES_SSL=true
   heroku config:set USE_POSTGRES=true
   ```

3. **Run Migrations**:
   ```bash
   heroku run npm run db:migrate
   ```

### AWS RDS

1. **Create RDS PostgreSQL Instance**
2. **Configure Security Group** (allow inbound on port 5432)
3. **Set Environment Variables**:
   ```
   POSTGRES_HOST=your-rds-endpoint.rds.amazonaws.com
   POSTGRES_PORT=5432
   POSTGRES_DB=mediconnect
   POSTGRES_USER=your_username
   POSTGRES_PASSWORD=your_secure_password
   POSTGRES_SSL=true
   USE_POSTGRES=true
   ```
4. **Run Migrations**

## Database Operations

### Connection Pooling

The application uses connection pooling for optimal performance:

```javascript
const db = require('./src/database/postgres');

// Configuration (via environment variables)
POSTGRES_POOL_MAX=20          // Maximum connections
POSTGRES_POOL_MIN=2           // Minimum connections
POSTGRES_IDLE_TIMEOUT=30000   // 30 seconds
POSTGRES_CONNECTION_TIMEOUT=10000 // 10 seconds
```

### Query Examples

```javascript
const db = require('./src/database/postgres');

// Simple query
const users = await db.queryAll('SELECT * FROM users WHERE role = $1', ['doctor']);

// Get single row
const user = await db.queryOne('SELECT * FROM users WHERE email = $1', ['dr.smith@example.com']);

// Insert with RETURNING
const newUser = await db.insert(
  'INSERT INTO users (email, password, role, name) VALUES ($1, $2, $3, $4)',
  ['user@example.com', hashedPassword, 'patient', 'John Doe']
);

// Transaction
await db.transaction(async (client) => {
  await client.query('INSERT INTO users ...');
  await client.query('INSERT INTO patients ...');
  // Both queries commit or rollback together
});
```

### Health Check

```javascript
const db = require('./src/database/postgres');

// Test connection
const connected = await db.testConnection();

// Get pool statistics
const stats = db.getPoolStats();
console.log(`Total: ${stats.total}, Idle: ${stats.idle}, Waiting: ${stats.waiting}`);
```

## Troubleshooting

### Connection Issues

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start PostgreSQL
npm run docker:postgres

# Or check local PostgreSQL
sudo systemctl status postgresql  # Linux
brew services list                # macOS
```

**Problem**: `password authentication failed for user`

**Solution**:
- Check `.env` file has correct `POSTGRES_USER` and `POSTGRES_PASSWORD`
- Ensure user exists in PostgreSQL:
  ```bash
  docker exec -it mediconnect-postgres psql -U postgres
  \du  # List all users
  ```

### Migration Issues

**Problem**: `relation "migrations" does not exist`

**Solution**:
```bash
# The migration script automatically creates this table
# If it doesn't exist, check database permissions
npm run db:migrate
```

**Problem**: Migration fails midway

**Solution**:
```bash
# Check migration status
npm run db:migrate:status

# In development, you can rollback and retry
npm run db:migrate:rollback
npm run db:migrate
```

### Performance Issues

**Problem**: Slow queries

**Solution**:
- Check slow query logs (queries > 1 second are logged)
- Analyze query plans:
  ```sql
  EXPLAIN ANALYZE SELECT * FROM appointments WHERE patient_id = 1;
  ```
- Ensure indexes exist on frequently queried columns
- Increase connection pool size in `.env`:
  ```
  POSTGRES_POOL_MAX=50
  ```

### SSL Certificate Issues

**Problem**: `SSL connection error` in production

**Solution**:
```bash
# Add to .env
POSTGRES_SSL=true

# Or in DATABASE_URL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

## Monitoring

### View Active Connections

```sql
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change
FROM pg_stat_activity
WHERE datname = 'mediconnect';
```

### Check Table Sizes

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Analyze Query Performance

```sql
-- Enable query timing
\timing

-- Analyze query
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM appointments
WHERE patient_id = 1
AND appointment_date >= CURRENT_DATE;
```

## Backup and Restore

### Backup

```bash
# Backup entire database
docker exec mediconnect-postgres pg_dump -U mediconnect_user mediconnect > backup.sql

# Backup with compression
docker exec mediconnect-postgres pg_dump -U mediconnect_user mediconnect | gzip > backup.sql.gz
```

### Restore

```bash
# Restore from backup
docker exec -i mediconnect-postgres psql -U mediconnect_user mediconnect < backup.sql

# Restore from compressed backup
gunzip -c backup.sql.gz | docker exec -i mediconnect-postgres psql -U mediconnect_user mediconnect
```

## Security Best Practices

1. **Strong Passwords**: Use complex passwords for database users
2. **Least Privilege**: Create separate users with minimal permissions
3. **SSL**: Always use SSL in production
4. **Regular Updates**: Keep PostgreSQL version updated
5. **Audit Logs**: Monitor the `audit_log` table
6. **Backups**: Automate daily backups
7. **Connection Limits**: Set appropriate pool sizes
8. **Network Security**: Restrict access to database ports

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/15/)
- [node-postgres Documentation](https://node-postgres.com/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/ddl.html)

---

**Need Help?** Check [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for Redis setup or [CLAUDE.md](./CLAUDE.md) for overall project architecture.
