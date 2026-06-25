import { describe, it, expect } from 'vitest';
import { doelProgress, huidigeWaarde } from '../src/services/doelen.js';

describe('doelProgress', () => {
  it('berekent % voor een stijgend doel (VO2max) uit Garmin', () => {
    const p = doelProgress({ metric: 'vo2max', start: 45, naar: 55 }, { vo2max: 50 });
    expect(p.huidige).toBe(50);
    expect(p.pct).toBe(50);
    expect(p.klaar).toBe(false);
  });

  it('werkt ook voor een dalend doel (gewicht)', () => {
    const p = doelProgress({ metric: 'gewicht', start: 85, naar: 75 }, { gewichtKg: 80 });
    expect(p.pct).toBe(50);
  });

  it('markeert klaar bij of voorbij het doel', () => {
    const p = doelProgress({ metric: 'gewicht', start: 85, naar: 75 }, { gewichtKg: 74 });
    expect(p.klaar).toBe(true);
    expect(p.pct).toBe(100);
  });

  it('valt terug op handmatige huidige waarde zonder Garmin', () => {
    expect(huidigeWaarde({ metric: 'eigen', huidige: 12 }, null)).toBe(12);
    const p = doelProgress({ metric: 'afstand', start: 0, naar: 10, huidige: 4 }, null);
    expect(p.pct).toBe(40);
  });
});
