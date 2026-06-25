// Minimale ICS-parser: haalt VEVENTs (SUMMARY, DTSTART, DTEND) eruit.
// Geen RRULE-expansie (Fase 1) — losse afspraken en matchen volstaan.

function unfold(text) {
  // Gevouwen regels (volgende regel begint met spatie/tab) samenvoegen.
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

// "20240615T194500Z" / "20240615T194500" / "20240615" -> Date (UTC-benadering)
function parseDt(waarde) {
  if (!waarde) return null;
  const m = waarde.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?/);
  if (!m) return null;
  const [, y, mo, d, hh = '00', mm = '00', ss = '00', z] = m;
  const allDay = !waarde.includes('T');
  if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss || 0)), allDay };
  // Geen Z: behandel als lokale tijd (Europe/Brussels-benadering via offset onbekend);
  // we bewaren als "wandklok" door een Date in UTC met dezelfde cijfers te maken.
  return { date: new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss || 0)), allDay, floating: true };
}

// Format een Date naar lokale (Brussel) datum/uur strings.
function lokaal(date) {
  const fmt = new Intl.DateTimeFormat('nl-BE', {
    timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { datum: `${p.year}-${p.month}-${p.day}`, tijd: `${p.hour}:${p.minute}` };
}

function parseIcs(text) {
  const events = [];
  const blocks = unfold(text).split('BEGIN:VEVENT').slice(1);
  for (const b of blocks) {
    const body = b.split('END:VEVENT')[0];
    const veld = (naam) => {
      const re = new RegExp(`(?:^|\\n)${naam}(?:;[^:\\n]*)?:(.*)`);
      const m = body.match(re);
      return m ? m[1].trim() : null;
    };
    const summary = (veld('SUMMARY') || '').replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
    const dtStart = parseDt(veld('DTSTART'));
    const dtEnd = parseDt(veld('DTEND'));
    if (!summary || !dtStart) continue;
    const baseUid = (veld('UID') || `${summary}`).slice(0, 100);
    const duurMs = dtEnd ? (dtEnd.date.getTime() - dtStart.date.getTime()) : 0;
    const rrule = veld('RRULE');

    const maakEvent = (startDate) => {
      const s = lokaal(startDate);
      const e = duurMs ? lokaal(new Date(startDate.getTime() + duurMs)) : null;
      events.push({
        titel: summary,
        datum: s.datum,
        start: dtStart.allDay ? '00:00' : s.tijd,
        eind: e ? e.tijd : null,
        allDay: dtStart.allDay,
        uid: `${baseUid}-${s.datum}`.slice(0, 120),
      });
    };

    if (rrule) {
      // Herhalende afspraak: uitklappen voor de komende ~60 dagen.
      const now = new Date();
      const winStart = new Date(now.getTime() - 86400000);
      const winEnd = new Date(now.getTime() + 60 * 86400000);
      const occ = expandRrule(dtStart.date, parseRruleStr(rrule), winStart, winEnd);
      occ.slice(0, 60).forEach(maakEvent);
    } else {
      maakEvent(dtStart.date);
    }
  }
  return events;
}

function parseRruleStr(s) {
  const o = {};
  (s || '').split(';').forEach((p) => {
    const [k, v] = p.split('=');
    if (k) o[k.trim().toUpperCase()] = (v || '').trim();
  });
  return o;
}

// Basis-RRULE-expansie: DAILY / WEEKLY(BYDAY) / MONTHLY, met INTERVAL/COUNT/UNTIL.
function expandRrule(base, rrule, winStart, winEnd) {
  const freq = (rrule.FREQ || '').toUpperCase();
  const interval = Math.max(1, parseInt(rrule.INTERVAL || '1', 10));
  const count = rrule.COUNT ? parseInt(rrule.COUNT, 10) : null;
  const until = rrule.UNTIL ? parseDt(rrule.UNTIL).date : null;
  const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const byday = rrule.BYDAY
    ? rrule.BYDAY.split(',').map((d) => dayMap[d.slice(-2).toUpperCase()]).filter((n) => n != null)
    : null;

  const hh = base.getUTCHours(), mm = base.getUTCMinutes(), ss = base.getUTCSeconds();
  const baseDay = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate());
  const occ = [];
  let made = 0;
  let dayMs = baseDay;
  for (let k = 0; k < 800; k++) {
    if (dayMs > winEnd.getTime()) break;
    if (until && dayMs > until.getTime()) break;
    if (count && made >= count) break;
    const diffDays = Math.round((dayMs - baseDay) / 86400000);
    const d = new Date(dayMs);
    let match = false;
    if (diffDays >= 0) {
      if (freq === 'DAILY') match = diffDays % interval === 0;
      else if (freq === 'WEEKLY') {
        const weekIdx = Math.floor(diffDays / 7);
        match = byday
          ? (weekIdx % interval === 0 && byday.includes(d.getUTCDay()))
          : (diffDays % (7 * interval) === 0);
      } else if (freq === 'MONTHLY') {
        const mDiff = (d.getUTCFullYear() - base.getUTCFullYear()) * 12 + (d.getUTCMonth() - base.getUTCMonth());
        match = d.getUTCDate() === base.getUTCDate() && mDiff >= 0 && mDiff % interval === 0;
      } else {
        match = diffDays === 0;
      }
    }
    if (match) {
      const occDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm, ss));
      if (occDate.getTime() >= winStart.getTime()) occ.push(occDate);
      made++;
    }
    dayMs += 86400000;
  }
  return occ;
}

module.exports = { parseIcs };
