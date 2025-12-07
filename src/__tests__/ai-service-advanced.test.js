/**
 * AI Service Advanced Coverage Tests
 * Comprehensive tests to achieve 90%+ coverage for mock paths
 */

const { AIService } = require('../services/ai-service');

describe('AIService - Advanced Coverage (Mock Paths)', () => {
  let service;

  beforeEach(() => {
    service = new AIService();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize service instance', () => {
      expect(service).toBeInstanceOf(AIService);
      expect(service.hasOpenAI).toBeDefined();
      expect(service.hasAnthropic).toBeDefined();
    });

    it('should have boolean flags for API availability', () => {
      expect(typeof service.hasOpenAI).toBe('boolean');
      expect(typeof service.hasAnthropic).toBe('boolean');
    });
  });

  describe('transcribeConsultation - Mock Mode', () => {
    it('should return successful mock transcription', async () => {
      const result = await service.transcribeConsultation('audio-data');

      expect(result.success).toBe(true);
      expect(result.transcript).toBeDefined();
      expect(typeof result.transcript).toBe('string');
      expect(result.duration).toBe(180);
      expect(result.language).toBe('es');
      expect(result.confidence).toBe(0.95);
    });

    it('should include medical dialogue in transcript', async () => {
      const result = await service.transcribeConsultation('audio-data');

      expect(result.transcript).toContain('Paciente');
      expect(result.transcript).toContain('Doctor');
      expect(result.transcript).toContain('dolor de cabeza');
    });

    it('should include complete consultation flow', async () => {
      const result = await service.transcribeConsultation('some-audio');

      expect(result.transcript).toContain('Buenos días doctor');
      expect(result.transcript).toContain('náuseas');
      expect(result.transcript).toContain('sensibilidad a la luz');
      expect(result.transcript).toContain('migrañas');
    });

    it('should always return consistent mock data structure', async () => {
      const result1 = await service.transcribeConsultation('audio1');
      const result2 = await service.transcribeConsultation('audio2');

      expect(result1.success).toBe(result2.success);
      expect(result1.duration).toBe(result2.duration);
      expect(result1.language).toBe(result2.language);
      expect(result1.confidence).toBe(result2.confidence);
    });
  });

  describe('generateStructuredNotes - Mock Mode', () => {
    it('should generate structured medical notes from transcript', async () => {
      const transcript = 'Patient complains of headache for 3 days';
      const result = await service.generateStructuredNotes(transcript);

      expect(result.success).toBe(true);
      expect(result.notes).toBeDefined();
      expect(typeof result.notes).toBe('object');
    });

    it('should include all required medical note fields', async () => {
      const result = await service.generateStructuredNotes('test transcript');

      expect(result.notes).toHaveProperty('chiefComplaint');
      expect(result.notes).toHaveProperty('historyOfPresentIllness');
      expect(result.notes).toHaveProperty('symptoms');
      expect(result.notes).toHaveProperty('physicalExamination');
      expect(result.notes).toHaveProperty('assessment');
      expect(result.notes).toHaveProperty('plan');
      expect(result.notes).toHaveProperty('prescriptions');
      expect(result.notes).toHaveProperty('followUp');
      expect(result.notes).toHaveProperty('redFlags');
    });

    it('should return symptoms as an array', async () => {
      const result = await service.generateStructuredNotes('headache symptoms');

      expect(Array.isArray(result.notes.symptoms)).toBe(true);
      expect(result.notes.symptoms.length).toBeGreaterThan(0);
    });

    it('should include prescription details', async () => {
      const result = await service.generateStructuredNotes('prescription needed');

      expect(Array.isArray(result.notes.prescriptions)).toBe(true);
      expect(result.notes.prescriptions.length).toBeGreaterThan(0);

      const prescription = result.notes.prescriptions[0];
      expect(prescription).toHaveProperty('medication');
      expect(prescription).toHaveProperty('dosage');
      expect(prescription).toHaveProperty('frequency');
      expect(prescription).toHaveProperty('duration');
    });

    it('should include multiple prescriptions', async () => {
      const result = await service.generateStructuredNotes('needs medication');

      expect(result.notes.prescriptions.length).toBeGreaterThanOrEqual(2);
    });

    it('should include red flags array', async () => {
      const result = await service.generateStructuredNotes('warning signs');

      expect(Array.isArray(result.notes.redFlags)).toBe(true);
      expect(result.notes.redFlags.length).toBeGreaterThan(0);
    });

    it('should handle patient context information', async () => {
      const patientContext = {
        name: 'John Doe',
        age: 35,
        conditions: 'Hypertension',
        allergies: 'Penicillin'
      };

      const result = await service.generateStructuredNotes('transcript', patientContext);

      expect(result.success).toBe(true);
      expect(result.notes).toBeDefined();
    });

    it('should handle empty patient context', async () => {
      const result = await service.generateStructuredNotes('transcript', {});

      expect(result.success).toBe(true);
      expect(result.notes).toBeDefined();
    });

    it('should handle undefined patient context', async () => {
      const result = await service.generateStructuredNotes('transcript');

      expect(result.success).toBe(true);
      expect(result.notes).toBeDefined();
    });

    it('should return detailed medical assessment', async () => {
      const result = await service.generateStructuredNotes('patient evaluation');

      expect(result.notes.chiefComplaint).toContain('Cefalea');
      expect(result.notes.assessment).toContain('tensional');
      expect(result.notes.plan).toContain('analgésicos');
    });
  });

  describe('generateMedicalReport - Mock Mode', () => {
    const mockConsultation = {
      patient: {
        name: 'John Doe',
        age: 30,
        allergies: 'None',
        conditions: 'None'
      },
      doctor: {
        name: 'Dr. Smith',
        specialization: 'General Medicine'
      },
      notes: {
        chiefComplaint: 'Headache'
      },
      date: '2025-12-07'
    };

    it('should generate comprehensive medical report', async () => {
      const result = await service.generateMedicalReport(mockConsultation);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(typeof result.report).toBe('string');
      expect(result.patientSummary).toBeDefined();
      expect(typeof result.patientSummary).toBe('string');
    });

    it('should include report header', async () => {
      const result = await service.generateMedicalReport(mockConsultation);

      expect(result.report).toContain('INFORME MÉDICO');
    });

    it('should include patient information', async () => {
      const result = await service.generateMedicalReport(mockConsultation);

      expect(result.report).toContain('John Doe');
      expect(result.report).toContain('30');
    });

    it('should include doctor information', async () => {
      const result = await service.generateMedicalReport(mockConsultation);

      expect(result.report).toContain('Dr. Smith');
      expect(result.report).toContain('General Medicine');
    });

    it('should include consultation date', async () => {
      const result = await service.generateMedicalReport(mockConsultation);

      expect(result.report).toContain('2025-12-07');
    });

    it('should include all report sections', async () => {
      const result = await service.generateMedicalReport(mockConsultation);

      expect(result.report).toContain('MOTIVO DE CONSULTA');
      expect(result.report).toContain('HISTORIA DE LA ENFERMEDAD ACTUAL');
      expect(result.report).toContain('EXPLORACIÓN FÍSICA');
      expect(result.report).toContain('IMPRESIÓN DIAGNÓSTICA');
      expect(result.report).toContain('PLAN TERAPÉUTICO');
      expect(result.report).toContain('RECOMENDACIONES Y SEGUIMIENTO');
    });

    it('should include patient summary', async () => {
      const result = await service.generateMedicalReport(mockConsultation);

      expect(result.patientSummary).toContain('Resumen para el Paciente');
      expect(result.patientSummary).toContain('John Doe');
    });

    it('should include treatment information in summary', async () => {
      const result = await service.generateMedicalReport(mockConsultation);

      expect(result.patientSummary).toContain('TRATAMIENTO');
      expect(result.patientSummary).toContain('Ibuprofeno');
    });

    it('should include warning signs in summary', async () => {
      const result = await service.generateMedicalReport(mockConsultation);

      expect(result.patientSummary).toContain('IMPORTANTE');
      expect(result.patientSummary).toContain('Rigidez');
    });

    it('should include next steps', async () => {
      const result = await service.generateMedicalReport(mockConsultation);

      expect(result.patientSummary).toContain('PRÓXIMOS PASOS');
    });

    it('should handle different patient data', async () => {
      const consultation = {
        patient: { name: 'Jane Smith', age: 45, allergies: 'Penicillin', conditions: 'Diabetes' },
        doctor: { name: 'Dr. Johnson', specialization: 'Cardiology' },
        notes: { chiefComplaint: 'Chest pain' },
        date: '2025-12-08'
      };

      const result = await service.generateMedicalReport(consultation);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
    });
  });

  describe('generatePatientSummary - Mock Mode', () => {
    it('should generate patient-friendly summary', async () => {
      const report = 'Technical medical report';
      const patientName = 'John';

      const result = await service.generatePatientSummary(report, patientName);

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
    });

    it('should return mock mode message', async () => {
      const result = await service.generatePatientSummary('report', 'Patient');

      expect(result.summary).toContain('mock mode');
    });

    it('should handle different inputs', async () => {
      const result1 = await service.generatePatientSummary('Report A', 'Alice');
      const result2 = await service.generatePatientSummary('Report B', 'Bob');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('triageSymptoms - Mock Mode', () => {
    it('should perform symptom triage assessment', async () => {
      const symptoms = 'Headache for 3 days, nausea';
      const result = await service.triageSymptoms(symptoms);

      expect(result.success).toBe(true);
      expect(result.triage).toBeDefined();
    });

    it('should include urgency level', async () => {
      const result = await service.triageSymptoms('headache');

      expect(result.triage).toHaveProperty('urgencyLevel');
      expect(['low', 'medium', 'high', 'emergency']).toContain(result.triage.urgencyLevel);
    });

    it('should return medium urgency in mock mode', async () => {
      const result = await service.triageSymptoms('symptoms');

      expect(result.triage.urgencyLevel).toBe('medium');
    });

    it('should include urgency reason', async () => {
      const result = await service.triageSymptoms('symptoms');

      expect(result.triage).toHaveProperty('urgencyReason');
      expect(typeof result.triage.urgencyReason).toBe('string');
      expect(result.triage.urgencyReason.length).toBeGreaterThan(0);
    });

    it('should include possible conditions array', async () => {
      const result = await service.triageSymptoms('headache');

      expect(Array.isArray(result.triage.possibleConditions)).toBe(true);
      expect(result.triage.possibleConditions.length).toBeGreaterThan(0);
    });

    it('should include multiple condition possibilities', async () => {
      const result = await service.triageSymptoms('symptoms');

      expect(result.triage.possibleConditions.length).toBeGreaterThanOrEqual(4);
    });

    it('should include recommended specialty', async () => {
      const result = await service.triageSymptoms('symptoms');

      expect(result.triage).toHaveProperty('recommendedSpecialty');
      expect(typeof result.triage.recommendedSpecialty).toBe('string');
    });

    it('should include red flags', async () => {
      const result = await service.triageSymptoms('symptoms');

      expect(Array.isArray(result.triage.redFlags)).toBe(true);
      expect(result.triage.redFlags.length).toBeGreaterThan(0);
    });

    it('should include immediate action flag', async () => {
      const result = await service.triageSymptoms('symptoms');

      expect(result.triage).toHaveProperty('immediateAction');
      expect(typeof result.triage.immediateAction).toBe('boolean');
    });

    it('should include recommendations', async () => {
      const result = await service.triageSymptoms('symptoms');

      expect(Array.isArray(result.triage.recommendations)).toBe(true);
      expect(result.triage.recommendations.length).toBeGreaterThan(0);
    });

    it('should include follow-up questions', async () => {
      const result = await service.triageSymptoms('symptoms');

      expect(Array.isArray(result.triage.questions)).toBe(true);
      expect(result.triage.questions.length).toBeGreaterThan(0);
    });

    it('should handle patient context data', async () => {
      const patientData = {
        age: 35,
        sex: 'male',
        conditions: 'Hypertension'
      };

      const result = await service.triageSymptoms('chest pain', patientData);

      expect(result.success).toBe(true);
      expect(result.triage).toBeDefined();
    });

    it('should handle minimal patient data', async () => {
      const result = await service.triageSymptoms('minor symptoms', {});

      expect(result.success).toBe(true);
    });

    it('should handle undefined patient data', async () => {
      const result = await service.triageSymptoms('symptoms');

      expect(result.success).toBe(true);
    });

    it('should not require immediate action for medium urgency', async () => {
      const result = await service.triageSymptoms('headache');

      expect(result.triage.immediateAction).toBe(false);
    });
  });

  describe('Response Structure Validation', () => {
    it('all methods should return success flag', async () => {
      const transcript = await service.transcribeConsultation('audio');
      expect(transcript).toHaveProperty('success');

      const notes = await service.generateStructuredNotes('text');
      expect(notes).toHaveProperty('success');

      const report = await service.generateMedicalReport({
        patient: { name: 'Test', age: 30 },
        doctor: { name: 'Dr Test', specialization: 'General' },
        notes: {},
        date: '2025-01-01'
      });
      expect(report).toHaveProperty('success');

      const triage = await service.triageSymptoms('symptoms');
      expect(triage).toHaveProperty('success');

      const summary = await service.generatePatientSummary('report', 'Name');
      expect(summary).toHaveProperty('success');
    });

    it('all successful responses should have success: true', async () => {
      const transcript = await service.transcribeConsultation('audio');
      expect(transcript.success).toBe(true);

      const notes = await service.generateStructuredNotes('text');
      expect(notes.success).toBe(true);

      const report = await service.generateMedicalReport({
        patient: { name: 'Test', age: 30 },
        doctor: { name: 'Dr Test', specialization: 'General' },
        notes: {},
        date: '2025-01-01'
      });
      expect(report.success).toBe(true);

      const triage = await service.triageSymptoms('symptoms');
      expect(triage.success).toBe(true);

      const summary = await service.generatePatientSummary('report', 'Name');
      expect(summary.success).toBe(true);
    });
  });

  describe('Data Consistency', () => {
    it('should return consistent mock data across multiple calls', async () => {
      const result1 = await service.triageSymptoms('headache');
      const result2 = await service.triageSymptoms('headache');

      expect(result1.triage.urgencyLevel).toBe(result2.triage.urgencyLevel);
      expect(result1.triage.possibleConditions.length).toBe(result2.triage.possibleConditions.length);
    });

    it('should return consistent structured notes', async () => {
      const result1 = await service.generateStructuredNotes('consultation');
      const result2 = await service.generateStructuredNotes('consultation');

      expect(result1.notes.chiefComplaint).toBe(result2.notes.chiefComplaint);
      expect(result1.notes.prescriptions.length).toBe(result2.notes.prescriptions.length);
    });
  });
});
