# PostgreSQL Migration Guide

## Current Status

The PostgreSQL database infrastructure has been implemented with an adapter pattern that allows seamless switching between JSON file storage and PostgreSQL.

### ✅ Completed

1. **PostgreSQL Module** ([demo-app/database/postgres.js](demo-app/database/postgres.js))
   - Connection pooling
   - Query helpers
   - Transaction support
   - Health monitoring

2. **Migration System** ([demo-app/database/migrate.js](demo-app/database/migrate.js))
   - Migration tracking
   - Automatic execution
   - Rollback support (dev only)

3. **Database Schema** ([demo-app/database/migrations/001_initial_schema.sql](demo-app/database/migrations/001_initial_schema.sql))
   - 10 tables with proper relationships
   - Indexes for performance
   - Triggers for automatic timestamps
   - Views for common queries

4. **PostgreSQL Adapter** ([demo-app/database/postgres-adapter.js](demo-app/database/postgres-adapter.js))
   - Complete implementation of database operations
   - Same interface as JSON adapter
   - Async/await throughout

5. **Unified Database Interface** ([demo-app/database/init.js](demo-app/database/init.js))
   - Feature flag `USE_POSTGRES` to switch between JSON and PostgreSQL
   - Both adapters return async functions
   - Backward compatible

6. **Route Updates Started**
   - ✅ [demo-app/routes/auth.js](demo-app/routes/auth.js:6) - Login endpoint updated to async

### 🚧 Remaining Work

The following route files need to be updated to use `async/await` for all database calls:

1. **demo-app/routes/api.js**
   - `app.get('/api/vitals')` - line 6
   - `app.get('/api/patients')` - line 28
   - `app.get('/api/patients/:id')` - line 44
   - `app.get('/api/stats')` - line 68

2. **demo-app/routes/appointments.js**
   - `app.get('/api/appointments')` - line 6
   - `app.post('/api/appointments')` - line 40
   - `app.patch('/api/appointments/:id')` - line 74

3. **demo-app/routes/prescriptions.js**
   - `app.get('/api/prescriptions')` - line 6
   - `app.post('/api/prescriptions')` - line 42

4. **demo-app/routes/insurance.js**
   - `app.post('/api/insurance/verify-eligibility')` - line 29 (line 38)
   - `app.post('/api/insurance/pre-authorization')` - line 78 (line 87)
   - `app.post('/api/insurance/submit-claim')` - line 118 (line 134)
   - `app.post('/api/insurance/calculate-cost')` - line 199 (line 208)

5. **demo-app/routes/pharmacy.js**
   - `app.post('/api/pharmacy/send-prescription')` - line 103 (line 114)

## Migration Steps

### Step 1: Update Route Handlers

For each route handler that calls database methods, add `async` to the function and `await` to database calls:

**Before:**
```javascript
app.get('/api/patients', requireAuth, (req, res) => {
  try {
    const patients = db.getAllPatients();
    res.json({ patients });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});
```

**After:**
```javascript
app.get('/api/patients', requireAuth, async (req, res) => {
  try {
    const patients = await db.getAllPatients();
    res.json({ patients });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});
```

### Step 2: Test with JSON Database (Default)

```bash
# Ensure USE_POSTGRES=false in .env
npm start

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dr.smith@mediconnect.demo","password":"Demo2024!Doctor"}'

# Test endpoints
# ... (see existing tests)
```

### Step 3: Setup PostgreSQL

```bash
# Start PostgreSQL with Docker
npm run docker:postgres

# Run migrations
npm run db:migrate

# Verify migrations
npm run db:migrate:status
```

### Step 4: Test with PostgreSQL

```bash
# Update .env
USE_POSTGRES=true

# Restart application
npm start

# Run the same tests as Step 2
# Compare results - should be identical
```

### Step 5: Run Test Suite

```bash
# Run all tests with JSON database
USE_POSTGRES=false npm test

# Run all tests with PostgreSQL database
USE_POSTGRES=true npm test

# Both should pass
```

## Known Issues

### Issue 1: Async/Await Not Complete

**Status**: In Progress
**Impact**: Routes not yet updated will fail with PostgreSQL
**Solution**: Complete the route updates listed above

### Issue 2: Field Name Mismatches

**PostgreSQL uses snake_case**: `insurance_provider`, `insurance_member_id`
**JSON uses camelCase**: `insuranceProvider`, `insuranceMemberId`

**Solution**: The PostgreSQL adapter handles conversion:
```javascript
insuranceProvider: patient?.insuranceProvider || null,  // JSON
insurance_provider as "insuranceProvider"                // PostgreSQL
```

### Issue 3: Sequential IDs

**PostgreSQL**: Uses SERIAL (auto-increment)
**JSON**: Manually calculates next ID with `Math.max()`

**Solution**: Both adapters return the inserted object with the correct ID

## Testing Checklist

- [ ] Login/Logout works
- [ ] Patient dashboard loads
- [ ] Doctor dashboard loads
- [ ] Admin dashboard loads
- [ ] Create appointment
- [ ] View appointments
- [ ] Create prescription
- [ ] View prescriptions
- [ ] Insurance verification
- [ ] Pharmacy integration
- [ ] Vital signs display
- [ ] Stats display (admin)

## Performance Comparison

### JSON File Storage
- **Pros**:
  - No external dependencies
  - Instant startup
  - Perfect for demos
- **Cons**:
  - Not scalable
  - No concurrent writes
  - No transactions
  - Entire file loaded into memory

### PostgreSQL
- **Pros**:
  - Scalable to millions of records
  - ACID transactions
  - Concurrent connections
  - Efficient indexes
  - Production-ready
- **Cons**:
  - Requires PostgreSQL installation
  - Slightly slower for tiny datasets
  - More complex setup

## Production Deployment

### Render.com

1. Add PostgreSQL database service
2. Set environment variables:
   ```
   DATABASE_URL=<provided by Render>
   POSTGRES_SSL=true
   USE_POSTGRES=true
   ```
3. Run migrations via shell or deployment script

### Heroku

1. Add addon: `heroku addons:create heroku-postgresql:mini`
2. Set: `heroku config:set USE_POSTGRES=true POSTGRES_SSL=true`
3. Run: `heroku run npm run db:migrate`

## Rollback Plan

If PostgreSQL causes issues in production:

1. Set `USE_POSTGRES=false` in environment variables
2. Restart application
3. App will use JSON file storage
4. No data loss (JSON file is still maintained)

## Next Steps

1. **Complete Route Updates** - Finish adding async/await to all routes
2. **Session Storage** - Use PostgreSQL sessions table instead of Redis (optional)
3. **Real-time Features** - Add WebSocket support for live updates
4. **Advanced Queries** - Leverage PostgreSQL features (full-text search, aggregations)
5. **Caching** - Add Redis caching layer for frequently accessed data
6. **Replication** - Setup read replicas for scaling reads

## Support

For issues or questions:
- Check [DATABASE.md](./DATABASE.md) for PostgreSQL setup
- See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for Redis/Docker
- Review [CLAUDE.md](./CLAUDE.md) for project architecture

---

**Last Updated**: 2025-10-16
**Status**: Phase 2.7 - Migration Infrastructure Complete, Route Updates In Progress
