# 🚂 Railway Quick Start - 5 Minute Deployment

This is the fastest way to deploy MediConnect Pro to Railway and get a live demo running.

## ⚡ Super Quick Deploy (2 Minutes)

### Option 1: One-Click Deploy Button (Easiest)

**Coming Soon**: We're setting up the Railway template. For now, use Manual Deploy below.

### Option 2: Manual Deploy (5 Minutes)

## 📝 Step-by-Step Instructions

### Step 1: Create Railway Account (1 minute)

1. Go to https://railway.app
2. Click **"Login"**
3. Choose **"Login with GitHub"**
4. Authorize Railway to access your GitHub account

✅ You'll get **$5 free credit** every month!

---

### Step 2: Create New Project (30 seconds)

1. Click **"New Project"** button (top right)
2. Select **"Deploy from GitHub repo"**
3. Choose **`mediconnect-pro`** repository
4. Click **"Deploy Now"**

Railway will start deploying immediately!

---

### Step 3: Add Databases (2 minutes)

You need to add 3 databases. For each one:

#### Add PostgreSQL

1. In your project, click **"+ New"** button
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Wait for it to provision (30 seconds)

#### Add MongoDB

1. Click **"+ New"** again
2. Select **"Database"**
3. Choose **"Add MongoDB"**
4. Wait for provisioning

#### Add Redis

1. Click **"+ New"** again
2. Select **"Database"**
3. Choose **"Add Redis"**
4. Wait for provisioning

---

### Step 4: Configure Main Service (1 minute)

1. Click on your **main service** (mediconnect-pro)
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Add these essential variables:

```bash
NODE_ENV=production
JWT_SECRET=mediconnect-super-secret-key-change-this-in-prod-min-32-chars
REFRESH_TOKEN_SECRET=mediconnect-refresh-secret-change-in-prod
```

Railway will automatically connect your databases!

---

### Step 5: Generate Public URL (30 seconds)

1. Click on your service
2. Go to **"Settings"** tab
3. Scroll to **"Networking"** section
4. Click **"Generate Domain"**
5. Railway will give you a URL like: `mediconnect-pro-production.up.railway.app`

**Save this URL!** You'll need it for the next step.

---

### Step 6: Seed Demo Data (Outside Railway - 1 minute)

On your local machine:

```bash
# Install dependencies (if not done)
npm install

# Set your Railway URL
export API_URL=https://your-url.up.railway.app

# Windows PowerShell:
$env:API_URL="https://your-url.up.railway.app"

# Run seed script
npx ts-node scripts/seed-demo-data.ts
```

This creates all demo users and data!

---

## ✅ You're Done!

Your demo is now live at: `https://your-url.up.railway.app`

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

## 🎯 What You Get

- ✅ Live web application
- ✅ All 6 microservices running
- ✅ PostgreSQL, MongoDB, Redis databases
- ✅ 6 demo users with realistic data
- ✅ Public URL to share with clients
- ✅ HTTPS enabled automatically
- ✅ Auto-redeploy on git push

---

## 💰 Cost

**Railway Pricing:**
- **Free**: $5 credit/month (perfect for testing)
- **Hobby**: $5/month (for active demos)
- **Pro**: $20/month (production-ready)

**Estimated cost for this project:**
- Demo/Testing: **$0-8/month** (fits in free tier)
- Active Demo: **$10-15/month**

---

## 🔄 Updating Your Demo

To update the demo with new code:

```bash
# Make your changes
git add .
git commit -m "your changes"
git push origin main
```

Railway will **automatically redeploy**! 🎉

---

## 📊 Monitoring Your Demo

In Railway dashboard you can see:

1. **Logs** - Real-time application logs
2. **Metrics** - CPU, Memory, Network usage
3. **Deployments** - History of all deployments
4. **Usage** - How much of your credit you've used

---

## 🆘 Troubleshooting

### "Service won't start"

1. Check the logs in Railway dashboard
2. Make sure all 3 databases are running
3. Verify environment variables are set

### "Can't connect to database"

1. Wait 2-3 minutes for databases to fully initialize
2. Restart your service in Railway
3. Check that database URLs are auto-populated

### "Out of memory"

1. Go to Settings → Resources
2. Increase memory allocation
3. Or upgrade to Hobby plan

### "Demo users don't exist"

Run the seed script again:
```bash
npx ts-node scripts/seed-demo-data.ts
```

---

## 📚 Next Steps

1. **Share the URL** with your clients
2. **Update DEMO.md** with your actual Railway URL
3. **Monitor usage** in Railway dashboard
4. **Set up alerts** for when service goes down
5. **Configure custom domain** (optional)

---

## 🔒 Security Tips

✅ **DO:**
- Change JWT secrets to strong random strings
- Monitor logs for suspicious activity
- Reset demo data weekly
- Use Railway's environment variables for secrets

❌ **DON'T:**
- Use production credentials in demo
- Share your Railway dashboard access
- Leave unused services running
- Commit secrets to git

---

## 🎓 Learn More

- **Full Deployment Guide**: [RAILWAY-DEPLOY.md](RAILWAY-DEPLOY.md)
- **Demo Documentation**: [DEMO.md](DEMO.md)
- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway

---

**Questions?** Open an issue on GitHub or check the full deployment guide!

🎉 **Congratulations on your live demo!**
