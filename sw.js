// เปลี่ยนเลขเวอร์ชันทุกครั้งที่อัปเดตไฟล์ เพื่อล้างแคชเก่า
const CACHE_NAME = 'hr-app-v3';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon/icon.svg',
  './icon/icon-maskable.svg'
];

// ติดตั้ง: เก็บไฟล์หลักลงแคช (ถ้าบางไฟล์ไม่มีจะไม่ทำให้ล้ม)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(APP_SHELL.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// เปิดใช้งาน: ลบแคชเวอร์ชันเก่า
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // ไม่ยุ่งกับ POST (เรียก API) และไฟล์จากโดเมนอื่น
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // หน้าเว็บ: ดึงจากเน็ตก่อน ถ้าออฟไลน์ใช้แคช
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // ไฟล์อื่น (ไอคอน ฯลฯ): ใช้แคชก่อน
  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
    )
  );
});
