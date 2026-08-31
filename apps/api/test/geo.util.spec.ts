import { haversineMeters, isWithinRadius } from '../src/common/geo.util';

describe('geo.util', () => {
  describe('haversineMeters', () => {
    it('returns ~0 for identical points', () => {
      const p = { latitude: 14.5995, longitude: 120.9842 };
      expect(haversineMeters(p, p)).toBeLessThan(0.001);
    });

    it('computes a plausible distance between two points', () => {
      // Roughly 1 degree of latitude ~ 111km
      const a = { latitude: 14.5995, longitude: 120.9842 };
      const b = { latitude: 15.5995, longitude: 120.9842 };
      const d = haversineMeters(a, b);
      expect(d).toBeGreaterThan(110000);
      expect(d).toBeLessThan(112000);
    });

    it('is symmetric', () => {
      const a = { latitude: 14.0, longitude: 121.0 };
      const b = { latitude: 14.5, longitude: 121.5 };
      expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
    });
  });

  describe('isWithinRadius', () => {
    const checkpoint = { latitude: 14.5995, longitude: 120.9842 };

    it('accepts a point inside the radius', () => {
      // ~50m north of the checkpoint
      const near = { latitude: checkpoint.latitude + 50 / 111000, longitude: checkpoint.longitude };
      expect(isWithinRadius(checkpoint, near, 100)).toBe(true);
    });

    it('rejects a point outside the radius', () => {
      const far = { latitude: checkpoint.latitude + 1, longitude: checkpoint.longitude };
      expect(isWithinRadius(checkpoint, far, 50)).toBe(false);
    });
  });
});
