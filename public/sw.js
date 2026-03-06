self.addEventListener('install', () => {
  console.log('Service Worker installed');
    self.skipWaiting();
    });

    self.addEventListener('activate', () => {
      console.log('Service Worker activated');
      });

      // Optional: Basic "Offline" fetch (Crucial for the "App" feel)
      self.addEventListener('fetch', (event) => {
        // You can add caching logic here later
        });