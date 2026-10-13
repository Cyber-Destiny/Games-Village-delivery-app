// Runam service worker: push notifications + a light offline fallback.
const VERSION = "runam-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Runam", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Runam";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/pwa-icon/192",
      badge: "/pwa-icon/96",
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: data.url || "/" },
      vibrate: [80, 40, 80],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

// Network-first for page navigations, with a tiny offline page.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:system-ui;background:#f5f2eb;color:#0f1d17;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px"><div><h1 style="font-size:22px">You're offline</h1><p style="color:#6c7a72">Check your connection and try again.</p><button onclick="location.reload()" style="margin-top:12px;height:44px;padding:0 20px;border-radius:14px;border:0;background:#137049;color:#fff;font-size:15px">Retry</button></div></body>`,
          { headers: { "Content-Type": "text/html" } },
        ),
    ),
  );
});
