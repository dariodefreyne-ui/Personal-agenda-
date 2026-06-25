import { describe, it, expect } from 'vitest';
import { genereerDagPlan, berekenFietsAdvies } from '../src/services/planner.js';
import { DEFAULT_INSTELLINGEN } from '../src/config/appConfig.js';

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

  it('judoles geven vervalt tijdens vakantie', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'verlof', isVakantie: true });
    expect(titels(plan).some((x) => /Judoles geven/.test(x))).toBe(false);
  });

  it('kantoor-fiets voegt fietsblokken als sport toe', () => {
    const plan = genereerDagPlan({ datum: '2026-06-23', dagKort: 'di', instellingen: I, werkModus: 'kantoor_fiets' });
    const fiets = plan.blokken.filter((b) => /Fietsen/.test(b.titel));
    expect(fiets.length).toBe(2);
    expect(fiets.every((b) => b.type === 'sport')).toBe(true);
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

describe('berekenFietsAdvies', () => {
  it('raadt fietsen af bij actieve blessure', () => {
    const a = berekenFietsAdvies({ sport: I.sport, blessureActief: true });
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
