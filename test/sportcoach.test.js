import { describe, it, expect } from 'vitest';
import { kiesSportVanDag, genereerHomeFitness, genereerFietsAdvies, genereerWandelAdvies, genereerSportInhoud } from '../src/services/sportcoach.js';

const SCHEMA = { ma: 'homefitness', di: 'fietsen', do: 'wandelen', vr: 'rust', zo: 'rust' };

describe('kiesSportVanDag', () => {
  it('judo wint altijd, ongeacht weekschema', () => {
    const k = kiesSportVanDag({ dagKort: 'ma', weekSchema: SCHEMA, niveau: 'hard', judoVandaag: true });
    expect(k.sport).toBe('judo');
    expect(k.overschreven).toBe(false);
  });

  it('volgt het geplande schema bij voldoende herstel', () => {
    const k = kiesSportVanDag({ dagKort: 'di', weekSchema: SCHEMA, niveau: 'hard', judoVandaag: false });
    expect(k.sport).toBe('fietsen');
    expect(k.overschreven).toBe(false);
  });

  it('vervangt een intensieve sport door wandelen bij herstel-niveau, met uitleg', () => {
    const k = kiesSportVanDag({ dagKort: 'di', weekSchema: SCHEMA, niveau: 'herstel', judoVandaag: false });
    expect(k.sport).toBe('wandelen');
    expect(k.overschreven).toBe(true);
    expect(k.waarom.length).toBeGreaterThan(0);
  });

  it('rustdag blijft rust, geen override nodig', () => {
    const k = kiesSportVanDag({ dagKort: 'vr', weekSchema: SCHEMA, niveau: 'herstel', judoVandaag: false });
    expect(k.sport).toBe('rust');
    expect(k.overschreven).toBe(false);
  });
});

describe('genereerHomeFitness', () => {
  const oefeningen = [
    { id: 'a', naam: 'Squats', waarom: 'benen', sets: 3, reps: 12, categorie: 'kracht' },
    { id: 'b', naam: 'Plank', waarom: 'core', sets: 3, reps: 1, categorie: 'core' },
  ];

  it('geeft elke oefening een waarom mee', () => {
    const r = genereerHomeFitness({ oefeningen, niveau: 'matig', datum: '2026-06-29' });
    expect(r.oefeningen.length).toBeGreaterThan(0);
    r.oefeningen.forEach((o) => expect(o.waarom).toBeTruthy());
  });

  it('valt veilig terug zonder ingestelde oefeningen', () => {
    const r = genereerHomeFitness({ oefeningen: [], niveau: 'matig', datum: '2026-06-29' });
    expect(r.oefeningen).toEqual([]);
    expect(r.waarom[0]).toMatch(/Beheer/);
  });

  it('zelfde datum geeft een stabiele selectie (geen willekeurige flikkering)', () => {
    const a = genereerHomeFitness({ oefeningen, niveau: 'matig', datum: '2026-06-29' });
    const b = genereerHomeFitness({ oefeningen, niveau: 'matig', datum: '2026-06-29' });
    expect(a.oefeningen.map((o) => o.id)).toEqual(b.oefeningen.map((o) => o.id));
  });
});

describe('genereerFietsAdvies', () => {
  it('geeft minder km en lagere zone bij herstel dan bij hard', () => {
    const hard = genereerFietsAdvies({ niveau: 'hard' });
    const herstel = genereerFietsAdvies({ niveau: 'herstel' });
    expect(herstel.km).toBeLessThan(hard.km);
  });
});

describe('genereerWandelAdvies', () => {
  it('adviseert resterende stappen tot het doel als dat nog niet gehaald is', () => {
    const r = genereerWandelAdvies({ niveau: 'matig', garmin: { stappen: 3000 }, stappenDoel: 8000 });
    expect(r.stappenAdvies).toBe(5000);
  });

  it('valt terug op een km-advies zonder stappendoel-data', () => {
    const r = genereerWandelAdvies({ niveau: 'matig', garmin: null, stappenDoel: null });
    expect(r.stappenAdvies).toBeNull();
    expect(r.km).toBeGreaterThan(0);
  });
});

describe('genereerSportInhoud', () => {
  it('geeft judo geen extra inhoud', () => {
    const r = genereerSportInhoud({ sport: 'judo', niveau: 'matig' });
    expect(r.type).toBe('judo');
    expect(r.waarom[0]).toMatch(/Vaste/);
  });
});
