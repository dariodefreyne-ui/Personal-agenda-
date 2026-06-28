import { describe, it, expect } from 'vitest';
import { periodiseringBepalen } from '../src/services/periodisering.js';

// Maandag 2026-06-01 als ankerpunt.
const maandag = (offsetWeken) => {
  const d = new Date('2026-06-01T12:00:00'); // maandag
  d.setDate(d.getDate() + offsetWeken * 7);
  return d;
};

describe('periodiseringBepalen', () => {
  it('precies 1 op elke cyclusLengte weken is deload, de rest opbouw', () => {
    const fases = Array.from({ length: 12 }, (_, w) => periodiseringBepalen(maandag(w)).fase);
    const deloads = fases.filter((f) => f === 'deload').length;
    expect(deloads).toBe(3); // 12 weken / cyclus van 4
    expect(fases.every((f) => f === 'opbouw' || f === 'deload')).toBe(true);
  });

  it('herhaalt zich exact elke cyclusLengte weken', () => {
    const eerste = periodiseringBepalen(maandag(0));
    const zelfdeFaseLater = periodiseringBepalen(maandag(eerste.cyclusLengte));
    expect(zelfdeFaseLater.fase).toBe(eerste.fase);
    expect(zelfdeFaseLater.weekInCyclus).toBe(eerste.weekInCyclus);
  });

  it('weekInCyclus telt op van 1 t.e.m. cyclusLengte en dan opnieuw 1', () => {
    const eerste = periodiseringBepalen(maandag(0));
    const volgende = periodiseringBepalen(maandag(1));
    const verwacht = (eerste.weekInCyclus % eerste.cyclusLengte) + 1;
    expect(volgende.weekInCyclus).toBe(verwacht);
    expect(volgende.fase).toBe(verwacht >= eerste.cyclusLengte ? 'deload' : 'opbouw');
  });

  it('is identiek voor elke dag binnen dezelfde week', () => {
    const ref = periodiseringBepalen(maandag(2));
    const zondag = new Date(maandag(2));
    zondag.setDate(zondag.getDate() + 6);
    expect(periodiseringBepalen(zondag).fase).toBe(ref.fase);
    expect(periodiseringBepalen(zondag).weekInCyclus).toBe(ref.weekInCyclus);
  });

  it('blijft consistent over een jaargrens (geen reset zoals bij ISO-weeknummers)', () => {
    const voorJaarwisseling = periodiseringBepalen(new Date('2026-12-28T12:00:00')); // maandag
    const naJaarwisseling = periodiseringBepalen(new Date('2027-01-04T12:00:00')); // maandag erna
    const verwacht = (voorJaarwisseling.weekInCyclus % voorJaarwisseling.cyclusLengte) + 1;
    expect(naJaarwisseling.weekInCyclus).toBe(verwacht);
  });

  it('respecteert een andere cycluslengte', () => {
    const fases = Array.from({ length: 6 }, (_, w) => periodiseringBepalen(maandag(w), 3).fase);
    expect(fases.filter((f) => f === 'deload').length).toBe(2); // 6 weken / cyclus van 3
  });

  it('is altijd hoog zeker (kalenderregel, geen meetdata nodig) en uitlegbaar', () => {
    const r = periodiseringBepalen(maandag(0));
    expect(r.zekerheid).toBe('hoog');
    expect(r.waarom).toBeTruthy();
    expect(r.meetlat).toBeTruthy();
  });
});
