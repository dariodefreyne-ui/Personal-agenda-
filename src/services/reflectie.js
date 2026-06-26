// Mindset & reflectie: schalen voor stemming/energie/tevredenheid + trend-helpers.
// Pure functies, makkelijk testbaar. Check-ins leven in dagen/{datum}.checkin:
//   { ochtend: { stemming, energie, op }, avond: { tevreden, dankbaar, reflectie, op } }

export const STEMMINGEN = [
  { v: 1, emoji: '😣', label: 'Slecht' },
  { v: 2, emoji: '😕', label: 'Matig' },
  { v: 3, emoji: '😐', label: 'Oké' },
  { v: 4, emoji: '🙂', label: 'Goed' },
  { v: 5, emoji: '😄', label: 'Top' },
];

export const ENERGIE = [
  { v: 1, label: 'Uitgeput' },
  { v: 2, label: 'Laag' },
  { v: 3, label: 'Normaal' },
  { v: 4, label: 'Energiek' },
  { v: 5, label: 'Topfit' },
];

export const stemmingInfo = (v) => STEMMINGEN.find((s) => s.v === v) || null;
export const energieInfo = (v) => ENERGIE.find((e) => e.v === v) || null;

// Gemiddelde over numerieke waarden (null/undefined genegeerd), op 1 decimaal.
export function gemiddelde(waarden) {
  const xs = (waarden || []).filter((v) => typeof v === 'number');
  if (!xs.length) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
}

// Reeks dagdocs -> reeks check-in-waarden per dag (voor sparklines/trends).
export function reflectieReeks(dagen) {
  return (dagen || []).map((d) => ({
    datum: d.datum,
    label: d.label || '',
    stemming: d.checkin?.ochtend?.stemming ?? null,
    energie: d.checkin?.ochtend?.energie ?? null,
    tevreden: d.checkin?.avond?.tevreden ?? null,
  }));
}

// Korte samenvatting van een reeks: gemiddelden + of er genoeg data is.
export function reflectieSamenvatting(dagen) {
  const r = reflectieReeks(dagen);
  return {
    stemming: gemiddelde(r.map((x) => x.stemming)),
    energie: gemiddelde(r.map((x) => x.energie)),
    tevreden: gemiddelde(r.map((x) => x.tevreden)),
    aantal: r.filter((x) => x.stemming != null || x.energie != null || x.tevreden != null).length,
    stemmingReeks: r.map((x) => x.stemming),
    energieReeks: r.map((x) => x.energie),
  };
}

// Zelf-gerapporteerde energie (1-5) -> bijsturing van de coach-score.
// Lage energie remt af, hoge energie geeft wat ruimte. 3 = neutraal.
export function energieNudge(energie) {
  if (typeof energie !== 'number') return 0;
  return { 1: -16, 2: -8, 3: 0, 4: 6, 5: 10 }[energie] ?? 0;
}
