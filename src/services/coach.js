// Coach-laag: vertaalt Garmin-signalen (readiness, body battery, slaap) + je doel
// naar een concreet sportadvies voor vandaag. Pure functie, makkelijk testbaar.

export const DOELEN = {
  afvallen: 'Afvallen',
  kracht: 'Kracht opbouwen',
  uithouding: 'Uithouding',
  herstel: 'Herstel & blessurevrij',
  algemeen: 'Algemeen fit',
};

// Niveaus oplopend in belasting.
const NIVEAU_KLEUR = {
  herstel: 'var(--text-dim)',
  rustig: 'var(--primary-2)',
  matig: 'var(--warning)',
  hard: 'var(--success)',
};

// Advies per doel × niveau: { sport, duurMin }.
const MATRIX = {
  afvallen: {
    hard: { sport: 'Langere cardio (fietsen/lopen) in zone 2', duurMin: 60 },
    matig: { sport: 'Stevige wandeling of rustige fietsrit', duurMin: 45 },
    rustig: { sport: 'Lichte wandeling', duurMin: 30 },
    herstel: { sport: 'Wandelen + mobiliteit', duurMin: 25 },
  },
  kracht: {
    hard: { sport: 'Krachttraining of judo (zwaar)', duurMin: 60 },
    matig: { sport: 'Krachttraining (matig) of techniektraining', duurMin: 45 },
    rustig: { sport: 'Core + mobiliteit', duurMin: 25 },
    herstel: { sport: 'Reva-oefeningen + stretchen', duurMin: 20 },
  },
  uithouding: {
    hard: { sport: 'Intervaltraining of langere duurloop', duurMin: 55 },
    matig: { sport: 'Duurloop/fietsrit in zone 2', duurMin: 45 },
    rustig: { sport: 'Rustige cardio', duurMin: 30 },
    herstel: { sport: 'Herstelwandeling', duurMin: 25 },
  },
  herstel: {
    hard: { sport: 'Lichte techniektraining of mobiliteit', duurMin: 30 },
    matig: { sport: 'Mobiliteit + lichte cardio', duurMin: 25 },
    rustig: { sport: 'Reva-oefeningen + wandelen', duurMin: 20 },
    herstel: { sport: 'Volledige rust of zachte stretching', duurMin: 15 },
  },
  algemeen: {
    hard: { sport: 'Sport naar keuze (judo, fietsen, kracht)', duurMin: 50 },
    matig: { sport: 'Matige training of fietsrit', duurMin: 40 },
    rustig: { sport: 'Lichte beweging of wandeling', duurMin: 30 },
    herstel: { sport: 'Rust + mobiliteit', duurMin: 20 },
  },
};

function bepaalNiveau({ readiness, bodyBattery, slaapUren, energie, blessureActief, overbelast }) {
  if (blessureActief || overbelast) return 'herstel';
  const r = readiness ?? 55;
  const bb = bodyBattery ?? 60;
  let score = r * 0.6 + bb * 0.4;
  if (typeof slaapUren === 'number') {
    if (slaapUren < 6) score -= 12;
    else if (slaapUren >= 8) score += 6;
  }
  if (typeof energie === 'number') {
    score += { 1: -16, 2: -8, 3: 0, 4: 6, 5: 10 }[energie] ?? 0;
  }
  if (score >= 65) return 'hard';
  if (score >= 45) return 'matig';
  if (score >= 30) return 'rustig';
  return 'herstel';
}

export function coachAdvies({
  readiness = null, bodyBattery = null, slaapUren = null, energie = null,
  goal = 'algemeen', blessureActief = false, overbelast = false,
} = {}) {
  const doel = MATRIX[goal] ? goal : 'algemeen';
  const niveau = bepaalNiveau({ readiness, bodyBattery, slaapUren, energie, blessureActief, overbelast });
  const advies = MATRIX[doel][niveau];

  const redenen = [];
  if (overbelast) redenen.push('Garmin: overbelast — herstel afgedwongen');
  if (blessureActief) redenen.push('blessure actief — herstel staat voorop');
  if (readiness != null) redenen.push(`readiness ${Math.round(readiness)}/100`);
  if (bodyBattery != null) redenen.push(`body battery ${Math.round(bodyBattery)}`);
  if (typeof slaapUren === 'number') redenen.push(`${slaapUren.toFixed(1)}u slaap`);
  if (typeof energie === 'number') redenen.push(`energie ${energie}/5 (zelf)`);

  const titel = {
    hard: 'Goeie dag om er vol voor te gaan',
    matig: 'Train met mate vandaag',
    rustig: 'Hou het rustig vandaag',
    herstel: 'Kies vandaag voor herstel',
  }[niveau];

  return {
    niveau, titel,
    sport: advies.sport,
    duurMin: advies.duurMin,
    doelLabel: DOELEN[doel],
    reden: redenen.join(' · '),
    kleur: NIVEAU_KLEUR[niveau],
  };
}
