// tests/AudioUtils.test.js

const { validateFrequency, validateDelayTime, formatTime } = require('../client/src/services/AudioUtils');

// Mock the Web Audio API since Jest runs in Node.js
global.AudioContext = jest.fn().mockImplementation(() => ({
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: { value: 0 }
  }),
  createOscillator: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  }),
  currentTime: 0
}));

describe('AudioUtils', () => {
  describe('validateFrequency', () => {
    test('should constrain frequencies to audible range', () => {
      expect(validateFrequency(1000)).toBe(1000);
      expect(validateFrequency(-100)).toBe(20); // MIN_FREQUENCY
      expect(validateFrequency(30000)).toBe(20000); // MAX_FREQUENCY
      expect(validateFrequency('not a number')).toBe(1000); // Default
    });
  });

  describe('validateDelayTime', () => {
    test('should constrain delay time to reasonable values', () => {
      expect(validateDelayTime(1.5)).toBe(1.5);
      expect(validateDelayTime(0)).toBe(0.01); // Minimum
      expect(validateDelayTime(10)).toBe(5); // Maximum
      expect(validateDelayTime('not a number')).toBe(0.3); // Default
    });
  });

  describe('formatTime', () => {
    test('should format seconds to MM:SS', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(61)).toBe('01:01');
      expect(formatTime(3661)).toBe('61:01'); // 1h 1m 1s
      expect(formatTime('invalid')).toBe('00:00');
      expect(formatTime(-10)).toBe('00:00');
    });
  });
});