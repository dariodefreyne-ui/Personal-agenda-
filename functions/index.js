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
const admin = require('firebase-admin');
const { parseIcs } = require('./lib/ics');

admin.initializeApp();
const db = admin.firestore();
const REGIO = 'europe-west1';

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
  const ids = [];
  for (const d of snap.docs) {
    const t = await d.ref.collection('pushTokens').where('actief', '==', true).limit(1).get();
    if (!t.empty) ids.push(d.id);
  }
  return ids;
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

    for (const uid of await gebruikersMetPush()) {
      const I = await getInstellingen(uid);
      const push = I.push || {};
      if (isStil(nu.minuten, push.stilVan || '22:45', push.stilTot || '06:30')) continue;
      // Globale snooze: alle push gepauzeerd tot snoozeTot.
      if (push.snoozeTot && Date.parse(push.snoozeTot) > Date.now()) continue;
      const cat = push.categorieen || {};
      const tokens = await actieveTokens(uid);
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

// =========================================================================
//  ICS-SYNC — elke 3 uur
// =========================================================================
exports.icsSync = onSchedule(
  { schedule: 'every 3 hours', timeZone: 'Europe/Brussels', region: REGIO },
  async () => {
    const snap = await db.collection('users').get();
    for (const userDoc of snap.docs) {
      const alg = (await userDoc.ref.collection('instellingen').doc('algemeen').get()).data() || {};
      let url = alg.icsUrl;
      if (!url) continue;
      url = url.replace(/^webcal:\/\//i, 'https://');
      try {
        const res = await fetch(url);
        if (!res.ok) { console.warn('ICS-fetch faalde', userDoc.id, res.status); continue; }
        const events = parseIcs(await res.text());
        const col = userDoc.ref.collection('agendaEvents');
        // Verwijder oude toekomstige events en herschrijf (eenvoudig + correct).
        const vandaag = brussel().datum;
        const oud = await col.where('datum', '>=', vandaag).get();
        const batch = db.batch();
        oud.forEach((d) => batch.delete(d.ref));
        events.filter((e) => e.datum >= vandaag).slice(0, 300).forEach((e) => {
          batch.set(col.doc(e.uid.replace(/[^A-Za-z0-9_-]/g, '_')), e);
        });
        await batch.commit();
        console.log('ICS gesynct', userDoc.id, events.length, 'events');
      } catch (e) {
        console.warn('ICS-sync fout', userDoc.id, e.message);
      }
    }
  }
);

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
