// tests/MobileOptimizer.test.js

const MobileOptimizer = require('../client/src/services/MobileOptimizer');

// Mock services
const mockPathRecorderService = {
  settings: {
    captureInterval: 1000,
    minDistance: 2
  },
  locationOptions: {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 10000
  },
  isRecording: false,
  wasTrackingBeforePause: false,
  pauseGPSTracking: jest.fn(),
  resumeGPSTracking: jest.fn()
};

const mockAudioService = {
  audioContext: {
    destination: {}
  },
  masterGain: {
    disconnect: jest.fn(),
    connect: jest.fn()
  },
  createLowpassFilter: jest.fn().mockImplementation((context, freq, q) => {
    return {
      frequency: { value: freq },
      connect: jest.fn(),
      disconnect: jest.fn()
    };
  }),
  suspendAudio: jest.fn(),
  resumeAudio: jest.fn(),
  dispose: jest.fn()
};

const mockMapService = {
  setRefreshRate: jest.fn(),
  pauseUpdates: jest.fn(),
  resumeUpdates: jest.fn(),
  setMapQuality: jest.fn()
};

// Mock Battery API
const mockBatteryManager = {
  level: 0.8,
  charging: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Mock navigator
global.navigator = {
  getBattery: jest.fn().mockResolvedValue(mockBatteryManager),
  deviceMemory: 4,
  hardwareConcurrency: 4,
  connection: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    addEventListener: jest.fn()
  }
};

// Mock document
global.document = {
  hidden: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Mock window
global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn()
  }
};

describe('MobileOptimizer', () => {
  let mobileOptimizer;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    mockBatteryManager.level = 0.8;
    mockBatteryManager.charging = false;
    
    document.hidden = false;
  });

  it('initializes correctly', async () => {
    mobileOptimizer = new MobileOptimizer(
      mockPathRecorderService,
      mockAudioService,
      mockMapService
    );
    
    expect(mobileOptimizer).toBeDefined();
    expect(mobileOptimizer.pathRecorderService).toBe(mockPathRecorderService);
    expect(mobileOptimizer.audioService).toBe(mockAudioService);
    expect(mobileOptimizer.mapService).toBe(mockMapService);
    
    // Should store original settings
    expect(mobileOptimizer.originalSettings).toEqual(mockPathRecorderService.settings);
    
    // Should set up battery monitoring
    expect(navigator.getBattery).toHaveBeenCalled();
    
    // Should apply initial optimizations
    expect(mockMapService.setMapQuality).not.toHaveBeenCalled(); // Not a low-end device
  });

  it('applies correct battery optimizations for critical battery', async () => {
    // Set critical battery level
    mockBatteryManager.level = 0.1;
    
    mobileOptimizer = new MobileOptimizer(
      mockPathRecorderService,
      mockAudioService,
      mockMapService
    );
    
    // Should apply aggressive power saving
    expect(mobileOptimizer.isLowPowerMode).toBe(true);
    expect(mockPathRecorderService.settings.captureInterval).toBe(3000);
    expect(mockPathRecorderService.settings.minDistance).toBe(8);
    expect(mockMapService.setRefreshRate).toHaveBeenCalledWith(3000);
    
    // Should reduce audio quality
    expect(mockAudioService.createLowpassFilter).toHaveBeenCalledWith(
      mockAudioService.audioContext,
      8000, // Aggressive cutoff
      0.5
    );
  });

  it('applies correct battery optimizations for low battery', async () => {
    // Set low battery level
    mockBatteryManager.level = 0.25;
    
    mobileOptimizer = new MobileOptimizer(
      mockPathRecorderService,
      mockAudioService,
      mockMapService
    );
    
    // Should apply moderate power saving
    expect(mobileOptimizer.isLowPowerMode).toBe(true);
    expect(mockPathRecorderService.settings.captureInterval).toBe(2000);
    expect(mockPathRecorderService.settings.minDistance).toBe(5);
    expect(mockMapService.setRefreshRate).toHaveBeenCalledWith(2000);
    
    // Should reduce audio quality moderately
    expect(mockAudioService.createLowpassFilter).toHaveBeenCalledWith(
      mockAudioService.audioContext,
      12000, // Moderate cutoff
      0.5
    );
  });

  it('restores original settings when charging', async () => {
    // Set charging and low battery
    mockBatteryManager.level = 0.25;
    mockBatteryManager.charging = true;
    
    mobileOptimizer = new MobileOptimizer(
      mockPathRecorderService,
      mockAudioService,
      mockMapService
    );
    
    // Original settings should be used when charging
    expect(mobileOptimizer.isLowPowerMode).toBe(false);
    expect(mockPathRecorderService.settings).toEqual(mobileOptimizer.originalSettings);
  });

  it('handles background state correctly', async () => {
    mobileOptimizer = new MobileOptimizer(
      mockPathRecorderService,
      mockAudioService,
      mockMapService
    );
    
    // Simulate app going to background
    document.hidden = true;
    mobileOptimizer.handleBackgroundState();
    
    // Should suspend audio and pause GPS and map
    expect(mockAudioService.suspendAudio).toHaveBeenCalled();
    expect(mockPathRecorderService.pauseGPSTracking).toHaveBeenCalled();
    expect(mockMapService.pauseUpdates).toHaveBeenCalled();
    
    // Simulate app coming back to foreground
    document.hidden = false;
    mobileOptimizer.handleForegroundState();
    
    // Should resume normal operation
    expect(mockAudioService.resumeAudio).toHaveBeenCalled();
    expect(mockMapService.resumeUpdates).toHaveBeenCalled();
  });

  it('handles background state correctly during recording', async () => {
    mockPathRecorderService.isRecording = true;
    
    mobileOptimizer = new MobileOptimizer(
      mockPathRecorderService,
      mockAudioService,
      mockMapService
    );
    
    // Simulate app going to background during recording
    document.hidden = true;
    mobileOptimizer.handleBackgroundState();
    
    // Should not pause GPS tracking
    expect(mockPathRecorderService.pauseGPSTracking).not.toHaveBeenCalled();
    
    // But should reduce tracking frequency
    expect(mockPathRecorderService.settings.captureInterval).toBe(5000);
    expect(mockPathRecorderService.settings.minDistance).toBe(10);
  });

  it('detects low-end devices correctly', () => {
    // Simulate low-end device
    global.navigator.deviceMemory = 2;
    global.navigator.hardwareConcurrency = 2;
    
    mobileOptimizer = new MobileOptimizer(
      mockPathRecorderService,
      mockAudioService,
      mockMapService
    );
    
    // Should detect low-end device
    expect(mobileOptimizer.detectLowEndDevice()).toBe(true);
    
    // Should apply low-end device optimizations
    expect(mockMapService.setMapQuality).toHaveBeenCalledWith('low');
  });

  it('handles app close correctly', () => {
    mockPathRecorderService.isRecording = true;
    
    mobileOptimizer = new MobileOptimizer(
      mockPathRecorderService,
      mockAudioService,
      mockMapService
    );
    
    // Simulate app close during recording
    mobileOptimizer.handleAppClose();
    
    // Should save recording state
    expect(window.localStorage.setItem).toHaveBeenCalledWith('eonta_recording_in_progress', 'true');
    expect(mockAudioService.dispose).toHaveBeenCalled();
  });
});