import { describe, it, expect } from 'vitest';
import { belastingStatus, sessieBelasting, acwrBerekenen } from '../src/services/belasting.js';

const REF = new Date('2026-06-27T12:00:00');
const dagGeleden = (n) => { const d = new Date(REF); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

describe('belastingStatus', () => {
  it('herkent overbelasting uit Garmin-trainingsstatus', () => {
    expect(belastingStatus({ trainingStatus: 'STRAINED' }).key).toBe('overbelast');
    expect(belastingStatus({ trainingStatus: 'OVERREACHING_1' }).key).toBe('overbelast');
  });

  it('herkent productieve opbouw', () => {
    expect(belastingStatus({ trainingStatus: 'PRODUCTIVE_2' }).key).toBe('opbouwen');
  });

  it('herkent herstel en onderhoud', () => {
    expect(belastingStatus({ trainingStatus: 'RECOVERY_LESS_THAN_24' }).key).toBe('herstel');
    expect(belastingStatus({ trainingStatus: 'MAINTAINING_2' }).key).toBe('balans');
  });

  it('valt terug op readiness-trend zonder Garmin-status', () => {
    const dalend = belastingStatus({ readinessReeks: [70, 68, 60, 50, 45, 40] });
    expect(dalend.key).toBe('herstel');
    const stijgend = belastingStatus({ readinessReeks: [40, 45, 50, 60, 66, 70] });
    expect(stijgend.key).toBe('opbouwen');
  });

  it('geeft onbekend zonder enige data', () => {
    expect(belastingStatus({}).key).toBe('onbekend');
  });
});

describe('sessieBelasting (sRPE)', () => {
  it('load = duur(min) × RPE, datum uit startTimeLocal', () => {
    expect(sessieBelasting([{ id: 'x', startTimeLocal: '2026-06-20T18:00:00', duration: 3600 }], { x: 6 }))
      .toEqual([{ datum: '2026-06-20', load: 360 }]);
  });
  it('zonder RPE een neutrale 5; negeert lege sessies', () => {
    expect(sessieBelasting([
      { id: 'a', datum: '2026-06-20', duurMin: 60 },
      { id: 'b', datum: '', duurMin: 30 },
    ], {})).toEqual([{ datum: '2026-06-20', load: 300 }]);
  });
});

describe('acwrBerekenen (opbouw-ratio)', () => {
  it('valt veilig terug bij te weinig data (ratio null, zone onbekend)', () => {
    const r = acwrBerekenen([{ datum: dagGeleden(2), load: 100 }], REF);
    expect(r.ratio).toBe(null);
    expect(r.zone).toBe('onbekend');
  });
  it('gelijkmatige opbouw -> ratio ~1.0 (optimaal), hoge zekerheid', () => {
    const r = acwrBerekenen([3, 10, 17, 24].map((n) => ({ datum: dagGeleden(n), load: 100 })), REF);
    expect(r.ratio).toBeCloseTo(1.0, 1);
    expect(r.zone).toBe('optimaal');
    expect(r.zekerheid).toBe('hoog');
  });
  it('piek deze week -> hoge ratio (risico) met uitleg', () => {
    const r = acwrBerekenen([
      ...[3, 10, 17, 24].map((n) => ({ datum: dagGeleden(n), load: 100 })),
      { datum: dagGeleden(1), load: 200 },
    ], REF);
    expect(r.ratio).toBeGreaterThan(1.5);
    expect(r.zone).toBe('risico');
    expect(r.waarom).toMatch(/belastingspunten/);
  });
});
