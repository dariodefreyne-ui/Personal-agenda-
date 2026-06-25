import { describe, it, expect } from 'vitest';
import { toMin, toHHMM, addMin, duurMin, datumKey, weekKey, dagKortVanDatum } from '../src/services/tijd.js';

describe('tijd-helpers', () => {
  it('toMin / toHHMM zijn elkaars inverse', () => {
    expect(toMin('08:25')).toBe(505);
    expect(toHHMM(505)).toBe('08:25');
    expect(toMin('00:00')).toBe(0);
    expect(toHHMM(0)).toBe('00:00');
  });
  it('addMin telt op en wrapt rond middernacht', () => {
    expect(addMin('23:45', 30)).toBe('00:15');
    expect(addMin('08:00', 90)).toBe('09:30');
  });
  it('duurMin berekent het verschil', () => {
    expect(duurMin('13:00', '13:30')).toBe(30);
  });
  it('datumKey formatteert YYYY-MM-DD', () => {
    expect(datumKey(new Date(2026, 5, 25))).toBe('2026-06-25');
  });
  it('dagKortVanDatum geeft NL-dagcode', () => {
    expect(dagKortVanDatum(new Date(2026, 5, 25))).toBe('do'); // donderdag
  });
  it('weekKey geeft ISO-weekformaat', () => {
    expect(weekKey(new Date(2026, 5, 25))).toMatch(/^2026-W\d{2}$/);
  });
});
