// Simulator pure helpers — no DB, no IO
const engine = require('../src/simulator/engine');
const { interpolate, generateReading, checkAlert } = engine._internal;

describe('simulator helpers', () => {
  describe('interpolate', () => {
    const wp = [
      [0, 0],
      [10, 10],
      [20, 0],
    ];

    it('returns first point at progress 0', () => {
      expect(interpolate(wp, 0)).toEqual([0, 0]);
    });

    it('returns last point at progress 1', () => {
      // waypoints are [lng, lat]; interpolate returns [lat, lng]
      // last wp [20, 0] → lng=20, lat=0 → returns [lat=0, lng=20]
      expect(interpolate(wp, 1)).toEqual([0, 20]);
    });

    it('interpolates inside a segment', () => {
      // halfway = end of first segment
      const [lat, lng] = interpolate(wp, 0.5);
      expect(lat).toBeCloseTo(10);
      expect(lng).toBeCloseTo(10);
    });
  });

  describe('generateReading', () => {
    const box = {
      targetTempMin: -25,
      targetTempMax: -13,
      targetHumMin: 58,
      targetHumMax: 82,
    };

    it('produces values near the midpoint without offset', () => {
      // midpoint is -19 °C; timeOfDayOffset adds up to ±6.3 °C, so plausible range is [-27, -12].
      const r = generateReading(box);
      expect(r.temperature).toBeGreaterThan(-27);
      expect(r.temperature).toBeLessThan(-12);
      expect(r.humidity).toBeGreaterThan(57);
      expect(r.humidity).toBeLessThan(83);
    });

    it('shifts values when forced offsets are provided', () => {
      const r = generateReading(box, 10, 20);
      expect(r.temperature).toBeGreaterThan(-15);
      expect(r.humidity).toBeGreaterThan(80);
    });
  });

  describe('checkAlert', () => {
    const box = {
      targetTempMin: -25,
      targetTempMax: -13,
      targetHumMin: 58,
      targetHumMax: 82,
    };

    it('no alerts when in range', () => {
      expect(checkAlert(box, { temperature: -19, humidity: 70 })).toEqual([]);
    });

    it('temp alert when out of range', () => {
      const alerts = checkAlert(box, { temperature: -10, humidity: 70 });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('TEMP');
    });

    it('hum alert when out of range', () => {
      const alerts = checkAlert(box, { temperature: -19, humidity: 95 });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('HUM');
    });

    it('both alerts when both out of range', () => {
      const alerts = checkAlert(box, { temperature: 0, humidity: 5 });
      expect(alerts.map((a) => a.type).sort()).toEqual(['HUM', 'TEMP']);
    });
  });

  describe('checkAlert severity', () => {
    const box = {
      targetTempMin: -25,
      targetTempMax: -13,
      targetHumMin: 58,
      targetHumMax: 82,
    };

    it('WARNING when temp deviation < 5', () => {
      // -10 exceeds max (-13) by 3 °C → WARNING
      const alerts = checkAlert(box, { temperature: -10, humidity: 70 });
      expect(alerts[0].severity).toBe('WARNING');
    });

    it('CRITICAL when temp deviation >= 5', () => {
      // -7 exceeds max (-13) by 6 °C → CRITICAL
      const alerts = checkAlert(box, { temperature: -7, humidity: 70 });
      expect(alerts[0].severity).toBe('CRITICAL');
    });

    it('WARNING when hum deviation < 10', () => {
      // 90 exceeds max (82) by 8 % → WARNING
      const alerts = checkAlert(box, { temperature: -19, humidity: 90 });
      expect(alerts[0].severity).toBe('WARNING');
    });

    it('CRITICAL when hum deviation >= 10', () => {
      // 95 exceeds max (82) by 13 % → CRITICAL
      const alerts = checkAlert(box, { temperature: -19, humidity: 95 });
      expect(alerts[0].severity).toBe('CRITICAL');
    });
  });
});
