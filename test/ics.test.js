import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parseIcs, icsDiagnose } = require('../functions/lib/ics.js');

const cal = (...vevents) => ['BEGIN:VCALENDAR', ...vevents, 'END:VCALENDAR'].join('\r\n');
const ev = (lines) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n');

describe('ICS-parser', () => {
  it('parseert een losse afspraak met UTC-tijd naar Brussel', () => {
    const out = parseIcs(cal(ev(['UID:a', 'SUMMARY:Tandarts', 'DTSTART:20260701T080000Z', 'DTEND:20260701T083000Z'])));
    expect(out).toHaveLength(1);
    expect(out[0].titel).toBe('Tandarts');
    expect(out[0].start).toBe('10:00'); // 08:00Z = 10:00 zomertijd Brussel
    expect(out[0].eind).toBe('10:30');
  });

  it('toont een TZID-lokale tijd als wandklok (18u blijft 18u, niet 20u)', () => {
    const out = parseIcs(cal(ev([
      'UID:tz', 'SUMMARY:Afspraak',
      'DTSTART;TZID=Europe/Brussels:20260628T180000',
      'DTEND;TZID=Europe/Brussels:20260628T190000',
    ])));
    expect(out).toHaveLength(1);
    expect(out[0].start).toBe('18:00');
    expect(out[0].eind).toBe('19:00');
  });

  it('toont een zwevende tijd (geen Z, geen TZID) als wandklok', () => {
    const out = parseIcs(cal(ev([
      'UID:fl', 'SUMMARY:Zwevend', 'DTSTART:20260628T180000', 'DTEND:20260628T193000',
    ])));
    expect(out[0].start).toBe('18:00');
    expect(out[0].eind).toBe('19:30');
  });

  it('herkent een hele-dag-afspraak', () => {
    const out = parseIcs(cal(ev(['UID:b', 'SUMMARY:Verlof', 'DTSTART;VALUE=DATE:20260705'])));
    expect(out[0].allDay).toBe(true);
    expect(out[0].start).toBe('00:00');
  });

  it('klapt een wekelijkse RRULE uit binnen het venster', () => {
    const out = parseIcs(cal(ev([
      'UID:c', 'SUMMARY:Wekelijkse training',
      'DTSTART:20260101T190000Z', 'DTEND:20260101T203000Z',
      'RRULE:FREQ=WEEKLY;BYDAY=WE',
    ])));
    expect(out.length).toBeGreaterThan(3);
    // alle occurrences op woensdag, en in de toekomst t.o.v. venster
    expect(out.every((e) => e.start === '21:00' && e.eind === '22:30')).toBe(true);
    // unieke datums
    const datums = new Set(out.map((e) => e.datum));
    expect(datums.size).toBe(out.length);
  });

  it('icsDiagnose toont ruwe regel + omgezette tijd per type', () => {
    const tz = parseIcs && icsDiagnose(cal(
      ev(['UID:1', 'SUMMARY:TZID', 'DTSTART;TZID=Europe/Brussels:20260628T180000']),
      ev(['UID:2', 'SUMMARY:UTC', 'DTSTART:20260628T160000Z']),
      ev(['UID:3', 'SUMMARY:Dag', 'DTSTART;VALUE=DATE:20260628']),
    ));
    expect(tz).toHaveLength(3);
    expect(tz[0]).toMatchObject({ start: '18:00', wandklok: true, heeftZ: false });
    expect(tz[0].ruw).toContain('TZID=Europe/Brussels');
    expect(tz[1]).toMatchObject({ start: '18:00', heeftZ: true });
    expect(tz[2].heleDag).toBe(true);
  });

  it('respecteert COUNT zodat afgelopen reeksen leeg zijn', () => {
    const out = parseIcs(cal(ev([
      'UID:d', 'SUMMARY:Afgelopen reeks',
      'DTSTART:20200101T100000Z', 'DTEND:20200101T110000Z',
      'RRULE:FREQ=DAILY;COUNT=5',
    ])));
    expect(out).toHaveLength(0); // 2020, ver buiten het 60-dagen-venster
  });
});
