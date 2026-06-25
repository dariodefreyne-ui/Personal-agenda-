import { describe, it, expect } from 'vitest';
import { belastingStatus } from '../src/services/belasting.js';

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
