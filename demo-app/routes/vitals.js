const { requireAuth, requireRole } = require('../middleware/auth');
const db = require('../database/init');

function setupVitalsRoutes(app) {
  // GET /api/vitals/thresholds - Get normal vital ranges by age
  app.get('/api/vitals/thresholds', requireAuth, async (req, res) => {
    try {
      const { age, conditions } = req.query;
      const patientAge = parseInt(age) || 30;

      // Define normal ranges with age-specific adjustments
      const thresholds = {
        heartRate: {
          min: patientAge < 18 ? 60 : patientAge > 65 ? 50 : 60,
          max: patientAge < 18 ? 100 : patientAge > 65 ? 90 : 100,
          unit: 'bpm',
          critical: { min: 40, max: 120 }
        },
        systolicBP: {
          min: patientAge < 18 ? 90 : 90,
          max: patientAge < 18 ? 120 : patientAge > 65 ? 140 : 130,
          unit: 'mmHg',
          critical: { min: 70, max: 180 }
        },
        diastolicBP: {
          min: 60,
          max: patientAge > 65 ? 90 : 80,
          unit: 'mmHg',
          critical: { min: 40, max: 110 }
        },
        temperature: {
          min: 36.1,
          max: 37.2,
          unit: '°C',
          critical: { min: 35.0, max: 39.0 }
        },
        oxygenSaturation: {
          min: 95,
          max: 100,
          unit: '%',
          critical: { min: 90, max: 100 }
        },
        respiratoryRate: {
          min: patientAge < 18 ? 15 : 12,
          max: patientAge < 18 ? 25 : 20,
          unit: 'breaths/min',
          critical: { min: 8, max: 30 }
        },
        bloodGlucose: {
          min: 70,
          max: 140,
          unit: 'mg/dL',
          critical: { min: 50, max: 250 }
        }
      };

      // Adjust thresholds based on conditions
      if (conditions) {
        const conditionList = conditions.split(',').map(c => c.trim().toLowerCase());

        if (conditionList.includes('hypertension')) {
          thresholds.systolicBP.max = 140;
          thresholds.diastolicBP.max = 90;
        }

        if (conditionList.includes('diabetes')) {
          thresholds.bloodGlucose.max = 180;
        }

        if (conditionList.includes('copd') || conditionList.includes('asthma')) {
          thresholds.oxygenSaturation.min = 92;
        }
      }

      res.json({ success: true, thresholds });
    } catch (error) {
      console.error('Error getting thresholds:', error);
      res.status(500).json({ error: 'Failed to retrieve thresholds' });
    }
  });

  // POST /api/vitals/record - Record new vital signs
  app.post('/api/vitals/record', requireAuth, async (req, res) => {
    try {
      const {
        patientId,
        heartRate,
        systolicBP,
        diastolicBP,
        temperature,
        oxygenSaturation,
        respiratoryRate,
        bloodGlucose,
        weight,
        notes
      } = req.body;

      // Validate required fields
      if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
      }

      // Verify patient exists
      const patient = db.getPatientById(patientId);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Check authorization (patient can only record their own, doctors/admins can record any)
      if (req.session.user.role === 'patient' && patient.userId !== req.session.user.id) {
        return res.status(403).json({ error: 'Unauthorized to record vitals for this patient' });
      }

      // Create vital signs record
      const vitalRecord = {
        id: Date.now().toString(),
        patientId,
        timestamp: new Date().toISOString(),
        recordedBy: req.session.user.id,
        heartRate: heartRate ? parseInt(heartRate) : null,
        systolicBP: systolicBP ? parseInt(systolicBP) : null,
        diastolicBP: diastolicBP ? parseInt(diastolicBP) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        oxygenSaturation: oxygenSaturation ? parseInt(oxygenSaturation) : null,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate) : null,
        bloodGlucose: bloodGlucose ? parseInt(bloodGlucose) : null,
        weight: weight ? parseFloat(weight) : null,
        notes: notes || null
      };

      // Add to database
      if (!db.database.vitalSigns) {
        db.database.vitalSigns = [];
      }
      db.database.vitalSigns.push(vitalRecord);

      // Check for alerts
      const alerts = [];
      const age = patient.dateOfBirth
        ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 30;

      // Get thresholds
      const thresholdsResponse = {
        heartRate: { min: 60, max: 100, critical: { min: 40, max: 120 }, unit: 'bpm' },
        systolicBP: { min: 90, max: 130, critical: { min: 70, max: 180 }, unit: 'mmHg' },
        diastolicBP: { min: 60, max: 80, critical: { min: 40, max: 110 }, unit: 'mmHg' },
        temperature: { min: 36.1, max: 37.2, critical: { min: 35.0, max: 39.0 }, unit: '°C' },
        oxygenSaturation: { min: 95, max: 100, critical: { min: 90, max: 100 }, unit: '%' },
        respiratoryRate: { min: 12, max: 20, critical: { min: 8, max: 30 }, unit: 'breaths/min' },
        bloodGlucose: { min: 70, max: 140, critical: { min: 50, max: 250 }, unit: 'mg/dL' }
      };

      const checkVital = (value, threshold, name) => {
        if (value === null) return;

        let severity = 'info';
        let message = '';

        if (value < threshold.critical.min || value > threshold.critical.max) {
          severity = 'critical';
          message = `${name} is at critical level: ${value} ${threshold.unit}`;
        } else if (value < threshold.min) {
          severity = 'warning';
          message = `${name} is below normal: ${value} ${threshold.unit} (normal: ${threshold.min}-${threshold.max})`;
        } else if (value > threshold.max) {
          severity = 'warning';
          message = `${name} is above normal: ${value} ${threshold.unit} (normal: ${threshold.min}-${threshold.max})`;
        }

        if (message) {
          alerts.push({
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            patientId,
            vitalRecordId: vitalRecord.id,
            severity,
            message,
            vitalType: name.toLowerCase().replace(/\s+/g, ''),
            value,
            threshold,
            timestamp: new Date().toISOString(),
            acknowledged: false
          });
        }
      };

      checkVital(vitalRecord.heartRate, thresholdsResponse.heartRate, 'Heart Rate');
      checkVital(vitalRecord.systolicBP, thresholdsResponse.systolicBP, 'Systolic BP');
      checkVital(vitalRecord.diastolicBP, thresholdsResponse.diastolicBP, 'Diastolic BP');
      checkVital(vitalRecord.temperature, thresholdsResponse.temperature, 'Temperature');
      checkVital(vitalRecord.oxygenSaturation, thresholdsResponse.oxygenSaturation, 'Oxygen Saturation');
      checkVital(vitalRecord.respiratoryRate, thresholdsResponse.respiratoryRate, 'Respiratory Rate');
      checkVital(vitalRecord.bloodGlucose, thresholdsResponse.bloodGlucose, 'Blood Glucose');

      // Save alerts to database
      if (alerts.length > 0) {
        if (!db.database.vitalAlerts) {
          db.database.vitalAlerts = [];
        }
        db.database.vitalAlerts.push(...alerts);
      }

      res.json({
        success: true,
        vitalRecord,
        alerts,
        message: alerts.length > 0
          ? `Vitals recorded with ${alerts.length} alert(s) generated`
          : 'Vitals recorded successfully'
      });
    } catch (error) {
      console.error('Error recording vitals:', error);
      res.status(500).json({ error: 'Failed to record vital signs' });
    }
  });

  // GET /api/vitals/patient/:id - Get patient vitals history
  app.get('/api/vitals/patient/:id', requireAuth, async (req, res) => {
    try {
      const patientId = req.params.id;
      const { limit, days } = req.query;

      // Verify patient exists
      const patient = db.getPatientById(patientId);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Check authorization
      if (req.session.user.role === 'patient' && patient.userId !== req.session.user.id) {
        return res.status(403).json({ error: 'Unauthorized to view this patient\'s vitals' });
      }

      // Get vitals from database with defensive check
      if (!db.database.vitalSigns) {
        db.database.vitalSigns = [];
      }

      let vitals = db.database.vitalSigns
        .filter(v => v.patientId === patientId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Filter by days if specified
      if (days) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        vitals = vitals.filter(v => new Date(v.timestamp) >= daysAgo);
      }

      // Limit results if specified
      if (limit) {
        vitals = vitals.slice(0, parseInt(limit));
      }

      // Calculate statistics
      const calculateStats = (values) => {
        const validValues = values.filter(v => v !== null && !isNaN(v));
        if (validValues.length === 0) return null;

        return {
          current: validValues[0],
          average: validValues.reduce((a, b) => a + b, 0) / validValues.length,
          min: Math.min(...validValues),
          max: Math.max(...validValues),
          trend: validValues.length > 1
            ? (validValues[0] - validValues[validValues.length - 1]) / validValues.length
            : 0
        };
      };

      const stats = {
        heartRate: calculateStats(vitals.map(v => v.heartRate)),
        systolicBP: calculateStats(vitals.map(v => v.systolicBP)),
        diastolicBP: calculateStats(vitals.map(v => v.diastolicBP)),
        temperature: calculateStats(vitals.map(v => v.temperature)),
        oxygenSaturation: calculateStats(vitals.map(v => v.oxygenSaturation)),
        respiratoryRate: calculateStats(vitals.map(v => v.respiratoryRate)),
        bloodGlucose: calculateStats(vitals.map(v => v.bloodGlucose)),
        weight: calculateStats(vitals.map(v => v.weight))
      };

      res.json({
        success: true,
        patient: {
          id: patient.id,
          name: patient.name,
          dateOfBirth: patient.dateOfBirth,
          conditions: patient.conditions
        },
        vitals,
        stats,
        totalRecords: vitals.length
      });
    } catch (error) {
      console.error('Error getting patient vitals:', error);
      res.status(500).json({ error: 'Failed to retrieve vital signs' });
    }
  });

  // GET /api/vitals/alerts/:id - Get active alerts for patient
  app.get('/api/vitals/alerts/:id', requireAuth, async (req, res) => {
    try {
      const patientId = req.params.id;
      const { includeAcknowledged } = req.query;

      // Verify patient exists
      const patient = db.getPatientById(patientId);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Check authorization
      if (req.session.user.role === 'patient' && patient.userId !== req.session.user.id) {
        return res.status(403).json({ error: 'Unauthorized to view this patient\'s alerts' });
      }

      // Get alerts from database with defensive check
      if (!db.database.vitalAlerts) {
        db.database.vitalAlerts = [];
      }

      let alerts = db.database.vitalAlerts
        .filter(a => a.patientId === patientId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Filter out acknowledged alerts unless requested
      if (includeAcknowledged !== 'true') {
        alerts = alerts.filter(a => !a.acknowledged);
      }

      // Group alerts by severity
      const alertsByLevel = {
        critical: alerts.filter(a => a.severity === 'critical'),
        warning: alerts.filter(a => a.severity === 'warning'),
        info: alerts.filter(a => a.severity === 'info')
      };

      res.json({
        success: true,
        alerts,
        summary: {
          total: alerts.length,
          critical: alertsByLevel.critical.length,
          warning: alertsByLevel.warning.length,
          info: alertsByLevel.info.length
        },
        alertsByLevel
      });
    } catch (error) {
      console.error('Error getting alerts:', error);
      res.status(500).json({ error: 'Failed to retrieve alerts' });
    }
  });

  // POST /api/vitals/alerts/:id/acknowledge - Acknowledge an alert
  app.post('/api/vitals/alerts/:id/acknowledge', requireAuth, async (req, res) => {
    try {
      const alertId = req.params.id;

      // Defensive check
      if (!db.database.vitalAlerts) {
        db.database.vitalAlerts = [];
      }

      const alert = db.database.vitalAlerts.find(a => a.id === alertId);
      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      // Verify patient exists
      const patient = db.getPatientById(alert.patientId);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Check authorization (only doctors and admins can acknowledge, or the patient themselves)
      if (req.session.user.role === 'patient' && patient.userId !== req.session.user.id) {
        return res.status(403).json({ error: 'Unauthorized to acknowledge this alert' });
      }

      // Update alert
      alert.acknowledged = true;
      alert.acknowledgedBy = req.session.user.id;
      alert.acknowledgedAt = new Date().toISOString();

      res.json({
        success: true,
        alert,
        message: 'Alert acknowledged successfully'
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  });

  // POST /api/ai/analyze-vitals - AI analysis of vital trends
  app.post('/api/ai/analyze-vitals', requireAuth, async (req, res) => {
    try {
      const { patientId, vitals, timeframe } = req.body;

      if (!patientId || !vitals || vitals.length === 0) {
        return res.status(400).json({ error: 'Patient ID and vitals data required' });
      }

      // Check if OpenAI is configured
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return res.json({
          success: false,
          error: 'AI analysis unavailable',
          message: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'
        });
      }

      // Get patient info
      const patient = db.getPatientById(patientId);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Prepare vitals summary for AI
      const vitalsSummary = vitals.map(v => ({
        date: new Date(v.timestamp).toLocaleDateString(),
        heartRate: v.heartRate,
        bloodPressure: v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : null,
        temperature: v.temperature,
        oxygenSat: v.oxygenSaturation,
        respiratory: v.respiratoryRate,
        glucose: v.bloodGlucose
      })).slice(0, 20); // Limit to most recent 20 readings

      const prompt = `You are an AI medical assistant analyzing vital signs trends for a patient.

Patient Information:
- Age: ${patient.age || 'Unknown'}
- Gender: ${patient.gender || 'Unknown'}
- Medical Conditions: ${patient.conditions || 'None listed'}
- Current Medications: ${patient.medications || 'None listed'}

Vital Signs History (most recent ${vitalsSummary.length} readings over ${timeframe || 'recent period'}):
${JSON.stringify(vitalsSummary, null, 2)}

Please provide a comprehensive analysis including:
1. Risk Assessment (Low/Medium/High) - Overall health risk based on vitals
2. Concerning Trends - Identify any worrying patterns in the data
3. Positive Observations - Note any improvements or stable readings
4. Recommended Actions - Specific steps for patient or healthcare provider
5. When to Seek Care - Clear guidance on when immediate medical attention is needed

Format your response as JSON with these exact fields:
{
  "riskLevel": "low|medium|high",
  "riskScore": 0-100,
  "concerningTrends": ["trend1", "trend2"],
  "positiveObservations": ["observation1", "observation2"],
  "recommendedActions": ["action1", "action2"],
  "seekImmediateCare": boolean,
  "seekImmediateCareReason": "reason if true",
  "summary": "brief overall assessment",
  "detailedAnalysis": "longer detailed explanation"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert medical AI assistant specializing in vital signs analysis and trend detection. Always provide evidence-based, conservative recommendations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;

      // Try to parse JSON response
      let analysis;
      try {
        // Extract JSON from response (might be wrapped in markdown code blocks)
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        // Fallback: create structured response from text
        analysis = {
          riskLevel: 'medium',
          riskScore: 50,
          concerningTrends: [],
          positiveObservations: [],
          recommendedActions: [],
          seekImmediateCare: false,
          summary: analysisText.substring(0, 200),
          detailedAnalysis: analysisText
        };
      }

      res.json({
        success: true,
        analysis,
        timestamp: new Date().toISOString(),
        vitalsAnalyzed: vitals.length
      });

    } catch (error) {
      console.error('Error analyzing vitals:', error);
      res.status(500).json({
        error: 'Failed to analyze vital signs'
      });
    }
  });
}

module.exports = { setupVitalsRoutes };
