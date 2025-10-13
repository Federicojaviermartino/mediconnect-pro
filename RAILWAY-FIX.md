# 🔧 Railway Deployment Fix

## Problem

The project uses npm workspaces which Railway doesn't support well for monorepo deployments.

## Solution: Deploy Each Service Separately

### Step 1: Delete Current Deployment

In Railway:
1. Go to your project
2. Settings → Danger Zone
3. Click "Delete Service"

### Step 2: Deploy Services Individually

We'll deploy each service as a separate Railway service.

---

## 🗄️ Deploy Databases First

### PostgreSQL
1. Click "+ New"
2. Database → Add PostgreSQL
3. Wait for provisioning

### MongoDB
1. Click "+ New"
2. Database → Add MongoDB
3. Wait for provisioning

### Redis
1. Click "+ New"
2. Database → Add Redis
3. Wait for provisioning

---

## 🚀 Deploy Individual Services

### Service 1: Auth Service

1. Click "+ New" → "GitHub Repo"
2. Select `mediconnect-pro`
3. Click "Add variables"
4. Add these:
   ```
   NODE_ENV=production
   PORT=3001
   ```
5. Go to Settings → **Root Directory**
6. Set to: `services/auth-service`
7. Deploy!

### Service 2: Patient Service

1. Click "+ New" → "GitHub Repo"
2. Select `mediconnect-pro`
3. Add variables:
   ```
   NODE_ENV=production
   PORT=3002
   ```
4. Settings → Root Directory: `services/patient-service`
5. Deploy!

### Service 3: Vitals Service

1. Click "+ New" → "GitHub Repo"
2. Select `mediconnect-pro`
3. Add variables:
   ```
   NODE_ENV=production
   PORT=3003
   ```
4. Settings → Root Directory: `services/vitals-service`
5. Deploy!

### Service 4: Consultation Service

1. Click "+ New" → "GitHub Repo"
2. Select `mediconnect-pro`
3. Add variables:
   ```
   NODE_ENV=production
   PORT=3004
   ```
4. Settings → Root Directory: `services/consultation-service`
5. Deploy!

### Service 5: ML Service (Python)

1. Click "+ New" → "GitHub Repo"
2. Select `mediconnect-pro`
3. Add variables:
   ```
   ENVIRONMENT=production
   PORT=8000
   ```
4. Settings → Root Directory: `services/ml-service`
5. Deploy!

### Service 6: API Gateway

1. Click "+ New" → "GitHub Repo"
2. Select `mediconnect-pro`
3. Add variables:
   ```
   NODE_ENV=production
   PORT=3000
   AUTH_SERVICE_URL=http://auth-service.railway.internal:3001
   PATIENT_SERVICE_URL=http://patient-service.railway.internal:3002
   VITALS_SERVICE_URL=http://vitals-service.railway.internal:3003
   CONSULTATION_SERVICE_URL=http://consultation-service.railway.internal:3004
   ML_SERVICE_URL=http://ml-service.railway.internal:8000
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   ```
4. Settings → Root Directory: `services/api-gateway`
5. Settings → Networking → **Generate Domain**
6. Deploy!

### Service 7: Web Frontend

1. Click "+ New" → "GitHub Repo"
2. Select `mediconnect-pro`
3. Add variables:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}
   ```
4. Settings → Root Directory: `frontend/web`
5. Settings → Networking → **Generate Domain**
6. Deploy!

---

## 🔗 Configure Internal Networking

Railway services can communicate using internal URLs:

Format: `http://<service-name>.railway.internal:<port>`

Example:
- Auth Service: `http://auth-service.railway.internal:3001`
- Patient Service: `http://patient-service.railway.internal:3002`

---

## ✅ Verify Deployment

Once all services are deployed:

1. Check each service has "Active" status
2. View logs to ensure no errors
3. Test API Gateway health: `https://your-api-gateway-url.railway.app/health`

---

## 🌱 Seed Demo Data

Once API Gateway is public:

```bash
# On your local machine
npm install
export API_URL=https://your-api-gateway-url.railway.app
npx ts-node scripts/seed-demo-data.ts
```

---

## 💰 Cost Estimation

With 7 services + 3 databases = 10 resources

- Free tier: $5/month credit (not enough)
- Hobby plan: $5/month + usage (~$15-20 total)
- Estimated: **$15-25/month**

---

## 🎯 Alternative: Docker Compose on Single Service

If cost is a concern, you can use Docker Compose on a single Railway service:

1. Deploy as one service
2. Use docker-compose.yml
3. Railway will run all containers together
4. Cheaper but less scalable

Let me know if you want instructions for this approach!

---

## 🆘 Still Having Issues?

Common problems:

1. **Build fails**: Check the logs, usually missing dependencies
2. **Service won't start**: Verify PORT environment variable
3. **Can't connect to DB**: Ensure database URLs are set correctly
4. **404 errors**: Check root directory is set correctly

Need help? Let me know which step is failing!
