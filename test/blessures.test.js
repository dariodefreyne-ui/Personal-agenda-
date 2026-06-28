import { describe, it, expect } from 'vitest';
import {
  isBlessureActief, isVerlopenNietGemeld, vermijdSportenVanBlessures,
  kiesOefeningenVanDag, blessureBlokDuur,
} from '../src/services/blessures.js';

describe('isBlessureActief', () => {
  it('actief zonder einddatum (onbepaald)', () => {
    expect(isBlessureActief({ actief: true }, '2026-06-28')).toBe(true);
  });
  it('niet actief als expliciet uitgezet', () => {
    expect(isBlessureActief({ actief: false }, '2026-06-28')).toBe(false);
  });
  it('niet actief na verstreken einddatum', () => {
    expect(isBlessureActief({ actief: true, eindDatum: '2026-06-01' }, '2026-06-28')).toBe(false);
  });
  it('actief vóór einddatum', () => {
    expect(isBlessureActief({ actief: true, eindDatum: '2026-07-01' }, '2026-06-28')).toBe(true);
  });
});

describe('isVerlopenNietGemeld', () => {
  it('true als einddatum verstreken en nog niet gemeld', () => {
    expect(isVerlopenNietGemeld({ actief: true, eindDatum: '2026-06-01', eindeGemeld: false }, '2026-06-28')).toBe(true);
  });
  it('false als al gemeld', () => {
    expect(isVerlopenNietGemeld({ actief: true, eindDatum: '2026-06-01', eindeGemeld: true }, '2026-06-28')).toBe(false);
  });
  it('false als nog niet verstreken', () => {
    expect(isVerlopenNietGemeld({ actief: true, eindDatum: '2026-07-01' }, '2026-06-28')).toBe(false);
  });
});

describe('vermijdSportenVanBlessures', () => {
  it('combineert vermijdSport van alle actieve blessures', () => {
    const blessures = [
      { actief: true, regio: 'knie' },
      { actief: true, regio: 'schouder' },
    ];
    const v = vermijdSportenVanBlessures(blessures, '2026-06-28');
    expect(v).toContain('fietsen');
    expect(v).toContain('wandelen');
    expect(v).toContain('judo');
  });
  it('algemeen geeft geen sportveto', () => {
    const v = vermijdSportenVanBlessures([{ actief: true, regio: 'algemeen' }], '2026-06-28');
    expect(v).toEqual([]);
  });
  it('negeert verlopen/inactieve blessures', () => {
    const v = vermijdSportenVanBlessures([{ actief: true, regio: 'knie', eindDatum: '2026-06-01' }], '2026-06-28');
    expect(v).toEqual([]);
  });
});

describe('kiesOefeningenVanDag', () => {
  const oefeningen = [
    { id: 'a', actief: true }, { id: 'b', actief: true }, { id: 'c', actief: true },
    { id: 'd', actief: false }, { id: 'e', actief: true },
  ];
  it('filtert inactieve oefeningen', () => {
    const k = kiesOefeningenVanDag({ oefeningen, aantalPerDag: 10, datum: '2026-06-28' });
    expect(k.every((o) => o.actief)).toBe(true);
    expect(k.length).toBe(4);
  });
  it('respecteert aantalPerDag', () => {
    const k = kiesOefeningenVanDag({ oefeningen, aantalPerDag: 2, datum: '2026-06-28' });
    expect(k.length).toBe(2);
  });
  it('roteert eerlijk over opeenvolgende dagen (round-robin)', () => {
    const k1 = kiesOefeningenVanDag({ oefeningen, aantalPerDag: 2, datum: '2026-06-28' });
    const k2 = kiesOefeningenVanDag({ oefeningen, aantalPerDag: 2, datum: '2026-06-29' });
    expect(k1.map((o) => o.id)).not.toEqual(k2.map((o) => o.id));
  });
  it('dezelfde dag geeft altijd dezelfde selectie (deterministisch)', () => {
    const k1 = kiesOefeningenVanDag({ oefeningen, aantalPerDag: 2, datum: '2026-06-28' });
    const k2 = kiesOefeningenVanDag({ oefeningen, aantalPerDag: 2, datum: '2026-06-28' });
    expect(k1.map((o) => o.id)).toEqual(k2.map((o) => o.id));
  });
  it('leeg zonder actieve oefeningen', () => {
    expect(kiesOefeningenVanDag({ oefeningen: [{ id: 'a', actief: false }], aantalPerDag: 2, datum: '2026-06-28' })).toEqual([]);
  });
});

describe('blessureBlokDuur', () => {
  it('minstens 10 minuten', () => {
    expect(blessureBlokDuur(0)).toBe(10);
  });
  it('schaalt met aantal oefeningen', () => {
    expect(blessureBlokDuur(5)).toBe(20);
  });
});
