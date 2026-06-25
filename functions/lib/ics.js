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
    const s = lokaal(dtStart.date);
    const e = dtEnd ? lokaal(dtEnd.date) : null;
    events.push({
      titel: summary,
      datum: s.datum,
      start: dtStart.allDay ? '00:00' : s.tijd,
      eind: e ? e.tijd : null,
      allDay: dtStart.allDay,
      uid: (veld('UID') || `${s.datum}-${summary}`).slice(0, 120),
    });
  }
  return events;
}

module.exports = { parseIcs };
