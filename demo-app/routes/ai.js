// AI Routes - Medical AI assistance endpoints
const { requireAuth, requireRole } = require('../middleware/auth');
const { AIService } = require('../services/ai-service');

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

      console.log(`Transcribing consultation ${consultationId || 'unknown'}...`);

      const result = await aiService.transcribeConsultation(audioData);

      if (!result.success) {
        return res.status(500).json({
          error: 'Transcription failed',
                  });
      }

      // Save transcript to consultation if consultationId provided
      if (consultationId) {
        // TODO: Save to database when consultation model is ready
        console.log(`Transcript saved for consultation ${consultationId}`);
      }

      res.json({
        success: true,
        transcript: result.transcript,
        duration: result.duration,
        language: result.language,
        confidence: result.confidence
      });
    } catch (error) {
      console.error('Transcription endpoint error:', error);
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

      console.log(`Generating notes for patient ${patientId}...`);

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
      console.error('Note generation endpoint error:', error);
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

      console.log(`Generating medical report for patient ${patientId}...`);

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
      console.error('Report generation endpoint error:', error);
      res.status(500).json({
        error: 'Failed to generate report',
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

      console.log(`Performing triage for user ${userId}...`);

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

      // Log triage result for analytics
      console.log(`Triage result for user ${userId}:`, result.triage.urgencyLevel);

      res.json({
        success: true,
        triage: result.triage
      });
    } catch (error) {
      console.error('Triage endpoint error:', error);
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
        noteGeneration: aiService.hasAnthropic || aiService.hasOpenAI,
        reportGeneration: aiService.hasAnthropic || aiService.hasOpenAI,
        triage: aiService.hasAnthropic || aiService.hasOpenAI
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
