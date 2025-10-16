# Infrastructure Setup Guide

This guide explains how to set up the infrastructure for MediConnect Pro, including Redis for persistent sessions and optional PostgreSQL for database migration.

## Table of Contents
- [Quick Start](#quick-start)
- [Redis Setup (Persistent Sessions)](#redis-setup)
- [PostgreSQL Setup (Optional)](#postgresql-setup)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Without Docker (Basic Development)

The application runs fine without any external dependencies. Sessions will be stored in memory:

```bash
npm install
npm start
```

**⚠️ Note**: Sessions will be lost when the server restarts.

### With Docker (Recommended for Development)

Use Docker Compose to run Redis (and optionally PostgreSQL):

```bash
# Start Redis only
docker-compose -f docker-compose.dev.yml up -d redis

# Or start all services (Redis + PostgreSQL)
docker-compose -f docker-compose.dev.yml up -d
```

---

## Redis Setup

### Why Redis?

- **Persistent Sessions**: Users stay logged in even after server restarts
- **Horizontal Scaling**: Share sessions across multiple server instances
- **Production Ready**: Battle-tested session storage solution

### Local Development with Docker

**1. Start Redis container:**

```bash
docker-compose -f docker-compose.dev.yml up -d redis
```

**2. Verify Redis is running:**

```bash
docker ps | grep mediconnect-redis
```

**3. Configure environment (optional):**

Create a `.env` file (copy from `.env.example`):

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
```

**4. Start the application:**

```bash
npm start
```

You should see:
```
✅ Redis connected successfully
✅ Redis client ready
✅ Redis session store configured
```

### Local Development without Docker

**1. Install Redis:**

**Windows:**
- Download from: https://github.com/microsoftarchive/redis/releases
- Or use WSL2 with Linux Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**2. Configure and start:**

```bash
# .env file
REDIS_HOST=localhost
REDIS_PORT=6379

# Start application
npm start
```

### Verifying Redis Session Storage

**1. Check health endpoint:**

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "MediConnect Pro is running",
  "timestamp": "2025-10-16T...",
  "database": "connected",
  "sessions": "redis",
  "redis": "connected"
}
```

**2. Test session persistence:**

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dr.smith@mediconnect.demo","password":"Demo2024!Doctor"}' \
  -c cookies.txt

# Restart server (Ctrl+C, then npm start)

# Verify session persists
curl http://localhost:3000/api/auth/me -b cookies.txt
```

You should still be logged in after server restart!

**3. Inspect Redis keys:**

```bash
# Connect to Redis CLI
docker exec -it mediconnect-redis redis-cli

# List all session keys
127.0.0.1:6379> KEYS mediconnect:sess:*

# Get session data
127.0.0.1:6379> GET mediconnect:sess:<session-id>

# Exit
127.0.0.1:6379> EXIT
```

---

## PostgreSQL Setup (Optional)

**Note**: PostgreSQL is included in `docker-compose.dev.yml` but is **not yet implemented** in the application. The app currently uses a JSON file database.

### Future Migration to PostgreSQL

The docker-compose file includes a PostgreSQL service configured for future use:

```bash
# Start PostgreSQL (uses --profile flag, so won't start by default)
docker-compose -f docker-compose.dev.yml --profile postgres up -d postgres
```

**Configuration:**
- Host: `localhost`
- Port: `5432`
- Database: `mediconnect`
- User: `mediconnect_user`
- Password: Set via `DB_PASSWORD` env var (default: `dev_password_2024`)

**Planned migration** (see CLAUDE.md for details):
- Replace JSON file storage with PostgreSQL
- Implement proper schema with migrations
- Add database connection pooling
- Support ACID transactions

---

## Production Deployment

### Render.com (Current Deployment)

**1. Add Redis add-on:**

Go to your Render dashboard:
1. Select your MediConnect Pro service
2. Navigate to "Environment" tab
3. Add Redis add-on or provide `REDIS_URL`

**2. Set environment variable:**

```
REDIS_URL=redis://username:password@hostname:port
```

**3. Deploy:**

The application will automatically detect `REDIS_URL` and use Redis for sessions.

### Other Cloud Platforms

**Heroku:**
```bash
heroku addons:create heroku-redis:mini
# REDIS_URL is automatically set
```

**AWS:**
- Use ElastiCache for Redis
- Set `REDIS_URL` environment variable

**DigitalOcean:**
- Use Managed Redis
- Set `REDIS_URL` environment variable

**Self-hosted:**
- Configure `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`
- Ensure firewall allows connections
- Consider using Redis Sentinel for high availability

---

## Troubleshooting

### Redis Connection Issues

**Problem**: `❌ Redis Client Error: connect ECONNREFUSED`

**Solution 1**: Verify Redis is running
```bash
docker ps | grep redis
# If not running:
docker-compose -f docker-compose.dev.yml up -d redis
```

**Solution 2**: Check Redis connectivity
```bash
# Test connection
docker exec mediconnect-redis redis-cli ping
# Should return: PONG
```

**Solution 3**: Verify environment variables
```bash
echo $REDIS_HOST
echo $REDIS_PORT
```

### Sessions Not Persisting

**Problem**: Users get logged out after server restart

**Check 1**: Verify Redis is being used
```bash
curl http://localhost:3000/health | grep sessions
# Should show: "sessions": "redis"
```

**Check 2**: Check server logs on startup
```bash
npm start
# Look for: ✅ Redis connected successfully
```

**Check 3**: Verify Redis has data
```bash
docker exec -it mediconnect-redis redis-cli
127.0.0.1:6379> KEYS mediconnect:sess:*
# Should list session keys
```

### Memory Sessions Fallback

If Redis is not available, the application automatically falls back to memory sessions.

**Log messages:**
```
⚠️  Redis not configured. Using in-memory sessions.
⚠️  Sessions will be lost on server restart.
💡 Tip: Set REDIS_HOST or REDIS_URL in environment to enable persistent sessions.
```

This is **expected behavior** when Redis is not configured and allows the app to run without dependencies.

---

## Best Practices

### Development
- ✅ Use Docker Compose for consistent environment
- ✅ Test session persistence regularly
- ✅ Check Redis memory usage: `docker stats mediconnect-redis`

### Production
- ✅ Use managed Redis service (Render Redis, AWS ElastiCache, etc.)
- ✅ Enable Redis persistence (AOF or RDB)
- ✅ Set up Redis monitoring and alerts
- ✅ Configure Redis password authentication
- ✅ Use connection pooling
- ✅ Set appropriate `maxAge` for sessions (currently 24 hours)

### Security
- ✅ Never commit Redis credentials to git
- ✅ Use strong `SESSION_SECRET` in production
- ✅ Enable TLS for Redis connections in production
- ✅ Restrict Redis network access (firewall rules)
- ✅ Regularly update Redis to latest stable version

---

## Commands Cheat Sheet

```bash
# Docker Compose
docker-compose -f docker-compose.dev.yml up -d redis      # Start Redis
docker-compose -f docker-compose.dev.yml down             # Stop all services
docker-compose -f docker-compose.dev.yml logs -f redis    # View Redis logs
docker-compose -f docker-compose.dev.yml restart redis    # Restart Redis

# Redis CLI
docker exec -it mediconnect-redis redis-cli               # Connect to Redis
docker exec mediconnect-redis redis-cli KEYS "mediconnect:sess:*"  # List sessions
docker exec mediconnect-redis redis-cli FLUSHDB           # Clear all data (careful!)

# Application
npm start                                                 # Start server
npm test                                                  # Run tests
curl http://localhost:3000/health                         # Check health

# Debugging
docker logs mediconnect-redis                             # View Redis logs
docker stats mediconnect-redis                            # View resource usage
```

---

## Next Steps

1. **Current**: Redis for session persistence ✅
2. **Planned**: Migrate from JSON to PostgreSQL
3. **Future**: Add database connection pooling
4. **Future**: Implement Redis caching for frequently accessed data
5. **Future**: Set up Redis Sentinel for high availability

For more details, see [CLAUDE.md](./CLAUDE.md) - Recomendación #3.
