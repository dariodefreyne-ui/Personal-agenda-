import { describe, it, expect } from 'vitest';
import { coachAdvies, DOELEN } from '../src/services/coach.js';

describe('coachAdvies', () => {
  it('kiest herstel bij actieve blessure, ongeacht readiness', () => {
    const a = coachAdvies({ readiness: 90, bodyBattery: 90, goal: 'kracht', blessureActief: true });
    expect(a.niveau).toBe('herstel');
    expect(/Reva|stretch|rust/i.test(a.sport)).toBe(true);
  });

  it('adviseert een harde sessie bij hoge readiness + body battery', () => {
    const a = coachAdvies({ readiness: 80, bodyBattery: 80, slaapUren: 8, goal: 'uithouding' });
    expect(a.niveau).toBe('hard');
    expect(a.duurMin).toBeGreaterThanOrEqual(50);
  });

  it('schaalt terug bij lage readiness', () => {
    const a = coachAdvies({ readiness: 20, bodyBattery: 25, goal: 'afvallen' });
    expect(['rustig', 'herstel']).toContain(a.niveau);
  });

  it('weinig slaap drukt het niveau', () => {
    const veel = coachAdvies({ readiness: 64, bodyBattery: 64, slaapUren: 8 });
    const weinig = coachAdvies({ readiness: 64, bodyBattery: 64, slaapUren: 4 });
    const rang = { herstel: 0, rustig: 1, matig: 2, hard: 3 };
    expect(rang[weinig.niveau]).toBeLessThanOrEqual(rang[veel.niveau]);
  });

  it('valt terug op algemeen doel bij onbekend doel', () => {
    const a = coachAdvies({ readiness: 55, goal: 'onbekend' });
    expect(a.doelLabel).toBe(DOELEN.algemeen);
  });

  it('werkt zonder enige data (veilige defaults)', () => {
    const a = coachAdvies();
    expect(a.sport).toBeTruthy();
    expect(a.titel).toBeTruthy();
  });
});
