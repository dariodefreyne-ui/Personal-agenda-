import { describe, it, expect } from 'vitest';
import { syncStatus } from '../src/services/garmin.js';

const vandaag = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('syncStatus', () => {
  it('valt veilig terug op "nog niet gesynct" zonder data', () => {
    expect(syncStatus(null)).toEqual({ tekst: 'Nog niet gesynct', stale: true, leeg: true });
  });

  it('toont het exacte tijdstip uit syncedAt naast de relatieve dag', () => {
    const syncedAt = new Date(`${vandaag()}T07:14:00`);
    const s = syncStatus({ datum: vandaag(), syncedAt });
    expect(s.tekst).toBe('Laatst gesynct: vandaag om 07:14');
    expect(s.stale).toBe(false);
    expect(s.leeg).toBe(false);
  });

  it('valt terug op enkel de relatieve dag zonder syncedAt-tijdstip', () => {
    const s = syncStatus({ datum: vandaag() });
    expect(s.tekst).toBe('Laatst gesynct: vandaag');
  });

  it('markeert als stale vanaf 2+ dagen geleden', () => {
    const eerder = new Date(Date.now() - 3 * 864e5);
    const datum = `${eerder.getFullYear()}-${String(eerder.getMonth() + 1).padStart(2, '0')}-${String(eerder.getDate()).padStart(2, '0')}`;
    const s = syncStatus({ datum });
    expect(s.stale).toBe(true);
    expect(s.tekst).toMatch(/^Laatst gesynct: \d dagen geleden$/);
  });
});
