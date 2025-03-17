// tests/MapUtils.test.js

const { calculateDistance, isPointInPolygon, isValidCoordinate } = require('../client/src/services/MapUtils');

describe('MapUtils', () => {
  describe('isValidCoordinate', () => {
    test('should validate correct coordinates', () => {
      expect(isValidCoordinate(40.73, -73.99)).toBe(true);
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
    });

    test('should invalidate incorrect coordinates', () => {
      expect(isValidCoordinate(91, 0)).toBe(false);
      expect(isValidCoordinate(0, 181)).toBe(false);
      expect(isValidCoordinate('40', '73')).toBe(false);
      expect(isValidCoordinate(null, undefined)).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    test('should calculate distance between two points correctly', () => {
      const point1 = { lat: 40.730610, lng: -73.935242 }; // NYC
      const point2 = { lat: 40.731610, lng: -73.936242 }; // About 140 meters away
      const distance = calculateDistance(point1, point2);
      
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
      // Approximate distance verification (should be ~140 meters)
      expect(distance).toBeGreaterThan(130);
      expect(distance).toBeLessThan(150);
    });

    test('should return 0 for invalid inputs', () => {
      expect(calculateDistance(null, { lat: 40, lng: -73 })).toBe(0);
      expect(calculateDistance({ lat: 40, lng: -73 }, null)).toBe(0);
      expect(calculateDistance({ lat: 'invalid', lng: -73 }, { lat: 40, lng: -73 })).toBe(0);
    });
  });

  describe('isPointInPolygon', () => {
    const polygon = [
      { lat: 40.730, lng: -73.935 },
      { lat: 40.731, lng: -73.934 },
      { lat: 40.732, lng: -73.936 },
      { lat: 40.731, lng: -73.937 }
    ];

    test('should correctly identify if a point is inside a polygon', () => {
      const insidePoint = { lat: 40.731, lng: -73.935 };
      expect(isPointInPolygon(insidePoint, polygon)).toBe(true);
    });

    test('should correctly identify if a point is outside a polygon', () => {
      const outsidePoint = { lat: 40.735, lng: -73.940 };
      expect(isPointInPolygon(outsidePoint, polygon)).toBe(false);
    });

    test('should handle invalid inputs gracefully', () => {
      expect(isPointInPolygon(null, polygon)).toBe(false);
      expect(isPointInPolygon({ lat: 40, lng: -73 }, null)).toBe(false);
      expect(isPointInPolygon({ lat: 40, lng: -73 }, [])).toBe(false);
      expect(isPointInPolygon({ lat: 40, lng: -73 }, [{ lat: 1, lng: 1 }])).toBe(false);
    });
  });
});