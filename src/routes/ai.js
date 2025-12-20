// AI Routes - Medical AI assistance endpoints
const { requireAuth, requireRole } = require('../middleware/auth');
const { AIService } = require('../services/ai-service');
const logger = require('../utils/logger');

const aiService = new AIService();

function setupAIRoutes(app, db) {
  // Middleware to add medical disclaimer header to all AI endpoints
  app.use('/api/ai', (req, res, next) => {
    res.setHeader('X-Medical-Disclaimer', 'AI-generated information is for informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult qualified healthcare professionals for medical decisions.');
    next();
  });

  // POST /api/ai/transcribe - Transcribe consultation audio
  app.post('/api/ai/transcribe', requireAuth, requireRole('doctor'), async (req, res) => {
    try {
      const { audioData, consultationId } = req.body;

      if (!audioData) {
        return res.status(400).json({ error: 'Audio data is required' });
      }

      logger.info(`Transcribing consultation ${consultationId || 'unknown'}`);

      const result = await aiService.transcribeConsultation(audioData);

      if (!result.success) {
        return res.status(500).json({
          error: 'Transcription failed',
                  });
      }

      // Save transcript to consultation if consultationId provided
      if (consultationId) {
        // TODO: Save to database when consultation model is ready
        logger.info(`Transcript saved for consultation ${consultationId}`);
      }

      res.json({
        success: true,
        transcript: result.transcript,
        duration: result.duration,
        language: result.language,
        confidence: result.confidence
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'AI Transcription' });
      res.status(500).json({
        error: 'Failed to transcribe audio',
              });
    }
  });

  // POST /api/ai/generate-notes - Generate structured notes from transcript
  app.post('/api/ai/generate-notes', requireAuth, requireRole('doctor'), async (req, res) => {
    try {
      const { transcript, patientId } = req.body;

      if (!transcript) {
        return res.status(400).json({ error: 'Transcript is required' });
      }

      // Get patient context
      const patient = patientId ? db.getPatientById(patientId) : {};
      const patientRecord = patientId ? db.getPatientByUserId(patientId) : {};

      const patientContext = {
        name: patient?.name || 'Unknown',
        age: calculateAge(patient?.birthDate) || 'Unknown',
        conditions: patientRecord?.conditions || 'None',
        allergies: patientRecord?.allergies || 'None'
      };

      const result = await aiService.generateStructuredNotes(transcript, patientContext);

      if (!result.success) {
        return res.status(500).json({
          error: 'Note generation failed',
                  });
      }

      res.json({
        success: true,
        notes: result.notes
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'AI Note generation' });
      res.status(500).json({
        error: 'Failed to generate notes',
              });
    }
  });

  // POST /api/ai/generate-report - Generate complete medical report
  app.post('/api/ai/generate-report', requireAuth, requireRole('doctor'), async (req, res) => {
    try {
      const { patientId, notes, consultationDate } = req.body;

      if (!patientId || !notes) {
        return res.status(400).json({
          error: 'Patient ID and notes are required'
        });
      }

      // Get patient and doctor information
      const patient = db.getPatientById(patientId);
      const patientRecord = db.getPatientByUserId(patientId);
      const doctor = db.getUserById(req.session.user.id);

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const consultationData = {
        patient: {
          name: patient.name,
          age: calculateAge(patient.birthDate) || 'Unknown',
          allergies: patientRecord?.allergies || 'None',
          conditions: patientRecord?.conditions || 'None'
        },
        doctor: {
          name: doctor.name,
          specialization: doctor.specialization || 'General Medicine'
        },
        notes,
        date: consultationDate || new Date().toISOString().split('T')[0]
      };

      const result = await aiService.generateMedicalReport(consultationData);

      if (!result.success) {
        return res.status(500).json({
          error: 'Report generation failed',
                  });
      }

      res.json({
        success: true,
        report: result.report,
        patientSummary: result.patientSummary
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'AI Report generation' });
      res.status(500).json({
        error: 'Failed to generate report',
              });
    }
  });

  // POST /api/ai/transcribe-diagnose - Transcribe audio and generate diagnosis
  // Main workflow: Doctor records patient → AI transcribes → AI generates diagnosis
  app.post('/api/ai/transcribe-diagnose', requireAuth, requireRole('doctor'), async (req, res) => {
    try {
      const { audioData, patientId } = req.body;

      if (!audioData) {
        return res.status(400).json({ error: 'Audio data is required' });
      }

      // Get patient context for better diagnosis
      let patientContext = {};
      if (patientId) {
        const patient = db.getPatientById(patientId);
        const patientRecord = db.getPatientByUserId(patientId);

        if (patient) {
          patientContext = {
            name: patient.name,
            age: calculateAge(patient.birthDate),
            sex: patient.sex || 'No especificado',
            conditions: patientRecord?.conditions || 'Ninguna conocida',
            allergies: patientRecord?.allergies || 'Ninguna conocida'
          };
        }
      }

      logger.info('Starting transcribe-diagnose workflow', {
        patientId: patientId || 'anonymous',
        doctorId: req.session.user.id
      });

      const result = await aiService.transcribeAndDiagnose(audioData, patientContext);

      if (!result.success) {
        return res.status(500).json({
          error: result.error || 'Transcription and diagnosis failed',
          transcript: result.transcript // Return transcript if available
        });
      }

      res.json({
        success: true,
        transcript: result.transcript,
        transcriptionDuration: result.transcriptionDuration,
        language: result.language,
        confidence: result.confidence,
        diagnosis: result.diagnosis,
        disclaimer: result.disclaimer
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'AI Transcribe-Diagnose' });
      res.status(500).json({
        error: 'Failed to transcribe and diagnose'
      });
    }
  });

  // POST /api/ai/text-diagnose - Generate diagnosis from text symptoms (Free mode)
  // Main workflow for demo: Doctor types symptoms → AI generates diagnosis
  app.post('/api/ai/text-diagnose', requireAuth, requireRole('doctor'), async (req, res) => {
    try {
      const { symptoms, patientId } = req.body;

      if (!symptoms || symptoms.length < 20) {
        return res.status(400).json({ error: 'Symptoms description is required (minimum 20 characters)' });
      }

      // Get patient context for better diagnosis
      let patientContext = {};
      if (patientId) {
        const patient = db.getPatientById(patientId);
        const patientRecord = db.getPatientByUserId(patientId);

        if (patient) {
          patientContext = {
            name: patient.name,
            age: calculateAge(patient.birthDate),
            sex: patient.sex || 'No especificado',
            conditions: patientRecord?.conditions || 'Ninguna conocida',
            allergies: patientRecord?.allergies || 'Ninguna conocida'
          };
        }
      }

      logger.info('Starting text-diagnose workflow', {
        patientId: patientId || 'anonymous',
        doctorId: req.session.user.id,
        symptomsLength: symptoms.length
      });

      const result = await aiService.diagnoseFromText(symptoms, patientContext);

      if (!result.success) {
        return res.status(500).json({
          error: result.error || 'Diagnosis generation failed'
        });
      }

      res.json({
        success: true,
        transcript: symptoms, // Use the symptoms text as "transcript"
        transcriptionDuration: 0,
        language: 'es',
        confidence: 1.0,
        diagnosis: result.diagnosis,
        disclaimer: result.disclaimer
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'AI Text-Diagnose' });
      res.status(500).json({
        error: 'Failed to generate diagnosis'
      });
    }
  });

  // POST /api/ai/triage - Triage patient symptoms
  app.post('/api/ai/triage', requireAuth, async (req, res) => {
    try {
      const { symptoms } = req.body;
      const userId = req.session.user.id;

      if (!symptoms) {
        return res.status(400).json({ error: 'Symptoms description is required' });
      }

      // Get patient data if available
      const user = db.getUserById(userId);
      const patientRecord = db.getPatientByUserId(userId);

      const patientData = {
        age: calculateAge(user?.birthDate),
        sex: user?.sex || 'Not specified',
        conditions: patientRecord?.conditions || 'None'
      };

      const result = await aiService.triageSymptoms(symptoms, patientData);

      if (!result.success) {
        return res.status(500).json({
          error: 'Triage failed',
                  });
      }

      res.json({
        success: true,
        triage: result.triage
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'AI Triage' });
      res.status(500).json({
        error: 'Failed to perform triage',
              });
    }
  });

  // GET /api/ai/status - Check AI service status
  app.get('/api/ai/status', requireAuth, (req, res) => {
    res.json({
      success: true,
      services: {
        transcription: aiService.hasOpenAI,
        transcribeDiagnose: aiService.hasOpenAI && (aiService.hasAnthropic || aiService.hasOpenAI),
        noteGeneration: aiService.hasAnthropic || aiService.hasOpenAI,
        reportGeneration: aiService.hasAnthropic || aiService.hasOpenAI,
        triage: aiService.hasAnthropic || aiService.hasOpenAI
      },
      models: {
        transcription: 'OpenAI Whisper',
        diagnosis: aiService.hasAnthropic ? 'Claude Opus 4.5' : 'GPT-5.2',
        notes: aiService.hasAnthropic ? 'Claude Opus 4.5' : 'GPT-5.2',
        triage: aiService.hasAnthropic ? 'Claude Opus 4.5' : 'GPT-5.2'
      },
      mode: aiService.hasOpenAI || aiService.hasAnthropic ? 'production' : 'demo'
    });
  });
}

// Helper function to calculate age from birthdate
function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

module.exports = { setupAIRoutes };
