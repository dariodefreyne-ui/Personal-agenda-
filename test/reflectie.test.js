import { describe, it, expect } from 'vitest';
import {
  gemiddelde, reflectieReeks, reflectieSamenvatting, energieNudge,
  stemmingInfo, energieInfo,
} from '../src/services/reflectie.js';
import { coachAdvies } from '../src/services/coach.js';

describe('reflectie-helpers', () => {
  it('gemiddelde negeert ontbrekende waarden', () => {
    expect(gemiddelde([4, 2, null, undefined, 3])).toBe(3);
    expect(gemiddelde([])).toBe(null);
    expect(gemiddelde([null])).toBe(null);
  });

  it('reflectieReeks haalt stemming/energie/tevreden per dag eruit', () => {
    const dagen = [
      { datum: '2026-06-24', checkin: { ochtend: { stemming: 4, energie: 3 } } },
      { datum: '2026-06-25', checkin: { avond: { tevreden: 5 } } },
      { datum: '2026-06-26' },
    ];
    const r = reflectieReeks(dagen);
    expect(r[0]).toMatchObject({ stemming: 4, energie: 3, tevreden: null });
    expect(r[1]).toMatchObject({ stemming: null, tevreden: 5 });
    expect(r[2]).toMatchObject({ stemming: null, energie: null, tevreden: null });
  });

  it('reflectieSamenvatting telt alleen dagen met een check-in', () => {
    const s = reflectieSamenvatting([
      { checkin: { ochtend: { stemming: 4, energie: 4 } } },
      { checkin: { ochtend: { stemming: 2, energie: 2 } } },
      {},
    ]);
    expect(s.stemming).toBe(3);
    expect(s.energie).toBe(3);
    expect(s.aantal).toBe(2);
  });

  it('energieNudge: laag remt af, hoog geeft ruimte, 3 neutraal', () => {
    expect(energieNudge(1)).toBeLessThan(0);
    expect(energieNudge(3)).toBe(0);
    expect(energieNudge(5)).toBeGreaterThan(0);
    expect(energieNudge(null)).toBe(0);
  });

  it('schaal-info lookups werken', () => {
    expect(stemmingInfo(5).label).toBe('Top');
    expect(energieInfo(1).label).toBe('Uitgeput');
    expect(stemmingInfo(99)).toBe(null);
  });
});

describe('coach houdt rekening met zelf-gerapporteerde energie', () => {
  const basis = { readiness: 60, bodyBattery: 60, slaapUren: 7.5, goal: 'algemeen' };

  it('lage energie verlaagt het niveau t.o.v. hoge energie', () => {
    const laag = coachAdvies({ ...basis, energie: 1 });
    const hoog = coachAdvies({ ...basis, energie: 5 });
    const rang = { herstel: 0, rustig: 1, matig: 2, hard: 3 };
    expect(rang[laag.niveau]).toBeLessThan(rang[hoog.niveau]);
  });

  it('vermeldt energie in de reden', () => {
    const a = coachAdvies({ ...basis, energie: 2 });
    expect(a.reden).toContain('energie 2/5');
  });
});

describe('coach — uitlegbaarheid & veilige terugval (Fase 4.5)', () => {
  it('geeft waarom, databronnen, zekerheid en meetlat terug', () => {
    const a = coachAdvies({ readiness: 70, bodyBattery: 65, slaapUren: 8, goal: 'kracht' });
    expect(Array.isArray(a.waarom)).toBe(true);
    expect(a.waarom.length).toBeGreaterThan(0);
    expect(a.databronnen).toContain('Garmin readiness');
    expect(a.zekerheid).toBe('hoog'); // 3 signalen
    expect(typeof a.meetlat).toBe('string');
  });

  it('bij geen meetdata: lage zekerheid + veilig algemeen advies', () => {
    const a = coachAdvies({ goal: 'algemeen' });
    expect(a.zekerheid).toBe('laag');
    expect(a.databronnen).toContain('Geen meetdata');
    expect(a.waarom.join(' ')).toMatch(/veilig algemeen advies/i);
  });

  it('cap: lage zekerheid pusht nooit "hard"', () => {
    // Zeer hoge readiness zou 'hard' geven, maar zonder andere signalen is de
    // zekerheid laag -> conservatief naar 'matig'.
    const a = coachAdvies({ readiness: 95 });
    expect(a.zekerheid).not.toBe('hoog');
    expect(a.niveau).not.toBe('hard');
  });
});
