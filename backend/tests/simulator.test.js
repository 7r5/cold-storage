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
      expect(interpolate(wp, 1)).toEqual([20, 0]);
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
      targetTempMin: -20,
      targetTempMax: -18,
      targetHumMin: 60,
      targetHumMax: 80,
    };

    it('produces values near the midpoint without offset', () => {
      const r = generateReading(box);
      expect(r.temperature).toBeGreaterThan(-20);
      expect(r.temperature).toBeLessThan(-18);
      expect(r.humidity).toBeGreaterThan(60);
      expect(r.humidity).toBeLessThan(80);
    });

    it('shifts values when forced offsets are provided', () => {
      const r = generateReading(box, 10, 20);
      expect(r.temperature).toBeGreaterThan(-15);
      expect(r.humidity).toBeGreaterThan(80);
    });
  });

  describe('checkAlert', () => {
    const box = {
      targetTempMin: -20,
      targetTempMax: -18,
      targetHumMin: 60,
      targetHumMax: 80,
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
});
