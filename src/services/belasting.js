// Belasting/herstel-bewaker: vertaalt Garmin-trainingsstatus (en als back-up de
// readiness-trend) naar mensentaal. Voorkomt overbelasting op weg naar elite.

const STATUS = {
  overbelast: { titel: 'Overbelast', kleur: 'var(--danger)', tekst: 'Je belasting is te hoog. Las 1-2 herstel- of rustdagen in.' },
  herstel:    { titel: 'Herstellend', kleur: 'var(--warning)', tekst: 'Je lichaam herstelt. Hou het licht (wandelen, mobiliteit, reva).' },
  inefficient:{ titel: 'Inefficiënt', kleur: 'var(--warning)', tekst: 'Veel inspanning, weinig winst. Check slaap, voeding en herstel.' },
  opbouwen:   { titel: 'Opbouwend', kleur: 'var(--success)', tekst: 'Mooie progressie — je mag rustig blijven opbouwen.' },
  balans:     { titel: 'In balans', kleur: 'var(--primary)', tekst: 'Je onderhoudt je niveau. Durf iets meer te pushen voor groei.' },
  teweinig:   { titel: 'Te weinig prikkel', kleur: 'var(--primary-2)', tekst: 'Je traint te weinig om te groeien. Voeg een sessie toe.' },
  onbekend:   { titel: 'Nog geen oordeel', kleur: 'var(--text-dim)', tekst: 'Te weinig data. Draag je horloge en sync dagelijks.' },
};

function avg(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }

// ── Periodisering: acute:chronic workload-ratio (ACWR) ────────────────────────
// sRPE-belasting per sessie = duur (min) × RPE (zwaarte 1-10). Zonder RPE nemen we
// een neutrale 5 (matig). Pure functies, makkelijk testbaar.

// Garmin-activiteiten + RPE-map -> [{ datum:'YYYY-MM-DD', load }].
export function sessieBelasting(activiteiten = [], rpeMap = {}) {
  return (activiteiten || []).map((a) => {
    const datum = (a.startTimeLocal || a.startTimeGMT || a.datum || '').slice(0, 10);
    const duurMin = a.duration ? a.duration / 60 : (a.duurMin || 0);
    const rpe = rpeMap[a.id] ?? rpeMap[a.activityId] ?? 5;
    return { datum, load: Math.round(duurMin * rpe) };
  }).filter((s) => s.datum && s.load > 0);
}

const ACWR_ZONES = {
  laag:     { kleur: 'var(--primary-2)', titel: 'Lage belasting', tekst: 'Je trainingsprikkel daalt — ruimte om (voorzichtig) op te bouwen.' },
  optimaal: { kleur: 'var(--success)',   titel: 'Optimale opbouw', tekst: 'Je belasting stijgt in een veilig tempo (sweet spot).' },
  verhoogd: { kleur: 'var(--warning)',   titel: 'Verhoogd risico',  tekst: 'Je bouwt snel op. Hou het deze week in toom.' },
  risico:   { kleur: 'var(--danger)',    titel: 'Blessurerisico',   tekst: 'Te snelle stijging in belasting. Las herstel in vóór je doorgaat.' },
  onbekend: { kleur: 'var(--text-dim)',  titel: 'Nog geen oordeel', tekst: 'Te weinig trainingsdata voor een betrouwbare belastingsratio.' },
};

const dagStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// ACWR = acute (7d) belasting / gemiddelde wekelijkse chronische (28d) belasting.
// Geeft ratio + zone + zekerheid + uitleg (premium-principe: uitlegbaar + veilige
// terugval bij te weinig data).
export function acwrBerekenen(sessies = [], refDatum = new Date()) {
  const ref = dagStart(refDatum).getTime();
  const dag = 86400000;
  const dagenGeleden = (s) => Math.floor((ref - dagStart(new Date(`${s.datum}T12:00:00`)).getTime()) / dag);
  const recent = (sessies || []).filter((s) => { const g = dagenGeleden(s); return g >= 0 && g < 28; });
  const som = (arr) => arr.reduce((a, s) => a + (s.load || 0), 0);

  const acuut = som(recent.filter((s) => dagenGeleden(s) < 7));
  const chronischWeek = som(recent) / 4;

  // Zekerheid: hoeveel weken historiek + aantal sessies dragen dit?
  const weken = recent.length ? Math.min(4, Math.ceil((Math.max(...recent.map(dagenGeleden)) + 1) / 7)) : 0;
  let zekerheid = 'laag';
  if (recent.length >= 4 && weken >= 3) zekerheid = 'hoog';
  else if (recent.length >= 2 && weken >= 2) zekerheid = 'gemiddeld';

  if (chronischWeek <= 0 || recent.length < 2) {
    return {
      ratio: null, zone: 'onbekend', zekerheid: 'laag',
      acuut, chronischWeek: Math.round(chronischWeek),
      waarom: 'Nog te weinig getrainde sessies (min. ~2 weken historiek) voor een betrouwbare ratio.',
      meetlat: 'ACWR = belasting deze week ÷ gemiddelde van de laatste 4 weken. Veilig: 0,8–1,3.',
      ...ACWR_ZONES.onbekend,
    };
  }

  const ratio = Math.round((acuut / chronischWeek) * 100) / 100;
  const zone = ratio < 0.8 ? 'laag' : ratio <= 1.3 ? 'optimaal' : ratio <= 1.5 ? 'verhoogd' : 'risico';
  return {
    ratio, zone, zekerheid,
    acuut: Math.round(acuut), chronischWeek: Math.round(chronischWeek),
    waarom: `Deze week ${Math.round(acuut)} belastingspunten t.o.v. een weekgemiddelde van ${Math.round(chronischWeek)} (ratio ${ratio.toFixed(2)}).`,
    meetlat: 'ACWR = belasting deze week ÷ gemiddelde van de laatste 4 weken. Veilig: 0,8–1,3.',
    ...ACWR_ZONES[zone],
  };
}

export function belastingStatus({ trainingStatus = null, readinessReeks = [] } = {}) {
  const ts = String(trainingStatus || '').toUpperCase();
  let key = null;

  if (/STRAINED|OVERREACH|OVERLOAD/.test(ts)) key = 'overbelast';
  else if (/RECOVERY/.test(ts)) key = 'herstel';
  else if (/UNPRODUCTIVE/.test(ts)) key = 'inefficient';
  else if (/PRODUCTIVE|PEAK/.test(ts)) key = 'opbouwen';
  else if (/MAINTAIN/.test(ts)) key = 'balans';
  else if (/DETRAIN/.test(ts)) key = 'teweinig';

  // Trend van de readiness (laatste helft vs eerste helft) als signaal/back-up.
  const vals = readinessReeks.filter((v) => typeof v === 'number');
  let trend = null;
  if (vals.length >= 4) {
    const h = Math.floor(vals.length / 2);
    trend = Math.round(avg(vals.slice(h)) - avg(vals.slice(0, h)));
  }

  if (!key) {
    if (trend == null) key = 'onbekend';
    else if (trend <= -8) key = 'herstel';
    else if (trend >= 6) key = 'opbouwen';
    else key = 'balans';
  }

  return { key, trend, ...STATUS[key] };
}
