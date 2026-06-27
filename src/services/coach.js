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

// HRV-status -> bijstelling van de score. Onbekende/afwezige status telt niet mee.
function hrvBijstelling(hrvStatus) {
  const s = String(hrvStatus || '').toUpperCase();
  if (/UNBALANCED|LOW|POOR/.test(s)) return -10;
  if (/BALANCED/.test(s)) return 4;
  return 0;
}

function bepaalNiveau({ readiness, bodyBattery, slaapUren, energie, hrvStatus, blessureActief, overbelast }) {
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
  score += hrvBijstelling(hrvStatus);
  if (score >= 65) return 'hard';
  if (score >= 45) return 'matig';
  if (score >= 30) return 'rustig';
  return 'herstel';
}

// Hoeveel echte meetsignalen zitten er achter het advies? Bepaalt de zekerheid.
// Weinig data -> lage zekerheid -> we adviseren bewust voorzichtiger (zie cap).
function bepaalZekerheid({ readiness, bodyBattery, slaapUren, energie, hrvStatus, blessureActief, overbelast }) {
  // Blessure/overbelasting is een duidelijk, hard veiligheidssignaal.
  if (blessureActief || overbelast) return 'hoog';
  let n = 0;
  if (readiness != null) n += 1;
  if (bodyBattery != null) n += 1;
  if (typeof slaapUren === 'number') n += 1;
  if (typeof energie === 'number') n += 1;
  if (hrvStatus) n += 1;
  // ≥2 elkaar bevestigende signalen = hoog; één los getal kan ruis zijn.
  if (n >= 2) return 'hoog';
  if (n === 1) return 'gemiddeld';
  return 'laag';
}

const NIVEAU_RANG = ['herstel', 'rustig', 'matig', 'hard'];

export function coachAdvies({
  readiness = null, bodyBattery = null, slaapUren = null, energie = null, hrvStatus = null,
  goal = 'algemeen', blessureActief = false, overbelast = false, acwrZone = null,
} = {}) {
  const doel = MATRIX[goal] ? goal : 'algemeen';
  let niveau = bepaalNiveau({ readiness, bodyBattery, slaapUren, energie, hrvStatus, blessureActief, overbelast });
  const zekerheid = bepaalZekerheid({ readiness, bodyBattery, slaapUren, energie, hrvStatus, blessureActief, overbelast });

  // Beoordeeld op je slechtste advies: 'hard' enkel bij hoge zekerheid (≥2 signalen).
  let voorzichtig = false;
  if (zekerheid !== 'hoog' && niveau === 'hard') { niveau = 'matig'; voorzichtig = true; }

  // Periodisering (ACWR): te snelle opbouw remt het advies af (blessurepreventie).
  let acwrRem = null;
  if (acwrZone === 'risico' && NIVEAU_RANG.indexOf(niveau) > NIVEAU_RANG.indexOf('rustig')) {
    niveau = 'rustig'; acwrRem = 'risico';
  } else if (acwrZone === 'verhoogd' && niveau === 'hard') {
    niveau = 'matig'; acwrRem = 'verhoogd';
  }
  const advies = MATRIX[doel][niveau];

  // "Waarom": de signalen die het advies dragen (mensbaar geformuleerd).
  const waarom = [];
  if (overbelast) waarom.push('Garmin meldt overbelasting — herstel gaat voor.');
  if (blessureActief) waarom.push('Blessure actief — we beschermen je herstel.');
  if (readiness != null) waarom.push(`Readiness ${Math.round(readiness)}/100.`);
  if (bodyBattery != null) waarom.push(`Body battery ${Math.round(bodyBattery)}.`);
  if (typeof slaapUren === 'number') waarom.push(`${slaapUren.toFixed(1)}u slaap.`);
  if (typeof energie === 'number') waarom.push(`Je gaf energie ${energie}/5 op.`);
  if (hrvStatus) waarom.push(`HRV-status: ${hrvStatus}.`);
  if (acwrRem === 'risico') waarom.push('Je trainingsbelasting steeg te snel (blessurerisico) — we temperen.');
  if (acwrRem === 'verhoogd') waarom.push('Je belasting loopt op — vandaag geen volle gas.');
  if (voorzichtig) waarom.push('Weinig meetdata vandaag → we houden het bewust voorzichtig.');
  if (!waarom.length) waarom.push('Nog geen meetdata vandaag — dit is een veilig algemeen advies.');

  // Welke databronnen zijn effectief gebruikt.
  const databronnen = [];
  if (readiness != null) databronnen.push('Garmin readiness');
  if (bodyBattery != null) databronnen.push('Body battery');
  if (typeof slaapUren === 'number') databronnen.push('Slaap');
  if (typeof energie === 'number') databronnen.push('Zelf-gerapporteerde energie');
  if (hrvStatus) databronnen.push('HRV-status');
  if (!databronnen.length) databronnen.push('Geen meetdata');

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
    waarom,
    databronnen,
    zekerheid,
    meetlat: 'Geslaagd = je voltooit deze sessie en voelt je morgen niet slechter.',
    reden: waarom.join(' '), // korte samenvatting (backwards-compat)
    kleur: NIVEAU_KLEUR[niveau],
  };
}
