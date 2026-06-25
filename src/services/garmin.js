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

  return {
    stappen,
    slaapUren,
    readiness,
    readinessLabel,
    rustHr,
    kcal,
    trainingStatus: status,
    // genormaliseerd voor de planner-advieslogica
    trainingReadiness: readiness != null ? { score: readiness } : null,
    sleep: slaapUren != null ? { urenTotaal: slaapUren } : null,
  };
}
