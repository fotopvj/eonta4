// db.js - IndexedDB for offline compositions

const DB_NAME = 'eonta-db';
const DB_VERSION = 1;
const COMPOSITIONS_STORE = 'compositions';
const AUDIO_STORE = 'audio-files';

class EontaDB {
  constructor() {
    this.db = null;
    this._initDB();
  }

  async _initDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.error("Your browser doesn't support IndexedDB");
        reject("IndexedDB not supported");
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = event => {
        console.error("Database error:", event.target.error);
        reject("Could not open database");
      };

      request.onsuccess = event => {
        this.db = event.target.result;
        console.log("Database opened successfully");
        resolve(this.db);
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;

        // Create compositions store
        if (!db.objectStoreNames.contains(COMPOSITIONS_STORE)) {
          const compositionsStore = db.createObjectStore(COMPOSITIONS_STORE, { keyPath: 'id' });
          compositionsStore.createIndex('userId', 'userId', { unique: false });
          compositionsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create audio files store
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          const audioStore = db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
          audioStore.createIndex('compositionId', 'compositionId', { unique: false });
        }
      };
    });
  }

  // Save a composition to IndexedDB
  async saveComposition(composition) {
    const db = await this._ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([COMPOSITIONS_STORE], 'readwrite');
      const store = transaction.objectStore(COMPOSITIONS_STORE);
      
      // Add timestamp if not present
      if (!composition.createdAt) {
        composition.createdAt = new Date().toISOString();
      }
      
      const request = store.put(composition);
      
      request.onsuccess = event => {
        resolve(event.target.result);
      };
      
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }

  // Get all compositions
  async getCompositions() {
    const db = await this._ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([COMPOSITIONS_STORE], 'readonly');
      const store = transaction.objectStore(COMPOSITIONS_STORE);
      const request = store.getAll();
      
      request.onsuccess = event => {
        resolve(event.target.result);
      };
      
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }

  // Get a specific composition
  async getComposition(id) {
    const db = await this._ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([COMPOSITIONS_STORE], 'readonly');
      const store = transaction.objectStore(COMPOSITIONS_STORE);
      const request = store.get(id);
      
      request.onsuccess = event => {
        resolve(event.target.result);
      };
      
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }

  // Save audio file
  async saveAudioFile(audioFile) {
    const db = await this._ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE], 'readwrite');
      const store = transaction.objectStore(AUDIO_STORE);
      const request = store.put(audioFile);
      
      request.onsuccess = event => {
        resolve(event.target.result);
      };
      
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }

  // Get audio file
  async getAudioFile(id) {
    const db = await this._ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE], 'readonly');
      const store = transaction.objectStore(AUDIO_STORE);
      const request = store.get(id);
      
      request.onsuccess = event => {
        resolve(event.target.result);
      };
      
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }

  // Get all audio files for a composition
  async getCompositionAudioFiles(compositionId) {
    const db = await this._ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE], 'readonly');
      const store = transaction.objectStore(AUDIO_STORE);
      const index = store.index('compositionId');
      const request = index.getAll(compositionId);
      
      request.onsuccess = event => {
        resolve(event.target.result);
      };
      
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }

  // Delete a composition and its audio files
  async deleteComposition(id) {
    const db = await this._ensureDB();
    
    // First, get all audio files for this composition
    const audioFiles = await this.getCompositionAudioFiles(id);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([COMPOSITIONS_STORE, AUDIO_STORE], 'readwrite');
      const compositionsStore = transaction.objectStore(COMPOSITIONS_STORE);
      const audioStore = transaction.objectStore(AUDIO_STORE);
      
      // Delete all audio files
      for (const audioFile of audioFiles) {
        audioStore.delete(audioFile.id);
      }
      
      // Delete the composition
      const request = compositionsStore.delete(id);
      
      request.onsuccess = event => {
        resolve(true);
      };
      
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }

  // Ensure database is initialized
  async _ensureDB() {
    if (this.db) return this.db;
    return this._initDB();
  }
}

// Export a singleton instance
const eontaDB = new EontaDB();
export default eontaDB;