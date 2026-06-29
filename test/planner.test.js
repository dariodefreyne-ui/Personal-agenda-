import { describe, it, expect } from 'vitest';
import { genereerDagPlan, berekenFietsAdvies } from '../src/services/planner.js';
import { DEFAULT_INSTELLINGEN } from '../src/config/appConfig.js';
import { toMin } from '../src/services/tijd.js';

const I = DEFAULT_INSTELLINGEN;
const titels = (plan) => plan.blokken.map((b) => b.titel);

describe('genereerDagPlan', () => {
  it('thuiswerkdag (maandag) bevat werk, middagpauze en slaap', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis' });
    expect(titels(plan).some((t) => /Thuiswerk/.test(t))).toBe(true);
    expect(titels(plan).some((t) => /Middagpauze/.test(t))).toBe(true);
    expect(plan.blokken.some((b) => b.type === 'slaap')).toBe(true);
    // blokken chronologisch gesorteerd
    const starts = plan.blokken.map((b) => b.start);
    expect([...starts].sort()).toEqual(starts);
  });

  it('woensdag plant judoles geven met vertrek + eten ervoor', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'thuis' });
    const t = titels(plan);
    expect(t.some((x) => /Judoles geven/.test(x))).toBe(true);
    expect(t.some((x) => /Vertrek naar judoclub/.test(x))).toBe(true);
    expect(t.some((x) => /Snel eten voor judo/.test(x))).toBe(true);
  });

  it('geenJudo (clubs dicht) schrapt training én les en meldt judovrij', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'thuis', geenJudo: true });
    const t = titels(plan);
    expect(t.some((x) => /Judotraining/.test(x))).toBe(false);
    expect(t.some((x) => /Judoles geven/.test(x))).toBe(false);
    expect(plan.advies.tekst.some((x) => /Judovrij/.test(x))).toBe(true);
  });

  it('slaapblok loopt tot het opstaan-uur (geen 1-minuut-blok)', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis' });
    const slaap = plan.blokken.find((b) => b.type === 'slaap');
    expect(slaap).toBeTruthy();
    expect(slaap.eind).toBe(I.algemeen.opstaan); // eindigt op het opstaan-uur
    expect(slaap.eind).not.toBe(slaap.start);     // niet 1 minuut
  });

  it('judoles geven vervalt tijdens vakantie', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'verlof', isVakantie: true });
    expect(titels(plan).some((x) => /Judoles geven/.test(x))).toBe(false);
  });

  it('geenJudo schrapt de gegenereerde judotraining maar laat agenda-items (BBQ judo) staan', () => {
    const agendaEvents = [{ titel: 'BBQ judo', datum: '2026-06-27', start: '16:00', eind: '21:00' }];
    const plan = genereerDagPlan({ datum: '2026-06-27', dagKort: 'za', instellingen: I, werkModus: 'vrij', geenJudo: true, agendaEvents });
    expect(titels(plan).some((x) => /Judotraining/.test(x))).toBe(false); // gegenereerd: weg
    expect(titels(plan).some((x) => /BBQ judo/.test(x))).toBe(true);       // agenda: blijft
  });

  it('kantoor-fiets voegt fietsblokken als sport toe', () => {
    const plan = genereerDagPlan({ datum: '2026-06-23', dagKort: 'di', instellingen: I, werkModus: 'kantoor_fiets' });
    const fiets = plan.blokken.filter((b) => /Fietsen/.test(b.titel));
    expect(fiets.length).toBe(2);
    expect(fiets.every((b) => b.type === 'sport')).toBe(true);
  });

  it('plant geen werk op een verlofdag (ziekte/vakantie)', () => {
    const plan = genereerDagPlan({ datum: '2026-06-25', dagKort: 'do', instellingen: I, werkModus: 'verlof', isVakantie: true });
    expect(plan.blokken.some((b) => /werk|thuiswerk/i.test(b.titel))).toBe(false);
  });

  it('gebruikt het vrije-dag-ritme (later opstaan) op een vrije dag', () => {
    const werk = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis' });
    const vrij = genereerDagPlan({ datum: '2026-06-27', dagKort: 'za', instellingen: I, werkModus: 'vrij' });
    expect(werk.blokken[0].start).toBe('06:45');     // werkdag
    expect(vrij.blokken[0].start).toBe('08:00');     // vrije dag, later
  });

  it('detecteert overlappende vaste blokken als conflict', () => {
    const agenda = [{ titel: 'RSCA match', start: '20:30', eind: '22:30' }];
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'thuis', agendaEvents: agenda });
    // eigen judotraining wo 20:00-21:30 overlapt met de match 20:30-22:30
    expect(plan.conflicten.length).toBeGreaterThan(0);
    expect(plan.blokken.some((b) => b.conflict)).toBe(true);
  });

  it('detecteert ook conflicten tussen een reva-blok en een vast agenda-item', () => {
    const blessures = [{
      id: 'b1', titel: 'Knie', regio: 'knie', actief: true, tijd: '20:15', aantalPerDag: 1,
      oefeningen: [{ id: 'o1', naam: 'Quad sets', actief: true }],
    }];
    const agenda = [{ titel: 'RSCA match', start: '20:00', eind: '22:00' }];
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures, agendaEvents: agenda });
    const revaBlok = plan.blokken.find((b) => b.bron === 'reva');
    expect(revaBlok.conflict).toBe(true);
  });

  it('taken zonder tijd komen in todos, met tijd worden blokken', () => {
    const taken = [
      { id: 'a', titel: 'Water drinken', actief: true, dagen: ['ma'] },
      { id: 'b', titel: 'Reva', actief: true, dagen: ['ma'], tijd: '07:10', blokType: 'reva' },
    ];
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', taken });
    expect(plan.todos.some((t) => t.titel === 'Water drinken')).toBe(true);
    expect(plan.blokken.some((b) => b.titel === 'Reva')).toBe(true);
  });
});

describe('genereerDagPlan — maaltijdplanning', () => {
  const recepten = [
    { id: 'havermout', naam: 'Havermout', type: 'ontbijt', aantalEters: 1, doelen: [],
      ingredienten: [{ naam: 'havermout', hoeveelheid: 60, eenheid: 'g' }, { naam: 'melk', hoeveelheid: 200, eenheid: 'ml' }] },
    { id: 'kip', naam: 'Kip met rijst', type: 'lunch', aantalEters: 2, doelen: [],
      ingredienten: [{ naam: 'kip', hoeveelheid: 300, eenheid: 'g' }] },
    { id: 'pasta', naam: 'Pasta bolognese', type: 'diner', aantalEters: 2, doelen: [],
      ingredienten: [{ naam: 'pasta', hoeveelheid: 200, eenheid: 'g' }] },
    { id: 'noten', naam: 'Noten', type: 'snack', aantalEters: 1, doelen: [],
      ingredienten: [{ naam: 'noten', hoeveelheid: 30, eenheid: 'g' }] },
  ];

  it('overschrijft het generieke ontbijtblok met een gekozen recept + geschaalde ingrediënten', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', maaltijden: recepten });
    const ontbijt = plan.blokken.find((b) => /Ontbijt/.test(b.titel));
    expect(ontbijt.titel).toBe('Ontbijt — Havermout');
    expect(ontbijt.bron).toBe('maaltijdplan');
    expect(ontbijt.detail).toBe('60g havermout, 200ml melk');
  });

  it('zonder passend recept blijft het blok generiek en niet-afvinkbaar (regressie)', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', maaltijden: [] });
    const ontbijt = plan.blokken.find((b) => b.type === 'ontbijt' || /Ontbijt/.test(b.titel));
    expect(ontbijt.titel).toBe('Ontbijt');
    expect(ontbijt.bron).toBe('maaltijd');
  });

  it('een expliciete override (maaltijdPlan) wint over de deterministische suggestie', () => {
    const plan = genereerDagPlan({
      datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', maaltijden: recepten,
      maaltijdPlan: { lunch: { recipeId: 'kip', aantalEters: 4 } },
    });
    const lunch = plan.blokken.find((b) => /Kip met rijst/.test(b.titel));
    expect(lunch).toBeTruthy();
    expect(lunch.detail).toBe('600g kip'); // 4 eters = dubbele basisportie (2)
  });

  it('plant 3 snackmomenten in die nooit overlappen met een vast blok', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'thuis', maaltijden: recepten });
    const snacks = plan.blokken.filter((b) => b.bron === 'maaltijdplan' && /Snack/.test(b.titel));
    expect(snacks.length).toBeGreaterThan(0);
    const vast = plan.blokken.filter((b) => b.vast || ['werk', 'judo', 'lesgeven', 'woonwerk', 'agenda'].includes(b.bron));
    snacks.forEach((s) => {
      vast.forEach((v) => {
        const overlap = toMin(s.start) < toMin(v.eind) && toMin(s.eind) > toMin(v.start);
        expect(overlap).toBe(false);
      });
    });
  });

  it('slaat snacks stil over als snacksAan uitstaat', () => {
    const Iuit = { ...I, voeding: { ...I.voeding, snacksAan: false } };
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: Iuit, werkModus: 'thuis', maaltijden: recepten });
    expect(plan.blokken.some((b) => /Snack/.test(b.titel))).toBe(false);
  });
});

describe('genereerDagPlan — sportcoach-integratie', () => {
  it('voegt een sportblok toe als de coach een niveau meegeeft', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', coachNiveau: 'matig' });
    const sportBlok = plan.blokken.find((b) => b.bron === 'sportcoach');
    expect(sportBlok).toBeTruthy();
    expect(sportBlok.type).toBe('sport');
    expect(sportBlok.titel).toBe('Home fitness');
    expect(sportBlok.detail).toBeTruthy();
  });

  it('voegt geen sportblok toe zonder coachNiveau (backwards-compatibel)', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis' });
    expect(plan.blokken.some((b) => b.bron === 'sportcoach')).toBe(false);
  });

  it('voegt geen los sportblok toe op een rustdag uit het weekschema', () => {
    const plan = genereerDagPlan({ datum: '2026-06-26', dagKort: 'vr', instellingen: I, werkModus: 'thuis', coachNiveau: 'hard' });
    expect(plan.blokken.some((b) => b.bron === 'sportcoach')).toBe(false);
  });

  it('judo wint nog steeds van het sportcoach-blok op een judodag', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'thuis', coachNiveau: 'hard' });
    expect(plan.blokken.some((b) => b.bron === 'sportcoach')).toBe(false);
    expect(plan.blokken.some((b) => /Judoles geven/.test(b.titel))).toBe(true);
  });

  it('geenJudo (vakantie) laat het sportcoach-blok wél door in plaats van judo', () => {
    const metWoSport = { ...I, sport: { ...I.sport, weekSchema: { ...I.sport.weekSchema, wo: 'homefitness' } } };
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: metWoSport, werkModus: 'thuis', geenJudo: true, coachNiveau: 'matig' });
    expect(plan.blokken.some((b) => b.bron === 'sportcoach')).toBe(true);
  });
});

describe('genereerDagPlan — blessures', () => {
  const blessures = [{
    id: 'b1', titel: 'Knie', regio: 'knie', actief: true, eindDatum: null, aantalPerDag: 2,
    oefeningen: [{ id: 'o1', naam: 'Quad sets', sets: '3×12', actief: true }, { id: 'o2', naam: 'Stepdowns', sets: '3×10', actief: true }],
  }];

  it('voegt een reva-blok toe per actieve blessure, met geselecteerde oefeningen', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures });
    const revaBlok = plan.blokken.find((b) => b.bron === 'reva');
    expect(revaBlok).toBeTruthy();
    expect(revaBlok.type).toBe('reva');
    expect(revaBlok.blessureId).toBe('b1');
    expect(revaBlok.oefeningen.length).toBe(2);
  });

  it('plant het reva-blok zelf rond het werk i.p.v. enkel een conflict te melden', () => {
    // Laat opstaan laat genoeg liggen zodat de oude vaste "opstaan + 60 min"
    // precies in de werkuren terechtkomt — dit reproduceert het gemelde
    // probleem (reva om 9u, werk begint om 8:25).
    const laatOp = { ...I, algemeen: { ...I.algemeen, opstaan: '08:00' } };
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: laatOp, werkModus: 'thuis', blessures });
    const revaBlok = plan.blokken.find((b) => b.bron === 'reva');
    const werkBlok = plan.blokken.find((b) => b.bron === 'werk');
    expect(revaBlok).toBeTruthy();
    expect(plan.conflicten.length).toBe(0);
    expect(revaBlok.conflict).toBeFalsy();
    // Geen overlap met het werkblok.
    const overlapt = revaBlokTijd => toMin(revaBlokTijd.start) < toMin(werkBlok.eind) && toMin(revaBlokTijd.eind) > toMin(werkBlok.start);
    expect(overlapt(revaBlok)).toBe(false);
  });

  it('plant het reva-blok vóór het werk als daar ruimte voor is na het ontbijt', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures });
    const revaBlok = plan.blokken.find((b) => b.bron === 'reva');
    const werkBlok = plan.blokken.find((b) => b.bron === 'werk');
    expect(toMin(revaBlok.eind)).toBeLessThanOrEqual(toMin(werkBlok.start));
  });

  it('respecteert een expliciet gekozen tijd en schuift die niet automatisch weg', () => {
    const metTijd = [{ ...blessures[0], tijd: '09:00' }];
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures: metTijd });
    const revaBlok = plan.blokken.find((b) => b.bron === 'reva');
    expect(revaBlok.start).toBe('09:00');
    expect(revaBlok.conflict).toBe(true); // valt midden in het werkblok — gemeld, niet verschoven
  });

  it('negeert verlopen blessures voor het reva-blok', () => {
    const verlopen = [{ ...blessures[0], eindDatum: '2026-06-01' }];
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures: verlopen });
    expect(plan.blokken.some((b) => b.bron === 'reva')).toBe(false);
  });

  it('knie-blessure verbant fietsen uit de sportcoach-keuze', () => {
    const metDiFiets = { ...I, sport: { ...I.sport, weekSchema: { ...I.sport.weekSchema, di: 'fietsen' } } };
    const plan = genereerDagPlan({ datum: '2026-06-23', dagKort: 'di', instellingen: metDiFiets, werkModus: 'thuis', coachNiveau: 'hard', blessures });
    const sportBlok = plan.blokken.find((b) => b.bron === 'sportcoach');
    expect(sportBlok).toBeTruthy();
    expect(sportBlok.titel).not.toBe('Fietsen');
    expect(plan.advies.tekst.some((t) => /afgeraden door een actieve blessure/.test(t))).toBe(true);
  });

  it('meldt een judo-veto als blessure judo afraadt, maar schrapt het judoblok niet', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'thuis', blessures });
    expect(plan.blokken.some((b) => /Judoles geven/.test(b.titel))).toBe(true);
    expect(plan.advies.tekst.some((t) => /Judo staat gepland.*blessure/.test(t))).toBe(true);
  });

  it('meldt een verlopen-niet-gemelde blessure in het advies', () => {
    const verlopenNietGemeld = [{ ...blessures[0], eindDatum: '2026-06-01', eindeGemeld: false }];
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures: verlopenNietGemeld });
    expect(plan.advies.tekst.some((t) => /liep af op/.test(t))).toBe(true);
  });

  it('signaleert structureel gemiste reva (adaptieve feedback-loop) zonder te straffen', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures, revaTrouw: 30 });
    expect(plan.advies.tekst.some((t) => /30%/.test(t))).toBe(true);
  });

  it('zegt niets over reva-trouw als die hoog genoeg is', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures, revaTrouw: 80 });
    expect(plan.advies.tekst.some((t) => /reva-oefeningen lukten/.test(t))).toBe(false);
  });
});

describe('berekenFietsAdvies', () => {
  it('raadt fietsen af bij actieve blessure', () => {
    const a = berekenFietsAdvies({ sport: I.sport, blessureActief: true });
    expect(a.fiets).toBe(false);
  });
  it('raadt fietsen af als de blessure-regio fietsen vermijdt (zonder globale vlag)', () => {
    const a = berekenFietsAdvies({ sport: I.sport, vermijdSporten: ['fietsen'] });
    expect(a.fiets).toBe(false);
  });
  it('raadt fietsen af bij lage readiness', () => {
    const a = berekenFietsAdvies({ sport: I.sport, garmin: { trainingReadiness: { score: 20 } } });
    expect(a.fiets).toBe(false);
  });
  it('raadt fietsen af bij veel regen', () => {
    const a = berekenFietsAdvies({ sport: I.sport, weer: { neerslagKans: 80 } });
    expect(a.fiets).toBe(false);
  });
  it('staat fietsen toe bij goede omstandigheden', () => {
    const a = berekenFietsAdvies({ sport: I.sport, garmin: { trainingReadiness: { score: 70 } }, weer: { neerslagKans: 10, windKmh: 12 } });
    expect(a.fiets).toBe(true);
  });
});
