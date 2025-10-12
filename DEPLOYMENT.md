# MediConnect Pro - Deployment Guide

Complete guide for deploying the MediConnect Pro telemedicine platform.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx (Port 80)                      │
│                    Reverse Proxy + Load Balancer             │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐               ┌──────────────┐
│  Web Frontend │               │ API Gateway  │
│  Next.js:3100 │               │ NestJS:3000  │
└───────────────┘               └──────┬───────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌────────────┐    ┌────────────┐    ┌────────────┐
            │Auth Service│    │Patient Svc │    │Vitals Svc  │
            │  :3001     │    │  :3002     │    │  :3003     │
            └─────┬──────┘    └─────┬──────┘    └─────┬──────┘
                  │                 │                  │
            ┌────────────┐    ┌────────────┐    ┌────────────┐
            │Consultation│    │  ML Service│    │            │
            │Svc :3004   │    │  :8000     │    │            │
            └─────┬──────┘    └─────┬──────┘    └────────────┘
                  │                 │
    ┌─────────────┴─────────────────┴─────────────┐
    │                                              │
    ▼                                              ▼
┌──────────┐  ┌──────────┐  ┌───────┐  ┌──────────┐
│PostgreSQL│  │ MongoDB  │  │ Redis │  │  Kafka   │
│  :5432   │  │  :27017  │  │ :6379 │  │  :9092   │
└──────────┘  └──────────┘  └───────┘  └──────────┘
```

## Prerequisites

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Node.js** 18+ (for local development)
- **Python** 3.11+ (for ML service development)
- **Minimum RAM**: 8GB
- **Disk Space**: 20GB

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/mediconnect-pro.git
cd mediconnect-pro
```

### 2. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your configuration
nano .env
```

### 3. Start All Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Initialize Databases

```bash
# Create database tables (automatic on first start)
# Auth Service will run migrations automatically

# Verify databases
docker exec -it mediconnect-postgres psql -U postgres -l
docker exec -it mediconnect-mongodb mongosh
```

### 5. Access Applications

- **Web Frontend**: http://localhost:80 (via Nginx)
- **API Gateway**: http://localhost:3000
- **Swagger Docs**:
  - Auth Service: http://localhost:3001/api/docs
  - Patient Service: http://localhost:3002/api/docs
  - Vitals Service: http://localhost:3003/api/docs
  - Consultation Service: http://localhost:3004/api/docs
  - ML Service: http://localhost:8000/api/docs

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Nginx | 80 | Reverse proxy |
| API Gateway | 3000 | API Gateway |
| Auth Service | 3001 | Authentication |
| Patient Service | 3002 | Patient management |
| Vitals Service | 3003 | Vital signs monitoring |
| Consultation Service | 3004 | Video consultations |
| ML Service | 8000 | Machine learning |
| Web Frontend | 3100 | Next.js frontend |
| PostgreSQL | 5432 | Relational database |
| MongoDB | 27017 | Document database |
| Redis | 6379 | Cache |
| Kafka | 9092 | Message broker |
| Zookeeper | 2181 | Kafka coordination |
| MQTT Broker | 1883 | IoT devices |

## Docker Commands

### Start/Stop Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d auth-service

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart service
docker-compose restart patient-service
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service

# Last 100 lines
docker-compose logs --tail=100 vitals-service
```

### Scale Services

```bash
# Scale patient service to 3 instances
docker-compose up -d --scale patient-service=3
```

### Rebuild Services

```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build auth-service

# Rebuild without cache
docker-compose build --no-cache ml-service
```

## Configuration

### Environment Variables

**Database Configuration**
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
MONGO_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD=your-mongo-password
```

**JWT Configuration**
```env
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

**MQTT Configuration**
```env
MQTT_USERNAME=mediconnect
MQTT_PASSWORD=your-mqtt-password
```

**Twilio (Optional)**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your-twilio-secret
```

### Nginx Configuration

Edit `config/nginx.conf` for:
- SSL/TLS certificates
- Rate limiting
- Custom domains
- Load balancing

### MQTT Broker

Edit `config/mosquitto.conf` for:
- Authentication
- WebSocket support
- Message persistence

## Database Management

### PostgreSQL

**Access PostgreSQL**
```bash
docker exec -it mediconnect-postgres psql -U postgres
```

**List databases**
```sql
\l
```

**Connect to database**
```sql
\c mediconnect_auth
```

**List tables**
```sql
\dt
```

**Backup database**
```bash
docker exec mediconnect-postgres pg_dump -U postgres mediconnect_auth > backup.sql
```

**Restore database**
```bash
cat backup.sql | docker exec -i mediconnect-postgres psql -U postgres mediconnect_auth
```

### MongoDB

**Access MongoDB**
```bash
docker exec -it mediconnect-mongodb mongosh -u root -p mongo123
```

**Show databases**
```javascript
show dbs
```

**Use database**
```javascript
use mediconnect_vitals
```

**Show collections**
```javascript
show collections
```

**Backup MongoDB**
```bash
docker exec mediconnect-mongodb mongodump --username root --password mongo123 --out /backup
```

## Monitoring

### Health Checks

```bash
# Check all services health
curl http://localhost/health

# Individual services
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:8000/health
```

### Docker Stats

```bash
# View resource usage
docker stats

# Specific service
docker stats mediconnect-auth-service
```

### Kafka Topics

```bash
# List topics
docker exec mediconnect-kafka kafka-topics --list --bootstrap-server localhost:9092

# Create topic
docker exec mediconnect-kafka kafka-topics --create \
  --topic patient.created \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1

# Describe topic
docker exec mediconnect-kafka kafka-topics --describe \
  --topic patient.created \
  --bootstrap-server localhost:9092

# Consume messages
docker exec mediconnect-kafka kafka-console-consumer \
  --topic patient.created \
  --bootstrap-server localhost:9092 \
  --from-beginning
```

## Production Deployment

### 1. Security Hardening

**Change default passwords**
```bash
# Generate secure passwords
openssl rand -base64 32
```

**Enable SSL/TLS**
```bash
# Generate SSL certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout config/ssl/key.pem \
  -out config/ssl/cert.pem
```

**Update nginx.conf** to enable HTTPS server block.

### 2. Environment Setup

```bash
# Production environment
export NODE_ENV=production
export ENVIRONMENT=production

# Update .env file
nano .env
```

### 3. Build Optimized Images

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Push to registry
docker-compose push
```

### 4. Database Migrations

```bash
# Run migrations
docker exec mediconnect-auth-service npm run migration:run
docker exec mediconnect-patient-service npm run migration:run
docker exec mediconnect-consultation-service npm run migration:run
```

### 5. Monitoring & Logging

**Prometheus + Grafana**
```yaml
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus
  volumes:
    - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana
  ports:
    - "3200:3000"
```

**ELK Stack (Elasticsearch, Logstash, Kibana)**
```bash
# For centralized logging
docker-compose -f docker-compose.logging.yml up -d
```

### 6. Backup Strategy

**Automated Backups**
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# PostgreSQL backup
docker exec mediconnect-postgres pg_dumpall -U postgres > backups/postgres_$DATE.sql

# MongoDB backup
docker exec mediconnect-mongodb mongodump --out /backups/mongodb_$DATE

# Compress
tar -czf backups/mediconnect_$DATE.tar.gz backups/*_$DATE*
EOF

chmod +x backup.sh

# Schedule with cron
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

## Kubernetes Deployment

### 1. Create Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mediconnect
```

```yaml
# k8s/auth-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: mediconnect
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: mediconnect/auth-service:1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
```

### 2. Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check status
kubectl get pods -n mediconnect
kubectl get services -n mediconnect

# View logs
kubectl logs -f deployment/auth-service -n mediconnect
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs service-name

# Check if port is in use
netstat -tulpn | grep :3001

# Restart service
docker-compose restart service-name
```

### Database Connection Issues

```bash
# Check if database is running
docker-compose ps postgres

# Check connection from service
docker exec mediconnect-auth-service nc -zv postgres 5432
```

### Out of Memory

```bash
# Increase Docker memory limit
# Docker Desktop > Settings > Resources > Memory

# Check memory usage
docker stats --no-stream
```

### Network Issues

```bash
# Check network
docker network ls
docker network inspect mediconnect

# Recreate network
docker-compose down
docker network rm mediconnect_default
docker-compose up -d
```

## Performance Tuning

### Database Optimization

**PostgreSQL**
```sql
-- Add indexes
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_vitals_patient_timestamp ON vital_signs(patient_id, timestamp DESC);

-- Vacuum and analyze
VACUUM ANALYZE;
```

**MongoDB**
```javascript
// Create indexes
db.vital_signs.createIndex({ patientId: 1, timestamp: -1 })
db.vital_signs.createIndex({ patientId: 1, type: 1, timestamp: -1 })
```

### Caching Strategy

```bash
# Redis cache configuration
# Increase maxmemory
docker exec mediconnect-redis redis-cli CONFIG SET maxmemory 2gb
docker exec mediconnect-redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Load Balancing

Update `docker-compose.yml` to scale services:
```yaml
deploy:
  replicas: 3
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
```

## Maintenance

### Update Services

```bash
# Pull latest images
docker-compose pull

# Restart with new images
docker-compose up -d
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Complete cleanup
docker system prune -a --volumes
```

## Support

For deployment issues:
- Check logs: `docker-compose logs -f`
- Review documentation
- Contact DevOps team

## License

Proprietary - MediConnect Pro
