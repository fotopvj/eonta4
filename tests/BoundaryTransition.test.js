// tests/BoundaryTransition.test.js

const BoundaryTransitionManager = require('../client/src/services/BoundaryTransitionManager');

// Mock audio service
const mockAudioService = {
  playAudio: jest.fn().mockReturnValue(true),
  stopAudio: jest.fn().mockReturnValue(true),
  fadeOutAudio: jest.fn().mockReturnValue(true),
  setVolume: jest.fn().mockReturnValue(true)
};

describe('BoundaryTransitionManager', () => {
  let transitionManager;
  
  beforeEach(() => {
    transitionManager = new BoundaryTransitionManager(mockAudioService);
    mockAudioService.playAudio.mockClear();
    mockAudioService.stopAudio.mockClear();
    mockAudioService.fadeOutAudio.mockClear();
    mockAudioService.setVolume.mockClear();
  });

  test('should create transition settings with defaults', () => {
    const boundary = { id: 'test-boundary' };
    const settings = transitionManager.createTransitionSettings(boundary);
    
    expect(settings.fadeInLength).toBeDefined();
    expect(settings.fadeOutLength).toBeDefined();
    expect(settings.transitionRadius).toBeDefined();
    expect(settings.blendingEnabled).toBeDefined();
    expect(settings.advancedSettings).toBeDefined();
  });

  test('should apply entry transition correctly', () => {
    const regionId = 'test-region';
    const audioData = { url: 'https://example.com/audio.mp3' };
    const settings = transitionManager.createTransitionSettings({ id: regionId });
    
    transitionManager.applyEntryTransition(regionId, audioData, settings, 5);
    
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

  test('should apply exit transition correctly', () => {
    const regionId = 'test-region';
    const settings = transitionManager.createTransitionSettings({ id: regionId });
    
    transitionManager.applyExitTransition(regionId, settings, 15);
    
    expect(mockAudioService.fadeOutAudio).toHaveBeenCalledWith(
      regionId,
      expect.any(Number)
    );
  });
});