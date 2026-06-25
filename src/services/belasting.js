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
