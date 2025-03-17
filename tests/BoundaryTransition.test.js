// tests/BoundaryTransition.test.js

import BoundaryTransitionManager from '../client/src/services/BoundaryTransitionManager';
import { createAudioContext } from '../client/src/services/AudioUtils';

// Mock audio service
const mockAudioService = {
  playAudio: jest.fn().mockReturnValue(true),
  stopAudio: jest.fn().mockReturnValue(true),
  fadeOutAudio: jest.fn().mockReturnValue(true),
  setVolume: jest.fn().mockReturnValue(true)
};

describe('BoundaryTransitionManager', () => {
  let manager;
  let mockAudioService;
  
  beforeEach(() => {
    mockAudioService = {
      playAudio: jest.fn(),
      stopAudio: jest.fn(),
      setVolume: jest.fn(),
      fadeOutAudio: jest.fn()
    };
    manager = new BoundaryTransitionManager(mockAudioService);
    mockAudioService.playAudio.mockClear();
    mockAudioService.stopAudio.mockClear();
    mockAudioService.fadeOutAudio.mockClear();
    mockAudioService.setVolume.mockClear();
  });

  describe('Position Validation', () => {
    test('validates correct position data', () => {
      const position = { lat: 40.7128, lng: -74.0060 };
      expect(manager.validatePosition(position)).toBe(true);
    });

    test('rejects invalid latitude', () => {
      const position = { lat: 91, lng: -74.0060 };
      expect(manager.validatePosition(position)).toBe(false);
    });

    test('rejects invalid longitude', () => {
      const position = { lat: 40.7128, lng: -181 };
      expect(manager.validatePosition(position)).toBe(false);
    });

    test('rejects non-numeric coordinates', () => {
      const position = { lat: '40.7128', lng: '-74.0060' };
      expect(manager.validatePosition(position)).toBe(false);
    });

    test('rejects null position', () => {
      expect(manager.validatePosition(null)).toBe(false);
    });
  });

  describe('Crossfade Handling', () => {
    test('handles equal distances correctly', () => {
      const regions = [
        { id: 'region1', center: { lat: 40.7128, lng: -74.0060 } },
        { id: 'region2', center: { lat: 40.7128, lng: -74.0060 } }
      ];
      const position = { lat: 40.7128, lng: -74.0060 };
      
      const volumes = manager.handleCrossfades(regions, position);
      expect(volumes.region1).toBe(0.5);
      expect(volumes.region2).toBe(0.5);
    });

    test('calculates correct volume ratios for different distances', () => {
      const regions = [
        { id: 'region1', center: { lat: 40.7128, lng: -74.0060 } },
        { id: 'region2', center: { lat: 40.7130, lng: -74.0062 } }
      ];
      const position = { lat: 40.7129, lng: -74.0061 };
      
      const volumes = manager.handleCrossfades(regions, position);
      expect(volumes.region1).toBeGreaterThan(0);
      expect(volumes.region2).toBeGreaterThan(0);
      expect(volumes.region1 + volumes.region2).toBeCloseTo(1);
    });

    test('handles single region gracefully', () => {
      const regions = [
        { id: 'region1', center: { lat: 40.7128, lng: -74.0060 } }
      ];
      const position = { lat: 40.7128, lng: -74.0060 };
      
      const volumes = manager.handleCrossfades(regions, position);
      expect(volumes).toEqual({});
    });

    test('handles invalid position data', () => {
      const regions = [
        { id: 'region1', center: { lat: 40.7128, lng: -74.0060 } },
        { id: 'region2', center: { lat: 40.7130, lng: -74.0062 } }
      ];
      const position = { lat: 'invalid', lng: -74.0060 };
      
      const volumes = manager.handleCrossfades(regions, position);
      expect(volumes).toBeUndefined();
    });
  });

  describe('Transition Effects', () => {
    test('applies volume fade transition correctly', () => {
      const regionId = 'region1';
      const audioData = { url: 'test.mp3' };
      const settings = manager.createTransitionSettings({ id: regionId });
      
      manager.applyEntryTransition(regionId, audioData, settings, 5);
      
      expect(mockAudioService.playAudio).toHaveBeenCalledWith(
        regionId,
        audioData.url,
        expect.objectContaining({
          fadeIn: expect.any(Number),
          volume: expect.any(Number),
          loop: true
        })
      );
    });

    test('applies filter transition correctly', () => {
      const regionId = 'region1';
      const audioData = { url: 'test.mp3' };
      const settings = manager.createTransitionSettings(
        { id: regionId },
        { fadeInType: manager.transitionTypes.LOWPASS_FILTER }
      );
      
      manager.applyEntryTransition(regionId, audioData, settings, 5);
      
      expect(mockAudioService.playAudio).toHaveBeenCalledWith(
        regionId,
        audioData.url,
        expect.objectContaining({
          effects: expect.objectContaining({
            lowpass: true,
            lowpassFrequency: expect.any(Number)
          })
        })
      );
    });
  });

  describe('Geolocation Fallback', () => {
    test('getCurrentPosition returns null when geolocation fails', async () => {
      // Mock failed geolocation
      global.navigator.geolocation = {
        getCurrentPosition: (success, error) => error(new Error('Geolocation failed'))
      };
      
      const position = await manager.getCurrentPosition();
      expect(position).toBeNull();
    });

    test('getCurrentPosition falls back to IP geolocation', async () => {
      // Mock failed geolocation but successful IP lookup
      global.navigator.geolocation = {
        getCurrentPosition: (success, error) => error(new Error('Geolocation failed'))
      };
      
      // Mock fetch to return a successful response
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            latitude: 40.7128,
            longitude: -74.0060
          })
        })
      );
      
      const position = await manager.getCurrentPosition();
      expect(position).toEqual({
        lat: 40.7128,
        lng: -74.0060,
        accuracy: 5000
      });
      
      expect(global.fetch).toHaveBeenCalledWith('https://ipapi.co/json/');
    });
  });
});