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
6. [Monitoring Setup](#monitoring-setup)
7. [Post-Deployment](#post-deployment)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)

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
