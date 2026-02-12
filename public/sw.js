const CACHE_NAME = "mini-erp-v2";
const STATIC_ASSETS = [
  "/",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API requests: network first, fallback to cache (GET only)
  if (url.pathname.startsWith("/api/")) {
    // Only cache GET requests - POST/PUT/DELETE cannot be cached
    if (event.request.method !== "GET") {
      return;
    }
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets: cache first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // HTML pages: network first
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return new Response(
          "<html><body><h1>Offline</h1><p>You are offline. Please check your connection.</p></body></html>",
          { headers: { "Content-Type": "text/html" } }
        );
      })
    )
  );
});

// Background sync for offline production reports
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-production-reports") {
    event.waitUntil(syncPendingReports());
  }
});

async function syncPendingReports() {
  try {
    const db = await openDB();
    const reports = await db.getAll("pending-reports");
    for (const report of reports) {
      const res = await fetch("/api/production/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report.data),
      });
      if (res.ok) {
        await db.delete("pending-reports", report.id);
      }
    }
  } catch {
    // Will retry on next sync
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("mini-erp-offline", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("pending-reports")) {
        db.createObjectStore("pending-reports", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
