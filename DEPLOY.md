# MediConnect Pro - Production Deployment Guide

**Complete guide for deploying MediConnect Pro to production environments**

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Deployment Options](#deployment-options)
   - [Render.com (Recommended)](#rendercom-recommended)
   - [Docker](#docker-deployment)
   - [Kubernetes](#kubernetes-deployment)
   - [Traditional VPS](#traditional-vps)
4. [Security Configuration](#security-configuration)
5. [Database Setup](#database-setup)
6. [Enterprise Scaling (1,000+ Users)](#enterprise-scaling-1000-users)
7. [Monitoring Setup](#monitoring-setup)
8. [Post-Deployment](#post-deployment)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Pre-Deployment Checklist

Before deploying to production, ensure you have:

### Required
- [ ] **SESSION_SECRET** generated (32-byte hex string)
- [ ] **NODE_ENV** set to `production`
- [ ] Database choice decided (JSON file or PostgreSQL)
- [ ] Domain name configured (if not using Render subdomain)
- [ ] SSL/TLS certificate (automatic with Render, manual for VPS)

### Recommended
- [ ] **Sentry account** for error tracking (https://sentry.io)
- [ ] **Redis instance** for session persistence
- [ ] **Backup strategy** implemented
- [ ] **Monitoring** configured

### Optional
- [ ] **OpenAI API key** for AI features
- [ ] **Anthropic API key** for AI triage
- [ ] **SendGrid/Twilio** for notifications
- [ ] **PostgreSQL database** for enterprise scale

---

## 🔧 Environment Setup

### 1. Copy Environment Template

```bash
cp .env.example .env.production
```

### 2. Generate SESSION_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add it to `.env.production`:

```bash
SESSION_SECRET=your_generated_secret_here
```

### 3. Configure Required Variables

Edit `.env.production`:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=<your_generated_secret>
USE_POSTGRES=false
LOG_LEVEL=info
```

---

## 🚀 Deployment Options

### Render.com (Recommended)

**Best for:** Quick deployment, auto-scaling, zero DevOps

#### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "feat: production ready deployment"
git push origin main
```

#### Step 2: Connect to Render

1. Go to [render.com](https://render.com) and sign up
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`

#### Step 3: Configure Environment Variables

Render will automatically use `render.yaml`, but you can override:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Auto-configured |
| `PORT` | `10000` | Auto-configured |
| `SESSION_SECRET` | Auto-generated | Render generates automatically |
| `SENTRY_DSN` | `https://...` | Optional, add if using Sentry |
| `USE_POSTGRES` | `false` | Set to `true` if adding PostgreSQL |

#### Step 4: Deploy

Click **"Create Web Service"** → Render will:
- Install dependencies (`npm ci`)
- Build the app
- Start the server (`node server.js`)
- Provide a URL: `https://your-app.onrender.com`

#### Step 5: Add PostgreSQL (Optional)

1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Choose a plan (Free tier available)
3. Copy the **Internal Database URL**
4. Add to your Web Service environment variables:
   - `USE_POSTGRES=true`
   - `DATABASE_URL=<your_postgres_url>`

#### Step 6: Configure Custom Domain (Optional)

1. In your Web Service settings, go to **"Custom Domains"**
2. Add your domain name
3. Configure DNS records as shown by Render

---

### Docker Deployment

**Best for:** Consistent environments, self-hosting

#### Step 1: Build Docker Image

```bash
docker build -t mediconnect-pro:latest .
```

#### Step 2: Run Container

```bash
docker run -d \
  --name mediconnect-pro \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  -e USE_POSTGRES=false \
  -v $(pwd)/src/database:/app/src/database \
  mediconnect-pro:latest
```

#### Step 3: With Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - USE_POSTGRES=true
      - DATABASE_URL=postgres://postgres:password@postgres:5432/mediconnect
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=mediconnect
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

Run:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

### Kubernetes Deployment

**Best for:** Large scale, high availability, enterprise

#### Step 1: Create ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mediconnect-config
data:
  NODE_ENV: "production"
  USE_POSTGRES: "true"
  LOG_LEVEL: "info"
  ENABLE_AI_FEATURES: "true"
```

#### Step 2: Create Secrets

```bash
kubectl create secret generic mediconnect-secrets \
  --from-literal=SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  --from-literal=DATABASE_URL="postgres://..." \
  --from-literal=SENTRY_DSN="https://..."
```

#### Step 3: Deploy Application

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mediconnect-pro
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mediconnect-pro
  template:
    metadata:
      labels:
        app: mediconnect-pro
    spec:
      containers:
      - name: mediconnect
        image: your-registry/mediconnect-pro:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: mediconnect-config
        - secretRef:
            name: mediconnect-secrets
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

#### Step 4: Create Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mediconnect-service
spec:
  selector:
    app: mediconnect-pro
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

Apply:

```bash
kubectl apply -f k8s/
```

---

### Traditional VPS

**Best for:** Full control, custom configurations

#### Step 1: Provision Server

Requirements:
- Ubuntu 22.04 LTS or similar
- 2+ GB RAM
- 20+ GB storage
- Node.js 18+ installed

#### Step 2: Clone Repository

```bash
cd /opt
sudo git clone https://github.com/your-repo/mediconnect-pro.git
cd mediconnect-pro
```

#### Step 3: Install Dependencies

```bash
npm ci --production
```

#### Step 4: Configure Environment

```bash
sudo nano /opt/mediconnect-pro/.env.production
```

Add all required variables.

#### Step 5: Setup PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Start application
pm2 start server.js --name mediconnect --env production

# Save process list
pm2 save

# Setup auto-start on boot
pm2 startup
```

#### Step 6: Setup Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Step 7: Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔒 Security Configuration

### 1. Firewall Setup

```bash
# Ubuntu with ufw
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

### 2. Enable 2FA for Admin Accounts

After deployment:
1. Login as admin
2. Go to `/api/2fa/setup`
3. Scan QR code with authenticator app
4. Verify and save backup codes

### 3. Configure Sentry

1. Sign up at [sentry.io](https://sentry.io)
2. Create new project → Select "Node.js"
3. Copy DSN
4. Add to environment: `SENTRY_DSN=https://...@sentry.io/...`

### 4. Review Security Headers

The application automatically sets:
- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

---

## 💾 Database Setup

### JSON File Storage (Default)

**Recommended for:** < 1000 users, simple deployments

✅ **Pros:**
- Zero setup required
- Automatic backups easy
- Perfect for demos

⚠️ **Cons:**
- Not suitable for high traffic
- Limited to single server
- Manual scaling required

**Backup command:**

```bash
node scripts/backup-database.js --compress --keep=30
```

Schedule with cron:

```bash
# Backup daily at 2 AM
0 2 * * * cd /opt/mediconnect-pro && node scripts/backup-database.js --compress
```

---

### PostgreSQL (Enterprise)

**Recommended for:** > 1000 users, high availability

#### Setup on Render

1. Add PostgreSQL addon in Render dashboard
2. Copy internal connection URL
3. Set environment variables:
   ```
   USE_POSTGRES=true
   DATABASE_URL=<postgres_url>
   ```

#### Setup Locally

```bash
# Install PostgreSQL
sudo apt install postgresql

# Create database
sudo -u postgres createdb mediconnect

# Run migrations
npm run db:migrate
```

#### Migrate from JSON to PostgreSQL

```bash
node src/database/migrate-to-postgres.js
```

---

## 🚀 Enterprise Scaling (1,000+ Users)

**For production deployments with 1,000-10,000+ concurrent users**

MediConnect Pro includes enterprise-grade optimizations for high-traffic production environments. This section covers the complete setup for maximum performance and reliability.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                           │
│                     (Nginx/CloudFlare)                       │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐       ┌───▼────┐
│ App    │       │ App    │        Multiple instances
│ Server │       │ Server │        (horizontal scaling)
│ Node 1 │       │ Node 2 │
└───┬────┘       └───┬────┘
    │                │
    └────────┬───────┘
             │
    ┌────────▼────────┐
    │   PostgreSQL    │      Optimized connection pool
    │   (Primary)     │      Performance indexes
    │                 │      Query caching
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │     Redis       │      Session persistence
    │   (Cluster)     │      Query result caching
    └─────────────────┘
```

### Capacity Targets

| Configuration | Concurrent Users | Total Users | Response Time |
|--------------|------------------|-------------|---------------|
| **Standard** | 1,000 - 2,500 | 50,000+ | < 200ms |
| **Pro** | 2,500 - 5,000 | 100,000+ | < 150ms |
| **Enterprise** | 5,000 - 10,000+ | 500,000+ | < 100ms |

---

### Step 1: PostgreSQL Setup

#### 1.1 Provision PostgreSQL Database

**Render.com:**
```bash
# In Render Dashboard:
# 1. New+ → PostgreSQL
# 2. Select plan: Standard ($50/mo) or Pro ($120/mo)
# 3. Copy Internal Database URL
```

**Alternatives:**
- **Managed Services**: AWS RDS, Google Cloud SQL, Azure Database
- **Self-hosted**: PostgreSQL 15+ on dedicated server (4+ CPU, 8+ GB RAM)

#### 1.2 Configure Environment Variables

Add to your environment (Render Dashboard or `.env.production`):

```bash
USE_POSTGRES=true
DATABASE_URL=postgres://user:pass@host:5432/mediconnect

# Connection Pool Optimization (defaults shown)
POSTGRES_POOL_MAX=30        # Max connections per app instance
POSTGRES_POOL_MIN=5         # Keep 5 connections warm
POSTGRES_IDLE_TIMEOUT=30000 # 30 seconds
POSTGRES_CONNECTION_TIMEOUT=10000  # 10 seconds
```

**Pool sizing guide:**
- **Standard Plan (1 instance):** MAX=30, MIN=5
- **Pro Plan (2-3 instances):** MAX=20, MIN=5 per instance
- **Enterprise (5+ instances):** MAX=15, MIN=3 per instance

> **Note:** Total connections = instances × POSTGRES_POOL_MAX
> Ensure your PostgreSQL plan supports total connections needed.

#### 1.3 Run Database Migrations

Migrations run automatically on deployment via `render.yaml`:

```yaml
buildCommand: npm ci --production --verbose && npm run db:migrate
```

Manual migration (if needed):

```bash
npm run db:migrate
```

This creates:
- Base schema (001_initial_schema.sql)
- Performance indexes (002_performance_indexes.sql)

#### 1.4 Verify Performance Indexes

Check indexes are created:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

Expected indexes:
- **Pagination:** created_at DESC on all major tables
- **Composite:** patient_id + date, doctor_id + date
- **Partial:** Active appointments/prescriptions only
- **Full-text:** GIN indexes for search functionality

---

### Step 2: Redis Setup

#### 2.1 Provision Redis Instance

**Recommended Providers:**

1. **Upstash** (Recommended for Render)
   - Free tier: 10,000 commands/day
   - Pay-as-you-go: $0.2/100K commands
   - Global edge caching
   - Sign up: https://upstash.com

2. **Redis Cloud** (Redis Labs)
   - Free tier: 30MB
   - Standard: $5-15/month
   - Sign up: https://redis.com/try-free/

3. **Render Redis** (if available)
   - Integrated with your Render account
   - Regional deployment

#### 2.2 Configure Environment Variables

Add Redis connection URL:

```bash
REDIS_URL=redis://default:password@redis-endpoint:6379
```

**Alternative configuration:**

```bash
REDIS_HOST=redis-endpoint.cloud.redislabs.com
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

#### 2.3 Enable Redis Features

Redis automatically enables:
- **Session persistence** (24-hour TTL)
- **Query result caching** (5-minute TTL)
- **Connection pool monitoring**

Verify in logs:

```
✅ Redis session store configured
✅ Sessions will persist across server restarts
✅ Ready for production scale (1,000+ concurrent users)
```

---

### Step 3: Query Caching

Query caching is automatically enabled when Redis is configured.

#### Cache Behavior

**What gets cached:**
- Patient records (5 min TTL)
- Vital signs history (5 min TTL)
- Appointment lists (5 min TTL)
- Prescription lists (5 min TTL)

**Cache invalidation:**
- Automatic on INSERT/UPDATE/DELETE
- Pattern-based (e.g., `patient:123:*`)

**Usage in routes:**

```javascript
const queryCache = require('../src/utils/query-cache');

// Cache patient data
app.get('/api/patients/:id', async (req, res) => {
  const cacheKey = `patient:${req.params.id}`;

  // Try cache first
  let patient = await queryCache.get(cacheKey);

  if (!patient) {
    // Cache miss - query database
    patient = await db.getPatientById(req.params.id);

    // Store in cache (5 min TTL)
    await queryCache.set(cacheKey, patient, 300);
  }

  res.json(patient);
});

// Invalidate on update
app.put('/api/patients/:id', async (req, res) => {
  await db.updatePatient(req.params.id, req.body);

  // Invalidate cache
  await queryCache.invalidate(`patient:${req.params.id}*`);

  res.json({ success: true });
});
```

---

### Step 4: Automated Backups

#### 4.1 Local Database Backups

Schedule automated backups:

```bash
# Add to crontab (crontab -e):

# Daily PostgreSQL backup at 2 AM
0 2 * * * cd /opt/mediconnect-pro && node scripts/backup-database.js --compress --keep=30

# Weekly backup to external storage
0 3 * * 0 cd /opt/mediconnect-pro && node scripts/backup-database.js --compress --output=/mnt/external-backup
```

#### 4.2 S3 Cloud Backups

Install AWS SDK:

```bash
npm install @aws-sdk/client-s3
```

Configure S3 credentials:

```bash
# AWS S3
AWS_S3_BUCKET=mediconnect-backups
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Backblaze B2 (S3-compatible, cheaper alternative)
S3_BUCKET=mediconnect-backups
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.us-east-1.backblazeb2.com
S3_ACCESS_KEY_ID=your_key_id
S3_SECRET_ACCESS_KEY=your_app_key

# Optional: Encryption
BACKUP_ENCRYPTION_KEY=<32-byte-hex-key>
```

Run S3 backups:

```bash
# Manual backup with compression and encryption
node scripts/backup-to-s3.js --compress --encrypt --keep=90

# Add to crontab for daily automated backups
0 3 * * * cd /opt/mediconnect-pro && node scripts/backup-to-s3.js --compress --keep=90
```

**Backup retention:**
- Keep 90 days in S3 (default)
- Older backups automatically deleted
- Encrypted backups require BACKUP_ENCRYPTION_KEY to restore

**Storage costs (Backblaze B2):**
- Storage: $0.005/GB/month (~$5/month for 1TB)
- Download: $0.01/GB (first 3x free)
- Much cheaper than AWS S3 for backups

---

### Step 5: Horizontal Scaling

#### 5.1 Multiple App Instances (Render)

**Update render.yaml:**

```yaml
services:
  - type: web
    name: mediconnect-pro
    env: node
    plan: standard  # Or pro
    numInstances: 3  # <-- Add this for multiple instances
    buildCommand: npm ci --production --verbose && npm run db:migrate
    startCommand: node server.js
    envVars:
      - key: USE_POSTGRES
        value: true
      - key: REDIS_URL
        sync: false  # Add manually in dashboard
```

> **Note:** Multiple instances require paid plan ($25+/month)

#### 5.2 Adjust Connection Pool

With multiple instances, reduce pool size per instance:

```bash
# 3 instances × 15 connections = 45 total
POSTGRES_POOL_MAX=15
POSTGRES_POOL_MIN=3
```

#### 5.3 Verify Load Balancing

Render automatically load balances across instances. Check logs:

```bash
# Render CLI
render logs -s mediconnect-pro --tail 100

# You should see different instance IDs handling requests
```

---

### Step 6: Performance Optimization

#### 6.1 Enable Compression

Already enabled by default in `server.js`:

```javascript
app.use(compression({ level: 6 }));
```

#### 6.2 Static Asset Caching

Configured in `server.js` with aggressive caching:

```javascript
// HTML: Always check for updates
app.use('/*.html', express.static('public', {
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-cache, must-revalidate');
  }
}));

// CSS/JS: 1 week cache
app.use(/\.(css|js)$/, express.static('public', {
  maxAge: '7d',
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  }
}));

// Images: 1 month cache
app.use(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/, express.static('public', {
  maxAge: '30d',
  immutable: true
}));
```

#### 6.3 Monitor Pool Utilization

PostgreSQL pool stats logged every 5 minutes in production:

```json
{
  "message": "PostgreSQL connection pool stats",
  "database": "postgresql",
  "total": 30,
  "idle": 12,
  "waiting": 0,
  "utilization": "60%"
}
```

**Tuning guidelines:**
- **Utilization < 50%:** Reduce POSTGRES_POOL_MAX to free resources
- **Utilization > 80%:** Increase POSTGRES_POOL_MAX or add instances
- **Waiting > 0:** Pool exhausted - increase POSTGRES_POOL_MAX immediately

---

### Performance Benchmarks

**Expected query performance with indexes:**

| Query Type | Before Indexes | After Indexes | Improvement |
|-----------|----------------|---------------|-------------|
| Dashboard load | 500-1000ms | 20-50ms | **20-50x faster** |
| Paginated lists | 200-500ms | 15-25ms | **10-20x faster** |
| Search queries | 1000-3000ms | 20-30ms | **50-100x faster** |
| Filtered views | 300-800ms | 10-20ms | **30-40x faster** |

**Response time targets:**

- **p50 (median):** < 100ms
- **p95:** < 300ms
- **p99:** < 500ms

Monitor with Sentry Performance or New Relic.

---

### Scaling Checklist

Before going live with 1,000+ users:

- [ ] PostgreSQL with performance indexes deployed
- [ ] Redis cluster configured and connected
- [ ] Connection pool size optimized for instance count
- [ ] Query caching enabled and tested
- [ ] Automated backups to S3 configured
- [ ] Multiple app instances running (horizontal scaling)
- [ ] Health check endpoints verified (`/health`, `/health/ready`)
- [ ] Performance monitoring enabled (Sentry/New Relic)
- [ ] Load testing completed (1,000+ concurrent requests)
- [ ] Database backup/restore tested
- [ ] Redis failover tested
- [ ] Documentation updated with production credentials

---

## 📊 Monitoring Setup

### Health Check Endpoints

- `/health` - Full health check
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe

### Sentry Error Tracking

1. Configure `SENTRY_DSN` in environment
2. Errors automatically reported
3. View at sentry.io dashboard

### Performance Monitoring

Sentry includes:
- Request timing
- Database query performance
- API response times
- Error rates

---

## ✅ Post-Deployment

### 1. Verify Deployment

```bash
# Check health
curl https://your-domain.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-12-08T...",
  "version": {...},
  "uptime": {...},
  "memory": {...},
  "components": {...}
}
```

### 2. Create Admin Account

Default credentials (change immediately):
- Email: `admin@mediconnect.demo`
- Password: `Demo2024!Admin`

### 3. Enable 2FA

1. Login as admin
2. Navigate to 2FA setup
3. Scan QR code
4. Save backup codes securely

### 4. Test All Features

- [ ] Login/logout
- [ ] Patient dashboard
- [ ] Doctor dashboard
- [ ] Admin dashboard
- [ ] Appointments
- [ ] Prescriptions
- [ ] Medical records
- [ ] AI features (if enabled)

---

## 🔄 Backup & Recovery

### Automated Backups

Add to crontab:

```bash
# Daily backup at 2 AM, keep last 30
0 2 * * * cd /opt/mediconnect-pro && node scripts/backup-database.js --compress --keep=30

# Weekly backup to external storage
0 3 * * 0 cd /opt/mediconnect-pro && node scripts/backup-database.js --compress --output=/mnt/backup
```

### Manual Backup

```bash
# JSON database
node scripts/backup-database.js --compress

# PostgreSQL
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Restore from Backup

#### JSON:

```bash
# Uncompress
gunzip backups/mediconnect-backup-*.json.gz

# Restore
cp backups/mediconnect-backup-*.json src/database/database.json
```

#### PostgreSQL:

```bash
psql $DATABASE_URL < backup-20251208.sql
```

---

## 🔧 Troubleshooting

### Server Won't Start

**Check logs:**

```bash
# PM2
pm2 logs mediconnect

# Docker
docker logs mediconnect-pro

# Kubernetes
kubectl logs -f deployment/mediconnect-pro
```

**Common issues:**

1. **Port already in use**
   ```bash
   # Find process using port 3000
   lsof -i :3000
   # Kill it
   kill -9 <PID>
   ```

2. **Database connection failed**
   - Verify `DATABASE_URL` is correct
   - Check PostgreSQL is running
   - Test connection: `psql $DATABASE_URL`

3. **Session secret not set**
   - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Add to environment variables

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart if needed
pm2 restart mediconnect
```

### Database Growing Too Large

**JSON:**
```bash
# Archive old records
node scripts/archive-old-data.js --older-than=90
```

**PostgreSQL:**
```sql
-- Clean old audit logs
DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum database
VACUUM FULL;
```

---

## 📞 Support

- **Documentation:** README.md, CLAUDE.md
- **API Documentation:** API.md
- **Test Coverage:** TEST_COVERAGE_REPORT.md
- **GitHub Issues:** https://github.com/your-repo/issues

---

## 🎉 Conclusion

Your MediConnect Pro instance is now deployed and ready for production use!

**Next Steps:**
1. Configure domain and SSL
2. Setup monitoring and alerts
3. Configure automated backups
4. Train staff on system usage
5. Monitor performance metrics

For questions or issues, refer to the documentation or open a GitHub issue.

**Happy deploying! 🚀**
