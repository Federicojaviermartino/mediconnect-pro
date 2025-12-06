/**
 * AI Service Tests
 */

const { AIService } = require('../services/ai-service');

describe('AIService', () => {
  let aiService;

  beforeEach(() => {
    aiService = new AIService();
  });

  describe('constructor', () => {
    test('should initialize with no API keys in test environment', () => {
      expect(aiService.hasOpenAI).toBe(false);
      expect(aiService.hasAnthropic).toBe(false);
    });
  });

  describe('transcribeConsultation', () => {
    test('should return mock transcript when no API key', async () => {
      const result = await aiService.transcribeConsultation('audio-data');

      expect(result.success).toBe(true);
      expect(result.transcript).toBeDefined();
      expect(result.transcript.length).toBeGreaterThan(0);
      expect(result.duration).toBe(180);
      expect(result.language).toBe('es');
      expect(result.confidence).toBe(0.95);
    });

    test('should include patient-doctor dialogue in mock transcript', async () => {
      const result = await aiService.transcribeConsultation('audio-data');

      expect(result.transcript).toContain('Paciente');
      expect(result.transcript).toContain('Doctor');
    });
  });

  describe('generateStructuredNotes', () => {
    test('should return structured notes with patient context', async () => {
      const transcript = 'Patient complains of headache for 3 days';
      const patientContext = {
        name: 'John Doe',
        age: 35,
        conditions: 'Hypertension',
        allergies: 'Penicillin'
      };

      const result = await aiService.generateStructuredNotes(transcript, patientContext);

      expect(result.success).toBe(true);
      expect(result.notes).toBeDefined();
      expect(result.notes.chiefComplaint).toBeDefined();
      expect(result.notes.assessment).toBeDefined();
      expect(result.notes.plan).toBeDefined();
    });

    test('should return structured notes without patient context', async () => {
      const transcript = 'Patient complains of headache';

      const result = await aiService.generateStructuredNotes(transcript);

      expect(result.success).toBe(true);
      expect(result.notes).toBeDefined();
    });

    test('should include all medical note components', async () => {
      const result = await aiService.generateStructuredNotes('test transcript');

      const notes = result.notes;
      expect(notes).toHaveProperty('chiefComplaint');
      expect(notes).toHaveProperty('historyOfPresentIllness');
      expect(notes).toHaveProperty('symptoms');
      expect(notes).toHaveProperty('physicalExamination');
      expect(notes).toHaveProperty('assessment');
      expect(notes).toHaveProperty('plan');
      expect(notes).toHaveProperty('prescriptions');
      expect(notes).toHaveProperty('followUp');
      expect(notes).toHaveProperty('redFlags');
    });

    test('should include symptoms as array', async () => {
      const result = await aiService.generateStructuredNotes('test transcript');

      expect(Array.isArray(result.notes.symptoms)).toBe(true);
      expect(result.notes.symptoms.length).toBeGreaterThan(0);
    });

    test('should include prescriptions with medication details', async () => {
      const result = await aiService.generateStructuredNotes('test transcript');

      expect(Array.isArray(result.notes.prescriptions)).toBe(true);
      if (result.notes.prescriptions.length > 0) {
        const prescription = result.notes.prescriptions[0];
        expect(prescription).toHaveProperty('medication');
        expect(prescription).toHaveProperty('dosage');
        expect(prescription).toHaveProperty('frequency');
        expect(prescription).toHaveProperty('duration');
      }
    });
  });

  describe('generateMedicalReport', () => {
    const consultationData = {
      patient: {
        name: 'John Doe',
        age: 45,
        allergies: 'Penicillin',
        conditions: 'Diabetes Type 2, Hypertension'
      },
      doctor: {
        name: 'Smith',
        specialization: 'Internal Medicine'
      },
      notes: {
        chiefComplaint: 'Headache',
        assessment: 'Tension headache',
        plan: 'Rest and medication'
      },
      date: '2024-01-15'
    };

    test('should generate comprehensive medical report', async () => {
      const result = await aiService.generateMedicalReport(consultationData);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(typeof result.report).toBe('string');
      expect(result.patientSummary).toBeDefined();
    });

    test('should include patient name in report', async () => {
      const result = await aiService.generateMedicalReport(consultationData);

      expect(result.report).toContain('John Doe');
    });

    test('should include doctor name in report', async () => {
      const result = await aiService.generateMedicalReport(consultationData);

      expect(result.report).toContain('Smith');
    });

    test('should include date in report', async () => {
      const result = await aiService.generateMedicalReport(consultationData);

      expect(result.report).toContain('2024-01-15');
    });

    test('should include patient-friendly summary', async () => {
      const result = await aiService.generateMedicalReport(consultationData);

      expect(result.patientSummary).toBeDefined();
      expect(typeof result.patientSummary).toBe('string');
    });

    test('should handle minimal consultation data', async () => {
      const minimalData = {
        patient: { name: 'Jane Doe', age: 30 },
        doctor: { name: 'Jones', specialization: 'General' },
        notes: {},
        date: '2024-01-15'
      };

      const result = await aiService.generateMedicalReport(minimalData);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
    });
  });

  describe('generatePatientSummary', () => {
    test('should generate summary from medical report', async () => {
      const medicalReport = 'Test medical report content';
      const patientName = 'Test Patient';

      const result = await aiService.generatePatientSummary(medicalReport, patientName);

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
    });

    test('should return mock summary when no API keys', async () => {
      const result = await aiService.generatePatientSummary('report', 'Patient');

      expect(result.success).toBe(true);
      expect(result.summary).toBe('Summary generated in mock mode');
    });
  });

  describe('triageSymptoms', () => {
    test('should return triage assessment', async () => {
      const symptoms = 'Headache for 3 days, nausea, sensitivity to light';
      const patientData = {
        age: 35,
        sex: 'male',
        conditions: 'None'
      };

      const result = await aiService.triageSymptoms(symptoms, patientData);

      expect(result.success).toBe(true);
      expect(result.triage).toBeDefined();
    });

    test('should include urgency level', async () => {
      const result = await aiService.triageSymptoms('headache', {});

      expect(result.triage).toHaveProperty('urgencyLevel');
      expect(['low', 'medium', 'high', 'emergency']).toContain(result.triage.urgencyLevel);
    });

    test('should include urgency reason', async () => {
      const result = await aiService.triageSymptoms('headache', {});

      expect(result.triage).toHaveProperty('urgencyReason');
      expect(typeof result.triage.urgencyReason).toBe('string');
    });

    test('should include possible conditions', async () => {
      const result = await aiService.triageSymptoms('headache', {});

      expect(result.triage).toHaveProperty('possibleConditions');
      expect(Array.isArray(result.triage.possibleConditions)).toBe(true);
    });

    test('should include recommended specialty', async () => {
      const result = await aiService.triageSymptoms('headache', {});

      expect(result.triage).toHaveProperty('recommendedSpecialty');
    });

    test('should include red flags', async () => {
      const result = await aiService.triageSymptoms('headache', {});

      expect(result.triage).toHaveProperty('redFlags');
      expect(Array.isArray(result.triage.redFlags)).toBe(true);
    });

    test('should include immediate action flag', async () => {
      const result = await aiService.triageSymptoms('headache', {});

      expect(result.triage).toHaveProperty('immediateAction');
      expect(typeof result.triage.immediateAction).toBe('boolean');
    });

    test('should include recommendations', async () => {
      const result = await aiService.triageSymptoms('headache', {});

      expect(result.triage).toHaveProperty('recommendations');
      expect(Array.isArray(result.triage.recommendations)).toBe(true);
    });

    test('should include follow-up questions', async () => {
      const result = await aiService.triageSymptoms('headache', {});

      expect(result.triage).toHaveProperty('questions');
      expect(Array.isArray(result.triage.questions)).toBe(true);
    });

    test('should handle minimal patient data', async () => {
      const result = await aiService.triageSymptoms('Minor headache', {});

      expect(result.success).toBe(true);
      expect(result.triage).toBeDefined();
    });

    test('should return medium urgency for mock response', async () => {
      const result = await aiService.triageSymptoms('headache', {});

      // Mock always returns medium urgency
      expect(result.triage.urgencyLevel).toBe('medium');
    });
  });

  describe('mock response validation', () => {
    test('all mock responses should be properly formatted', async () => {
      // Test that all methods return proper structure
      const transcription = await aiService.transcribeConsultation('test');
      expect(transcription).toHaveProperty('success');
      expect(transcription.success).toBe(true);

      const notes = await aiService.generateStructuredNotes('test');
      expect(notes).toHaveProperty('success');
      expect(notes.success).toBe(true);

      const report = await aiService.generateMedicalReport({
        patient: { name: 'Test', age: 30 },
        doctor: { name: 'Dr Test', specialization: 'General' },
        notes: {},
        date: '2024-01-01'
      });
      expect(report).toHaveProperty('success');
      expect(report.success).toBe(true);

      const triage = await aiService.triageSymptoms('test symptoms', {});
      expect(triage).toHaveProperty('success');
      expect(triage.success).toBe(true);

      const summary = await aiService.generatePatientSummary('report', 'Patient');
      expect(summary).toHaveProperty('success');
      expect(summary.success).toBe(true);
    });
  });
});
