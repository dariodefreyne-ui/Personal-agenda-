// Leest defensief een paar bruikbare waarden uit het ruwe Garmin-dagdocument.
// De pipeline bewaart de onbewerkte Garmin-objecten; sleutels kunnen per
// account licht verschillen, dus alles is best-effort met nette fallback.

function eersteGetal(...kandidaten) {
  for (const k of kandidaten) {
    const n = Number(k);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function garminSamenvatting(g) {
  if (!g) return null;

  const stappen = eersteGetal(
    g.summary?.totalSteps,
    g.stepsIntraday?.totalSteps,
  );

  const slaapSec = eersteGetal(
    g.sleep?.dailySleepDTO?.sleepTimeSeconds,
    g.sleep?.sleepTimeSeconds,
  );
  const slaapUren = slaapSec ? slaapSec / 3600 : null;

  // trainingReadiness is meestal een lijst met één object.
  const tr = Array.isArray(g.trainingReadiness) ? g.trainingReadiness[0] : g.trainingReadiness;
  const readiness = eersteGetal(tr?.score, tr?.readinessScore);
  const readinessLabel = tr?.level || tr?.feedbackShort || null;

  const rustHr = eersteGetal(
    g.restingHeartRate?.restingHeartRate,
    g.restingHeartRate?.allMetrics?.metricsMap?.WELLNESS_RESTING_HEART_RATE?.[0]?.value,
    g.summary?.restingHeartRate,
  );

  const kcal = eersteGetal(g.summary?.totalKilocalories, g.summary?.activeKilocalories);

  const status = g.trainingStatus?.latestTrainingStatusData
    ? Object.values(g.trainingStatus.latestTrainingStatusData)[0]?.trainingStatusFeedbackPhrase
    : null;

  // ---- Fase 3: body battery, VO2max, profiel ----
  const bb = Array.isArray(g.bodyBattery) ? g.bodyBattery[0] : g.bodyBattery;
  const bbArray = bb?.bodyBatteryValuesArray || bb?.bodyBatteryValuesArrayLevel;
  let bodyBattery = null, bodyBatteryMax = null;
  if (Array.isArray(bbArray) && bbArray.length) {
    const levels = bbArray.map((p) => (Array.isArray(p) ? p[1] : p?.level)).filter((n) => typeof n === 'number');
    if (levels.length) { bodyBattery = levels[levels.length - 1]; bodyBatteryMax = Math.max(...levels); }
  }

  const mm = Array.isArray(g.maxMetrics) ? g.maxMetrics[0] : g.maxMetrics;
  const vo2max = eersteGetal(mm?.generic?.vo2MaxValue, mm?.vo2MaxValue, g.userProfile?.userData?.vo2Max);

  const bc = g.bodyComposition?.totalAverage || (Array.isArray(g.bodyComposition) ? g.bodyComposition[0] : g.bodyComposition);
  const gewichtG = eersteGetal(bc?.weight, g.userProfile?.userData?.weight);
  const gewichtKg = gewichtG ? Math.round(gewichtG / 1000 * 10) / 10 : null;
  const vetPct = eersteGetal(bc?.bodyFat);

  const ud = g.userProfile?.userData || g.userProfile || {};
  const lengteCm = eersteGetal(ud.height);
  let leeftijd = null;
  if (ud.birthDate) {
    const d = new Date(ud.birthDate);
    if (!isNaN(d)) leeftijd = Math.floor((Date.now() - d.getTime()) / (365.25 * 864e5));
  }

  return {
    stappen,
    slaapUren,
    readiness,
    readinessLabel,
    rustHr,
    kcal,
    trainingStatus: status,
    bodyBattery,
    bodyBatteryMax,
    vo2max,
    gewichtKg,
    vetPct,
    leeftijd,
    lengteCm,
    // genormaliseerd voor de planner-advieslogica
    trainingReadiness: readiness != null ? { score: readiness } : null,
    sleep: slaapUren != null ? { urenTotaal: slaapUren } : null,
  };
}
