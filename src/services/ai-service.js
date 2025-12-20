// AI Service for MediConnect Pro
// Provides AI-powered medical assistance including transcription, report generation, and triage

const logger = require('../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

class AIService {
  constructor() {
    this.hasOpenAI = !!OPENAI_API_KEY;
    this.hasAnthropic = !!ANTHROPIC_API_KEY;

    if (!this.hasOpenAI && !this.hasAnthropic) {
      logger.warn('No AI API keys configured. AI features will use mock responses.', {
        service: 'ai',
        feature: 'initialization'
      });
    } else {
      logger.info('AI Service initialized', {
        service: 'ai',
        hasOpenAI: this.hasOpenAI,
        hasAnthropic: this.hasAnthropic
      });
    }
  }

  /**
   * Transcribe audio from consultation using Whisper API
   * @param {Buffer|string} audioData - Audio file or path
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeConsultation(audioData) {
    logger.info('Transcribing consultation audio', {
      service: 'ai',
      operation: 'transcribe',
      hasOpenAI: this.hasOpenAI
    });

    if (!this.hasOpenAI) {
      // Mock response for demo
      return {
        success: true,
        transcript: `Patient: Good morning doctor, I've been experiencing constant headaches for the past 3 days.

Doctor: When did it start exactly? Is it continuous or intermittent pain?

Patient: It started Monday morning. It's stronger in the mornings and improves a bit during the day.

Doctor: Do you have any other symptoms? Fever, nausea, vision problems?

Patient: Yes, some nausea in the morning and a bit of light sensitivity.

Doctor: Have you had migraines before?

Patient: No, this is the first time I'm experiencing something like this.

Doctor: I understand. I'm going to prescribe you a pain reliever and we want to monitor your symptoms. If it gets worse or new symptoms appear, you should contact me immediately.`,
        duration: 180, // seconds
        language: 'en',
        confidence: 0.95
      };
    }

    try {
      // Real implementation with OpenAI Whisper
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data'
        },
        body: audioData
      });

      const data = await response.json();

      return {
        success: true,
        transcript: data.text,
        duration: data.duration,
        language: data.language,
        confidence: data.confidence || 0.9
      };
    } catch (error) {
      logger.error('Transcription error', {
        service: 'ai',
        operation: 'transcribe',
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: 'Failed to transcribe audio',
        details: error.message
      };
    }
  }

  /**
   * Generate structured medical notes from consultation transcript
   * @param {string} transcript - Consultation transcript
   * @param {Object} patientContext - Patient information
   * @returns {Promise<Object>} Structured medical notes
   */
  async generateStructuredNotes(transcript, patientContext = {}) {
    logger.info('Generating structured medical notes', {
      service: 'ai',
      operation: 'generate-notes',
      patientName: patientContext.name
    });

    const prompt = `You are a medical assistant specialized in creating structured clinical notes.

Patient: ${patientContext.name || 'Patient'}, ${patientContext.age || 'unknown age'} years old
Medical History: ${patientContext.conditions || 'Not specified'}
Allergies: ${patientContext.allergies || 'None known'}

Consultation transcript:
${transcript}

Please generate structured medical notes in the following JSON format:

{
  "chiefComplaint": "Main reason for consultation",
  "historyOfPresentIllness": "History of present illness",
  "symptoms": ["symptom1", "symptom2"],
  "physicalExamination": "Physical examination findings",
  "assessment": "Assessment and provisional diagnosis",
  "plan": "Treatment plan",
  "prescriptions": [
    {
      "medication": "medication name",
      "dosage": "dosage",
      "frequency": "frequency",
      "duration": "duration"
    }
  ],
  "followUp": "Follow-up recommendations",
  "redFlags": ["warning signs if any"]
}

Respond ONLY with the JSON, no additional text.`;

    if (!this.hasAnthropic && !this.hasOpenAI) {
      // Mock response for demo
      return {
        success: true,
        notes: {
          chiefComplaint: "Persistent headache for 3 days",
          historyOfPresentIllness: "Male patient presents with headache starting Monday, more intense in the mornings, with partial improvement during the day. Associated with morning nausea and photophobia. Denies history of migraines.",
          symptoms: [
            "Persistent headache",
            "Morning nausea",
            "Photophobia",
            "Predominantly morning pain"
          ],
          physicalExamination: "Patient alert and oriented. Stable vital signs. No focal neurological signs observed.",
          assessment: "Tension headache vs. migraine without aura de novo. Rule out secondary causes if persistent or worsening.",
          plan: "Symptomatic management with analgesics. Close observation and follow-up.",
          prescriptions: [
            {
              medication: "Ibuprofen",
              dosage: "400mg",
              frequency: "Every 8 hours as needed",
              duration: "5 days"
            },
            {
              medication: "Metoclopramide",
              dosage: "10mg",
              frequency: "Every 8 hours if nausea",
              duration: "3 days"
            }
          ],
          followUp: "Follow-up in 48-72 hours or sooner if worsening. Go to emergency if: neck stiffness, altered consciousness, persistent vomiting, or neurological deficit.",
          redFlags: [
            "Neck stiffness",
            "Altered state of consciousness",
            "Focal neurological deficit",
            "Persistent vomiting"
          ]
        }
      };
    }

    try {
      // Real implementation with Claude or GPT-4
      const apiUrl = this.hasAnthropic
        ? 'https://api.anthropic.com/v1/messages'
        : 'https://api.openai.com/v1/chat/completions';

      const headers = this.hasAnthropic
        ? {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        : {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          };

      const body = this.hasAnthropic
        ? {
            model: 'claude-opus-4-5-20250514',
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }]
          }
        : {
            model: 'gpt-5.2',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
          };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();
      const content = this.hasAnthropic ? data.content[0].text : data.choices[0].message.content;

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const notes = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      return {
        success: true,
        notes
      };
    } catch (error) {
      logger.error('Note generation error', {
        service: 'ai',
        operation: 'generate-notes',
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: 'Failed to generate notes',
        details: error.message
      };
    }
  }

  /**
   * Generate medical report from consultation data
   * @param {Object} consultationData - Complete consultation information
   * @returns {Promise<Object>} Generated medical report
   */
  async generateMedicalReport(consultationData) {
    logger.info('Generating medical report', {
      service: 'ai',
      operation: 'generate-report',
      patientName: consultationData.patient?.name,
      doctorName: consultationData.doctor?.name
    });

    const { patient, doctor, notes, date } = consultationData;

    const prompt = `Generate a professional medical report in English based on the following information:

PATIENT DATA:
- Name: ${patient.name}
- Age: ${patient.age} years old
- Allergies: ${patient.allergies || 'None'}
- Previous conditions: ${patient.conditions || 'None'}

PHYSICIAN DATA:
- Dr. ${doctor.name}
- Specialty: ${doctor.specialization}

CONSULTATION DATE: ${date}

CLINICAL NOTES:
${JSON.stringify(notes, null, 2)}

Generate a formal and professional medical report that includes:
1. Header with patient and physician data
2. Chief complaint
3. Current medical history
4. Physical examination
5. Diagnostic impression
6. Therapeutic plan
7. Recommendations and follow-up

The report should be professional, clear, and suitable for the patient's medical record.`;

    if (!this.hasAnthropic && !this.hasOpenAI) {
      // Mock response for demo
      return {
        success: true,
        report: `MEDICAL REPORT

PATIENT DATA
Name: ${patient.name}
Age: ${patient.age} years old
Consultation date: ${date}

PHYSICIAN DATA
Dr. ${doctor.name}
Specialty: ${doctor.specialization}

CHIEF COMPLAINT
Persistent headache for 3 days.

HISTORY OF PRESENT ILLNESS
Patient reports headache onset 3 days ago, with greater intensity in morning hours and partial improvement during the day. Pain is accompanied by morning nausea and photophobia. Denies personal history of migraines. First time experiencing such symptoms.

PHYSICAL EXAMINATION
Patient conscious, oriented and cooperative. Vital signs within normal parameters. Neurological exam without focal findings. No neck stiffness. Normal fundoscopy.

DIAGNOSTIC IMPRESSION
1. Tension headache vs. Migraine without aura de novo
2. Rule out secondary causes in evolution

THERAPEUTIC PLAN
Prescribed:
- Ibuprofen 400mg every 8 hours as needed for 5 days
- Metoclopramide 10mg every 8 hours if nausea for 3 days

RECOMMENDATIONS AND FOLLOW-UP
- Medical follow-up in 48-72 hours
- Go to emergency immediately if experiencing: neck stiffness, altered consciousness, persistent vomiting or neurological deficit
- Maintain adequate hydration
- Avoid known triggering factors

Dr. ${doctor.name}
${doctor.specialization}
Digital signature`,
        patientSummary: `Patient Summary:

Hello ${patient.name},

You've been evaluated for headaches you've had for 3 days. Based on your symptoms, it appears to be a tension headache or possibly a migraine.

TREATMENT:
- Take Ibuprofen 400mg every 8 hours when you have pain (maximum 5 days)
- If you have nausea, take Metoclopramide 10mg every 8 hours (maximum 3 days)

IMPORTANT - Go to emergency if you experience:
❗ Neck stiffness
❗ Confusion or severe dizziness
❗ Non-stop vomiting
❗ Loss of strength or sensation

NEXT STEPS:
📅 Schedule follow-up in 2-3 days
💧 Stay well hydrated
😴 Get enough rest

If you have questions, don't hesitate to contact us.

Take care,
Dr. ${doctor.name}`
      };
    }

    try {
      // Real implementation with AI
      const apiUrl = this.hasAnthropic
        ? 'https://api.anthropic.com/v1/messages'
        : 'https://api.openai.com/v1/chat/completions';

      const headers = this.hasAnthropic
        ? {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        : {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          };

      const body = this.hasAnthropic
        ? {
            model: 'claude-opus-4-5-20250514',
            max_tokens: 3000,
            messages: [{ role: 'user', content: prompt }]
          }
        : {
            model: 'gpt-5.2',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
          };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();
      const report = this.hasAnthropic ? data.content[0].text : data.choices[0].message.content;

      // Generate patient-friendly summary
      const patientSummary = await this.generatePatientSummary(report, patient.name);

      return {
        success: true,
        report,
        patientSummary: patientSummary.summary
      };
    } catch (error) {
      logger.error('Report generation error', {
        service: 'ai',
        operation: 'generate-report',
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: 'Failed to generate report',
        details: error.message
      };
    }
  }

  /**
   * Generate patient-friendly summary from medical report
   * @param {string} medicalReport - Technical medical report
   * @param {string} patientName - Patient's name
   * @returns {Promise<Object>} Patient-friendly summary
   */
  async generatePatientSummary(medicalReport, patientName) {
    const prompt = `Convert the following technical medical report into a friendly and easy-to-understand summary for the patient.

Patient name: ${patientName}

Medical report:
${medicalReport}

Create a summary that:
1. Uses simple and non-technical language
2. Explains the diagnosis clearly
3. Lists medications and how to take them
4. Includes warning signs clearly
5. Is empathetic and reassuring
6. Uses appropriate emojis (📅 ❗ 💊 etc.)

The tone should be professional but approachable.`;

    if (!this.hasAnthropic && !this.hasOpenAI) {
      return { success: true, summary: 'Summary generated in mock mode' };
    }

    try {
      const apiUrl = this.hasAnthropic
        ? 'https://api.anthropic.com/v1/messages'
        : 'https://api.openai.com/v1/chat/completions';

      const headers = this.hasAnthropic
        ? {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        : {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          };

      const body = this.hasAnthropic
        ? {
            model: 'claude-opus-4-5-20250514',
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }]
          }
        : {
            model: 'gpt-5.2',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5
          };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();
      const summary = this.hasAnthropic ? data.content[0].text : data.choices[0].message.content;

      return {
        success: true,
        summary
      };
    } catch (error) {
      logger.error('Summary generation error', {
        service: 'ai',
        operation: 'generate-summary',
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: 'Failed to generate summary'
      };
    }
  }

  /**
   * Triage chatbot - Initial symptom assessment
   * @param {string} symptoms - Patient's symptoms description
   * @param {Object} patientData - Basic patient information
   * @returns {Promise<Object>} Triage result
   */
  async triageSymptoms(symptoms, patientData = {}) {
    logger.info('Performing symptom triage', {
      service: 'ai',
      operation: 'triage',
      patientAge: patientData.age
    });

    const prompt = `You are a medical triage assistant. Evaluate the following symptoms and provide:

PATIENT:
- Age: ${patientData.age || 'Not specified'}
- Sex: ${patientData.sex || 'Not specified'}
- Previous conditions: ${patientData.conditions || 'None'}

REPORTED SYMPTOMS:
${symptoms}

Provide your evaluation in the following JSON format:

{
  "urgencyLevel": "low|medium|high|emergency",
  "urgencyReason": "Explanation of urgency level",
  "possibleConditions": ["condition1", "condition2", "condition3"],
  "recommendedSpecialty": "recommended medical specialty",
  "redFlags": ["warning sign 1", "warning sign 2"],
  "immediateAction": "Requires immediate attention? true/false",
  "recommendations": [
    "recommendation 1",
    "recommendation 2"
  ],
  "questions": [
    "clarifying question 1",
    "clarifying question 2"
  ]
}

Urgency levels:
- emergency: Requires immediate emergency care (911)
- high: Requires medical attention same day
- medium: Requires consultation within 24-48 hours
- low: Can wait for scheduled appointment

Respond ONLY with JSON.`;

    if (!this.hasAnthropic && !this.hasOpenAI) {
      // Mock response for demo
      return {
        success: true,
        triage: {
          urgencyLevel: "medium",
          urgencyReason: "Persistent headache with associated symptoms that requires medical evaluation to rule out secondary causes.",
          possibleConditions: [
            "Tension headache",
            "Migraine",
            "Sinusitis",
            "Arterial hypertension"
          ],
          recommendedSpecialty: "General Medicine",
          redFlags: [
            "Sudden onset severe headache",
            "Associated with high fever",
            "With altered consciousness"
          ],
          immediateAction: false,
          recommendations: [
            "Schedule medical consultation within the next 24-48 hours",
            "Maintain adequate hydration",
            "Record pain characteristics (intensity, duration, factors that improve/worsen it)",
            "May take over-the-counter pain relievers following package instructions"
          ],
          questions: [
            "Is the pain pulsating or constant?",
            "Is it accompanied by nausea or vomiting?",
            "Do you have sensitivity to light or noise?",
            "Have you had a fever?",
            "Does the pain worsen with physical activity?"
          ]
        }
      };
    }

    try {
      const apiUrl = this.hasAnthropic
        ? 'https://api.anthropic.com/v1/messages'
        : 'https://api.openai.com/v1/chat/completions';

      const headers = this.hasAnthropic
        ? {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        : {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          };

      const body = this.hasAnthropic
        ? {
            model: 'claude-opus-4-5-20250514',
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }]
          }
        : {
            model: 'gpt-5.2',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
          };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();
      const content = this.hasAnthropic ? data.content[0].text : data.choices[0].message.content;

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const triage = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      return {
        success: true,
        triage
      };
    } catch (error) {
      logger.error('Triage error', {
        service: 'ai',
        operation: 'triage',
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: 'Failed to perform triage',
        details: error.message
      };
    }
  }

  /**
   * Transcribe audio and automatically generate diagnosis
   * This is the main workflow for doctors: record patient → transcribe → diagnose
   * @param {Buffer|string} audioData - Audio file or base64 data
   * @param {Object} patientContext - Patient information for context
   * @returns {Promise<Object>} Transcription with diagnosis
   */
  async transcribeAndDiagnose(audioData, patientContext = {}) {
    logger.info('Starting transcribe-and-diagnose workflow', {
      service: 'ai',
      operation: 'transcribe-diagnose',
      patientName: patientContext.name
    });

    // Step 1: Transcribe the audio
    const transcriptionResult = await this.transcribeConsultation(audioData);

    if (!transcriptionResult.success) {
      return {
        success: false,
        error: 'Transcription failed',
        details: transcriptionResult.error
      };
    }

    const transcript = transcriptionResult.transcript;

    // Step 2: Generate diagnosis from transcript
    const diagnosisPrompt = `You are an expert physician analyzing a patient's symptom description.

PATIENT DATA:
- Name: ${patientContext.name || 'Not specified'}
- Age: ${patientContext.age || 'Not specified'}
- Sex: ${patientContext.sex || 'Not specified'}
- Previous conditions: ${patientContext.conditions || 'None known'}
- Allergies: ${patientContext.allergies || 'None known'}

CONSULTATION TRANSCRIPT:
${transcript}

Analyze the transcript and provide a structured diagnosis in JSON format:

{
  "mainSymptoms": ["main symptom 1", "symptom 2"],
  "symptomDuration": "duration of symptoms",
  "urgencyLevel": "low|medium|high|emergency",
  "differentialDiagnosis": [
    {
      "condition": "most likely diagnosis",
      "probability": "high|medium|low",
      "reasoning": "clinical justification"
    },
    {
      "condition": "second possible diagnosis",
      "probability": "high|medium|low",
      "reasoning": "clinical justification"
    }
  ],
  "recommendedTests": ["test 1", "test 2"],
  "suggestedTreatment": {
    "immediate": "suggested immediate treatment",
    "medications": [
      {
        "name": "medication",
        "dosage": "dose",
        "frequency": "frequency",
        "duration": "duration"
      }
    ],
    "lifestyle": ["lifestyle recommendation 1", "recommendation 2"]
  },
  "redFlags": ["warning sign 1", "warning sign 2"],
  "followUp": "follow-up recommendation",
  "specialistReferral": "specialist if required or null",
  "clinicalNotes": "additional notes for the physician"
}

IMPORTANT:
- This is a support tool for the physician, NOT a final diagnosis
- Always include differential diagnoses
- Highlight any warning signs
- The physician must verify and adjust according to their clinical judgment

Respond ONLY with JSON.`;

    if (!this.hasAnthropic && !this.hasOpenAI) {
      // Mock diagnosis for demo
      return {
        success: true,
        transcript: transcript,
        transcriptionDuration: transcriptionResult.duration,
        language: transcriptionResult.language,
        confidence: transcriptionResult.confidence,
        diagnosis: {
          mainSymptoms: ["Persistent headache", "Morning nausea", "Photophobia"],
          symptomDuration: "3 days",
          urgencyLevel: "medium",
          differentialDiagnosis: [
            {
              condition: "Migraine without aura",
              probability: "high",
              reasoning: "Unilateral pulsating headache with photophobia and nausea, without prior aura. First presentation in adult."
            },
            {
              condition: "Tension headache",
              probability: "medium",
              reasoning: "Morning pain pattern that improves during the day, possible muscular component."
            },
            {
              condition: "Acute sinusitis",
              probability: "low",
              reasoning: "Morning pattern could suggest congestion, although typical nasal symptoms are absent."
            }
          ],
          recommendedTests: [
            "Blood pressure measurement",
            "Basic neurological examination",
            "Fundoscopy if available",
            "Consider CBC if persists"
          ],
          suggestedTreatment: {
            immediate: "Analgesia and dark/quiet environment",
            medications: [
              {
                name: "Ibuprofen",
                dosage: "400mg",
                frequency: "Every 8 hours with food",
                duration: "5 days maximum"
              },
              {
                name: "Metoclopramide",
                dosage: "10mg",
                frequency: "30 min before analgesic if nausea",
                duration: "As needed"
              }
            ],
            lifestyle: [
              "Adequate hydration (2L water/day)",
              "Avoid bright screens",
              "Rest in dark room during episodes",
              "Keep headache diary"
            ]
          },
          redFlags: [
            "Sudden 'thunderclap' headache",
            "Neck stiffness",
            "High fever",
            "Altered consciousness",
            "Focal neurological deficit",
            "Persistent vomiting"
          ],
          followUp: "Follow-up in 48-72 hours. If persists >2 weeks or pattern changes, neurology referral.",
          specialistReferral: "Neurology if no response to treatment in 2 weeks",
          clinicalNotes: "First headache of this type for the patient. Consider triggering factors (stress, sleep, diet). Educate about warning signs. If migraine confirmed, consider prophylaxis if >4 episodes/month."
        },
        disclaimer: "This diagnosis is AI-generated as support for the physician. It does not replace professional clinical judgment. The treating physician must verify and adjust according to their assessment."
      };
    }

    try {
      const apiUrl = this.hasAnthropic
        ? 'https://api.anthropic.com/v1/messages'
        : 'https://api.openai.com/v1/chat/completions';

      const headers = this.hasAnthropic
        ? {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        : {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          };

      const body = this.hasAnthropic
        ? {
            model: 'claude-opus-4-5-20250514',
            max_tokens: 3000,
            messages: [{ role: 'user', content: diagnosisPrompt }]
          }
        : {
            model: 'gpt-5.2',
            messages: [{ role: 'user', content: diagnosisPrompt }],
            temperature: 0.2
          };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();
      const content = this.hasAnthropic ? data.content[0].text : data.choices[0].message.content;

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const diagnosis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      logger.info('Transcribe-and-diagnose completed', {
        service: 'ai',
        operation: 'transcribe-diagnose',
        urgencyLevel: diagnosis?.urgencyLevel
      });

      return {
        success: true,
        transcript: transcript,
        transcriptionDuration: transcriptionResult.duration,
        language: transcriptionResult.language,
        confidence: transcriptionResult.confidence,
        diagnosis: diagnosis,
        disclaimer: "This diagnosis is AI-generated as support for the physician. It does not replace professional clinical judgment. The treating physician must verify and adjust according to their assessment."
      };
    } catch (error) {
      logger.error('Transcribe-and-diagnose error', {
        service: 'ai',
        operation: 'transcribe-diagnose',
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        transcript: transcript, // Return transcript even if diagnosis fails
        error: 'Diagnosis generation failed',
        details: error.message
      };
    }
  }

  /**
   * Generate diagnosis from text symptoms (Free demo mode)
   * Analyzes symptom keywords to generate contextual diagnosis
   * @param {string} symptomsText - Text description of symptoms
   * @param {Object} patientContext - Patient information for context
   * @returns {Promise<Object>} Diagnosis result
   */
  async diagnoseFromText(symptomsText, patientContext = {}) {
    logger.info('Starting text-based diagnosis', {
      service: 'ai',
      operation: 'text-diagnose',
      patientName: patientContext.name,
      symptomsLength: symptomsText.length
    });

    const symptomsLower = symptomsText.toLowerCase();

    // Analyze symptoms to determine condition type
    const conditionType = this.detectConditionType(symptomsLower);
    const diagnosis = this.generateContextualDiagnosis(conditionType, symptomsText, patientContext);

    logger.info('Text-based diagnosis completed', {
      service: 'ai',
      operation: 'text-diagnose',
      conditionType: conditionType,
      urgencyLevel: diagnosis.urgencyLevel
    });

    return {
      success: true,
      diagnosis: diagnosis,
      disclaimer: "This diagnosis is AI-generated in DEMO mode as support for the physician. It does not replace professional clinical judgment. The treating physician must verify and adjust according to their assessment."
    };
  }

  /**
   * Detect the type of condition based on symptom keywords
   */
  detectConditionType(symptomsLower) {
    // Headache/Neurological
    if (symptomsLower.includes('headache') || symptomsLower.includes('cefalea') ||
        symptomsLower.includes('dolor de cabeza') || symptomsLower.includes('migraine') ||
        symptomsLower.includes('migraña')) {
      return 'headache';
    }

    // Respiratory
    if (symptomsLower.includes('cough') || symptomsLower.includes('tos') ||
        symptomsLower.includes('respiratory') || symptomsLower.includes('respirator') ||
        symptomsLower.includes('dyspnea') || symptomsLower.includes('disnea') ||
        symptomsLower.includes('chest') || symptomsLower.includes('pecho') ||
        symptomsLower.includes('congestion') || symptomsLower.includes('nasal')) {
      return 'respiratory';
    }

    // Digestive
    if (symptomsLower.includes('abdominal') || symptomsLower.includes('stomach') ||
        symptomsLower.includes('estómago') || symptomsLower.includes('nausea') ||
        symptomsLower.includes('náusea') || symptomsLower.includes('vomit') ||
        symptomsLower.includes('diarrhea') || symptomsLower.includes('diarrea') ||
        symptomsLower.includes('digestive') || symptomsLower.includes('digestivo')) {
      return 'digestive';
    }

    // Musculoskeletal pain
    if (symptomsLower.includes('pain') || symptomsLower.includes('dolor') ||
        symptomsLower.includes('back') || symptomsLower.includes('espalda') ||
        symptomsLower.includes('knee') || symptomsLower.includes('rodilla') ||
        symptomsLower.includes('muscle') || symptomsLower.includes('muscular')) {
      return 'musculoskeletal';
    }

    // Fever/Infection
    if (symptomsLower.includes('fever') || symptomsLower.includes('fiebre') ||
        symptomsLower.includes('temperature') || symptomsLower.includes('temperatura') ||
        symptomsLower.includes('chills') || symptomsLower.includes('escalofríos')) {
      return 'infection';
    }

    // Default: general
    return 'general';
  }

  /**
   * Generate contextual diagnosis based on condition type
   */
  generateContextualDiagnosis(conditionType, symptomsText, patientContext) {
    const diagnoses = {
      headache: {
        mainSymptoms: ["Headache", "Persistent head pain", "Light sensitivity"],
        symptomDuration: "Variable according to description",
        urgencyLevel: "medium",
        differentialDiagnosis: [
          {
            condition: "Tension headache",
            probability: "high",
            reasoning: "Pain pattern compatible with muscle tension and stress. Very common in general population."
          },
          {
            condition: "Migraine without aura",
            probability: "medium",
            reasoning: "If photophobia, nausea or pulsating character present, consider migraine as primary diagnosis."
          },
          {
            condition: "Medication overuse headache",
            probability: "low",
            reasoning: "Evaluate frequent analgesic use (>15 days/month)."
          }
        ],
        recommendedTests: [
          "Blood pressure measurement",
          "Basic neurological examination",
          "Fundoscopy if warning signs present",
          "Consider CBC if systemic symptoms"
        ],
        suggestedTreatment: {
          immediate: "Analgesia and dark/quiet environment",
          medications: [
            {
              name: "Acetaminophen",
              dosage: "500-1000mg",
              frequency: "Every 6-8 hours",
              duration: "As needed, maximum 5 days"
            },
            {
              name: "Ibuprofen",
              dosage: "400mg",
              frequency: "Every 8 hours with food",
              duration: "3-5 days maximum"
            }
          ],
          lifestyle: [
            "Adequate hydration (2L water/day)",
            "Rest in dark environment",
            "Avoid bright screens during episodes",
            "Relaxation techniques and stress management"
          ]
        },
        redFlags: [
          "Sudden severe headache ('thunderclap')",
          "Neck stiffness or high fever",
          "Altered state of consciousness",
          "Focal neurological deficit",
          "Change in usual headache pattern"
        ],
        followUp: "Follow-up in 72 hours if no improvement. If persists >2 weeks, refer to neurology.",
        specialistReferral: "Neurology if refractory headache or change in usual pattern",
        clinicalNotes: "Evaluate triggering factors: stress, sleep, diet, hormonal changes. Consider headache diary to identify patterns."
      },

      respiratory: {
        mainSymptoms: ["Cough", "Nasal congestion", "Respiratory difficulty"],
        symptomDuration: "According to clinical evolution",
        urgencyLevel: "medium",
        differentialDiagnosis: [
          {
            condition: "Viral upper respiratory infection",
            probability: "high",
            reasoning: "Clinical picture compatible with viral rhinopharyngitis. High seasonal prevalence."
          },
          {
            condition: "Acute bronchitis",
            probability: "medium",
            reasoning: "If cough is productive and persistent >5 days, consider bronchitis."
          },
          {
            condition: "Acute sinusitis",
            probability: "low",
            reasoning: "Evaluate if facial pain, purulent rhinorrhea and symptoms >10 days present."
          }
        ],
        recommendedTests: [
          "Complete pulmonary auscultation",
          "Pulse oximetry",
          "Body temperature",
          "Chest X-ray if pneumonia suspected"
        ],
        suggestedTreatment: {
          immediate: "Rest and abundant hydration",
          medications: [
            {
              name: "Acetaminophen",
              dosage: "500-1000mg",
              frequency: "Every 6-8 hours if fever",
              duration: "As needed"
            },
            {
              name: "Nasal saline solution",
              dosage: "2-3 applications",
              frequency: "3-4 times daily",
              duration: "Until improvement"
            }
          ],
          lifestyle: [
            "Relative rest",
            "Abundant hydration (warm liquids)",
            "Avoid sudden temperature changes",
            "Elevate head of bed when sleeping"
          ]
        },
        redFlags: [
          "Severe respiratory difficulty",
          "Fever >38.5°C persistent >72 hours",
          "Hemoptysis (blood in sputum)",
          "Pleuritic chest pain",
          "Oxygen saturation <94%"
        ],
        followUp: "Follow-up in 48-72 hours. If worsens, urgent consultation.",
        specialistReferral: "Pulmonology if no improvement in 2 weeks or warning signs present",
        clinicalNotes: "Rule out COVID-19 if clinical picture compatible. Evaluate flu vaccination and smoking history."
      },

      digestive: {
        mainSymptoms: ["Abdominal pain", "Nausea", "Altered bowel movements"],
        symptomDuration: "According to clinical evolution",
        urgencyLevel: "medium",
        differentialDiagnosis: [
          {
            condition: "Acute gastroenteritis",
            probability: "high",
            reasoning: "Clinical picture compatible with viral or bacterial gastrointestinal infection."
          },
          {
            condition: "Functional dyspepsia",
            probability: "medium",
            reasoning: "If recurrent postprandial symptoms without warning signs."
          },
          {
            condition: "Gastritis",
            probability: "medium",
            reasoning: "Consider if epigastric pain, heartburn or food relationship present."
          }
        ],
        recommendedTests: [
          "Complete abdominal palpation",
          "Vital signs (BP, HR, Temperature)",
          "Hydration and general condition",
          "CBC and electrolytes if dehydration"
        ],
        suggestedTreatment: {
          immediate: "Bland diet, oral hydration",
          medications: [
            {
              name: "Oral rehydration salts",
              dosage: "1 sachet in 1L water",
              frequency: "According to tolerance",
              duration: "Until symptom improvement"
            },
            {
              name: "Omeprazole",
              dosage: "20mg",
              frequency: "Once daily on empty stomach",
              duration: "7-14 days"
            }
          ],
          lifestyle: [
            "Progressive bland diet",
            "Avoid irritating foods",
            "Small frequent meals",
            "Avoid lying down immediately after eating"
          ]
        },
        redFlags: [
          "Gastrointestinal bleeding (hematemesis/melena)",
          "Severe localized abdominal pain",
          "High fever with abdominal pain",
          "Persistent vomiting with dehydration",
          "Involuntary weight loss"
        ],
        followUp: "Follow-up in 48-72 hours. If no improvement, consider additional studies.",
        specialistReferral: "Gastroenterology if symptoms >2 weeks or warning signs",
        clinicalNotes: "Evaluate recent suspicious food intake, travel, contact with sick people. Consider stool culture if fever present."
      },

      musculoskeletal: {
        mainSymptoms: ["Localized pain", "Limited movement", "Stiffness"],
        symptomDuration: "According to evolution",
        urgencyLevel: "low",
        differentialDiagnosis: [
          {
            condition: "Muscle contracture",
            probability: "high",
            reasoning: "Muscle pain from overexertion or poor posture. Very common."
          },
          {
            condition: "Myofascial syndrome",
            probability: "medium",
            reasoning: "Trigger points and characteristic referred pain."
          },
          {
            condition: "Tendinopathy",
            probability: "low",
            reasoning: "If pain at tendon insertion with specific movements."
          }
        ],
        recommendedTests: [
          "Musculoskeletal examination",
          "Range of motion",
          "Tender points on palpation",
          "X-ray if bone injury suspected"
        ],
        suggestedTreatment: {
          immediate: "Relative rest and local heat application",
          medications: [
            {
              name: "Ibuprofen",
              dosage: "400-600mg",
              frequency: "Every 8 hours with food",
              duration: "5-7 days"
            },
            {
              name: "Muscle relaxant (e.g., cyclobenzaprine)",
              dosage: "5-10mg",
              frequency: "At night",
              duration: "5-7 days"
            }
          ],
          lifestyle: [
            "Postural ergonomics",
            "Gentle stretching",
            "Avoid movements that aggravate pain",
            "Local heat 15-20 minutes several times daily"
          ]
        },
        redFlags: [
          "Night pain that awakens",
          "Associated fever",
          "Loss of strength or sensation",
          "Significant prior trauma",
          "History of cancer"
        ],
        followUp: "Follow-up in 1-2 weeks if no improvement.",
        specialistReferral: "Orthopedics/Physical therapy if persists >2-3 weeks",
        clinicalNotes: "Evaluate work ergonomics and postural habits. Consider preventive physical therapy."
      },

      infection: {
        mainSymptoms: ["Fever", "General malaise", "Chills"],
        symptomDuration: "According to evolution",
        urgencyLevel: "medium",
        differentialDiagnosis: [
          {
            condition: "Viral febrile syndrome",
            probability: "high",
            reasoning: "Clinical picture compatible with systemic viral infection. High prevalence."
          },
          {
            condition: "Localized bacterial infection",
            probability: "medium",
            reasoning: "Evaluate infectious focus: respiratory, urinary, cutaneous."
          },
          {
            condition: "Non-infectious inflammatory process",
            probability: "low",
            reasoning: "Consider if no clear focus and persists."
          }
        ],
        recommendedTests: [
          "Temperature and vital signs",
          "Complete physical exam searching for focus",
          "CBC with white blood cells",
          "CRP and/or procalcitonin if available"
        ],
        suggestedTreatment: {
          immediate: "Antipyretics and monitoring",
          medications: [
            {
              name: "Acetaminophen",
              dosage: "500-1000mg",
              frequency: "Every 6-8 hours if fever >38°C",
              duration: "As needed"
            }
          ],
          lifestyle: [
            "Rest",
            "Abundant hydration",
            "Temperature monitoring every 6 hours",
            "Light clothing and cool environment"
          ]
        },
        redFlags: [
          "Fever >40°C",
          "Meningeal signs",
          "Altered state of consciousness",
          "Petechiae or purpuric rash",
          "Hemodynamic compromise"
        ],
        followUp: "Follow-up in 24-48 hours. If fever >72 hours, reassess with studies.",
        specialistReferral: "Infectious disease if prolonged fever without identified focus",
        clinicalNotes: "Rule out common infectious foci. Consider blood cultures if high persistent fever."
      },

      general: {
        mainSymptoms: ["General symptoms described", "Malaise", "Fatigue"],
        symptomDuration: "According to patient description",
        urgencyLevel: "low",
        differentialDiagnosis: [
          {
            condition: "Nonspecific general syndrome",
            probability: "high",
            reasoning: "Clinical picture requires further evaluation to determine specific etiology."
          },
          {
            condition: "Stress/Anxiety",
            probability: "medium",
            reasoning: "Common somatization. Evaluate psychosocial context."
          },
          {
            condition: "Underlying medical condition",
            probability: "low",
            reasoning: "Consider additional studies if symptoms persist."
          }
        ],
        recommendedTests: [
          "Complete physical examination",
          "Vital signs",
          "Basic CBC",
          "Blood glucose, renal and hepatic function if relevant"
        ],
        suggestedTreatment: {
          immediate: "Symptomatic treatment according to predominant symptoms",
          medications: [
            {
              name: "Symptomatic treatment",
              dosage: "According to specific symptoms",
              frequency: "Variable",
              duration: "According to evolution"
            }
          ],
          lifestyle: [
            "Adequate rest",
            "Balanced diet",
            "Hydration",
            "Stress management"
          ]
        },
        redFlags: [
          "Unexplained weight loss",
          "Prolonged fever",
          "Neurological symptoms",
          "Abnormal bleeding",
          "Persistent severe pain"
        ],
        followUp: "Follow-up in 1 week if symptoms persist.",
        specialistReferral: "According to findings and clinical evolution",
        clinicalNotes: "Detailed history to identify predominant symptoms. Consider additional studies according to clinical picture."
      }
    };

    return diagnoses[conditionType] || diagnoses.general;
  }
}

module.exports = { AIService };
