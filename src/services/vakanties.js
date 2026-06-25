// Vakantieperiodes als datum-reeksen (YYYY-MM-DD; string-vergelijking volstaat).
// Een periode kan 'verlof' zijn (jij bent vrij) en/of 'geenJudo' (clubs dicht:
// geen eigen training én geen lesgeven).

export function vakantieVoorDatum(lijst, datum) {
  for (const v of lijst || []) {
    if (v.van && v.tot && datum >= v.van && datum <= v.tot) return v;
  }
  return null;
}

// Eerste periode die een van de gegeven dagdatums overlapt (voor weekbanner).
export function vakantieInWeek(lijst, datums) {
  for (const v of lijst || []) {
    if (v.van && v.tot && datums.some((d) => d >= v.van && d <= v.tot)) return v;
  }
  return null;
}

export function vakantieLabel(v) {
  if (!v) return '';
  if (v.geenJudo && v.verlof) return 'Verlof + judovrij';
  if (v.geenJudo) return 'Judovrij (clubs dicht)';
  if (v.verlof) return 'Persoonlijk verlof';
  return 'Vakantie';
}
