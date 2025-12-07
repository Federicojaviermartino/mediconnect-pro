# MediConnect Pro - Deployment Guide
## Production Deployment and Configuration

This guide covers the complete deployment process for MediConnect Pro in a production environment with real doctors and patients.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Server Requirements](#server-requirements)
4. [Database Setup (PostgreSQL)](#database-setup-postgresql)
5. [Application Configuration](#application-configuration)
6. [Security Hardening](#security-hardening)
7. [Deployment Options](#deployment-options)
8. [Post-Deployment Configuration](#post-deployment-configuration)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)
10. [Backup and Recovery](#backup-and-recovery)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Knowledge

- Linux command line basics
- Basic understanding of PostgreSQL
- Understanding of environment variables
- Experience with Node.js applications
- Basic networking concepts (DNS, SSL/TLS)

### Required Accounts and Services

- [x] Server/Cloud hosting account (AWS, DigitalOcean, Render, Heroku, etc.)
- [x] Domain name (e.g., mediconnect.yourdomain.com)
- [x] SSL certificate (Let's Encrypt free option available)
- [x] Email service (Gmail, SendGrid, AWS SES, etc.)
- [x] (Optional) AI API keys:
  - OpenAI API key for GPT-4
  - Anthropic API key for Claude

### Development Tools

- Git
- Node.js 18+ and npm
- PostgreSQL client tools
- SSH client
- Text editor (VS Code, nano, vim)

---

## Pre-Deployment Checklist

Before deploying to production:

### Code Readiness

- [ ] All tests passing: `npm test`
- [ ] Test coverage ≥ 66%: `npm test -- --coverage`
- [ ] No security vulnerabilities: `npm audit`
- [ ] Dependencies updated: `npm outdated`
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Backup/restore procedures tested

### Security Audit

- [ ] Default passwords changed
- [ ] Strong password policies configured
- [ ] Rate limiting enabled
- [ ] HTTPS/SSL configured
- [ ] CORS properly configured
- [ ] Input validation in place
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] CSRF protection enabled

### Documentation

- [ ] User manuals ready (Patient, Doctor, Admin)
- [ ] API documentation current
- [ ] Environment variables documented
- [ ] Deployment procedures documented
- [ ] Disaster recovery plan ready

---

## Server Requirements

### Minimum Requirements (Small Deployment: <50 users)

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 50 GB SSD
- **Bandwidth**: 100 GB/month
- **OS**: Ubuntu 20.04 LTS or newer

### Recommended Requirements (Medium Deployment: 50-500 users)

- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **Bandwidth**: 500 GB/month
- **OS**: Ubuntu 22.04 LTS

### Large Deployment (500+ users)

- **CPU**: 8+ cores
- **RAM**: 16+ GB
- **Storage**: 200+ GB SSD
- **Bandwidth**: 1 TB+/month
- **OS**: Ubuntu 22.04 LTS
- **Load Balancer**: Recommended
- **Database**: Separate server recommended

### Software Requirements

```bash
# Node.js 18 or higher
node --version  # Should be v18.x.x or higher

# npm 9 or higher
npm --version

# PostgreSQL 14 or higher
psql --version

# Git
git --version

# PM2 (process manager)
npm install -g pm2
```

---

## Database Setup (PostgreSQL)

### Option 1: Install PostgreSQL on Ubuntu

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo systemctl status postgresql
```

### Option 2: Use Managed Database Service

**Recommended providers**:
- **AWS RDS**: Most features, higher cost
- **DigitalOcean Managed Database**: Good balance
- **Render PostgreSQL**: Simple setup
- **Heroku Postgres**: Easy integration

Benefits of managed services:
- Automatic backups
- High availability
- Automatic updates
- Monitoring included
- No maintenance overhead

### Create Database and User

```bash
# Switch to postgres user
sudo -i -u postgres

# Access PostgreSQL prompt
psql

# Create database
CREATE DATABASE mediconnect_prod;

# Create user with strong password
CREATE USER mediconnect_user WITH PASSWORD 'YourVeryStrongPassword123!';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE mediconnect_prod TO mediconnect_user;

# Exit PostgreSQL
\q

# Exit postgres user
exit
```

### Configure PostgreSQL for Remote Access

If database is on separate server:

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Change listen_addresses
listen_addresses = '*'

# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add line (replace IP with your app server IP)
host    mediconnect_prod    mediconnect_user    YOUR_APP_SERVER_IP/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Test Database Connection

```bash
# From application server
psql -h DATABASE_HOST -U mediconnect_user -d mediconnect_prod

# If successful, you'll see the PostgreSQL prompt
mediconnect_prod=>
```

---

## Application Configuration

### Clone Repository

```bash
# Create application directory
sudo mkdir -p /var/www/mediconnect
sudo chown $USER:$USER /var/www/mediconnect

# Clone repository
cd /var/www/mediconnect
git clone https://github.com/yourusername/mediconnect-pro.git .

# Install dependencies
npm ci --production
```

### Environment Variables Setup

Create production `.env` file:

```bash
# Create .env file
nano /var/www/mediconnect/.env
```

Add the following configuration:

```bash
# ======================
# SERVER CONFIGURATION
# ======================
NODE_ENV=production
PORT=3000

# ======================
# DATABASE CONFIGURATION
# ======================
USE_POSTGRES=true
DATABASE_URL=postgresql://mediconnect_user:YourVeryStrongPassword123!@localhost:5432/mediconnect_prod

# Alternative format:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=mediconnect_prod
# DB_USER=mediconnect_user
# DB_PASSWORD=YourVeryStrongPassword123!

# ======================
# SESSION CONFIGURATION
# ======================
# Generate a strong random secret:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
SESSION_SECRET=your-64-character-random-string-here-replace-this

# ======================
# REDIS CONFIGURATION (Optional but recommended)
# ======================
# For session storage in production
REDIS_URL=redis://localhost:6379

# ======================
# AI SERVICES (Optional)
# ======================
# OpenAI GPT-4 for transcription and notes
OPENAI_API_KEY=sk-your-openai-key-here

# Anthropic Claude for triage
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# ======================
# EMAIL CONFIGURATION
# ======================
# SMTP settings for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-app-specific-password

# Email sender
EMAIL_FROM="MediConnect Pro <noreply@yourdomain.com>"

# ======================
# APPLICATION URLs
# ======================
APP_URL=https://mediconnect.yourdomain.com
API_URL=https://mediconnect.yourdomain.com/api

# ======================
# SECURITY SETTINGS
# ======================
# CORS allowed origins (comma separated)
CORS_ORIGIN=https://mediconnect.yourdomain.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ======================
# LOGGING
# ======================
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/mediconnect/app.log

# ======================
# BACKUP CONFIGURATION
# ======================
BACKUP_PATH=/var/backups/mediconnect
BACKUP_RETENTION_DAYS=30
```

**Security Notes**:
- Never commit `.env` file to git
- Use strong, unique passwords
- Rotate secrets regularly
- Limit access to `.env` file: `chmod 600 .env`

### Run Database Migrations

```bash
# Execute migrations to create tables
npm run db:migrate

# Verify migration status
npm run db:migrate:status
```

Expected output:
```
✓ Migration 001_create_users_table - Applied
✓ Migration 002_create_patients_table - Applied
✓ Migration 003_create_vital_signs_table - Applied
✓ Migration 004_create_appointments_table - Applied
✓ Migration 005_create_prescriptions_table - Applied
```

### Migrate Data from JSON (if applicable)

If you have existing data in JSON format:

```bash
# Backup JSON file first
cp demo-app/database/database.json demo-app/database/database.json.backup

# Run migration script
node demo-app/database/migrate-to-postgres.js
```

### Test Application Locally

```bash
# Start application
npm start

# In another terminal, test health endpoint
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-07T10:00:00Z",
  "components": {
    "database": { "status": "up" }
  }
}
```

---

## Security Hardening

### 1. Configure Firewall (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL only from app server (if on separate server)
sudo ufw allow from YOUR_APP_IP to any port 5432

# Check status
sudo ufw status
```

### 2. Install and Configure Fail2Ban

Protect against brute force attacks:

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Create custom configuration
sudo nano /etc/fail2ban/jail.local
```

Add:
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
```

```bash
# Start Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 3. Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d mediconnect.yourdomain.com

# Certificate will auto-renew
# Test renewal
sudo certbot renew --dry-run
```

### 4. Configure Nginx as Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/mediconnect
```

Add:
```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name mediconnect.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mediconnect.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/mediconnect.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mediconnect.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/mediconnect_access.log;
    error_log /var/log/nginx/mediconnect_error.log;

    # Client upload size (for medical images)
    client_max_body_size 50M;

    # Proxy to Node.js application
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

        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mediconnect /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 5. Configure PM2 for Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
nano ecosystem.config.js
```

Add:
```javascript
module.exports = {
  apps: [{
    name: 'mediconnect-pro',
    script: './server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/mediconnect/pm2-error.log',
    out_file: '/var/log/mediconnect/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

```bash
# Create log directory
sudo mkdir -p /var/log/mediconnect
sudo chown $USER:$USER /var/log/mediconnect

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs

# Monitor application
pm2 monit

# View logs
pm2 logs mediconnect-pro
```

---

## Deployment Options

### Option 1: Traditional VPS (DigitalOcean, Linode, AWS EC2)

**Pros**: Full control, cost-effective at scale
**Cons**: More setup, you manage everything

Follow the complete setup above (database, nginx, PM2, SSL).

### Option 2: Platform as a Service (Render, Heroku)

**Pros**: Simpler deployment, automatic SSL, managed database
**Cons**: Higher cost, less control

#### Render.com Deployment

1. **Create Render account**
2. **Create PostgreSQL database**:
   - Dashboard → New → PostgreSQL
   - Note the `Internal Database URL`

3. **Create Web Service**:
   - Dashboard → New → Web Service
   - Connect GitHub repository
   - Configuration:
     - **Name**: mediconnect-pro
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Starter ($7/month) or higher

4. **Add Environment Variables**:
   - Go to Environment tab
   - Add all variables from `.env` section above
   - Use Internal Database URL for `DATABASE_URL`

5. **Deploy**:
   - Render auto-deploys on git push to main branch
   - Monitor build logs in dashboard

6. **Run Migrations**:
   - Go to Shell tab in dashboard
   - Run: `npm run db:migrate`

#### Heroku Deployment

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create mediconnect-pro

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
heroku config:set USE_POSTGRES=true

# Deploy
git push heroku main

# Run migrations
heroku run npm run db:migrate

# Open app
heroku open
```

### Option 3: Docker Deployment

```bash
# Build Docker image
docker build -t mediconnect-pro:latest .

# Run with docker-compose
docker-compose up -d

# Run migrations
docker exec mediconnect-app npm run db:migrate
```

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  app:
    image: mediconnect-pro:latest
    container_name: mediconnect-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - USE_POSTGRES=true
      - DATABASE_URL=postgresql://mediconnect_user:password@db:5432/mediconnect_prod
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
      - ./backups:/app/backups

  db:
    image: postgres:14
    container_name: mediconnect-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=mediconnect_prod
      - POSTGRES_USER=mediconnect_user
      - POSTGRES_PASSWORD=YourStrongPassword
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backups:/backups

  redis:
    image: redis:7-alpine
    container_name: mediconnect-redis
    restart: unless-stopped
    volumes:
      - redisdata:/data

  nginx:
    image: nginx:alpine
    container_name: mediconnect-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - app

volumes:
  pgdata:
  redisdata:
```

---

## Post-Deployment Configuration

### 1. Change Default Admin Password

```bash
# Access database
psql -h localhost -U mediconnect_user -d mediconnect_prod

# Update admin password (already hashed with bcrypt)
# Generate new hash: node -e "console.log(require('bcrypt').hashSync('NewPassword123!', 10))"
UPDATE users
SET password = '$2b$10$NEW_HASH_HERE'
WHERE email = 'admin@mediconnect.demo';

# Exit
\q
```

### 2. Create Initial Users

Access the application at `https://mediconnect.yourdomain.com` and:

1. Login as admin
2. Navigate to **Users** → **+ New User**
3. Create first doctor account
4. Create first patient account
5. Delete or disable demo users

### 3. Configure Email Service

Test email configuration:
```bash
# Send test email via application
curl -X POST https://mediconnect.yourdomain.com/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com"}'
```

### 4. Setup Monitoring

#### Install monitoring tools:

**Option A: PM2 Plus (Free tier available)**
```bash
pm2 link YOUR_PUBLIC_KEY YOUR_SECRET_KEY
```

**Option B: New Relic**
```bash
npm install newrelic
# Follow New Relic setup instructions
```

**Option C: Datadog**
```bash
# Install Datadog agent
DD_API_KEY=YOUR_KEY DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"
```

### 5. Configure Automated Backups

Create backup script:
```bash
sudo nano /usr/local/bin/mediconnect-backup.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mediconnect"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="mediconnect_prod"
DB_USER="mediconnect_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Application files backup (if needed)
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /var/www/mediconnect/public/uploads

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://your-bucket/backups/
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/mediconnect-backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
```

Add:
```
0 2 * * * /usr/local/bin/mediconnect-backup.sh >> /var/log/mediconnect/backup.log 2>&1
```

### 6. Setup Log Rotation

```bash
sudo nano /etc/logrotate.d/mediconnect
```

Add:
```
/var/log/mediconnect/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Monitoring and Maintenance

### Health Checks

Setup automated health checks:

**Using cron and curl**:
```bash
# Add to crontab
*/5 * * * * curl -f https://mediconnect.yourdomain.com/health || echo "Health check failed" | mail -s "MediConnect Down" admin@yourdomain.com
```

**Using external service**:
- UptimeRobot (free tier: 50 monitors)
- Pingdom
- StatusCake

Configure to monitor:
- Main URL: `https://mediconnect.yourdomain.com/health`
- Check every 5 minutes
- Alert via email/SMS if down

### Performance Monitoring

Monitor key metrics:

**Server Resources**:
```bash
# CPU and Memory
htop

# Disk usage
df -h

# Database size
psql -U mediconnect_user -d mediconnect_prod -c "SELECT pg_size_pretty(pg_database_size('mediconnect_prod'));"
```

**Application Metrics**:
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs --lines 100

# Process info
pm2 info mediconnect-pro
```

**Database Performance**:
```sql
-- Slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Database connections
SELECT count(*) FROM pg_stat_activity;

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Regular Maintenance Tasks

**Daily**:
- [ ] Check health endpoint
- [ ] Review error logs
- [ ] Monitor disk space

**Weekly**:
- [ ] Review user activity logs
- [ ] Check backup success
- [ ] Review security logs
- [ ] Monitor performance metrics

**Monthly**:
- [ ] Update dependencies: `npm outdated`
- [ ] Security audit: `npm audit`
- [ ] Database optimization: `VACUUM ANALYZE`
- [ ] Review and archive old logs
- [ ] Test disaster recovery procedure

**Quarterly**:
- [ ] Review access controls
- [ ] Update SSL certificates (if not auto-renewing)
- [ ] Capacity planning review
- [ ] User feedback review

---

## Backup and Recovery

### Backup Strategy

**3-2-1 Rule**:
- **3** copies of data
- **2** different storage types
- **1** offsite copy

### Automated Database Backups

Already configured in cron job above. Verify:
```bash
# Check cron is running
sudo systemctl status cron

# List backups
ls -lh /var/backups/mediconnect/

# Test restore (to test database)
gunzip < /var/backups/mediconnect/db_backup_YYYYMMDD_HHMMSS.sql.gz | psql -U mediconnect_user mediconnect_test
```

### Manual Backup

```bash
# Full database backup
pg_dump -U mediconnect_user mediconnect_prod > backup_$(date +%Y%m%d).sql

# Backup specific tables
pg_dump -U mediconnect_user -t users -t patients mediconnect_prod > users_patients_backup.sql

# Backup with data only (no schema)
pg_dump -U mediconnect_user --data-only mediconnect_prod > data_only_backup.sql
```

### Disaster Recovery Procedure

**Scenario: Complete server failure**

1. **Provision new server** with same specs
2. **Install dependencies** (Node.js, PostgreSQL, Nginx)
3. **Restore database**:
   ```bash
   # Create database
   createdb -U mediconnect_user mediconnect_prod

   # Restore from backup
   gunzip < db_backup_LATEST.sql.gz | psql -U mediconnect_user mediconnect_prod
   ```
4. **Deploy application** (follow deployment steps above)
5. **Restore environment variables** from secure storage
6. **Configure Nginx and SSL**
7. **Start application** with PM2
8. **Verify functionality**:
   - Health check: `/health`
   - Login as admin
   - Test critical features
9. **Update DNS** if IP changed
10. **Monitor logs** for 24 hours

**Recovery Time Objective (RTO)**: 4 hours
**Recovery Point Objective (RPO)**: 24 hours (daily backups)

### Test Recovery Process

**IMPORTANT**: Test recovery quarterly to ensure backups work!

```bash
# Create test environment
createdb mediconnect_test

# Restore latest backup
gunzip < /var/backups/mediconnect/db_backup_LATEST.sql.gz | psql mediconnect_test

# Verify data
psql mediconnect_test -c "SELECT COUNT(*) FROM users;"
psql mediconnect_test -c "SELECT COUNT(*) FROM patients;"

# Drop test database
dropdb mediconnect_test
```

---

## Troubleshooting

### Application Won't Start

**Check logs**:
```bash
pm2 logs mediconnect-pro --lines 50
tail -f /var/log/mediconnect/app.log
```

**Common issues**:
1. **Port already in use**:
   ```bash
   sudo lsof -i :3000
   # Kill process using port
   sudo kill -9 PID
   ```

2. **Database connection failed**:
   ```bash
   # Test connection
   psql -h localhost -U mediconnect_user -d mediconnect_prod
   # Check DATABASE_URL in .env
   ```

3. **Missing environment variables**:
   ```bash
   # Verify .env file exists
   ls -la /var/www/mediconnect/.env
   # Check required variables are set
   cat /var/www/mediconnect/.env | grep -E "SESSION_SECRET|DATABASE_URL"
   ```

### High Memory Usage

```bash
# Check memory usage
free -h
pm2 monit

# Restart application
pm2 restart mediconnect-pro

# If issue persists, increase server RAM or optimize queries
```

### Database Performance Issues

```sql
-- Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- Kill long-running query
SELECT pg_terminate_backend(PID);

-- Optimize database
VACUUM ANALYZE;
REINDEX DATABASE mediconnect_prod;
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test renewal process
sudo certbot renew --dry-run
```

### Application Errors After Update

```bash
# Rollback to previous version
git log --oneline  # Find previous commit hash
git reset --hard COMMIT_HASH

# Reinstall dependencies
rm -rf node_modules
npm ci --production

# Restart application
pm2 restart mediconnect-pro
```

---

## Security Best Practices

### Regular Security Audits

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically when possible
npm audit fix

# Update dependencies
npm update
```

### Access Control

- Use SSH keys instead of passwords
- Disable root SSH login
- Use sudo for privileged operations
- Implement principle of least privilege
- Regular password rotation
- Enable 2FA for all admin accounts

### Network Security

- Use firewall (UFW)
- Close unused ports
- Use VPN for database access
- Implement DDoS protection (Cloudflare)
- Regular security updates: `sudo apt update && sudo apt upgrade`

### Data Security

- Encrypt database at rest
- Use HTTPS everywhere
- Sanitize all user inputs
- Regular backups with encryption
- Secure API keys (never in code)
- Log access to sensitive data

---

## Support and Resources

### Getting Help

- **Documentation**: This guide and user manuals
- **GitHub Issues**: Report bugs and request features
- **Email Support**: admin-support@mediconnect.com
- **Community**: Join our Slack channel

### Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

## Deployment Checklist

Use this checklist for your deployment:

### Pre-Deployment

- [ ] Tests passing (66%+ coverage)
- [ ] Security audit clean
- [ ] Database migrations ready
- [ ] Environment variables documented
- [ ] Backups tested
- [ ] User manuals ready

### Deployment

- [ ] Server provisioned
- [ ] PostgreSQL installed and configured
- [ ] Application cloned and dependencies installed
- [ ] Environment variables configured
- [ ] Database migrations executed
- [ ] Nginx configured with SSL
- [ ] PM2 configured and running
- [ ] Firewall rules configured
- [ ] Domain DNS configured

### Post-Deployment

- [ ] Health check passing
- [ ] Default passwords changed
- [ ] Initial admin account created
- [ ] Email configuration tested
- [ ] Monitoring configured
- [ ] Automated backups configured
- [ ] Log rotation configured
- [ ] Disaster recovery tested

### Go-Live

- [ ] Notify users of system availability
- [ ] Monitor for 24 hours continuously
- [ ] User training completed
- [ ] Support channels ready
- [ ] Celebrate! 🎉

---

**Document Version**: 1.0
**Last Updated**: December 2025
**MediConnect Pro** - Production Deployment Guide

For questions or issues during deployment, contact: devops@mediconnect.com
