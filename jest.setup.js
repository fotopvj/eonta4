// Mock browser APIs
global.navigator = {
  geolocation: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn()
  }
};

global.window = {
  AudioContext: jest.fn(),
  webkitAudioContext: jest.fn()
};

// Create a proper document mock with getters/setters
let documentHidden = false;
Object.defineProperty(global, 'document', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    get hidden() {
      return documentHidden;
    },
    set hidden(value) {
      documentHidden = value;
    }
  },
  writable: true
});

// Mock fetch API
global.fetch = jest.fn(); 