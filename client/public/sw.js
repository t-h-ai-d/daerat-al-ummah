self.addEventListener("push", event => {
  let payload = { title: "دائرة الأمة", body: "لديك تحديث جديد.", url: "/notifications", tag: "daerat-update" };
  try { payload = { ...payload, ...event.data?.json() }; } catch { /* Empty or non-JSON push payload. */ }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    data: { url: payload.url },
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    renotify: false,
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const destination = event.notification.data?.url || "/notifications";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const existing = windows.find(windowClient => new URL(windowClient.url).pathname === destination);
    return existing ? existing.focus() : clients.openWindow(destination);
  }));
});
