// tests/MobileOptimizer.test.js

import MobileOptimizer from '../client/src/services/MobileOptimizer';

describe('MobileOptimizer', () => {
  let mobileOptimizer;
  let mockPathRecorderService;
  let mockAudioService;
  let mockMapService;
  let mockBatteryManager;
  let mockLocalStorage;
  let batteryLevelChangeCallback;
  let batteryChargingChangeCallback;
  let originalNavigator;
  let originalDocument;
  let documentHidden;
  let visibilityChangeHandler;
  let beforeUnloadHandler;
  
  beforeEach(() => {
    // Store original navigator and document
    originalNavigator = global.navigator;
    originalDocument = global.document;
    
    // Reset state
    documentHidden = false;
    batteryLevelChangeCallback = null;
    batteryChargingChangeCallback = null;
    visibilityChangeHandler = null;
    beforeUnloadHandler = null;
    
    // Mock battery manager
    mockBatteryManager = {
      level: 1.0,
      charging: false,
      addEventListener: jest.fn((event, callback) => {
        if (event === 'levelchange') {
          batteryLevelChangeCallback = callback;
        }
        if (event === 'chargingchange') {
          batteryChargingChangeCallback = callback;
        }
      }),
      removeEventListener: jest.fn()
    };
    
    // Mock services
    mockPathRecorderService = {
      settings: {
        captureInterval: 1000,
        minDistance: 2
      },
      isRecording: false,
      pauseGPSTracking: jest.fn(),
      resumeGPSTracking: jest.fn(),
      locationOptions: {},
      wasTrackingBeforePause: false
    };
    
    mockAudioService = {
      suspendAudio: jest.fn(),
      resumeAudio: jest.fn(),
      dispose: jest.fn(),
      createLowpassFilter: jest.fn(),
      masterGain: {
        disconnect: jest.fn(),
        connect: jest.fn()
      },
      audioContext: {
        destination: {}
      }
    };
    
    mockMapService = {
      pauseUpdates: jest.fn(),
      resumeUpdates: jest.fn(),
      setRefreshRate: jest.fn(),
      setMapQuality: jest.fn()
    };
    
    // Mock localStorage
    mockLocalStorage = {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn()
    };
    
    // Mock window
    const mockWindow = {
      localStorage: mockLocalStorage,
      addEventListener: jest.fn((event, handler) => {
        if (event === 'beforeunload') {
          beforeUnloadHandler = handler;
        }
      }),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(event => {
        if (event.type === 'beforeunload' && beforeUnloadHandler) {
          beforeUnloadHandler(event);
        }
      })
    };
    
    // Set up global window object
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true
    });
    
    // Mock document
    global.document = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'visibilitychange') {
          visibilityChangeHandler = handler;
        }
      }),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(event => {
        if (event.type === 'visibilitychange' && visibilityChangeHandler) {
          documentHidden = !documentHidden;
          visibilityChangeHandler(event);
        }
      }),
      get hidden() {
        return documentHidden;
      }
    };
    
    // Mock navigator
    const getBatteryMock = jest.fn().mockResolvedValue(mockBatteryManager);
    
    // Create a new navigator object with all the properties we need
    const mockNavigator = {
      getBattery: getBatteryMock,
      deviceMemory: 8,
      hardwareConcurrency: 8,
      connection: {
        type: 'wifi',
        effectiveType: '4g',
        downlink: 10
      }
    };
    
    // Replace global navigator
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true,
      configurable: true
    });
    
    // Create instance
    mobileOptimizer = new MobileOptimizer(
      mockPathRecorderService,
      mockAudioService,
      mockMapService
    );
  });
  
  afterEach(() => {
    // Restore original navigator and document
    global.navigator = originalNavigator;
    global.document = originalDocument;
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  it('initializes correctly', async () => {
    await mobileOptimizer.init();
    expect(navigator.getBattery).toHaveBeenCalled();
    expect(mockBatteryManager.addEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
    expect(mockBatteryManager.addEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
  });
  
  it('applies correct battery optimizations for critical battery', async () => {
    await mobileOptimizer.init();
    
    // Simulate critical battery
    mockBatteryManager.level = 0.1;
    if (batteryLevelChangeCallback) {
      await batteryLevelChangeCallback();
    }
    
    expect(mobileOptimizer.isLowPowerMode).toBe(true);
    expect(mockPathRecorderService.settings.captureInterval).toBe(3000);
    expect(mockPathRecorderService.settings.minDistance).toBe(8);
    expect(mockMapService.setRefreshRate).toHaveBeenCalledWith(3000);
  });
  
  it('applies correct battery optimizations for low battery', async () => {
    await mobileOptimizer.init();
    
    // Simulate low battery
    mockBatteryManager.level = 0.2;
    if (batteryLevelChangeCallback) {
      await batteryLevelChangeCallback();
    }
    
    expect(mobileOptimizer.isLowPowerMode).toBe(true);
    expect(mockPathRecorderService.settings.captureInterval).toBe(2000);
    expect(mockPathRecorderService.settings.minDistance).toBe(5);
    expect(mockMapService.setRefreshRate).toHaveBeenCalledWith(2000);
  });
  
  it('restores original settings when charging', async () => {
    await mobileOptimizer.init();
    
    // Simulate charging
    mockBatteryManager.charging = true;
    if (batteryChargingChangeCallback) {
      await batteryChargingChangeCallback();
    }
    
    expect(mobileOptimizer.isLowPowerMode).toBe(false);
    expect(mockPathRecorderService.settings.captureInterval).toBe(1000);
    expect(mockPathRecorderService.settings.minDistance).toBe(2);
  });
  
  it('handles background state correctly', async () => {
    await mobileOptimizer.init();
    
    // Simulate background state
    document.dispatchEvent(new Event('visibilitychange'));
    
    expect(mockAudioService.suspendAudio).toHaveBeenCalled();
    expect(mockMapService.pauseUpdates).toHaveBeenCalled();
  });
  
  it('handles background state correctly during recording', async () => {
    await mobileOptimizer.init();
    
    // Set recording state
    mockPathRecorderService.isRecording = true;
    
    // Simulate background state
    document.dispatchEvent(new Event('visibilitychange'));
    
    expect(mockPathRecorderService.settings.captureInterval).toBe(5000);
    expect(mockPathRecorderService.settings.minDistance).toBe(10);
  });
  
  it('detects low-end devices correctly', async () => {
    // Mock low-end device
    const lowEndNavigator = {
      ...navigator,
      deviceMemory: 2,
      hardwareConcurrency: 2,
      connection: {
        type: 'cellular',
        effectiveType: '2g',
        downlink: 0.5
      }
    };
    
    Object.defineProperty(global, 'navigator', {
      value: lowEndNavigator,
      writable: true,
      configurable: true
    });
    
    await mobileOptimizer.init();
    expect(mobileOptimizer.detectLowEndDevice()).toBe(true);
  });
  
  it('handles app close correctly', async () => {
    await mobileOptimizer.init();
    
    // Set recording state
    mockPathRecorderService.isRecording = true;
    
    // Simulate app close
    window.dispatchEvent(new Event('beforeunload'));
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('eonta_recording_in_progress', 'true');
    expect(mockAudioService.dispose).toHaveBeenCalled();
  });
});