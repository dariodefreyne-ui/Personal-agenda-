// Kleine tijd-helpers. Tijden zijn strings "HH:MM"; intern rekenen we in minuten.
export const toMin = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};
export const toHHMM = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
export const addMin = (hhmm, delta) => toHHMM(toMin(hhmm) + delta);
export const duurMin = (a, b) => toMin(b) - toMin(a);

export const DAG_KORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
export const dagKortVanDatum = (d) => DAG_KORT[d.getDay()];

export const datumKey = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

// ISO-weeknummer + jaar -> "YYYY-Www"
export function weekKey(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(x.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((x - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${x.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const nuMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

// Dagnummer sinds epoch — basis voor deterministische, eerlijke round-robin-
// rotaties (reva-oefeningen, maaltijdsuggesties) zonder willekeur.
export const dagOrdinal = (datum) => Math.floor(new Date(`${datum}T00:00:00Z`).getTime() / 86400000);
