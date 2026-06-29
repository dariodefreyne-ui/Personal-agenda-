import { describe, it, expect } from 'vitest';
import {
  MOMENTEN, receptType, kiesSuggesties, gekozenMaaltijd, schaalIngredienten,
  ingredientenTekst, genereerBoodschappenlijst,
} from '../src/services/maaltijden.js';

const recepten = [
  { id: 'kip', naam: 'Kip met rijst', type: 'lunch', aantalEters: 2, houdbaar: false,
    doelen: ['spiermassa', 'prestatie'], ingredienten: [{ naam: 'kip', hoeveelheid: 300, eenheid: 'g' }, { naam: 'rijst', hoeveelheid: 200, eenheid: 'g' }] },
  { id: 'salade', naam: 'Salade', type: 'lunch', aantalEters: 1, houdbaar: false, doelen: ['afvallen'],
    ingredienten: [{ naam: 'sla', hoeveelheid: 100, eenheid: 'g' }] },
  { id: 'pasta', naam: 'Pasta', type: 'lunch', aantalEters: 2, houdbaar: false, doelen: [],
    ingredienten: [{ naam: 'pasta', hoeveelheid: 150, eenheid: 'g' }] },
  { id: 'noten', naam: 'Noten', type: 'snack', aantalEters: 1, houdbaar: true,
    ingredienten: [{ naam: 'noten', hoeveelheid: 30, eenheid: 'g' }] },
];

describe('receptType', () => {
  it('herleidt elk snackmoment naar het brede type snack', () => {
    expect(receptType('snack1')).toBe('snack');
    expect(receptType('snack2')).toBe('snack');
    expect(receptType('snack3')).toBe('snack');
    expect(receptType('ontbijt')).toBe('ontbijt');
  });
});

describe('kiesSuggesties', () => {
  it('filtert op moment + doel, lege doelen-array past bij elk doel', () => {
    const s = kiesSuggesties({ recepten, moment: 'lunch', doelen: ['afvallen'], datum: '2026-06-29' });
    const ids = s.map((r) => r.id);
    expect(ids).toContain('salade'); // matcht doel
    expect(ids).toContain('pasta');  // geen doelen -> past overal
    expect(ids).not.toContain('kip'); // ander doel, geen match
  });

  it('valt veilig terug op lege lijst zonder passende recepten', () => {
    expect(kiesSuggesties({ recepten: [], moment: 'lunch', datum: '2026-06-29' })).toEqual([]);
    expect(kiesSuggesties({ recepten, moment: 'diner', datum: '2026-06-29' })).toEqual([]);
  });

  it('roteert dag-deterministisch (zelfde datum -> zelfde resultaat, geen willekeur)', () => {
    const a = kiesSuggesties({ recepten, moment: 'lunch', datum: '2026-06-29', aantal: 2 });
    const b = kiesSuggesties({ recepten, moment: 'lunch', datum: '2026-06-29', aantal: 2 });
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
  });

  it('snack-momenten gebruiken een verschillende rotatie-offset binnen dezelfde dag', () => {
    const snacks = [
      { id: 's1', naam: 'Snack 1', type: 'snack', ingredienten: [] },
      { id: 's2', naam: 'Snack 2', type: 'snack', ingredienten: [] },
      { id: 's3', naam: 'Snack 3', type: 'snack', ingredienten: [] },
    ];
    const m1 = kiesSuggesties({ recepten: snacks, moment: 'snack1', datum: '2026-06-29', aantal: 1 })[0].id;
    const m2 = kiesSuggesties({ recepten: snacks, moment: 'snack2', datum: '2026-06-29', aantal: 1 })[0].id;
    const m3 = kiesSuggesties({ recepten: snacks, moment: 'snack3', datum: '2026-06-29', aantal: 1 })[0].id;
    expect(new Set([m1, m2, m3]).size).toBe(3);
  });
});

describe('gekozenMaaltijd', () => {
  it('override wint altijd over de deterministische suggestie', () => {
    const g = gekozenMaaltijd({ recepten, moment: 'lunch', datum: '2026-06-29', override: { recipeId: 'kip', aantalEters: 3 } });
    expect(g.recept.id).toBe('kip');
    expect(g.aantalEters).toBe(3);
  });

  it('zonder override valt het terug op de eerste suggestie', () => {
    const g = gekozenMaaltijd({ recepten, moment: 'lunch', doelen: ['afvallen'], datum: '2026-06-29' });
    expect(['salade', 'pasta']).toContain(g.recept.id);
  });

  it('geeft null bij geen passend recept (veilige terugval)', () => {
    expect(gekozenMaaltijd({ recepten: [], moment: 'diner', datum: '2026-06-29' })).toBeNull();
  });
});

describe('schaalIngredienten', () => {
  it('schaalt proportioneel op het aantal eters', () => {
    const result = schaalIngredienten([{ naam: 'kip', hoeveelheid: 300, eenheid: 'g' }], 2, 4);
    expect(result[0].hoeveelheid).toBe(600);
  });
  it('rondt gewicht/volume af op 5 (g/ml), behoudt 1 decimaal voor stuks', () => {
    const result = schaalIngredienten([{ naam: 'kip', hoeveelheid: 301, eenheid: 'g' }, { naam: 'ei', hoeveelheid: 1, eenheid: 'stuk' }], 1, 1);
    expect(result[0].hoeveelheid % 5).toBe(0);
    expect(result[1].hoeveelheid).toBe(1);
  });
});

describe('ingredientenTekst', () => {
  it('formatteert als leesbare, komma-gescheiden tekst', () => {
    expect(ingredientenTekst([{ naam: 'kip', hoeveelheid: 300, eenheid: 'g' }, { naam: 'rijst', hoeveelheid: 200, eenheid: 'g' }]))
      .toBe('300g kip, 200g rijst');
  });
});

describe('genereerBoodschappenlijst', () => {
  it('telt ingrediënten op over de periode en splitst vers/houdbaar', () => {
    const lijst = genereerBoodschappenlijst({
      periode: ['2026-06-29', '2026-06-30'], recepten, doelen: [], aantalEtersStandaard: 1,
    });
    expect(lijst.vers.length).toBeGreaterThan(0);
    expect(lijst.vers.every((i) => i.naam)).toBe(true);
    expect(lijst.houdbaar.every((i) => i.naam)).toBe(true);
  });

  it('een override uit dagDocs wint over de deterministische suggestie', () => {
    const dagDocs = { '2026-06-29': { maaltijdPlan: { lunch: { recipeId: 'kip', aantalEters: 2 } } } };
    const lijst = genereerBoodschappenlijst({
      periode: ['2026-06-29'], recepten, doelen: [], aantalEtersStandaard: 1, dagDocs,
    });
    const kipIngr = lijst.vers.find((i) => i.naam === 'kip');
    expect(kipIngr?.hoeveelheid).toBe(300); // 2 eters = basisportie van het recept, geen schaling nodig
  });

  it('valt veilig terug op een leeg overzicht zonder recepten', () => {
    const lijst = genereerBoodschappenlijst({ periode: ['2026-06-29'], recepten: [] });
    expect(lijst).toEqual({ vers: [], houdbaar: [] });
  });
});

describe('MOMENTEN', () => {
  it('bevat de 3 hoofdmaaltijden + 3 snackmomenten', () => {
    expect(MOMENTEN).toEqual(['ontbijt', 'lunch', 'diner', 'snack1', 'snack2', 'snack3']);
  });
});
