# 🚂 Railway Deployment Guide

This guide will help you deploy MediConnect Pro to Railway for a live demo accessible to clients without sharing the source code.

## 📋 Prerequisites

- Railway account (free): https://railway.app
- GitHub account with this repository
- 10 minutes of your time

## 🚀 Quick Deploy (Option 1 - Recommended)

### Deploy with One Click

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/mediconnect-pro)

This will automatically:
- Create all required services
- Set up databases
- Configure environment variables
- Deploy the application

**⏱️ Deployment time: ~5-7 minutes**

## 🛠️ Manual Deploy (Option 2)

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose `mediconnect-pro` repository
5. Click **"Deploy Now"**

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically create the database
4. Note the connection details

### Step 3: Add MongoDB Database

1. Click **"+ New"** again
2. Select **"Database"** → **"MongoDB"**
3. Railway will provision MongoDB
4. Note the connection string

### Step 4: Add Redis

1. Click **"+ New"**
2. Select **"Database"** → **"Redis"**
3. Railway will provision Redis

### Step 5: Configure Environment Variables

Click on your main service and add these environment variables:

#### Required Variables

```bash
# Node Environment
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-this
REFRESH_TOKEN_EXPIRES_IN=7d

# PostgreSQL (Railway provides these automatically)
POSTGRES_HOST=${{Postgres.RAILWAY_PRIVATE_DOMAIN}}
POSTGRES_PORT=${{Postgres.RAILWAY_TCP_PROXY_PORT}}
POSTGRES_USER=${{Postgres.PGUSER}}
POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}
POSTGRES_DB_AUTH=mediconnect_auth
POSTGRES_DB_PATIENTS=mediconnect_patients
POSTGRES_DB_CONSULTATIONS=mediconnect_consultations

# MongoDB (Railway provides these automatically)
MONGODB_URI=${{MongoDB.MONGO_URL}}

# Redis (Railway provides these automatically)
REDIS_HOST=${{Redis.RAILWAY_PRIVATE_DOMAIN}}
REDIS_PORT=${{Redis.RAILWAY_TCP_PROXY_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}

# Frontend URLs (Update with your Railway domain)
FRONTEND_URL=https://${{RAILWAY_STATIC_URL}}
CORS_ORIGINS=https://${{RAILWAY_STATIC_URL}}

# Service URLs (Internal)
API_GATEWAY_URL=http://api-gateway.railway.internal:3000
AUTH_SERVICE_URL=http://auth-service.railway.internal:3001
PATIENT_SERVICE_URL=http://patient-service.railway.internal:3002
VITALS_SERVICE_URL=http://vitals-service.railway.internal:3003
CONSULTATION_SERVICE_URL=http://consultation-service.railway.internal:3004
ML_SERVICE_URL=http://ml-service.railway.internal:8000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_SALT_ROUNDS=10
```

### Step 6: Deploy Each Service

Railway will automatically detect the services from your `docker-compose.yml`. If not:

1. Create a new service for each microservice
2. Set the root directory to the service folder (e.g., `services/auth-service`)
3. Railway will auto-detect the Dockerfile
4. Deploy

Services to deploy:
- `api-gateway`
- `auth-service`
- `patient-service`
- `vitals-service`
- `consultation-service`
- `ml-service`
- `web-frontend`

### Step 7: Configure Networking

1. Click on each service
2. Go to **"Settings"** → **"Networking"**
3. Generate a public domain for:
   - `api-gateway` (main API)
   - `web-frontend` (main app)

### Step 8: Seed Demo Data

After deployment is complete:

```bash
# Install dependencies locally
npm install

# Set the API URL
export API_URL=https://your-api-gateway.railway.app

# Run the seed script
npx ts-node scripts/seed-demo-data.ts
```

## 🌐 Access Your Demo

After deployment, you'll have URLs like:

- **Web Application**: `https://mediconnect-pro-web.up.railway.app`
- **API Gateway**: `https://mediconnect-pro-api.up.railway.app`
- **API Documentation**: `https://mediconnect-pro-api.up.railway.app/api-docs`

## 👥 Demo Credentials

After running the seed script, use these credentials:

### Admin Access
```
Email: admin@mediconnect.demo
Password: Demo2024!Admin
```

### Doctor Access
```
Email: dr.smith@mediconnect.demo
Password: Demo2024!Doctor
```

### Patient Access
```
Email: john.doe@mediconnect.demo
Password: Demo2024!Patient
```

## 📊 Monitoring

Railway provides built-in monitoring:

1. **Logs**: View real-time logs for each service
2. **Metrics**: CPU, Memory, Network usage
3. **Deployments**: Track all deployments
4. **Observability**: Request traces and errors

## 💰 Cost Estimation

Railway pricing (as of 2024):

- **Free Tier**: $5 credit/month (sufficient for small demos)
- **Hobby Plan**: $5/month (better for active demos)
- **Pro Plan**: $20/month (recommended for production)

**Estimated cost for this project:**
- Development/Demo: ~$8-15/month
- Production: ~$50-100/month (depending on traffic)

## 🔒 Security for Client Demo

### Option 1: Public Demo (No Authentication Required)
- Keep the demo publicly accessible
- Use demo data only
- Reset database weekly

### Option 2: Protected Demo (Require Login)
- Provide clients with demo credentials
- Enable rate limiting
- Monitor usage

### Option 3: Private Demo (IP Restricted)
- Use Railway's IP allowlist feature
- Only allow specific client IPs
- Most secure option

## 🛡️ Security Best Practices

1. **Never use production credentials** in demo
2. **Change all default secrets** in environment variables
3. **Enable rate limiting** to prevent abuse
4. **Monitor logs** for suspicious activity
5. **Reset demo data regularly** (weekly/monthly)
6. **Use strong JWT secrets** (32+ characters)
7. **Enable HTTPS** (Railway provides this automatically)

## 🔄 Updating the Demo

When you update the code:

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. Railway will **automatically redeploy** (if auto-deploy is enabled)

3. Or **manually deploy**:
   - Go to Railway dashboard
   - Click on the service
   - Click **"Deploy"**

## 🐛 Troubleshooting

### Services won't start

1. Check logs in Railway dashboard
2. Verify environment variables are set correctly
3. Ensure databases are running
4. Check service dependencies

### Database connection errors

1. Verify database credentials
2. Check if databases are provisioned
3. Ensure services can reach databases (private networking)

### Out of memory errors

1. Increase service memory in Railway settings
2. Optimize Docker images
3. Consider upgrading Railway plan

### Slow performance

1. Check if you're on free tier (has resource limits)
2. Upgrade to Hobby or Pro plan
3. Enable Railway's CDN for static assets

## 📝 Maintenance

### Weekly Tasks
- Check logs for errors
- Monitor resource usage
- Verify demo is accessible

### Monthly Tasks
- Reset demo database
- Update dependencies
- Review security logs
- Check Railway usage and costs

## 🆘 Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Project Issues**: https://github.com/Federicojaviermartino/mediconnect-pro/issues

## 🎯 Alternative Deployment Options

If Railway doesn't meet your needs:

1. **Render**: https://render.com (similar to Railway)
2. **Fly.io**: https://fly.io (global edge deployment)
3. **DigitalOcean App Platform**: https://www.digitalocean.com/products/app-platform
4. **Heroku**: https://www.heroku.com (traditional PaaS)
5. **AWS ECS**: https://aws.amazon.com/ecs/ (more complex, more control)

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Docker Deployment Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Environment Variables Guide](https://12factor.net/config)
- [Monitoring Guide](MONITORING.md) (if exists)

---

**Need help?** Open an issue or contact support!
