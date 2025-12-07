// Appointment routes
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate, validateParams, appointmentSchemas, paramSchemas } = require('../middleware/validators');
const logger = require('../utils/logger');

function setupAppointmentRoutes(app, db) {
  // Get all appointments
  app.get('/api/appointments', requireAuth, (req, res) => {
    try {
      if (!req.session || !req.session.user || !req.session.user.id) {
        logger.warn('Invalid session in appointments GET');
        return res.status(401).json({ error: 'Invalid session. Please login again.' });
      }

      const userId = req.session.user.id;
      const role = req.session.user.role;
      const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

      let appointments = db.getAppointments(userId, role);

      // Filter by status
      if (status && ['scheduled', 'confirmed', 'cancelled', 'completed'].includes(status)) {
        appointments = appointments.filter(apt => apt.status === status);
      }

      // Filter by date range
      if (startDate) {
        appointments = appointments.filter(apt => apt.date >= startDate);
      }
      if (endDate) {
        appointments = appointments.filter(apt => apt.date <= endDate);
      }

      // Pagination
      const total = appointments.length;
      const startIndex = (page - 1) * limit;
      const paginatedAppointments = appointments.slice(startIndex, startIndex + parseInt(limit));

      // Enrich with user names
      const enrichedAppointments = paginatedAppointments.map(apt => {
        const patient = db.getUserById(apt.patient_id);
        const doctor = db.getUserById(apt.doctor_id);
        return {
          ...apt,
          patient_name: patient?.name || 'Unknown',
          doctor_name: doctor?.name || 'Unknown'
        };
      });

      res.json({
        appointments: enrichedAppointments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get appointments' });
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  });

  // Get single appointment
  app.get('/api/appointments/:id', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const role = req.session.user.role;

      const appointment = db.getAppointmentById(appointmentId);

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Authorization check
      if (role === 'patient' && appointment.patient_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to view this appointment' });
      }
      if (role === 'doctor' && appointment.doctor_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to view this appointment' });
      }

      // Enrich with user names
      const patient = db.getUserById(appointment.patient_id);
      const doctor = db.getUserById(appointment.doctor_id);

      res.json({
        appointment: {
          ...appointment,
          patient_name: patient?.name || 'Unknown',
          doctor_name: doctor?.name || 'Unknown'
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get appointment' });
      res.status(500).json({ error: 'Failed to fetch appointment' });
    }
  });

  // Create appointment
  app.post('/api/appointments', requireAuth, validate(appointmentSchemas.create), (req, res) => {
    try {
      if (!req.session || !req.session.user || !req.session.user.id) {
        logger.warn('Invalid session in appointments POST');
        return res.status(401).json({ error: 'Invalid session. Please login again.' });
      }

      const { date, time, reason, doctor_id } = req.body;
      const userId = req.session.user.id;

      const appointmentData = {
        patient_id: userId,
        doctor_id: doctor_id || 2,
        date,
        time,
        reason
      };

      const appointment = db.createAppointment(appointmentData);
      res.status(201).json({ success: true, appointment });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Create appointment' });
      res.status(500).json({ error: 'Failed to create appointment' });
    }
  });

  // Update appointment
  app.put('/api/appointments/:id', requireAuth, validateParams(paramSchemas.id), validate(appointmentSchemas.update), (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const role = req.session.user.role;

      const appointment = db.getAppointmentById(appointmentId);

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Authorization check - patients can only update their own, doctors their assigned
      if (role === 'patient' && appointment.patient_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to update this appointment' });
      }
      if (role === 'doctor' && appointment.doctor_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to update this appointment' });
      }

      // Patients can only update date/time/reason, not status
      const updateData = { ...req.body };
      if (role === 'patient') {
        delete updateData.status;
      }

      const updatedAppointment = db.updateAppointment(appointmentId, updateData);

      res.json({ success: true, appointment: updatedAppointment });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Update appointment' });
      res.status(500).json({ error: 'Failed to update appointment' });
    }
  });

  // Cancel appointment (DELETE)
  app.delete('/api/appointments/:id', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const role = req.session.user.role;

      const appointment = db.getAppointmentById(appointmentId);

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Authorization check
      if (role === 'patient' && appointment.patient_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to cancel this appointment' });
      }
      if (role === 'doctor' && appointment.doctor_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to cancel this appointment' });
      }

      // Soft delete - set status to cancelled
      const cancelledAppointment = db.updateAppointment(appointmentId, { status: 'cancelled' });

      res.json({ success: true, message: 'Appointment cancelled', appointment: cancelledAppointment });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Cancel appointment' });
      res.status(500).json({ error: 'Failed to cancel appointment' });
    }
  });

  // Confirm appointment (doctor only)
  app.post('/api/appointments/:id/confirm', requireAuth, requireRole('doctor'), validateParams(paramSchemas.id), (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const doctorId = req.session.user.id;

      const appointment = db.getAppointmentById(appointmentId);

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Doctor can only confirm their own appointments
      if (appointment.doctor_id !== doctorId) {
        return res.status(403).json({ error: 'Unauthorized to confirm this appointment' });
      }

      if (appointment.status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot confirm a cancelled appointment' });
      }

      const confirmedAppointment = db.updateAppointment(appointmentId, { status: 'confirmed' });

      res.json({ success: true, message: 'Appointment confirmed', appointment: confirmedAppointment });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Confirm appointment' });
      res.status(500).json({ error: 'Failed to confirm appointment' });
    }
  });

  // Complete appointment (doctor only)
  app.post('/api/appointments/:id/complete', requireAuth, requireRole('doctor'), validateParams(paramSchemas.id), (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const doctorId = req.session.user.id;

      const appointment = db.getAppointmentById(appointmentId);

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      if (appointment.doctor_id !== doctorId) {
        return res.status(403).json({ error: 'Unauthorized to complete this appointment' });
      }

      if (appointment.status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot complete a cancelled appointment' });
      }

      const completedAppointment = db.updateAppointment(appointmentId, { status: 'completed' });

      res.json({ success: true, message: 'Appointment completed', appointment: completedAppointment });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Complete appointment' });
      res.status(500).json({ error: 'Failed to complete appointment' });
    }
  });
}

module.exports = { setupAppointmentRoutes };
