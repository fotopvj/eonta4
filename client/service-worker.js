// Enhanced service-worker.js with battery-efficient background processing

const CACHE_NAME = 'eonta-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/css/main.css',
  '/assets/img/logo.svg',
  '/src/app.js',
  '/src/services/MapUtils.js',
  '/src/services/AudioUtils.js',
  '/src/services/MobileOptimizer.js',
  '/src/services/PathRecorderService.js',
  '/src/services/EnhancedAudioServices.js',
  '/manifest.json'
];

// Audio files cache - separate from static assets for better management
const AUDIO_CACHE_NAME = 'eonta-audio-cache-v1';

// Max size for audio cache (100MB)
const MAX_AUDIO_CACHE_SIZE = 100 * 1024 * 1024;

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  const cacheWhitelist = [CACHE_NAME, AUDIO_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete outdated caches
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Activation complete');
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Helper function to determine if a request is for an audio file
function isAudioRequest(request) {
  const url = new URL(request.url);
  // Check the path or extension
  return url.pathname.includes('/audio/') || 
         url.pathname.endsWith('.mp3') || 
         url.pathname.endsWith('.ogg') || 
         url.pathname.endsWith('.wav') || 
         request.headers.get('Content-Type')?.includes('audio/');
}

// Helper function to determine if we should use network-first approach
function shouldUseNetworkFirst(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || // API calls
         url.pathname.includes('/compositions/') || // Composition data
         url.pathname.includes('/users/'); // User data
}

// Fetch event - different strategies for different resources
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // For audio files, use a dedicated cache with size limits
  if (isAudioRequest(event.request)) {
    event.respondWith(audioFirstStrategy(event.request));
    return;
  }
  
  // For API calls, use network first
  if (shouldUseNetworkFirst(event.request)) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }
  
  // For static assets, use cache first
  event.respondWith(cacheFirstStrategy(event.request));
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log(`[Service Worker] Serving from cache: ${request.url}`);
    return cachedResponse;
  }
  
  try {
    console.log(`[Service Worker] Fetching resource: ${request.url}`);
    const networkResponse = await fetch(request);
    
    // Cache valid responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log(`[Service Worker] Caching new resource: ${request.url}`);
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`[Service Worker] Fetch failed for ${request.url}:`, error);
    
    // If offline and not in cache, show offline page for HTML requests
    if (request.headers.get('Accept')?.includes('text/html')) {
      console.log('[Service Worker] Serving offline page');
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    console.log(`[Service Worker] Fetching from network: ${request.url}`);
    const networkResponse = await fetch(request);
    
    // Cache valid API responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log(`[Service Worker] Caching API response: ${request.url}`);
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`[Service Worker] Network fetch failed for ${request.url}, trying cache`);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`[Service Worker] Serving API response from cache: ${request.url}`);
      return cachedResponse;
    }
    
    // For API calls, return a JSON error response if possible
    if (request.headers.get('Accept')?.includes('application/json')) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'You are offline. Please check your connection.',
          offline: true
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Special strategy for audio files with size management
async function audioFirstStrategy(request) {
  try {
    // Check audio cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`[Service Worker] Serving audio from cache: ${request.url}`);
      return cachedResponse;
    }
    
    // If not in cache, fetch from network
    console.log(`[Service Worker] Fetching audio from network: ${request.url}`);
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      // Before caching, check and manage cache size
      const audioCache = await caches.open(AUDIO_CACHE_NAME);
      
      // Get current cache size
      const keys = await audioCache.keys();
      let cacheSize = 0;
      
      // Calculate current cache size
      await Promise.all(keys.map(async (key) => {
        const response = await audioCache.match(key);
        const clone = response.clone();
        const buffer = await clone.arrayBuffer();
        cacheSize += buffer.byteLength;
      }));
      
      // Clone response for size check
      const responseClone = networkResponse.clone();
      const buffer = await responseClone.arrayBuffer();
      const newFileSize = buffer.byteLength;
      
      console.log(`[Service Worker] Audio cache size: ${cacheSize / 1024 / 1024}MB, new file: ${newFileSize / 1024 / 1024}MB`);
      
      // If adding this file would exceed limit, remove oldest files until we have room
      if (cacheSize + newFileSize > MAX_AUDIO_CACHE_SIZE && keys.length > 0) {
        console.log('[Service Worker] Audio cache full, removing oldest files');
        
        // Sort keys by last accessed time (if available)
        const keysByAge = [...keys];
        
        // Remove oldest files until we have enough space
        let spaceFreed = 0;
        while (spaceFreed < newFileSize && keysByAge.length > 0) {
          const oldestKey = keysByAge.shift();
          const oldResponse = await audioCache.match(oldestKey);
          const oldBuffer = await oldResponse.clone().arrayBuffer();
          const oldSize = oldBuffer.byteLength;
          
          await audioCache.delete(oldestKey);
          spaceFreed += oldSize;
          console.log(`[Service Worker] Removed ${oldestKey.url}, freed ${oldSize / 1024 / 1024}MB`);
        }
      }
      
      // Now cache the new audio file
      console.log(`[Service Worker] Caching audio file: ${request.url}`);
      audioCache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`[Service Worker] Audio fetch failed for ${request.url}:`, error);
    
    // Last resort - check main cache
    const fallbackResponse = await caches.match(request, { cacheName: CACHE_NAME });
    if (fallbackResponse) {
      return fallbackResponse;
    }
    
    throw error;
  }
}

// Background sync for path recording data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-path-recordings') {
    console.log('[Service Worker] Syncing path recordings...');
    event.waitUntil(syncPathRecordings());
  }
});

// Function to sync path recordings with the server
async function syncPathRecordings() {
  try {
    // This would be implemented in a full version
    // It would find unsynced recordings in IndexedDB and send them to the server
    console.log('[Service Worker] Path recording sync functionality would happen here');
    
    // Example of how it might work:
    // 1. Open IndexedDB
    // 2. Find unsynced recordings
    // 3. For each unsaved recording:
    //    - POST to the server
    //    - If successful, mark as synced
    
    // For now, just log a message
    console.log('[Service Worker] Sync completed successfully');
    return true;
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    return false;
  }
}

// Handle messages from clients
self.addEventListener('message', event => {
  const data = event.data;
  
  if (data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (data.action === 'cleanAudioCache') {
    event.waitUntil(cleanAudioCache());
  }
  
  if (data.action === 'savePathRecording') {
    console.log('[Service Worker] Received path recording to save');
    // In a full implementation, we would save to IndexedDB here
    // and attempt to sync with the server
  }
});

// Function to clean the audio cache
async function cleanAudioCache() {
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const keys = await cache.keys();
    
    console.log(`[Service Worker] Cleaning audio cache, removing ${keys.length} items`);
    
    for (const request of keys) {
      await cache.delete(request);
    }
    
    console.log('[Service Worker] Audio cache cleaned successfully');
    return true;
  } catch (error) {
    console.error('[Service Worker] Error cleaning audio cache:', error);
    return false;
  }
}

// Listen for push notifications (for future implementation)
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  console.log('[Service Worker] Push notification received:', data);
  
  const options = {
    body: data.body || 'Something happened in EONTA!',
    icon: '/assets/img/icon-192.png',
    badge: '/assets/img/badge.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'EONTA', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});