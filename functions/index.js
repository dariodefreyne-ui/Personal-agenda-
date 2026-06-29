// =========================================================================
//  Personal Agenda — Cloud Functions
//   - dispatcher: elke 10 min push (slot-herinneringen, ochtend/avond,
//     readiness-check, anti-scroll nudges) — respecteert stil-uren/intensiteit
//   - icsSync: leest de iPhone-agenda (ICS-link) -> agendaEvents
//   - weerSync: Open-Meteo -> weer/{datum} (voor fietsadvies)
//   - weekMail: wekelijkse samenvatting via Trigger-Email-extensie
//  Alles draait per gebruiker (meervoudig veilig, ook al ben jij de enige).
// =========================================================================
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const dns = require('node:dns').promises;
const net = require('node:net');
const { parseIcs, icsDiagnose } = require('./lib/ics');

admin.initializeApp();
const db = admin.firestore();
const REGIO = 'europe-west1';
const MAX_ICS_LINKS = 5;
const MAX_ICS_BYTES = 1024 * 1024; // 1 MB per agenda-link
const ICS_FETCH_TIMEOUT_MS = 10000;
const HANDMATIGE_SYNC_COOLDOWN_MS = 2 * 60 * 1000;

// ---- Tijd in Europe/Brussels ----
function brussel(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('nl-BE', {
    timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const map = { ma: 'ma', di: 'di', wo: 'wo', do: 'do', vr: 'vr', za: 'za', zo: 'zo' };
  const wk = { Mon: 'ma', Tue: 'di', Wed: 'wo', Thu: 'do', Fri: 'vr', Sat: 'za', Sun: 'zo' };
  const hhmm = `${p.hour}:${p.minute}`;
  return {
    datum: `${p.year}-${p.month}-${p.day}`,
    hhmm,
    minuten: parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10),
    dagKort: wk[p.weekday] || map[p.weekday] || 'ma',
  };
}
const toMin = (s) => (s ? (+s.split(':')[0]) * 60 + (+s.split(':')[1]) : null);

// Stil-uur (over middernacht): true als push NIET mag.
function isStil(min, vanStr, totStr) {
  const van = toMin(vanStr), tot = toMin(totStr);
  if (van == null || tot == null) return false;
  return van > tot ? (min >= van || min < tot) : (min >= van && min < tot);
}

async function actieveTokens(uid) {
  const snap = await db.collection('users').doc(uid).collection('pushTokens').where('actief', '==', true).get();
  return snap.docs.map((d) => d.id);
}

async function stuurPush(uid, tokens, titel, body, data = {}) {
  if (!tokens.length) return;
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title: titel, body },
    data: Object.fromEntries(Object.entries({ url: '/', ...data }).map(([k, v]) => [k, String(v)])),
    webpush: { fcmOptions: { link: data.url || '/' }, notification: { icon: '/icons/icon-192.png' } },
  });
  // Ruim dode tokens op.
  res.responses.forEach((r, i) => {
    if (!r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(r.error?.code)) {
      db.collection('users').doc(uid).collection('pushTokens').doc(tokens[i]).set({ actief: false }, { merge: true }).catch(() => {});
    }
  });
}

// Onthoudt welke meldingen al verstuurd zijn (per dag) om dubbels te vermijden.
async function alGestuurd(uid, datum, sleutel) {
  const ref = db.collection('users').doc(uid).collection('dagen').doc(datum);
  const snap = await ref.get();
  const log = snap.exists ? (snap.data().pushLog || {}) : {};
  if (log[sleutel]) return true;
  await ref.set({ pushLog: { [sleutel]: true } }, { merge: true });
  return false;
}

async function getInstellingen(uid) {
  const out = {};
  for (const r of ['algemeen', 'werk', 'push', 'gezondheid']) {
    const s = await db.collection('users').doc(uid).collection('instellingen').doc(r).get();
    out[r] = s.exists ? s.data() : {};
  }
  return out;
}

// ---- Lijst van gebruikers (met minstens één actief token) ----
async function gebruikersMetPush() {
  const snap = await db.collection('users').get();
  const gebruikers = [];
  for (const d of snap.docs) {
    const t = await d.ref.collection('pushTokens').where('actief', '==', true).get();
    const tokens = t.docs.map((doc) => doc.id);
    if (tokens.length) gebruikers.push({ uid: d.id, tokens });
  }
  return gebruikers;
}

// =========================================================================
//  DISPATCHER — elke 10 minuten
// =========================================================================
exports.dispatcher = onSchedule(
  { schedule: 'every 10 minutes', timeZone: 'Europe/Brussels', region: REGIO },
  async () => {
    const nu = brussel();
    const venster = 10; // minuten
    const due = (t) => { const m = toMin(t); return m != null && nu.minuten >= m && nu.minuten < m + venster; };

    for (const { uid, tokens } of await gebruikersMetPush()) {
      const I = await getInstellingen(uid);
      const push = I.push || {};
      if (isStil(nu.minuten, push.stilVan || '22:45', push.stilTot || '06:30')) continue;
      // Globale snooze: alle push gepauzeerd tot snoozeTot.
      if (push.snoozeTot && Date.parse(push.snoozeTot) > Date.now()) continue;
      const cat = push.categorieen || {};
      if (!tokens.length) continue;
      const intensiteit = push.intensiteit || 'elk_blok';

      // 1) Ochtendbriefing
      if (cat.ochtend !== false && due(push.ochtendBriefing || '07:00') && !(await alGestuurd(uid, nu.datum, 'ochtend'))) {
        const plan = await getPlan(uid, nu.datum);
        const eerste = plan.find((b) => toMin(b.start) >= nu.minuten);
        await stuurPush(uid, tokens, 'Goeiemorgen ☀️',
          plan.length ? `${plan.length} blokken vandaag. Eerst: ${eerste ? eerste.titel + ' om ' + eerste.start : 'rustige dag'}.`
            : 'Open de app om je dag te plannen.');
      }

      // 2) Readiness-check
      if (cat.readiness !== false && due(push.readinessCheck || '07:15') && !(await alGestuurd(uid, nu.datum, 'readiness'))) {
        const g = await garminVan(uid, nu.datum);
        const body = g
          ? `Slaap ${g.slaap ?? '?'}u · readiness ${g.readiness ?? '?'}/100. ${g.readiness != null && g.readiness < 40 ? 'Kies vandaag herstel.' : 'Plan je training gerust.'}`
          : 'Hoe voel je je vandaag? Doe je check-in in de app.';
        await stuurPush(uid, tokens, 'Klaar om te trainen? 🏋️', body, { url: '/gezondheid' });
      }

      // 2b) Blessure-afloop niet stil laten verlopen: als een blessure een
      // verstreken einddatum heeft maar nog niet bevestigd is in de app,
      // stuur een herinnering (anders ziet de gebruiker dit pas als hij
      // toevallig Gezondheid opent).
      if (cat.ochtend !== false && due(push.ochtendBriefing || '07:00')) {
        const blessuresSnap = await db.collection('users').doc(uid).collection('blessures').get();
        for (const doc of blessuresSnap.docs) {
          const b = doc.data();
          if (b.actief === false || !b.eindDatum || b.eindDatum >= nu.datum || b.eindeGemeld) continue;
          const sl = `blessure-afloop-${doc.id}`;
          if (await alGestuurd(uid, nu.datum, sl)) continue;
          await stuurPush(uid, tokens, 'Blessure-update nodig',
            `"${b.titel || b.naam || 'Blessure'}" liep af op ${b.eindDatum} — bevestig in de app of zet ze terug actief.`,
            { url: '/gezondheid' });
        }
      }

      // 3) Per-slot herinneringen
      if (intensiteit !== 'minimaal' && cat.slot !== false) {
        const plan = await getPlan(uid, nu.datum);
        for (const b of plan) {
          if (b.push === false) continue;
          if (intensiteit === 'sleutel' && !b.sleutel) continue;
          if (!due(b.start)) continue;
          const sl = `slot-${b.id}`;
          if (await alGestuurd(uid, nu.datum, sl)) continue;
          await stuurPush(uid, tokens, b.titel, `${b.start}–${b.eind}${b.detail ? ' · ' + b.detail : ''}`);
        }
      }

      // 4) Avondvooruitblik
      if (cat.avond !== false && due(push.avondVooruitblik || '21:30') && !(await alGestuurd(uid, nu.datum, 'avond'))) {
        const morgen = volgendeDatum(nu.datum);
        const evs = await db.collection('users').doc(uid).collection('agendaEvents').where('datum', '==', morgen).get();
        await stuurPush(uid, tokens, 'Vooruitblik morgen 🌙',
          `${evs.size ? evs.size + ' afspra(a)k(en) in je agenda. ' : ''}Leg je telefoon weg en rust goed.`, { url: '/week' });
      }

      // 5) Anti-scroll nudges (elk half uur binnen het venster)
      if (push.antiScrollNudges && cat.antiscroll !== false &&
          binnenVenster(nu.minuten, push.antiScrollVan || '21:00', push.antiScrollTot || '23:30') &&
          nu.minuten % 30 < venster) {
        const sl = `scroll-${nu.hhmm}`;
        if (!(await alGestuurd(uid, nu.datum, sl))) {
          await stuurPush(uid, tokens, 'Even loskoppelen 📵', 'Tijd om te stoppen met scrollen. Lezen, stretchen of slapen?');
        }
      }
    }
  }
);

function binnenVenster(min, vanStr, totStr) {
  const van = toMin(vanStr), tot = toMin(totStr);
  if (van == null || tot == null) return false;
  return van > tot ? (min >= van || min < tot) : (min >= van && min < tot);
}
function volgendeDatum(datum) {
  const d = new Date(datum + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Leest het door de app weggeschreven dagplan (blokken).
async function getPlan(uid, datum) {
  const snap = await db.collection('users').doc(uid).collection('dagen').doc(datum).get();
  return snap.exists ? (snap.data().plan || []) : [];
}

async function garminVan(uid, datum) {
  const snap = await db.collection('users').doc(uid).collection('garminDaily').doc(datum).get();
  if (!snap.exists) return null;
  const g = snap.data();
  const tr = Array.isArray(g.trainingReadiness) ? g.trainingReadiness[0] : g.trainingReadiness;
  const slaapSec = g.sleep?.dailySleepDTO?.sleepTimeSeconds;
  return {
    readiness: tr?.score ?? null,
    slaap: slaapSec ? (slaapSec / 3600).toFixed(1) : null,
  };
}

function isPriveIp(host) {
  const h = String(host || '').replace(/^\[|\]$/g, '').toLowerCase();
  if (!h || h === 'localhost' || h.endsWith('.localhost')) return true;
  const ipVersion = net.isIP(h);
  if (ipVersion === 4) {
    const [a, b] = h.split('.').map((n) => parseInt(n, 10));
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (ipVersion === 6) {
    return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:');
  }
  return false;
}

async function valideerIcsUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').replace(/^webcal:\/\//i, 'https://'));
  } catch {
    return { ok: false, fout: 'Ongeldige URL.' };
  }
  if (parsed.protocol !== 'https:') return { ok: false, fout: 'Alleen https-agenda-links zijn toegestaan.' };
  if (parsed.username || parsed.password) return { ok: false, fout: 'Agenda-links met gebruikersnaam/wachtwoord zijn niet toegestaan.' };
  if (isPriveIp(parsed.hostname)) return { ok: false, fout: 'Lokale of private adressen zijn niet toegestaan.' };
  try {
    const records = await dns.lookup(parsed.hostname, { all: true });
    if (records.some((r) => isPriveIp(r.address))) {
      return { ok: false, fout: 'Agenda-link verwijst naar een lokaal of privaat adres.' };
    }
  } catch {
    return { ok: false, fout: 'Hostnaam kon niet gecontroleerd worden.' };
  }
  return { ok: true, url: parsed.toString() };
}

async function fetchTekstMetLimiet(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ICS_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) throw new Error('Redirects in agenda-links zijn niet toegestaan.');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const lengte = Number(res.headers.get('content-length') || 0);
    if (lengte > MAX_ICS_BYTES) throw new Error('ICS-bestand is te groot.');
    if (!res.body) {
      const tekst = await res.text();
      if (Buffer.byteLength(tekst, 'utf8') > MAX_ICS_BYTES) throw new Error('ICS-bestand is te groot.');
      return tekst;
    }
    const reader = res.body.getReader();
   ks = [];
    let totaal = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      totaal += chunk.length;
      if (totaal > MAX_ICS_BYTES) {
        await reader.cancel().catch(() => {});
        throw new Error('ICS-bestand is te groot.');
      }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Timeout bij het ophalen van de agenda.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function commitAgendaMutaties(col, oudeDocs, nieuweEvents) {
  let batch = db.batch();
  let teller = 0;
  async function voegToe(fn) {
    fn(batch);
    teller += 1;
    if (teller >= 450) {
      await batch.commit();
      batch = db.batch();
      teller = 0;
    }
  }
  for (const d of oudeDocs) await voegToe((b) => b.delete(d.ref));
  for (const e of nieuweEvents) {
    await voegToe((b) => b.set(col.doc(e.uid.replace(/[^A-Za-z0-9_-]/g, '_')), e));
  }
  if (teller) await batch.commit();
}

// Leest alle ICS-links van één gebruiker in en schrijft agendaEvents.
// Geeft een status terug (per link het aantal of de fout) + bewaart die status.
async function syncGebruikerAgenda(userRef) {
  const alg = (await userRef.collection('instellingen').doc('algemeen').get()).data() || {};
  const alleUrls = String(alg.icsUrl || '')
    .split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  const urls = alleUrls.slice(0, MAX_ICS_LINKS);

  const perLink = [];
  if (alleUrls.length > MAX_ICS_LINKS) {
    perLink.push({ link: 'extra links', fout: `Maximaal ${MAX_ICS_LINKS} agenda-links per sync.` });
  }
  let events = [];
  let diagnose = [];
  for (const rawUrl of urls) {
    const geldig = await valideerIcsUrl(rawUrl);
    const kort = String(geldig.url || rawUrl).replace(/^https?:\/\//, '').slice(0, 40);
    if (!geldig.ok) { perLink.push({ link: kort, fout: geldig.fout }); continue; }
    try {
      const tekst = await fetchTekstMetLimiet(geldig.url);
      const n = parseIcs(tekst);
      events.push(...n);
      if (diagnose.length < 6) diagnose.push(...icsDiagnose(tekst, 4));
      perLink.push({ link: kort, aantal: n.length });
    } catch (e) {
      perLink.push({ link: kort, fout: e.message });
    }
  }
  diagnose = diagnose.slice(0, 6);

  // Ontdubbel op uid.
  const gezien = new Set();
  events = events.filter((e) => (gezien.has(e.uid) ? false : gezien.add(e.uid)));

  const col = userRef.collection('agendaEvents');
  const vandaag = brussel().datum;
  const toekomst = events.filter((e) => e.datum >= vandaag).slice(0, 300);
  const oud = await col.where('datum', '>=', vandaag).get();
  await commitAgendaMutaties(col, oud.docs, toekomst);

  // Steekproef van wat er nét is weggeschreven (zo zien we de opgeslagen tijd).
  const opgeslagen = toekomst.slice(0, 6).map((e) => ({
    titel: (e.titel || '').slice(0, 40), datum: e.datum, start: e.start, eind: e.eind,
  }));
  // Serverklok (Brussel) ter controle of de functie-omgeving de juiste tijd heeft.
  const nu = brussel();

  const status = {
    aantal: toekomst.length, perLink, links: urls.length,
    op: admin.firestore.FieldValue.serverTimestamp(),
  };
  await userRef.collection('instellingen').doc('agendaStatus').set(status, { merge: true });
  return {
    aantal: toekomst.length, perLink, links: urls.length,
    diagnose, opgeslagen, serverTijd: `${nu.datum} ${nu.hhmm}`,
  };
}

// =========================================================================
//  ICS-SYNC — elke 3 uur (alle gebruikers)
// =========================================================================
exports.icsSync = onSchedule(
  { schedule: 'every 3 hours', timeZone: 'Europe/Brussels', region: REGIO },
  async () => {
    const snap = await db.collection('users').get();
    for (const userDoc of snap.docs) {
      try {
        const r = await syncGebruikerAgenda(userDoc.ref);
        if (r.links) console.log('ICS gesynct', userDoc.id, r.aantal, 'events');
      } catch (e) {
        console.warn('ICS-sync fout', userDoc.id, e.message);
      }
    }
  }
);

// Directe sync op verzoek vanuit de app ("Agenda nu inlezen").
exports.syncAgendaNu = onCall({ region: REGIO }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Aanmelden vereist.');
  const userRef = db.collection('users').doc(uid);
  const statusRef = userRef.collection('instellingen').doc('agendaStatus');
  const statusSnap = await statusRef.get();
  const laatste = statusSnap.data()?.laatsteHandmatigeSync;
  const laatsteMs = typeof laatste?.toMillis === 'function' ? laatste.toMillis() : Date.parse(laatste || 0);
  if (laatsteMs && Date.now() - laatsteMs < HANDMATIGE_SYNC_COOLDOWN_MS) {
    return { overgeslagen: true, reden: 'Agenda werd net al handmatig gesynchroniseerd. Probeer straks opnieuw.' };
  }
  await statusRef.set({ laatsteHandmatigeSync: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return await syncGebruikerAgenda(userRef);
});

// =========================================================================
//  WEER-SYNC — dagelijks 05:30 (Open-Meteo, geen sleutel nodig)
// =========================================================================
exports.weerSync = onSchedule(
  { schedule: '30 5 * * *', timeZone: 'Europe/Brussels', region: REGIO },
  async () => {
    const snap = await db.collection('users').get();
    for (const userDoc of snap.docs) {
      const alg = (await userDoc.ref.collection('instellingen').doc('algemeen').get()).data() || {};
      const lat = alg.lat || 50.85, lon = alg.lon || 4.35;
      try {
        const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_probability_max,wind_speed_10m_max,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBrussels&forecast_days=3`;
        const res = await fetch(u);
        if (!res.ok) continue;
        const d = await res.json();
        (d.daily?.time || []).forEach((datum, i) => {
          userDoc.ref.collection('weer').doc(datum).set({
            datum,
            neerslagKans: d.daily.precipitation_probability_max?.[i] ?? null,
            windKmh: Math.round(d.daily.wind_speed_10m_max?.[i] ?? 0),
            tMax: d.daily.temperature_2m_max?.[i] ?? null,
            tMin: d.daily.temperature_2m_min?.[i] ?? null,
          }, { merge: true });
        });
      } catch (e) {
        console.warn('Weer-sync fout', userDoc.id, e.message);
      }
    }
  }
);

// =========================================================================
//  WEEKMAIL — zondag 19:00 via Trigger-Email-extensie (collectie "mail")
//  De afzendernaam (= app-naam) stel je in de extensie in (zie README).
// =========================================================================
exports.weekMail = onSchedule(
  { schedule: '0 19 * * 0', timeZone: 'Europe/Brussels', region: REGIO },
  async () => {
    const snap = await db.collection('users').get();
    for (const userDoc of snap.docs) {
      const u = userDoc.data();
      if (!u?.email) continue;
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;color:#0b1120">
          <h2>Je week in vogelvlucht</h2>
          <p>Een nieuwe week begint. Bekijk je planning, plan je trainingen rond je herstel,
          en hou je gewoontes vol. Je kan alles aanpassen in de app.</p>
          <p style="color:#64748b;font-size:13px">Verstuurd door Personal Agenda.</p>
        </div>`;
      await db.collection('mail').add({
        to: [u.email],
        message: { subject: 'Personal Agenda — je week', html },
        aangemaakt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);
