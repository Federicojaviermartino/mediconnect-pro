// Video Consultation routes
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateParams, paramSchemas } = require('../middleware/validators');
const logger = require('../utils/logger');

function setupConsultationRoutes(app, db) {
  // In-memory storage for consultations (would be in database in production)
  const consultations = [];
  let consultationIdCounter = 1;

  // Get helper to find consultation
  const findConsultation = (id) => consultations.find(c => c.id === parseInt(id));

  // Initiate a video consultation
  app.post('/api/consultations/initiate', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { appointmentId, patientId, notes } = req.body;

      // Validate required fields based on role
      if (userRole === 'doctor' && !patientId) {
        return res.status(400).json({ error: 'Patient ID is required for doctors' });
      }

      // Determine patient and doctor IDs
      let patient_id, doctor_id;
      if (userRole === 'patient') {
        patient_id = userId;
        doctor_id = req.body.doctor_id || 2; // Default to Dr. Smith
      } else if (userRole === 'doctor') {
        doctor_id = userId;
        patient_id = patientId;
      } else {
        return res.status(403).json({ error: 'Only patients and doctors can initiate consultations' });
      }

      // Generate room ID (would integrate with WebRTC service in production)
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const consultation = {
        id: consultationIdCounter++,
        appointment_id: appointmentId || null,
        patient_id,
        doctor_id,
        room_id: roomId,
        status: 'waiting',
        initiated_by: userId,
        initiated_at: new Date().toISOString(),
        notes: notes || '',
        participants: [],
        recording_available: false
      };

      consultations.push(consultation);

      // Enrich with user names
      const patient = db.getUserById(patient_id);
      const doctor = db.getUserById(doctor_id);

      res.status(201).json({
        success: true,
        consultation: {
          ...consultation,
          patient_name: patient?.name || 'Unknown',
          doctor_name: doctor?.name || 'Unknown',
          // Mock WebRTC connection info
          connection: {
            room_id: roomId,
            signaling_server: 'wss://mediconnect.demo/rtc',
            ice_servers: [
              { urls: 'stun:stun.l.google.com:19302' }
            ]
          }
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Initiate consultation' });
      res.status(500).json({ error: 'Failed to initiate consultation' });
    }
  });

  // Get consultation history - MUST be before /:id route
  app.get('/api/consultations/history', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { page = 1, limit = 10, status } = req.query;

      let userConsultations;

      if (userRole === 'admin') {
        userConsultations = [...consultations];
      } else if (userRole === 'doctor') {
        userConsultations = consultations.filter(c => c.doctor_id === userId);
      } else {
        userConsultations = consultations.filter(c => c.patient_id === userId);
      }

      // Filter by status
      if (status && ['waiting', 'in_progress', 'ended'].includes(status)) {
        userConsultations = userConsultations.filter(c => c.status === status);
      }

      // Sort by most recent
      userConsultations.sort((a, b) =>
        new Date(b.initiated_at) - new Date(a.initiated_at)
      );

      // Pagination
      const total = userConsultations.length;
      const startIndex = (page - 1) * limit;
      const paginatedConsultations = userConsultations.slice(startIndex, startIndex + parseInt(limit));

      // Enrich with user names
      const enrichedConsultations = paginatedConsultations.map(c => {
        const patient = db.getUserById(c.patient_id);
        const doctor = db.getUserById(c.doctor_id);
        return {
          ...c,
          patient_name: patient?.name || 'Unknown',
          doctor_name: doctor?.name || 'Unknown'
        };
      });

      res.json({
        consultations: enrichedConsultations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get consultation history' });
      res.status(500).json({ error: 'Failed to fetch consultation history' });
    }
  });

  // Get active consultation for user - MUST be before /:id route
  app.get('/api/consultations/active', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;

      const activeConsultation = consultations.find(c =>
        (c.patient_id === userId || c.doctor_id === userId) &&
        ['waiting', 'in_progress'].includes(c.status)
      );

      if (!activeConsultation) {
        return res.json({ active: false, consultation: null });
      }

      const patient = db.getUserById(activeConsultation.patient_id);
      const doctor = db.getUserById(activeConsultation.doctor_id);

      res.json({
        active: true,
        consultation: {
          ...activeConsultation,
          patient_name: patient?.name || 'Unknown',
          doctor_name: doctor?.name || 'Unknown'
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get active consultation' });
      res.status(500).json({ error: 'Failed to check active consultation' });
    }
  });

  // Get consultation details
  app.get('/api/consultations/:id', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const consultationId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      const consultation = findConsultation(consultationId);

      if (!consultation) {
        return res.status(404).json({ error: 'Consultation not found' });
      }

      // Authorization check
      if (userRole !== 'admin' &&
          consultation.patient_id !== userId &&
          consultation.doctor_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to view this consultation' });
      }

      const patient = db.getUserById(consultation.patient_id);
      const doctor = db.getUserById(consultation.doctor_id);

      res.json({
        consultation: {
          ...consultation,
          patient_name: patient?.name || 'Unknown',
          doctor_name: doctor?.name || 'Unknown'
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get consultation' });
      res.status(500).json({ error: 'Failed to fetch consultation' });
    }
  });

  // Join consultation
  app.post('/api/consultations/:id/join', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const consultationId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const userName = req.session.user.name;

      const consultation = findConsultation(consultationId);

      if (!consultation) {
        return res.status(404).json({ error: 'Consultation not found' });
      }

      // Only patient and doctor can join
      if (consultation.patient_id !== userId && consultation.doctor_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to join this consultation' });
      }

      // Check if already ended
      if (consultation.status === 'ended') {
        return res.status(400).json({ error: 'Consultation has already ended' });
      }

      // Add participant if not already joined
      if (!consultation.participants.find(p => p.user_id === userId)) {
        consultation.participants.push({
          user_id: userId,
          name: userName,
          joined_at: new Date().toISOString()
        });
      }

      // Update status if both participants joined
      if (consultation.participants.length >= 2) {
        consultation.status = 'in_progress';
        consultation.started_at = consultation.started_at || new Date().toISOString();
      }

      res.json({
        success: true,
        message: 'Joined consultation',
        consultation: {
          id: consultation.id,
          room_id: consultation.room_id,
          status: consultation.status,
          participants: consultation.participants
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Join consultation' });
      res.status(500).json({ error: 'Failed to join consultation' });
    }
  });

  // End consultation
  app.post('/api/consultations/:id/end', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const consultationId = parseInt(req.params.id);
      const userId = req.session.user.id;

      const consultation = findConsultation(consultationId);

      if (!consultation) {
        return res.status(404).json({ error: 'Consultation not found' });
      }

      // Only doctor can end consultation
      if (consultation.doctor_id !== userId) {
        return res.status(403).json({ error: 'Only the doctor can end the consultation' });
      }

      if (consultation.status === 'ended') {
        return res.status(400).json({ error: 'Consultation already ended' });
      }

      consultation.status = 'ended';
      consultation.ended_at = new Date().toISOString();

      // Calculate duration
      if (consultation.started_at) {
        const duration = new Date(consultation.ended_at) - new Date(consultation.started_at);
        consultation.duration_minutes = Math.round(duration / 60000);
      }

      res.json({
        success: true,
        message: 'Consultation ended',
        consultation: {
          id: consultation.id,
          status: consultation.status,
          duration_minutes: consultation.duration_minutes,
          ended_at: consultation.ended_at
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'End consultation' });
      res.status(500).json({ error: 'Failed to end consultation' });
    }
  });

  // Save consultation notes
  app.post('/api/consultations/:id/notes', requireAuth, requireRole('doctor'), validateParams(paramSchemas.id), (req, res) => {
    try {
      const consultationId = parseInt(req.params.id);
      const doctorId = req.session.user.id;
      const { notes, diagnosis, recommendations, followUp } = req.body;

      const consultation = findConsultation(consultationId);

      if (!consultation) {
        return res.status(404).json({ error: 'Consultation not found' });
      }

      if (consultation.doctor_id !== doctorId) {
        return res.status(403).json({ error: 'Unauthorized to add notes to this consultation' });
      }

      consultation.clinical_notes = {
        notes: notes || '',
        diagnosis: diagnosis || '',
        recommendations: recommendations || '',
        followUp: followUp || null,
        created_at: new Date().toISOString(),
        created_by: doctorId
      };

      res.json({
        success: true,
        message: 'Consultation notes saved',
        notes: consultation.clinical_notes
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Save consultation notes' });
      res.status(500).json({ error: 'Failed to save notes' });
    }
  });

}

module.exports = { setupConsultationRoutes };
