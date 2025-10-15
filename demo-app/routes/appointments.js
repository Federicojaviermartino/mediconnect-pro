// Appointment routes
const { requireAuth } = require('../middleware/auth');

function setupAppointmentRoutes(app, db) {
  // Get appointments
  app.get('/api/appointments', requireAuth, (req, res) => {
    try {
      // Validate session and user data
      if (!req.session || !req.session.user || !req.session.user.id) {
        console.error('Invalid session in appointments GET:', req.session);
        return res.status(401).json({ error: 'Invalid session. Please login again.' });
      }

      const userId = req.session.user.id;
      const role = req.session.user.role;

      console.log(`Fetching appointments for user ${userId} (${role})`);

      const appointments = db.getAppointments(userId, role);

      // Enrich with user names
      const enrichedAppointments = appointments.map(apt => {
        const patient = db.getUserById(apt.patient_id);
        const doctor = db.getUserById(apt.doctor_id);
        return {
          ...apt,
          patient_name: patient?.name || 'Unknown',
          doctor_name: doctor?.name || 'Unknown'
        };
      });

      console.log(`Found ${enrichedAppointments.length} appointments`);
      res.json({ appointments: enrichedAppointments });
    } catch (error) {
      console.error('Get appointments error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to fetch appointments', details: error.message });
    }
  });

  // Create appointment
  app.post('/api/appointments', requireAuth, (req, res) => {
    try {
      // Validate session and user data
      if (!req.session || !req.session.user || !req.session.user.id) {
        console.error('Invalid session in appointments POST:', req.session);
        return res.status(401).json({ error: 'Invalid session. Please login again.' });
      }

      const { date, time, reason, doctor_id } = req.body;
      const userId = req.session.user.id;

      if (!date || !time || !reason) {
        return res.status(400).json({ error: 'Date, time and reason are required' });
      }

      const appointmentData = {
        patient_id: userId,
        doctor_id: doctor_id || 2, // Default to Dr. Smith
        date,
        time,
        reason
      };

      const appointment = db.createAppointment(appointmentData);
      console.log(`Created appointment ${appointment.id} for user ${userId}`);
      res.json({ success: true, appointment });
    } catch (error) {
      console.error('Create appointment error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to create appointment', details: error.message });
    }
  });
}

module.exports = { setupAppointmentRoutes };
