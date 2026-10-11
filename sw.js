/* ─────────────────────────────────────────────
   서비스 워커 — 홈 화면에 설치한 앱이 인터넷 없이도 열리게 합니다.

   ▸ 화면(HTML)은 언제나 먼저 인터넷에서 새로 받습니다. 그래서 고친 내용이
     바로 보입니다. 인터넷이 끊겼을 때만 저장해 둔 화면을 꺼냅니다.
   ▸ 아이콘 같은 정적 파일은 저장해 둔 것을 먼저 씁니다.
   ▸ /api/ 아래(수집·통계)와 다른 사이트 주소는 손대지 않습니다.

   아이콘이나 이 파일을 고치면 아래 CACHE 의 숫자를 하나 올려 주십시오.
   그래야 설치된 앱도 옛 파일을 버리고 새 파일을 받습니다.
   ───────────────────────────────────────────── */
const CACHE = 'chulga-v1';
const ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); }
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
