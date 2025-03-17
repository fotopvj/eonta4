// tests/AudioUtils.test.js

import {
  createAudioContext,
  cleanupAudioContext,
  trackAudioNode,
  loadAudioFile,
  createGainNode,
  validateFrequency,
  createLowpassFilter,
  createHighpassFilter,
  validateDelayTime,
  createDelay
} from '../client/src/services/AudioUtils';

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
  let mockAudioContext;
  let mockGainNode;
  let mockBiquadFilter;
  let mockDelayNode;

  beforeEach(() => {
    // Mock Web Audio API
    mockGainNode = {
      gain: { value: 1 },
      connect: jest.fn(),
      disconnect: jest.fn()
    };

    mockBiquadFilter = {
      type: 'lowpass',
      frequency: { value: 1000 },
      Q: { value: 1 },
      connect: jest.fn(),
      disconnect: jest.fn()
    };

    mockDelayNode = {
      delayTime: { value: 0.3 },
      connect: jest.fn(),
      disconnect: jest.fn()
    };

    mockAudioContext = {
      createGain: () => mockGainNode,
      createBiquadFilter: () => mockBiquadFilter,
      createDelay: () => mockDelayNode,
      decodeAudioData: jest.fn(),
      state: 'running',
      close: jest.fn(),
      resume: jest.fn(),
      suspend: jest.fn()
    };

    global.AudioContext = jest.fn(() => mockAudioContext);
    global.webkitAudioContext = jest.fn(() => mockAudioContext);
  });

  describe('Audio Context Management', () => {
    test('creates audio context successfully', () => {
      const context = createAudioContext();
      expect(context).toBeTruthy();
      expect(context._activeNodes).toEqual([]);
    });

    test('handles missing Web Audio API', () => {
      delete global.AudioContext;
      delete global.webkitAudioContext;
      const context = createAudioContext();
      expect(context).toBeNull();
    });

    test('tracks audio nodes correctly', () => {
      const context = createAudioContext();
      const node = mockGainNode;
      trackAudioNode(context, node);
      expect(context._activeNodes).toContain(node);
    });

    test('cleans up audio context properly', async () => {
      const context = createAudioContext();
      const node1 = mockGainNode;
      const node2 = mockBiquadFilter;
      
      trackAudioNode(context, node1);
      trackAudioNode(context, node2);
      
      await cleanupAudioContext(context);
      
      expect(node1.disconnect).toHaveBeenCalled();
      expect(node2.disconnect).toHaveBeenCalled();
      expect(context.close).toHaveBeenCalled();
      expect(context._activeNodes).toEqual([]);
    });
  });

  describe('Audio Loading', () => {
    test('loads audio file successfully', async () => {
      const url = 'test.mp3';
      const audioBuffer = { duration: 10 };
      
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
          headers: new Map([['content-length', '1024']])
        })
      );
      
      mockAudioContext.decodeAudioData.mockResolvedValue(audioBuffer);
      
      const result = await loadAudioFile(mockAudioContext, url);
      expect(result).toBe(audioBuffer);
    });

    test('handles large file rejection', async () => {
      const url = 'large.mp3';
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          headers: new Map([['content-length', '20000000']]) // 20MB
        })
      );
      
      await expect(loadAudioFile(mockAudioContext, url))
        .rejects
        .toThrow('Audio file too large');
    });

    test('handles network errors', async () => {
      const url = 'test.mp3';
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      );
      
      await expect(loadAudioFile(mockAudioContext, url))
        .rejects
        .toThrow('Network error');
    });
  });

  describe('Audio Processing', () => {
    test('validates frequency correctly', () => {
      expect(validateFrequency(1000)).toBe(1000);
      expect(validateFrequency(-100)).toBe(20); // MIN_FREQUENCY
      expect(validateFrequency(25000)).toBe(20000); // MAX_FREQUENCY
      expect(validateFrequency('invalid')).toBe(1000); // Default
    });

    test('creates gain node with proper volume', () => {
      const gainNode = createGainNode(mockAudioContext, 0.5);
      expect(gainNode.gain.value).toBe(0.5);
    });

    test('creates lowpass filter with proper frequency', () => {
      const filter = createLowpassFilter(mockAudioContext, 2000, 1.5);
      expect(filter.type).toBe('lowpass');
      expect(filter.frequency.value).toBe(2000);
      expect(filter.Q.value).toBe(1.5);
    });

    test('creates highpass filter with proper frequency', () => {
      const filter = createHighpassFilter(mockAudioContext, 500, 0.7);
      expect(filter.type).toBe('highpass');
      expect(filter.frequency.value).toBe(500);
      expect(filter.Q.value).toBe(0.7);
    });

    test('validates delay time correctly', () => {
      expect(validateDelayTime(0.3)).toBe(0.3);
      expect(validateDelayTime(-1)).toBe(0.01); // Minimum
      expect(validateDelayTime(10)).toBe(5); // Maximum
      expect(validateDelayTime('invalid')).toBe(0.3); // Default
    });

    test('creates delay effect with proper settings', () => {
      const delay = createDelay(mockAudioContext, 0.5, 0.3);
      expect(delay).toBeTruthy();
      expect(mockDelayNode.delayTime.value).toBe(0.5);
    });
  });
});