import { describe, it, expect } from 'vitest';
import { dagTherapietrouw, noordster, dagRevaTherapietrouw, revaTherapietrouw } from '../src/services/noordster.js';

const dag = (blokken, gedaan = {}, checkin = null) => ({ plan: blokken, gedaan, checkin });

describe('noordster — therapietrouw per dag', () => {
  it('telt enkel checkbare blokken (checkbaar-vlag)', () => {
    const d = dag([
      { id: 'a', checkbaar: true }, { id: 'b', checkbaar: true },
      { id: 'm', checkbaar: false }, // maaltijd/slaap tellen niet mee
    ], { a: true });
    const t = dagTherapietrouw(d);
    expect(t).toEqual({ ratio: 0.5, gedaan: 1, totaal: 2 });
  });

  it('valt terug op kerntypes voor oude docs zonder checkbaar-vlag', () => {
    const d = dag([{ id: 'j', type: 'judo' }, { id: 's', type: 'slaap' }], { j: true });
    expect(dagTherapietrouw(d)).toEqual({ ratio: 1, gedaan: 1, totaal: 1 });
  });

  it('geeft null als er niets te doen viel', () => {
    expect(dagTherapietrouw(dag([{ id: 'm', checkbaar: false }]))).toBe(null);
    expect(dagTherapietrouw(dag([]))).toBe(null);
    expect(dagTherapietrouw(null)).toBe(null);
  });
});

describe('noordster — samengestelde score', () => {
  it('middelt de dag-ratios naar een score 0-100', () => {
    const dagen = [
      dag([{ id: 'a', checkbaar: true }, { id: 'b', checkbaar: true }], { a: true, b: true }), // 100%
      dag([{ id: 'a', checkbaar: true }, { id: 'b', checkbaar: true }], { a: true }),            // 50%
    ];
    const ns = noordster(dagen);
    expect(ns.score).toBe(75);
    expect(ns.dagenMetPlan).toBe(2);
    expect(ns.label).toBe('Op koers');
    expect(ns.waarom).toContain('afgevinkte sleutelblokken');
  });

  it('valt veilig terug bij geen data (score null, geen misleidend getal)', () => {
    const ns = noordster([dag([]), null]);
    expect(ns.score).toBe(null);
    expect(ns.dagenMetPlan).toBe(0);
    expect(ns.label).toMatch(/te weinig data/i);
  });

  it('telt check-in-dagen mee in de uitleg', () => {
    const ns = noordster([
      dag([{ id: 'a', checkbaar: true }], { a: true }, { ochtend: { stemming: 4 } }),
    ]);
    expect(ns.score).toBe(100);
    expect(ns.checkinDagen).toBe(1);
  });
});

describe('noordster — reva-blok met oefeningen-checklist', () => {
  it('telt pas als gedaan als alle oefeningen zijn afgevinkt', () => {
    const d = dag([{ id: 'reva-1', type: 'reva', checkbaar: true, oefeningen: ['o1', 'o2'] }], {
      'reva-1::o1': true, // maar o2 niet
    });
    expect(dagTherapietrouw(d)).toEqual({ ratio: 0, gedaan: 0, totaal: 1 });
  });

  it('telt als gedaan zodra alle oefeningen zijn afgevinkt', () => {
    const d = dag([{ id: 'reva-1', type: 'reva', checkbaar: true, oefeningen: ['o1', 'o2'] }], {
      'reva-1::o1': true, 'reva-1::o2': true,
    });
    expect(dagTherapietrouw(d)).toEqual({ ratio: 1, gedaan: 1, totaal: 1 });
  });

  it('dagRevaTherapietrouw negeert niet-reva-blokken en geeft null zonder reva', () => {
    expect(dagRevaTherapietrouw(dag([{ id: 'j', type: 'judo' }], { j: true }))).toBe(null);
  });

  it('revaTherapietrouw valt veilig terug zonder reva-data', () => {
    const r = revaTherapietrouw([dag([{ id: 'j', type: 'judo' }])]);
    expect(r.score).toBe(null);
    expect(r.dagenMetReva).toBe(0);
  });

  it('revaTherapietrouw berekent een score over meerdere dagen', () => {
    const dagen = [
      dag([{ id: 'reva-1', type: 'reva', oefeningen: ['o1'] }], { 'reva-1::o1': true }), // 100%
      dag([{ id: 'reva-1', type: 'reva', oefeningen: ['o1'] }], {}), // 0%
    ];
    const r = revaTherapietrouw(dagen);
    expect(r.score).toBe(50);
    expect(r.dagenMetReva).toBe(2);
  });
});
