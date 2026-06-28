// Vakantieperiodes als datum-reeksen (YYYY-MM-DD; string-vergelijking volstaat).
// Een periode kan 'verlof' zijn (jij bent vrij) en/of 'geenJudo' (clubs dicht:
// geen eigen training én geen lesgeven).

export function vakantieVoorDatum(lijst, datum) {
  for (const v of lijst || []) {
    if (v.van && v.tot && datum >= v.van && datum <= v.tot) return v;
  }
  return null;
}

// Gecombineerde vlaggen over ÁLLE periodes die deze datum overlappen. Belangrijk
// bij overlap: als één periode 'geenJudo' is en een andere 'verlof', gelden beide.
// (Anders zou alleen de eerst-gevonden periode tellen en kon judovrij wegvallen.)
export function vakantieFlags(lijst, datum) {
  let verlof = false, geenJudo = false, buitenland = false, periode = null;
  for (const v of lijst || []) {
    if (v.van && v.tot && datum >= v.van && datum <= v.tot) {
      if (!periode) periode = v;
      if (v.verlof) verlof = true;
      if (v.geenJudo) geenJudo = true;
      if (v.buitenland) buitenland = true;
    }
  }
  return { verlof, geenJudo, buitenland, periode };
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
  const suffix = v.buitenland ? ' (buitenland)' : '';
  if (v.geenJudo && v.verlof) return `Verlof + judovrij${suffix}`;
  if (v.geenJudo) return `Judovrij (clubs dicht)${suffix}`;
  if (v.verlof) return `Persoonlijk verlof${suffix}`;
  return 'Vakantie';
}
