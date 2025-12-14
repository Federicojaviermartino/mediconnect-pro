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
        transcript: `Paciente: Buenos días doctor, he estado sintiendo dolor de cabeza constante durante los últimos 3 días.

Doctor: ¿Cuándo comenzó exactamente? ¿Es un dolor continuo o intermitente?

Paciente: Comenzó el lunes por la mañana. Es más fuerte por las mañanas y mejora un poco durante el día.

Doctor: ¿Tiene algún otro síntoma? ¿Fiebre, náuseas, problemas de visión?

Paciente: Sí, algunas náuseas por la mañana y un poco de sensibilidad a la luz.

Doctor: ¿Ha tenido migrañas antes?

Paciente: No, esta es la primera vez que experimento algo así.

Doctor: Entiendo. Voy a recetarle un analgésico y queremos monitorear sus síntomas. Si empeora o aparecen nuevos síntomas, debe contactarme inmediatamente.`,
        duration: 180, // seconds
        language: 'es',
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

    const prompt = `Eres un asistente médico especializado en crear notas clínicas estructuradas.

Paciente: ${patientContext.name || 'Paciente'}, ${patientContext.age || 'edad desconocida'} años
Historial: ${patientContext.conditions || 'No especificado'}
Alergias: ${patientContext.allergies || 'Ninguna conocida'}

Transcripción de la consulta:
${transcript}

Por favor, genera notas médicas estructuradas en el siguiente formato JSON:

{
  "chiefComplaint": "Motivo principal de consulta",
  "historyOfPresentIllness": "Historia de la enfermedad actual",
  "symptoms": ["síntoma1", "síntoma2"],
  "physicalExamination": "Hallazgos del examen físico",
  "assessment": "Evaluación y diagnóstico provisional",
  "plan": "Plan de tratamiento",
  "prescriptions": [
    {
      "medication": "nombre del medicamento",
      "dosage": "dosis",
      "frequency": "frecuencia",
      "duration": "duración"
    }
  ],
  "followUp": "Recomendaciones de seguimiento",
  "redFlags": ["señales de alarma si las hay"]
}

Responde SOLO con el JSON, sin texto adicional.`;

    if (!this.hasAnthropic && !this.hasOpenAI) {
      // Mock response for demo
      return {
        success: true,
        notes: {
          chiefComplaint: "Cefalea persistente de 3 días de evolución",
          historyOfPresentIllness: "Paciente masculino presenta cefalea de inicio el lunes, más intensa por las mañanas, con mejoría parcial durante el día. Asociada a náuseas matutinas y fotofobia. Niega antecedentes de migrañas.",
          symptoms: [
            "Cefalea persistente",
            "Náuseas matutinas",
            "Fotofobia",
            "Dolor predominante matutino"
          ],
          physicalExamination: "Paciente alerta y orientado. Signos vitales estables. No se observan signos neurológicos focales.",
          assessment: "Cefalea tensional vs. migraña sin aura de novo. A descartar causas secundarias si persiste o empeora.",
          plan: "Manejo sintomático con analgésicos. Observación y seguimiento estrecho.",
          prescriptions: [
            {
              medication: "Ibuprofeno",
              dosage: "400mg",
              frequency: "Cada 8 horas según necesidad",
              duration: "5 días"
            },
            {
              medication: "Metoclopramida",
              dosage: "10mg",
              frequency: "Cada 8 horas si náuseas",
              duration: "3 días"
            }
          ],
          followUp: "Control en 48-72 horas o antes si empeoramiento. Acudir a urgencias si aparecen: rigidez de nuca, alteración de conciencia, vómitos persistentes, o déficit neurológico.",
          redFlags: [
            "Rigidez de nuca",
            "Alteración del estado de conciencia",
            "Déficit neurológico focal",
            "Vómitos persistentes"
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

    const prompt = `Genera un informe médico profesional en español basado en la siguiente información:

DATOS DEL PACIENTE:
- Nombre: ${patient.name}
- Edad: ${patient.age} años
- Alergias: ${patient.allergies || 'Ninguna'}
- Condiciones previas: ${patient.conditions || 'Ninguna'}

DATOS DEL MÉDICO:
- Dr./Dra. ${doctor.name}
- Especialidad: ${doctor.specialization}

FECHA DE CONSULTA: ${date}

NOTAS CLÍNICAS:
${JSON.stringify(notes, null, 2)}

Genera un informe médico formal y profesional que incluya:
1. Encabezado con datos del paciente y médico
2. Motivo de consulta
3. Historia clínica actual
4. Exploración física
5. Impresión diagnóstica
6. Plan terapéutico
7. Recomendaciones y seguimiento

El informe debe ser profesional, claro y adecuado para el expediente médico del paciente.`;

    if (!this.hasAnthropic && !this.hasOpenAI) {
      // Mock response for demo
      return {
        success: true,
        report: `INFORME MÉDICO

DATOS DEL PACIENTE
Nombre: ${patient.name}
Edad: ${patient.age} años
Fecha de consulta: ${date}

DATOS DEL MÉDICO
Dr./Dra. ${doctor.name}
Especialidad: ${doctor.specialization}

MOTIVO DE CONSULTA
Cefalea persistente de 3 días de evolución.

HISTORIA DE LA ENFERMEDAD ACTUAL
Paciente refiere inicio de cefalea hace 3 días, con mayor intensidad en horas matutinas y mejoría parcial durante el día. El dolor se acompaña de náuseas matutinas y fotofobia. Niega antecedentes personales de migrañas. Primera vez que experimenta un cuadro similar.

EXPLORACIÓN FÍSICA
Paciente consciente, orientado y colaborador. Signos vitales dentro de parámetros normales. Examen neurológico sin hallazgos de focalización. No rigidez de nuca. Fondos de ojo normales.

IMPRESIÓN DIAGNÓSTICA
1. Cefalea tensional vs. Migraña sin aura de novo
2. A descartar causas secundarias en evolución

PLAN TERAPÉUTICO
Se prescribe:
- Ibuprofeno 400mg cada 8 horas según necesidad por 5 días
- Metoclopramida 10mg cada 8 horas si náuseas por 3 días

RECOMENDACIONES Y SEGUIMIENTO
- Control médico en 48-72 horas
- Acudir a urgencias inmediatamente si presenta: rigidez de nuca, alteración de conciencia, vómitos persistentes o déficit neurológico
- Mantener adecuada hidratación
- Evitar factores desencadenantes conocidos

Dr./Dra. ${doctor.name}
${doctor.specialization}
Firma digital`,
        patientSummary: `Resumen para el Paciente:

Hola ${patient.name},

Has sido evaluado por dolor de cabeza que has tenido durante 3 días. Basado en tus síntomas, parece ser una cefalea tensional o posiblemente una migraña.

TRATAMIENTO:
- Toma Ibuprofeno 400mg cada 8 horas cuando tengas dolor (máximo 5 días)
- Si tienes náuseas, toma Metoclopramida 10mg cada 8 horas (máximo 3 días)

IMPORTANTE - Acude a urgencias si presentas:
❗ Rigidez en el cuello
❗ Confusión o mareos severos
❗ Vómitos que no paran
❗ Pérdida de fuerza o sensibilidad

PRÓXIMOS PASOS:
📅 Agenda control en 2-3 días
💧 Mantente bien hidratado
😴 Descansa lo suficiente

Si tienes dudas, no dudes en contactarnos.

Cuídate,
Dr./Dra. ${doctor.name}`
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
    const prompt = `Convierte el siguiente informe médico técnico en un resumen amigable y fácil de entender para el paciente.

Nombre del paciente: ${patientName}

Informe médico:
${medicalReport}

Crea un resumen que:
1. Use lenguaje simple y no técnico
2. Explique el diagnóstico de forma clara
3. Liste los medicamentos y cómo tomarlos
4. Incluya señales de alarma claramente
5. Sea empático y tranquilizador
6. Use emojis apropiados (📅 ❗ 💊 etc.)

El tono debe ser profesional pero cercano.`;

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

    const prompt = `Eres un asistente médico de triaje. Evalúa los siguientes síntomas y proporciona:

PACIENTE:
- Edad: ${patientData.age || 'No especificada'}
- Sexo: ${patientData.sex || 'No especificado'}
- Condiciones previas: ${patientData.conditions || 'Ninguna'}

SÍNTOMAS REPORTADOS:
${symptoms}

Proporciona tu evaluación en el siguiente formato JSON:

{
  "urgencyLevel": "low|medium|high|emergency",
  "urgencyReason": "Explicación del nivel de urgencia",
  "possibleConditions": ["condición1", "condición2", "condición3"],
  "recommendedSpecialty": "especialidad médica recomendada",
  "redFlags": ["señal de alarma 1", "señal de alarma 2"],
  "immediateAction": "¿Requiere atención inmediata? true/false",
  "recommendations": [
    "recomendación 1",
    "recomendación 2"
  ],
  "questions": [
    "pregunta aclaratoria 1",
    "pregunta aclaratoria 2"
  ]
}

Niveles de urgencia:
- emergency: Requiere atención de emergencia inmediata (911)
- high: Requiere atención médica el mismo día
- medium: Requiere consulta en 24-48 horas
- low: Puede esperar consulta programada

Responde SOLO con el JSON.`;

    if (!this.hasAnthropic && !this.hasOpenAI) {
      // Mock response for demo
      return {
        success: true,
        triage: {
          urgencyLevel: "medium",
          urgencyReason: "Cefalea persistente con síntomas asociados que requiere evaluación médica para descartar causas secundarias.",
          possibleConditions: [
            "Cefalea tensional",
            "Migraña",
            "Sinusitis",
            "Hipertensión arterial"
          ],
          recommendedSpecialty: "Medicina General",
          redFlags: [
            "Cefalea de inicio súbito y severo",
            "Asociada a fiebre alta",
            "Con alteración de conciencia"
          ],
          immediateAction: false,
          recommendations: [
            "Agendar consulta médica en las próximas 24-48 horas",
            "Mantener hidratación adecuada",
            "Registrar características del dolor (intensidad, duración, factores que lo mejoran/empeoran)",
            "Puede tomar analgésicos de venta libre siguiendo indicaciones del envase"
          ],
          questions: [
            "¿El dolor es pulsátil o constante?",
            "¿Se acompaña de náuseas o vómitos?",
            "¿Tiene sensibilidad a la luz o al ruido?",
            "¿Ha tenido fiebre?",
            "¿El dolor empeora con la actividad física?"
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
    const diagnosisPrompt = `Eres un médico experto analizando la descripción de síntomas de un paciente.

DATOS DEL PACIENTE:
- Nombre: ${patientContext.name || 'No especificado'}
- Edad: ${patientContext.age || 'No especificada'}
- Sexo: ${patientContext.sex || 'No especificado'}
- Condiciones previas: ${patientContext.conditions || 'Ninguna conocida'}
- Alergias: ${patientContext.allergies || 'Ninguna conocida'}

TRANSCRIPCIÓN DE LA CONSULTA:
${transcript}

Analiza la transcripción y proporciona un diagnóstico estructurado en formato JSON:

{
  "mainSymptoms": ["síntoma principal 1", "síntoma 2"],
  "symptomDuration": "duración de los síntomas",
  "urgencyLevel": "low|medium|high|emergency",
  "differentialDiagnosis": [
    {
      "condition": "diagnóstico más probable",
      "probability": "alta|media|baja",
      "reasoning": "justificación clínica"
    },
    {
      "condition": "segundo diagnóstico posible",
      "probability": "alta|media|baja",
      "reasoning": "justificación clínica"
    }
  ],
  "recommendedTests": ["estudio 1", "estudio 2"],
  "suggestedTreatment": {
    "immediate": "tratamiento inmediato sugerido",
    "medications": [
      {
        "name": "medicamento",
        "dosage": "dosis",
        "frequency": "frecuencia",
        "duration": "duración"
      }
    ],
    "lifestyle": ["recomendación de estilo de vida 1", "recomendación 2"]
  },
  "redFlags": ["señal de alarma 1", "señal de alarma 2"],
  "followUp": "recomendación de seguimiento",
  "specialistReferral": "especialista si se requiere o null",
  "clinicalNotes": "notas adicionales para el médico"
}

IMPORTANTE:
- Este es un apoyo para el médico, NO un diagnóstico final
- Incluir siempre diagnósticos diferenciales
- Señalar cualquier señal de alarma
- El médico debe verificar y ajustar según su criterio clínico

Responde SOLO con el JSON.`;

    if (!this.hasAnthropic && !this.hasOpenAI) {
      // Mock diagnosis for demo
      return {
        success: true,
        transcript: transcript,
        transcriptionDuration: transcriptionResult.duration,
        language: transcriptionResult.language,
        confidence: transcriptionResult.confidence,
        diagnosis: {
          mainSymptoms: ["Cefalea persistente", "Náuseas matutinas", "Fotofobia"],
          symptomDuration: "3 días",
          urgencyLevel: "medium",
          differentialDiagnosis: [
            {
              condition: "Migraña sin aura",
              probability: "alta",
              reasoning: "Cefalea unilateral pulsátil con fotofobia y náuseas, sin aura previa. Primera presentación en adulto."
            },
            {
              condition: "Cefalea tensional",
              probability: "media",
              reasoning: "Patrón de dolor matutino que mejora durante el día, posible componente muscular."
            },
            {
              condition: "Sinusitis aguda",
              probability: "baja",
              reasoning: "El patrón matutino podría sugerir congestión, aunque faltan síntomas nasales típicos."
            }
          ],
          recommendedTests: [
            "Toma de presión arterial",
            "Examen neurológico básico",
            "Fundoscopia si disponible",
            "Considerar hemograma si persiste"
          ],
          suggestedTreatment: {
            immediate: "Analgesia y ambiente oscuro/tranquilo",
            medications: [
              {
                name: "Ibuprofeno",
                dosage: "400mg",
                frequency: "Cada 8 horas con alimentos",
                duration: "5 días máximo"
              },
              {
                name: "Metoclopramida",
                dosage: "10mg",
                frequency: "30 min antes de analgésico si náuseas",
                duration: "Según necesidad"
              }
            ],
            lifestyle: [
              "Hidratación adecuada (2L agua/día)",
              "Evitar pantallas brillantes",
              "Descanso en habitación oscura durante episodios",
              "Registro de diario de cefalea"
            ]
          },
          redFlags: [
            "Cefalea súbita 'en trueno'",
            "Rigidez de nuca",
            "Fiebre alta",
            "Alteración de conciencia",
            "Déficit neurológico focal",
            "Vómitos persistentes"
          ],
          followUp: "Control en 48-72 horas. Si persiste >2 semanas o cambia patrón, neurología.",
          specialistReferral: "Neurología si no responde a tratamiento en 2 semanas",
          clinicalNotes: "Primera cefalea de este tipo en el paciente. Considerar factores desencadenantes (estrés, sueño, alimentación). Educar sobre señales de alarma. Si migraña confirmada, considerar profilaxis si >4 episodios/mes."
        },
        disclaimer: "Este diagnóstico es generado por IA como apoyo al médico. No sustituye el juicio clínico profesional. El médico tratante debe verificar y ajustar según su evaluación."
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
        disclaimer: "Este diagnóstico es generado por IA como apoyo al médico. No sustituye el juicio clínico profesional. El médico tratante debe verificar y ajustar según su evaluación."
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
}

module.exports = { AIService };
