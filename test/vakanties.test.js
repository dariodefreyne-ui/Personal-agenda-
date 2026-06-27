import { describe, it, expect } from 'vitest';
import { vakantieVoorDatum, vakantieFlags } from '../src/services/vakanties.js';

// Twee overlappende periodes zoals in de praktijk: een ziekteverlof én een
// langere judovrije periode die elkaar op één dag overlappen.
const periodes = [
  { naam: 'Ziekte', van: '2026-05-25', tot: '2026-06-28', verlof: true, geenJudo: false },
  { naam: 'Geen judo', van: '2026-06-26', tot: '2026-08-18', verlof: false, geenJudo: true },
];

describe('vakantieFlags — combineert overlappende periodes', () => {
  it('27 jun valt in beide: zowel verlof als geenJudo gelden', () => {
    const f = vakantieFlags(periodes, '2026-06-27');
    expect(f.verlof).toBe(true);
    expect(f.geenJudo).toBe(true);
  });

  it('vakantieVoorDatum (één periode) miste geenJudo bij overlap — flags lost dit op', () => {
    // De eerste match is "Ziekte" (geen judovrij); daarom is enkel die ontoereikend.
    expect(vakantieVoorDatum(periodes, '2026-06-27').geenJudo).toBe(false);
    expect(vakantieFlags(periodes, '2026-06-27').geenJudo).toBe(true);
  });

  it('20 jun: enkel ziekteverlof, geen judovrij', () => {
    const f = vakantieFlags(periodes, '2026-06-20');
    expect(f.verlof).toBe(true);
    expect(f.geenJudo).toBe(false);
  });

  it('1 sept: buiten alle periodes', () => {
    const f = vakantieFlags(periodes, '2026-09-01');
    expect(f).toEqual({ verlof: false, geenJudo: false, periode: null });
  });
});
