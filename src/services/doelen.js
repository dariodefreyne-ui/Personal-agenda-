// Lange-termijndoelen met automatische koppeling aan Garmin waar mogelijk.

export const METRIEKEN = {
  vo2max:  { label: 'VO₂max',   eenheid: '',    omhoog: true },
  gewicht: { label: 'Gewicht',  eenheid: 'kg',  omhoog: false },
  rusthr:  { label: 'Rust-HR',  eenheid: 'bpm', omhoog: false },
  afstand: { label: 'Afstand',  eenheid: 'km',  omhoog: true },
  kracht:  { label: 'Gewicht (kg)', eenheid: 'kg', omhoog: true },
  eigen:   { label: 'Eigen meting', eenheid: '', omhoog: true },
};

// Huidige waarde: uit Garmin als de metriek dat toelaat, anders handmatig.
export function huidigeWaarde(doel, garmin) {
  if (doel.metric === 'vo2max' && garmin?.vo2max != null) return garmin.vo2max;
  if (doel.metric === 'gewicht' && garmin?.gewichtKg != null) return garmin.gewichtKg;
  if (doel.metric === 'rusthr' && garmin?.rustHr != null) return garmin.rustHr;
  return doel.huidige ?? null;
}

export function doelProgress(doel, garmin) {
  const start = Number(doel.start);
  const naar = Number(doel.naar);
  const huidige = huidigeWaarde(doel, garmin);
  if (huidige == null || !Number.isFinite(start) || !Number.isFinite(naar) || start === naar) {
    return { huidige, pct: 0, klaar: false, rest: null };
  }
  let pct = ((Number(huidige) - start) / (naar - start)) * 100;
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  const rest = Math.round((naar - Number(huidige)) * 10) / 10;
  return { huidige: Number(huidige), pct, klaar: pct >= 100, rest };
}

export function doelKleur(pct) {
  if (pct >= 100) return 'var(--success)';
  if (pct >= 50) return 'var(--primary)';
  return 'var(--primary-2)';
}
