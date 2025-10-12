# Deploy MediConnect Pro to Vercel

Quick guide to deploy the MediConnect Pro frontend to Vercel.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Project pushed to GitHub

## Steps

### 1. Prepare Frontend for Vercel

The frontend is already configured in `frontend/web/` with Next.js 14.

### 2. Push to GitHub

```bash
# Initialize git if not done
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/mediconnect-pro.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Vercel

#### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd frontend/web

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: mediconnect-web
# - Directory: ./
# - Override settings? No

# Production deployment
vercel --prod
```

#### Option B: Vercel Dashboard

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-api-gateway.com
   NEXT_PUBLIC_WS_URL=wss://your-api-gateway.com
   ```
6. Click "Deploy"

### 4. Configure Backend Services

For a complete deployment, you'll need to deploy backend services separately:

#### Option 1: Railway.app (Recommended for demo)
- Deploy docker-compose to Railway
- Each service gets its own URL
- PostgreSQL, MongoDB, Redis included

#### Option 2: Render.com
- Deploy each service individually
- Free PostgreSQL database
- Environment variables per service

#### Option 3: AWS/GCP/Azure
- Use docker-compose or Kubernetes
- More control, more setup required

### 5. Update Frontend Environment Variables

Once backend is deployed, update Vercel environment variables:

```bash
# In Vercel dashboard
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_WS_URL=wss://your-backend-url.com
```

Then redeploy:
```bash
vercel --prod
```

## Demo Mode (Frontend Only)

To deploy frontend for demo without backend:

1. Use mock data in the app
2. Set environment variables to mock endpoints
3. Deploy to Vercel

Create `frontend/web/.env.production`:
```env
NEXT_PUBLIC_API_URL=/api/mock
NEXT_PUBLIC_WS_URL=
NEXT_PUBLIC_DEMO_MODE=true
```

## Custom Domain

In Vercel dashboard:
1. Go to project settings
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Troubleshooting

### Build fails
- Check build logs in Vercel dashboard
- Verify all dependencies in package.json
- Check TypeScript errors

### Environment variables not working
- Must start with `NEXT_PUBLIC_` for client-side
- Redeploy after changing env vars
- Clear build cache if needed

### API calls fail
- Check CORS settings in backend
- Verify API_URL is correct
- Check network tab in browser dev tools

## Useful Commands

```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Remove deployment
vercel rm mediconnect-web

# Pull environment variables
vercel env pull
```

## Production Checklist

- [ ] Backend services deployed and running
- [ ] Database migrations run
- [ ] Environment variables configured
- [ ] Custom domain configured (optional)
- [ ] SSL/HTTPS enabled (automatic in Vercel)
- [ ] Analytics configured (optional)
- [ ] Error tracking (Sentry) configured (optional)

## Cost

- Vercel: **Free** for hobby projects
- Custom domain: ~$12/year (optional)

## Support

For issues:
- Check Vercel docs: https://vercel.com/docs
- Check Next.js docs: https://nextjs.org/docs
