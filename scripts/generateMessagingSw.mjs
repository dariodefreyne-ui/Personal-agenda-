// Genereert public/firebase-messaging-sw.js uit de VITE_FB_*-omgevingsvariabelen.
// De Firebase web-config is publiek (beveiliging zit in de regels + App Check),
// maar we genereren het bestand bij elke build zodat de echte waarden uit één
// bron (ENV_LOCAL / .env.local) komen en niet in git belanden.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// .env.local lokaal inlezen (in CI komen de waarden uit de echte env).
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(root, '.env.local');
if (existsSync(envFile)) {
  const { readFileSync } = await import('node:fs');
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const cfg = {
  apiKey: process.env.VITE_FB_API_KEY || '',
  authDomain: process.env.VITE_FB_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FB_PROJECT_ID || '',
  storageBucket: process.env.VITE_FB_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FB_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FB_APP_ID || '',
};

const out = `/* AUTOGEGENEREERD door scripts/generateMessagingSw.mjs — niet handmatig bewerken. */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(cfg, null, 2)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const titel = (payload.notification && payload.notification.title) || 'Personal Agenda';
  const opties = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: (payload.data && payload.data.tag) || 'personal-agenda',
    data: payload.data || {},
  };
  self.registration.showNotification(titel, opties);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
`;

const dest = resolve(root, 'public', 'firebase-messaging-sw.js');
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, out);
console.log('[generateMessagingSw] geschreven:', dest, cfg.projectId ? `(project ${cfg.projectId})` : '(LEEG — env ontbreekt)');
