// Real-Time Vital Signs Monitoring Service
// Simulates integration with wearable devices and medical equipment

class VitalsMonitoringService {
  constructor() {
    // Normal ranges for vital signs
    this.normalRanges = {
      heartRate: { min: 60, max: 100, critical_low: 50, critical_high: 120 },
      systolic: { min: 90, max: 140, critical_low: 80, critical_high: 160 },
      diastolic: { min: 60, max: 90, critical_low: 50, critical_high: 100 },
      spo2: { min: 95, max: 100, critical_low: 92, critical_high: 100 },
      temperature: { min: 36.1, max: 37.2, critical_low: 35.5, critical_high: 38.0 },
      respiratoryRate: { min: 12, max: 20, critical_low: 10, critical_high: 25 }
    };

    // Mock devices
    this.devices = [
      { id: 'apple-watch-1', name: 'Apple Watch Series 8', type: 'smartwatch' },
      { id: 'fitbit-1', name: 'Fitbit Charge 5', type: 'fitness-tracker' },
      { id: 'welch-allyn-1', name: 'Welch Allyn Vital Signs Monitor', type: 'medical-monitor' },
      { id: 'masimo-1', name: 'Masimo Pulse Oximeter', type: 'pulse-oximeter' },
      { id: 'nonin-1', name: 'Nonin Onyx II', type: 'pulse-oximeter' }
    ];
  }

  /**
   * Generate realistic vital signs with natural variations
   */
  generateRealisticVitals(patientId, baseValues = {}) {
    // Base values (can be customized per patient)
    const base = {
      heartRate: baseValues.heartRate || 75,
      systolic: baseValues.systolic || 120,
      diastolic: baseValues.diastolic || 80,
      spo2: baseValues.spo2 || 98,
      temperature: baseValues.temperature || 36.6,
      respiratoryRate: baseValues.respiratoryRate || 16
    };

    // Add natural variation (±5%)
    const variation = () => (Math.random() - 0.5) * 0.1;

    // Occasionally generate anomalies (5% chance)
    const anomaly = Math.random() < 0.05;
    const anomalyFactor = anomaly ? (Math.random() < 0.5 ? 1.15 : 0.85) : 1;

    const vitals = {
      heartRate: Math.round((base.heartRate * (1 + variation())) * anomalyFactor),
      systolic: Math.round((base.systolic * (1 + variation())) * anomalyFactor),
      diastolic: Math.round((base.diastolic * (1 + variation())) * anomalyFactor),
      spo2: Math.min(100, Math.round((base.spo2 * (1 + variation() * 0.5)) * anomalyFactor)),
      temperature: Number(((base.temperature * (1 + variation() * 0.5)) * anomalyFactor).toFixed(1)),
      respiratoryRate: Math.round((base.respiratoryRate * (1 + variation())) * anomalyFactor),
      ecg: anomaly ? 'irregular' : 'regular'
    };

    // Blood pressure formatting
    vitals.bloodPressure = `${vitals.systolic}/${vitals.diastolic}`;

    // Select random device
    const device = this.devices[Math.floor(Math.random() * this.devices.length)];
    vitals.deviceSource = device.name;
    vitals.deviceId = device.id;

    // Detect anomalies
    const alerts = this.detectAnomalies(vitals);
    vitals.alertTriggered = alerts.length > 0;
    vitals.alerts = alerts;

    // Trend analysis
    vitals.trend = this.analyzeTrend(vitals, base);

    // Timestamp
    vitals.recordedAt = new Date().toISOString();

    return vitals;
  }

  /**
   * Detect anomalies in vital signs
   */
  detectAnomalies(vitals) {
    const alerts = [];

    // Heart rate
    if (vitals.heartRate < this.normalRanges.heartRate.critical_low) {
      alerts.push({
        type: 'critical',
        vital: 'heartRate',
        message: `Critical: Heart rate too low (${vitals.heartRate} bpm)`,
        value: vitals.heartRate,
        threshold: this.normalRanges.heartRate.critical_low
      });
    } else if (vitals.heartRate > this.normalRanges.heartRate.critical_high) {
      alerts.push({
        type: 'critical',
        vital: 'heartRate',
        message: `Critical: Heart rate too high (${vitals.heartRate} bpm)`,
        value: vitals.heartRate,
        threshold: this.normalRanges.heartRate.critical_high
      });
    } else if (vitals.heartRate < this.normalRanges.heartRate.min || vitals.heartRate > this.normalRanges.heartRate.max) {
      alerts.push({
        type: 'warning',
        vital: 'heartRate',
        message: `Warning: Heart rate outside normal range (${vitals.heartRate} bpm)`,
        value: vitals.heartRate
      });
    }

    // Blood pressure
    if (vitals.systolic < this.normalRanges.systolic.critical_low || vitals.systolic > this.normalRanges.systolic.critical_high) {
      alerts.push({
        type: 'critical',
        vital: 'bloodPressure',
        message: `Critical: Systolic pressure abnormal (${vitals.systolic} mmHg)`,
        value: vitals.systolic
      });
    }

    if (vitals.diastolic < this.normalRanges.diastolic.critical_low || vitals.diastolic > this.normalRanges.diastolic.critical_high) {
      alerts.push({
        type: 'critical',
        vital: 'bloodPressure',
        message: `Critical: Diastolic pressure abnormal (${vitals.diastolic} mmHg)`,
        value: vitals.diastolic
      });
    }

    // SpO2
    if (vitals.spo2 < this.normalRanges.spo2.critical_low) {
      alerts.push({
        type: 'critical',
        vital: 'spo2',
        message: `Critical: Oxygen saturation too low (${vitals.spo2}%)`,
        value: vitals.spo2,
        threshold: this.normalRanges.spo2.critical_low
      });
    } else if (vitals.spo2 < this.normalRanges.spo2.min) {
      alerts.push({
        type: 'warning',
        vital: 'spo2',
        message: `Warning: Oxygen saturation borderline (${vitals.spo2}%)`,
        value: vitals.spo2
      });
    }

    // Temperature
    if (vitals.temperature < this.normalRanges.temperature.critical_low) {
      alerts.push({
        type: 'critical',
        vital: 'temperature',
        message: `Critical: Temperature too low (${vitals.temperature}°C)`,
        value: vitals.temperature
      });
    } else if (vitals.temperature > this.normalRanges.temperature.critical_high) {
      alerts.push({
        type: 'critical',
        vital: 'temperature',
        message: `Critical: Temperature too high (${vitals.temperature}°C)`,
        value: vitals.temperature
      });
    } else if (vitals.temperature < this.normalRanges.temperature.min || vitals.temperature > this.normalRanges.temperature.max) {
      alerts.push({
        type: 'warning',
        vital: 'temperature',
        message: `Warning: Temperature outside normal range (${vitals.temperature}°C)`,
        value: vitals.temperature
      });
    }

    // Respiratory rate
    if (vitals.respiratoryRate < this.normalRanges.respiratoryRate.critical_low || vitals.respiratoryRate > this.normalRanges.respiratoryRate.critical_high) {
      alerts.push({
        type: 'critical',
        vital: 'respiratoryRate',
        message: `Critical: Respiratory rate abnormal (${vitals.respiratoryRate} breaths/min)`,
        value: vitals.respiratoryRate
      });
    } else if (vitals.respiratoryRate < this.normalRanges.respiratoryRate.min || vitals.respiratoryRate > this.normalRanges.respiratoryRate.max) {
      alerts.push({
        type: 'warning',
        vital: 'respiratoryRate',
        message: `Warning: Respiratory rate outside normal range (${vitals.respiratoryRate} breaths/min)`,
        value: vitals.respiratoryRate
      });
    }

    // ECG
    if (vitals.ecg === 'irregular') {
      alerts.push({
        type: 'warning',
        vital: 'ecg',
        message: 'Warning: Irregular heart rhythm detected',
        value: vitals.ecg
      });
    }

    return alerts;
  }

  /**
   * Analyze trend compared to baseline
   */
  analyzeTrend(current, baseline) {
    const changes = {
      heartRate: ((current.heartRate - baseline.heartRate) / baseline.heartRate) * 100,
      systolic: ((current.systolic - baseline.systolic) / baseline.systolic) * 100,
      spo2: ((current.spo2 - baseline.spo2) / baseline.spo2) * 100
    };

    // Calculate average change
    const avgChange = (changes.heartRate + changes.systolic + changes.spo2) / 3;

    if (avgChange > 5) {
      return 'worsening';
    } else if (avgChange < -5) {
      return 'improving';
    } else {
      return 'stable';
    }
  }

  /**
   * Get vital signs status (normal, warning, critical)
   */
  getVitalStatus(vital, value) {
    const ranges = this.normalRanges[vital];
    if (!ranges) return 'normal';

    if (value < ranges.critical_low || value > ranges.critical_high) {
      return 'critical';
    } else if (value < ranges.min || value > ranges.max) {
      return 'warning';
    } else {
      return 'normal';
    }
  }

  /**
   * Get connected devices for a patient
   */
  getConnectedDevices(patientId) {
    // In real implementation, this would check actual device connections
    // For demo, return all devices with random connection status
    return this.devices.map(device => ({
      ...device,
      connected: Math.random() > 0.2, // 80% chance of being connected
      lastSync: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Within last hour
      batteryLevel: Math.floor(Math.random() * 100)
    }));
  }

  /**
   * Configure custom alert thresholds for a patient
   */
  configureThresholds(patientId, customThresholds) {
    // In real implementation, save to database
    // For demo, just validate and return
    const configured = {};

    for (const [vital, thresholds] of Object.entries(customThresholds)) {
      if (this.normalRanges[vital]) {
        configured[vital] = {
          ...this.normalRanges[vital],
          ...thresholds
        };
      }
    }

    return {
      success: true,
      patientId,
      thresholds: configured,
      message: 'Alert thresholds configured successfully'
    };
  }
}

module.exports = { VitalsMonitoringService };
