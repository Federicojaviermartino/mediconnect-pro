// Analytics routes
const { requireAuth, requireRole } = require('../middleware/auth');
const { cacheMiddleware } = require('../utils/cache');
const logger = require('../utils/logger');

// Analytics data can be cached for longer since it's aggregated data
const analyticsCache = cacheMiddleware({ ttl: 60000 }); // 1 minute cache

function setupAnalyticsRoutes(app, db) {
  // Dashboard metrics - general overview (cached for 1 minute)
  app.get('/api/analytics/dashboard', requireAuth, analyticsCache, (req, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      const stats = db.getStats();
      const allUsers = db.getAllUsers();

      let dashboardData = {
        timestamp: new Date().toISOString()
      };

      if (userRole === 'admin') {
        dashboardData = {
          ...dashboardData,
          users: {
            total: stats.totalUsers,
            patients: stats.totalPatients,
            doctors: stats.totalDoctors,
            admins: allUsers.filter(u => u.role === 'admin').length
          },
          vitals: {
            total_records: stats.totalVitals
          },
          system: {
            uptime: process.uptime(),
            memory_usage: process.memoryUsage()
          }
        };
      } else if (userRole === 'doctor') {
        const appointments = db.getAppointments(userId, 'doctor');
        const prescriptions = db.getPrescriptions(userId, 'doctor');

        dashboardData = {
          ...dashboardData,
          patients: {
            total: new Set(appointments.map(a => a.patient_id)).size
          },
          appointments: {
            total: appointments.length,
            scheduled: appointments.filter(a => a.status === 'scheduled').length,
            completed: appointments.filter(a => a.status === 'completed').length
          },
          prescriptions: {
            total: prescriptions.length,
            pending: prescriptions.filter(p => p.status === 'pending').length,
            active: prescriptions.filter(p => p.status === 'active').length
          }
        };
      } else {
        // Patient view
        const appointments = db.getAppointments(userId, 'patient');
        const prescriptions = db.getPrescriptions(userId, 'patient');
        const patient = db.getPatientByUserId(userId);
        const vitals = patient ? db.getVitalsByPatientId(patient.id || 1) : [];

        dashboardData = {
          ...dashboardData,
          appointments: {
            upcoming: appointments.filter(a => a.status === 'scheduled' && new Date(a.date) >= new Date()).length,
            past: appointments.filter(a => a.status === 'completed').length
          },
          prescriptions: {
            active: prescriptions.filter(p => p.status === 'active').length,
            total: prescriptions.length
          },
          vitals: {
            recent_count: vitals.length,
            last_recorded: vitals.length > 0 ? vitals[0].recorded_at : null
          }
        };
      }

      res.json(dashboardData);
    } catch (error) {
      logger.logApiError(error, req, { context: 'Dashboard analytics' });
      res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
    }
  });

  // Appointment statistics
  app.get('/api/analytics/appointments', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { period = '30d' } = req.query;

      const appointments = db.getAppointments(userId, userRole);

      // Calculate period filter
      const now = new Date();
      let startDate;
      switch (period) {
        case '7d':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30d':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90d':
          startDate = new Date(now.setDate(now.getDate() - 90));
          break;
        case '1y':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(0);
      }

      const filteredAppointments = appointments.filter(a =>
        new Date(a.created_at) >= startDate
      );

      const byStatus = {
        scheduled: filteredAppointments.filter(a => a.status === 'scheduled').length,
        confirmed: filteredAppointments.filter(a => a.status === 'confirmed').length,
        completed: filteredAppointments.filter(a => a.status === 'completed').length,
        cancelled: filteredAppointments.filter(a => a.status === 'cancelled').length
      };

      // Group by date
      const byDate = {};
      filteredAppointments.forEach(a => {
        const date = a.date || a.created_at.split('T')[0];
        byDate[date] = (byDate[date] || 0) + 1;
      });

      res.json({
        period,
        total: filteredAppointments.length,
        by_status: byStatus,
        by_date: byDate,
        completion_rate: filteredAppointments.length > 0
          ? ((byStatus.completed / filteredAppointments.length) * 100).toFixed(1)
          : 0
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Appointment analytics' });
      res.status(500).json({ error: 'Failed to fetch appointment analytics' });
    }
  });

  // Vitals trends
  app.get('/api/analytics/vitals', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { patientId, period = '30d' } = req.query;

      let targetPatientId;

      if (userRole === 'patient') {
        const patient = db.getPatientByUserId(userId);
        targetPatientId = patient?.id || 1;
      } else if (patientId) {
        targetPatientId = parseInt(patientId);
      } else {
        return res.status(400).json({ error: 'Patient ID required for non-patient users' });
      }

      const vitals = db.getVitalsByPatientId(targetPatientId);

      if (vitals.length === 0) {
        return res.json({
          patient_id: targetPatientId,
          vitals_count: 0,
          trends: {},
          message: 'No vitals data available'
        });
      }

      // Calculate averages and trends
      const heartRates = vitals.filter(v => v.heart_rate).map(v => v.heart_rate);
      const temperatures = vitals.filter(v => v.temperature).map(v => v.temperature);
      const oxygenLevels = vitals.filter(v => v.oxygen_saturation).map(v => v.oxygen_saturation);

      const average = arr => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

      res.json({
        patient_id: targetPatientId,
        vitals_count: vitals.length,
        period,
        latest: vitals[0],
        averages: {
          heart_rate: average(heartRates),
          temperature: average(temperatures),
          oxygen_saturation: average(oxygenLevels)
        },
        ranges: {
          heart_rate: heartRates.length > 0 ? {
            min: Math.min(...heartRates),
            max: Math.max(...heartRates)
          } : null,
          temperature: temperatures.length > 0 ? {
            min: Math.min(...temperatures),
            max: Math.max(...temperatures)
          } : null
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Vitals analytics' });
      res.status(500).json({ error: 'Failed to fetch vitals analytics' });
    }
  });

  // Prescription patterns (doctor/admin only)
  app.get('/api/analytics/prescriptions', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      const prescriptions = db.getPrescriptions(userId, userRole);

      const byStatus = {
        pending: prescriptions.filter(p => p.status === 'pending').length,
        active: prescriptions.filter(p => p.status === 'active').length,
        completed: prescriptions.filter(p => p.status === 'completed').length,
        rejected: prescriptions.filter(p => p.status === 'rejected').length
      };

      // Most prescribed medications
      const medicationCounts = {};
      prescriptions.forEach(p => {
        const med = p.medication;
        medicationCounts[med] = (medicationCounts[med] || 0) + 1;
      });

      const topMedications = Object.entries(medicationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([medication, count]) => ({ medication, count }));

      // By pharmacy
      const pharmacyCounts = {};
      prescriptions.forEach(p => {
        const pharmacy = p.pharmacy || 'Unknown';
        pharmacyCounts[pharmacy] = (pharmacyCounts[pharmacy] || 0) + 1;
      });

      res.json({
        total: prescriptions.length,
        by_status: byStatus,
        top_medications: topMedications,
        by_pharmacy: pharmacyCounts,
        approval_rate: prescriptions.length > 0
          ? (((byStatus.active + byStatus.completed) / prescriptions.length) * 100).toFixed(1)
          : 0
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Prescription analytics' });
      res.status(500).json({ error: 'Failed to fetch prescription analytics' });
    }
  });

  // System health metrics (admin only)
  app.get('/api/analytics/system', requireAuth, requireRole('admin'), (req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      res.json({
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: process.uptime(),
          formatted: formatUptime(process.uptime())
        },
        memory: {
          heapUsed: formatBytes(memoryUsage.heapUsed),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          rss: formatBytes(memoryUsage.rss),
          external: formatBytes(memoryUsage.external)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        node: {
          version: process.version,
          platform: process.platform
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'System analytics' });
      res.status(500).json({ error: 'Failed to fetch system analytics' });
    }
  });
}

// Helper functions
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

module.exports = { setupAnalyticsRoutes };
