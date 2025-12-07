// Medical Records routes
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateParams, paramSchemas } = require('../middleware/validators');
const logger = require('../utils/logger');

function setupMedicalRecordsRoutes(app, db) {
  // In-memory storage for medical records (would be in database/file storage in production)
  const medicalRecords = [];
  let recordIdCounter = 1;

  const findRecord = (id) => medicalRecords.find(r => r.id === parseInt(id));

  // Get all medical records for a patient
  app.get('/api/medical-records', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { patientId, type, page = 1, limit = 20 } = req.query;

      let records;

      if (userRole === 'admin') {
        records = [...medicalRecords];
        if (patientId) {
          records = records.filter(r => r.patient_id === parseInt(patientId));
        }
      } else if (userRole === 'doctor') {
        // Doctors can see records for their patients
        if (patientId) {
          records = medicalRecords.filter(r => r.patient_id === parseInt(patientId));
        } else {
          // Get all records the doctor has access to
          records = medicalRecords.filter(r => r.uploaded_by === userId || r.shared_with?.includes(userId));
        }
      } else {
        // Patients see only their own records
        records = medicalRecords.filter(r => r.patient_id === userId);
      }

      // Filter by type
      if (type) {
        records = records.filter(r => r.type === type);
      }

      // Sort by most recent
      records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Pagination
      const total = records.length;
      const startIndex = (page - 1) * limit;
      const paginatedRecords = records.slice(startIndex, startIndex + parseInt(limit));

      // Enrich with user names
      const enrichedRecords = paginatedRecords.map(r => {
        const patient = db.getUserById(r.patient_id);
        const uploader = db.getUserById(r.uploaded_by);
        return {
          ...r,
          patient_name: patient?.name || 'Unknown',
          uploaded_by_name: uploader?.name || 'Unknown'
        };
      });

      res.json({
        records: enrichedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get medical records' });
      res.status(500).json({ error: 'Failed to fetch medical records' });
    }
  });

  // Get single medical record
  app.get('/api/medical-records/:id', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const recordId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      const record = findRecord(recordId);

      if (!record) {
        return res.status(404).json({ error: 'Medical record not found' });
      }

      // Authorization check
      if (userRole === 'patient' && record.patient_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to view this record' });
      }

      const patient = db.getUserById(record.patient_id);
      const uploader = db.getUserById(record.uploaded_by);

      res.json({
        record: {
          ...record,
          patient_name: patient?.name || 'Unknown',
          uploaded_by_name: uploader?.name || 'Unknown'
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get medical record' });
      res.status(500).json({ error: 'Failed to fetch medical record' });
    }
  });

  // Upload/create a medical record
  app.post('/api/medical-records', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { patientId, type, title, description, content, fileData } = req.body;

      // Validate required fields
      if (!title || !type) {
        return res.status(400).json({ error: 'Title and type are required' });
      }

      // Validate type
      const validTypes = ['lab_result', 'imaging', 'prescription', 'note', 'report', 'vaccination', 'other'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid record type' });
      }

      // Determine patient ID
      let patient_id;
      if (userRole === 'patient') {
        patient_id = userId;
      } else if (userRole === 'doctor' || userRole === 'admin') {
        if (!patientId) {
          return res.status(400).json({ error: 'Patient ID is required' });
        }
        patient_id = parseInt(patientId);
        // Verify patient exists
        const patient = db.getUserById(patient_id);
        if (!patient || patient.role !== 'patient') {
          return res.status(404).json({ error: 'Patient not found' });
        }
      } else {
        return res.status(403).json({ error: 'Unauthorized to upload records' });
      }

      const record = {
        id: recordIdCounter++,
        patient_id,
        type,
        title,
        description: description || '',
        content: content || null,
        file_name: fileData?.name || null,
        file_type: fileData?.type || null,
        file_size: fileData?.size || null,
        file_url: fileData ? `/api/medical-records/${recordIdCounter - 1}/file` : null,
        uploaded_by: userId,
        shared_with: [],
        created_at: new Date().toISOString()
      };

      medicalRecords.push(record);

      const patient = db.getUserById(patient_id);
      const uploader = db.getUserById(userId);

      res.status(201).json({
        success: true,
        record: {
          ...record,
          patient_name: patient?.name || 'Unknown',
          uploaded_by_name: uploader?.name || 'Unknown'
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Create medical record' });
      res.status(500).json({ error: 'Failed to create medical record' });
    }
  });

  // Update a medical record
  app.put('/api/medical-records/:id', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const recordId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { title, description, content } = req.body;

      const record = findRecord(recordId);

      if (!record) {
        return res.status(404).json({ error: 'Medical record not found' });
      }

      // Only uploader, admin, or the patient's assigned doctor can update
      if (userRole === 'patient' && record.patient_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to update this record' });
      }

      if (userRole === 'doctor' && record.uploaded_by !== userId) {
        return res.status(403).json({ error: 'Only the doctor who uploaded can update' });
      }

      if (title) record.title = title;
      if (description !== undefined) record.description = description;
      if (content !== undefined) record.content = content;
      record.updated_at = new Date().toISOString();
      record.updated_by = userId;

      res.json({
        success: true,
        record
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Update medical record' });
      res.status(500).json({ error: 'Failed to update medical record' });
    }
  });

  // Delete a medical record
  app.delete('/api/medical-records/:id', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const recordId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      const recordIndex = medicalRecords.findIndex(r => r.id === recordId);

      if (recordIndex === -1) {
        return res.status(404).json({ error: 'Medical record not found' });
      }

      const record = medicalRecords[recordIndex];

      // Only uploader or admin can delete
      if (userRole !== 'admin' && record.uploaded_by !== userId) {
        return res.status(403).json({ error: 'Unauthorized to delete this record' });
      }

      medicalRecords.splice(recordIndex, 1);

      res.json({
        success: true,
        message: 'Medical record deleted'
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Delete medical record' });
      res.status(500).json({ error: 'Failed to delete medical record' });
    }
  });

  // Share a medical record
  app.post('/api/medical-records/:id/share', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const recordId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const { doctorId } = req.body;

      const record = findRecord(recordId);

      if (!record) {
        return res.status(404).json({ error: 'Medical record not found' });
      }

      // Only patient can share their own records
      if (record.patient_id !== userId) {
        return res.status(403).json({ error: 'Only the patient can share their records' });
      }

      if (!doctorId) {
        return res.status(400).json({ error: 'Doctor ID is required' });
      }

      const doctor = db.getUserById(doctorId);
      if (!doctor || doctor.role !== 'doctor') {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      if (!record.shared_with.includes(doctorId)) {
        record.shared_with.push(doctorId);
      }

      res.json({
        success: true,
        message: `Record shared with ${doctor.name}`,
        shared_with: record.shared_with
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Share medical record' });
      res.status(500).json({ error: 'Failed to share medical record' });
    }
  });

  // Get record types summary
  app.get('/api/medical-records/types/summary', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      let userRecords;
      if (userRole === 'admin') {
        userRecords = medicalRecords;
      } else if (userRole === 'patient') {
        userRecords = medicalRecords.filter(r => r.patient_id === userId);
      } else {
        userRecords = medicalRecords.filter(r => r.uploaded_by === userId || r.shared_with?.includes(userId));
      }

      const summary = {
        lab_result: userRecords.filter(r => r.type === 'lab_result').length,
        imaging: userRecords.filter(r => r.type === 'imaging').length,
        prescription: userRecords.filter(r => r.type === 'prescription').length,
        note: userRecords.filter(r => r.type === 'note').length,
        report: userRecords.filter(r => r.type === 'report').length,
        vaccination: userRecords.filter(r => r.type === 'vaccination').length,
        other: userRecords.filter(r => r.type === 'other').length,
        total: userRecords.length
      };

      res.json({ summary });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get types summary' });
      res.status(500).json({ error: 'Failed to get summary' });
    }
  });
}

module.exports = { setupMedicalRecordsRoutes };
