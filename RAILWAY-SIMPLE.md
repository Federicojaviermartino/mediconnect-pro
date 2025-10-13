# 🚂 Railway Simple Deployment - Docker Compose

## ✅ This is the EASY way - One service, all containers

---

## 🗑️ Step 1: Clean Up (if needed)

If you have a failing deployment:
1. Go to Railway dashboard
2. Click on the failing service
3. Settings → Danger Zone → **Delete Service**

---

## 🆕 Step 2: Create New Service in Railway

1. Click **"+ New"**
2. Select **"GitHub Repo"**
3. Choose **`mediconnect-pro`**
4. Railway will start deploying automatically

---

## ⚙️ Step 3: Add Databases

### PostgreSQL
1. Click **"+ New"**
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Wait 30 seconds for provisioning

### MongoDB
1. Click **"+ New"**
2. Select **"Database"**
3. Choose **"Add MongoDB"**
4. Wait 30 seconds

### Redis
1. Click **"+ New"**
2. Select **"Database"**
3. Choose **"Add Redis"**
4. Wait 30 seconds

---

## 🔧 Step 4: Configure Environment Variables

Click on your main service → **Variables** tab → Add these:

```bash
# Required
NODE_ENV=production
JWT_SECRET=mediconnect-jwt-secret-change-this-min-32-characters-random
REFRESH_TOKEN_SECRET=mediconnect-refresh-secret-change-this-random-string

# Database URLs (Railway auto-provides these, reference them)
POSTGRES_HOST=${{Postgres.PGHOST}}
POSTGRES_PORT=${{Postgres.PGPORT}}
POSTGRES_USER=${{Postgres.PGUSER}}
POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}

MONGODB_URI=${{MongoDB.MONGO_URL}}

REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}

# Port
PORT=3000
```

**Important**: Railway will automatically inject database URLs when you reference them with `${{DatabaseName.VARIABLE}}`

---

## 🌐 Step 5: Generate Public Domain

1. Click on your service
2. Go to **Settings**
3. Scroll to **Networking** section
4. Click **"Generate Domain"**
5. Save the URL (e.g., `mediconnect-pro-production.up.railway.app`)

---

## ⏳ Step 6: Wait for Deployment

- First deployment takes **5-10 minutes** (building Docker images)
- Check **Logs** tab to see progress
- Look for: `✅ MediConnect Pro is running!`

---

## 🌱 Step 7: Seed Demo Data

Once deployment is successful, run locally:

```bash
# Install dependencies (if not done)
npm install

# Set your Railway URL
export API_URL=https://your-railway-url.up.railway.app

# Windows PowerShell:
$env:API_URL="https://your-railway-url.up.railway.app"

# Run seed script
npx ts-node scripts/seed-demo-data.ts
```

This creates all demo users!

---

## ✅ You're Done!

Access your demo at: `https://your-railway-url.up.railway.app`

### Demo Credentials

**Admin:**
```
Email: admin@mediconnect.demo
Password: Demo2024!Admin
```

**Doctor:**
```
Email: dr.smith@mediconnect.demo
Password: Demo2024!Doctor
```

**Patient:**
```
Email: john.doe@mediconnect.demo
Password: Demo2024!Patient
```

---

## 📊 What's Running?

Inside your single Railway service, Docker Compose runs:
- ✅ API Gateway (port 3000) - Your public endpoint
- ✅ Auth Service (internal)
- ✅ Patient Service (internal)
- ✅ Vitals Service (internal)
- ✅ Consultation Service (internal)
- ✅ ML Service (internal)
- ✅ Web Frontend (internal)

Plus 3 separate database services:
- ✅ PostgreSQL
- ✅ MongoDB
- ✅ Redis

---

## 💰 Cost

**Estimated monthly cost:**
- Main service: $5-8
- PostgreSQL: $2-3
- MongoDB: $2-3
- Redis: $1-2

**Total: $10-16/month**

Much cheaper than deploying each service separately!

---

## 🔍 Monitoring

In Railway dashboard:

1. **Logs** - Real-time application logs
   - Look for errors here if something fails

2. **Metrics** - Resource usage
   - CPU, Memory, Network

3. **Deployments** - History
   - See all your deployments

---

## 🆘 Troubleshooting

### "Deployment failed during build"

Check logs for:
- `Docker daemon not running` → Railway issue, redeploy
- `Out of memory` → Upgrade Railway plan
- `Cannot connect to database` → Check database variables

### "Service is running but can't access"

1. Check that Domain is generated (Settings → Networking)
2. Verify health check: `https://your-url.railway.app/health`
3. Check logs for errors

### "Demo users don't exist"

Run the seed script again (Step 7)

### "502 Bad Gateway"

Wait 2-3 minutes, services are still starting

---

## 🔄 Updating Your Demo

To deploy updates:

```bash
git add .
git commit -m "your changes"
git push origin main
```

Railway will **auto-deploy** in 2-3 minutes! 🎉

---

## 🎯 Next Steps

1. **Share URL with clients** → `https://your-url.railway.app`
2. **Update [DEMO.md](DEMO.md)** with your actual URL
3. **Monitor usage** in Railway dashboard
4. **Set up custom domain** (optional, in Railway settings)

---

## 📚 Additional Resources

- **Full Deployment Guide**: [RAILWAY-DEPLOY.md](RAILWAY-DEPLOY.md)
- **Demo Documentation**: [DEMO.md](DEMO.md)
- **Troubleshooting**: [RAILWAY-FIX.md](RAILWAY-FIX.md)
- **Railway Docs**: https://docs.railway.app

---

**Questions?** Check the logs first, then open an issue on GitHub!

🎉 **Enjoy your live demo!**
