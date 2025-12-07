const { VitalsMonitoringService } = require('../services/vitals-monitoring');

describe('VitalsMonitoringService', () => {
  let service;

  beforeEach(() => {
    service = new VitalsMonitoringService();
  });

  describe('constructor', () => {
    test('should initialize with normal ranges', () => {
      expect(service.normalRanges).toBeDefined();
      expect(service.normalRanges.heartRate).toBeDefined();
      expect(service.normalRanges.systolic).toBeDefined();
      expect(service.normalRanges.diastolic).toBeDefined();
      expect(service.normalRanges.spo2).toBeDefined();
      expect(service.normalRanges.temperature).toBeDefined();
      expect(service.normalRanges.respiratoryRate).toBeDefined();
    });

    test('should initialize with mock devices', () => {
      expect(service.devices).toBeDefined();
      expect(service.devices.length).toBeGreaterThan(0);
      expect(service.devices[0]).toHaveProperty('id');
      expect(service.devices[0]).toHaveProperty('name');
      expect(service.devices[0]).toHaveProperty('type');
    });
  });

  describe('generateRealisticVitals', () => {
    test('should generate vitals with all required fields', () => {
      const vitals = service.generateRealisticVitals(1);

      expect(vitals).toHaveProperty('heartRate');
      expect(vitals).toHaveProperty('systolic');
      expect(vitals).toHaveProperty('diastolic');
      expect(vitals).toHaveProperty('spo2');
      expect(vitals).toHaveProperty('temperature');
      expect(vitals).toHaveProperty('respiratoryRate');
      expect(vitals).toHaveProperty('bloodPressure');
      expect(vitals).toHaveProperty('ecg');
      expect(vitals).toHaveProperty('deviceSource');
      expect(vitals).toHaveProperty('deviceId');
      expect(vitals).toHaveProperty('alertTriggered');
      expect(vitals).toHaveProperty('alerts');
      expect(vitals).toHaveProperty('trend');
      expect(vitals).toHaveProperty('recordedAt');
    });

    test('should use default base values when not provided', () => {
      const vitals = service.generateRealisticVitals(1);

      // Values should be close to defaults (±15% for anomalies)
      expect(vitals.heartRate).toBeGreaterThan(50);
      expect(vitals.heartRate).toBeLessThan(100);
    });

    test('should use custom base values when provided', () => {
      const baseValues = {
        heartRate: 90,
        systolic: 130,
        diastolic: 85,
        spo2: 97,
        temperature: 37.0,
        respiratoryRate: 18
      };

      const vitals = service.generateRealisticVitals(1, baseValues);

      // Values should be close to custom base values (±15% for anomalies)
      expect(vitals.heartRate).toBeGreaterThan(70);
      expect(vitals.heartRate).toBeLessThan(110);
    });

    test('should format blood pressure correctly', () => {
      const vitals = service.generateRealisticVitals(1);

      expect(vitals.bloodPressure).toMatch(/^\d+\/\d+$/);
    });

    test('should include device information', () => {
      const vitals = service.generateRealisticVitals(1);

      expect(vitals.deviceSource).toBeTruthy();
      expect(vitals.deviceId).toBeTruthy();
      expect(service.devices.some(d => d.id === vitals.deviceId)).toBe(true);
    });

    test('should include valid ISO timestamp', () => {
      const vitals = service.generateRealisticVitals(1);

      expect(new Date(vitals.recordedAt).toISOString()).toBe(vitals.recordedAt);
    });

    test('should have ECG as regular or irregular', () => {
      const vitals = service.generateRealisticVitals(1);

      expect(['regular', 'irregular']).toContain(vitals.ecg);
    });
  });

  describe('detectAnomalies', () => {
    test('should detect critical low heart rate', () => {
      const vitals = { heartRate: 45 };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'heartRate' && a.type === 'critical')).toBe(true);
    });

    test('should detect critical high heart rate', () => {
      const vitals = { heartRate: 130 };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'heartRate' && a.type === 'critical')).toBe(true);
    });

    test('should detect warning for slightly abnormal heart rate', () => {
      const vitals = { heartRate: 55 };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'heartRate' && a.type === 'warning')).toBe(true);
    });

    test('should detect critical systolic pressure', () => {
      const vitals = { systolic: 170, diastolic: 80 };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'bloodPressure' && a.type === 'critical')).toBe(true);
    });

    test('should detect critical diastolic pressure', () => {
      const vitals = { systolic: 120, diastolic: 110 };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'bloodPressure' && a.type === 'critical')).toBe(true);
    });

    test('should detect critical low SpO2', () => {
      const vitals = { spo2: 88 };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'spo2' && a.type === 'critical')).toBe(true);
    });

    test('should detect warning for borderline SpO2', () => {
      const vitals = { spo2: 94 };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'spo2' && a.type === 'warning')).toBe(true);
    });

    test('should detect critical low temperature', () => {
      const vitals = { temperature: 34.5 };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'temperature' && a.type === 'critical')).toBe(true);
    });

    test('should detect critical high temperature', () => {
      const vitals = { temperature: 39.5 };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'temperature' && a.type === 'critical')).toBe(true);
    });

    test('should detect warning for slightly abnormal temperature', () => {
      const vitals = { temperature: 37.5 };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'temperature' && a.type === 'warning')).toBe(true);
    });

    test('should detect critical respiratory rate', () => {
      const vitals = { respiratoryRate: 8 };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'respiratoryRate' && a.type === 'critical')).toBe(true);
    });

    test('should detect warning for abnormal respiratory rate', () => {
      const vitals = { respiratoryRate: 22 };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'respiratoryRate' && a.type === 'warning')).toBe(true);
    });

    test('should detect irregular ECG', () => {
      const vitals = { ecg: 'irregular' };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts.some(a => a.vital === 'ecg' && a.type === 'warning')).toBe(true);
    });

    test('should return empty array for normal vitals', () => {
      const vitals = {
        heartRate: 75,
        systolic: 120,
        diastolic: 80,
        spo2: 98,
        temperature: 36.6,
        respiratoryRate: 16,
        ecg: 'regular'
      };
      const alerts = service.detectAnomalies(vitals);

      expect(alerts).toEqual([]);
    });
  });

  describe('analyzeTrend', () => {
    test('should detect worsening trend', () => {
      const current = { heartRate: 90, systolic: 140, spo2: 94 };
      const baseline = { heartRate: 75, systolic: 120, spo2: 98 };

      const trend = service.analyzeTrend(current, baseline);

      expect(trend).toBe('worsening');
    });

    test('should detect improving trend', () => {
      const current = { heartRate: 70, systolic: 115, spo2: 99 };
      const baseline = { heartRate: 85, systolic: 130, spo2: 95 };

      const trend = service.analyzeTrend(current, baseline);

      expect(trend).toBe('improving');
    });

    test('should detect stable trend', () => {
      const current = { heartRate: 76, systolic: 121, spo2: 98 };
      const baseline = { heartRate: 75, systolic: 120, spo2: 98 };

      const trend = service.analyzeTrend(current, baseline);

      expect(trend).toBe('stable');
    });
  });

  describe('getVitalStatus', () => {
    test('should return critical for values outside critical range', () => {
      expect(service.getVitalStatus('heartRate', 45)).toBe('critical');
      expect(service.getVitalStatus('heartRate', 130)).toBe('critical');
      expect(service.getVitalStatus('spo2', 90)).toBe('critical');
    });

    test('should return warning for values outside normal but not critical', () => {
      expect(service.getVitalStatus('heartRate', 55)).toBe('warning');
      expect(service.getVitalStatus('heartRate', 105)).toBe('warning');
    });

    test('should return normal for values within range', () => {
      expect(service.getVitalStatus('heartRate', 75)).toBe('normal');
      expect(service.getVitalStatus('spo2', 98)).toBe('normal');
      expect(service.getVitalStatus('temperature', 36.6)).toBe('normal');
    });

    test('should return normal for unknown vital type', () => {
      expect(service.getVitalStatus('unknownVital', 100)).toBe('normal');
    });
  });

  describe('getConnectedDevices', () => {
    test('should return array of devices', () => {
      const devices = service.getConnectedDevices(1);

      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBe(service.devices.length);
    });

    test('should include connection status for each device', () => {
      const devices = service.getConnectedDevices(1);

      devices.forEach(device => {
        expect(device).toHaveProperty('id');
        expect(device).toHaveProperty('name');
        expect(device).toHaveProperty('type');
        expect(device).toHaveProperty('connected');
        expect(device).toHaveProperty('lastSync');
        expect(device).toHaveProperty('batteryLevel');
        expect(typeof device.connected).toBe('boolean');
        expect(typeof device.batteryLevel).toBe('number');
      });
    });

    test('should have battery level between 0 and 100', () => {
      const devices = service.getConnectedDevices(1);

      devices.forEach(device => {
        expect(device.batteryLevel).toBeGreaterThanOrEqual(0);
        expect(device.batteryLevel).toBeLessThan(100);
      });
    });

    test('should have valid ISO timestamp for lastSync', () => {
      const devices = service.getConnectedDevices(1);

      devices.forEach(device => {
        const date = new Date(device.lastSync);
        expect(date.toISOString()).toBe(device.lastSync);
      });
    });
  });

  describe('configureThresholds', () => {
    test('should configure custom thresholds successfully', () => {
      const customThresholds = {
        heartRate: { min: 55, max: 110 },
        spo2: { min: 93 }
      };

      const result = service.configureThresholds(1, customThresholds);

      expect(result.success).toBe(true);
      expect(result.patientId).toBe(1);
      expect(result.thresholds).toBeDefined();
      expect(result.message).toBe('Alert thresholds configured successfully');
    });

    test('should merge custom thresholds with defaults', () => {
      const customThresholds = {
        heartRate: { min: 55 }
      };

      const result = service.configureThresholds(1, customThresholds);

      expect(result.thresholds.heartRate.min).toBe(55);
      expect(result.thresholds.heartRate.max).toBe(service.normalRanges.heartRate.max);
    });

    test('should ignore unknown vital types', () => {
      const customThresholds = {
        unknownVital: { min: 10, max: 100 }
      };

      const result = service.configureThresholds(1, customThresholds);

      expect(result.thresholds.unknownVital).toBeUndefined();
    });

    test('should handle empty thresholds', () => {
      const result = service.configureThresholds(1, {});

      expect(result.success).toBe(true);
      expect(result.thresholds).toEqual({});
    });
  });

  describe('Normal Ranges', () => {
    test('should have valid heart rate ranges', () => {
      const hr = service.normalRanges.heartRate;
      expect(hr.critical_low).toBeLessThan(hr.min);
      expect(hr.min).toBeLessThan(hr.max);
      expect(hr.max).toBeLessThan(hr.critical_high);
    });

    test('should have valid SpO2 ranges', () => {
      const spo2 = service.normalRanges.spo2;
      expect(spo2.critical_low).toBeLessThan(spo2.min);
      expect(spo2.min).toBeLessThan(spo2.max);
      expect(spo2.max).toBeLessThanOrEqual(100);
    });

    test('should have valid temperature ranges', () => {
      const temp = service.normalRanges.temperature;
      expect(temp.critical_low).toBeLessThan(temp.min);
      expect(temp.min).toBeLessThan(temp.max);
      expect(temp.max).toBeLessThan(temp.critical_high);
    });
  });
});
