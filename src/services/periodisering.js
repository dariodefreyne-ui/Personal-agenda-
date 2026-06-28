// Periodisering: expliciete trainingsblokken (opbouw- vs deload-weken).
// Bewust een vaste, voorspelbare kalendercyclus (geen losse instelling, geen
// data-afhankelijke gok) — premium-principe 2: "vertrouwen > intelligentie",
// liever voorspelbaar dan verrassend. ACWR (services/belasting.js) blijft de
// dynamische, data-gedreven laag; periodisering is de structurele laag erboven:
// elke Nde week (standaard 4) is een ingeplande hersteller, los van hoe de
// belasting die week toevallig uitviel.

const CYCLUS_LENGTE_DEFAULT = 4; // 3 weken opbouw + 1 week deload

// Maandag-gebaseerde, doorlopende weekindex (i.t.t. ISO-weeknummers loopt deze
// door over jaargrenzen, anders zou de cyclus elk jaar rond nieuwjaar haperen).
function weekIndex(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dagSindsMaandag = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dagSindsMaandag);
  return Math.floor(x.getTime() / (7 * 86400000));
}

// Welke fase van de opbouw-/deloadcyclus valt op refDatum? Pure functie van de
// datum — geen meetdata nodig, dus altijd hoge zekerheid.
export function periodiseringBepalen(refDatum = new Date(), cyclusLengte = CYCLUS_LENGTE_DEFAULT) {
  const idx = weekIndex(refDatum);
  const weekInCyclus = (((idx % cyclusLengte) + cyclusLengte) % cyclusLengte) + 1; // 1..cyclusLengte
  const fase = weekInCyclus >= cyclusLengte ? 'deload' : 'opbouw';
  const waarom = fase === 'deload'
    ? `Week ${weekInCyclus}/${cyclusLengte} van je trainingscyclus is een ingeplande hersteller — na ${cyclusLengte - 1} weken opbouwen bouwen we bewust af, los van hoe zwaar deze week toevallig aanvoelt.`
    : `Week ${weekInCyclus}/${cyclusLengte} van je trainingscyclus — een opbouwweek, daarna volgt een hersteller.`;
  return {
    fase, weekInCyclus, cyclusLengte, zekerheid: 'hoog', waarom,
    meetlat: `Vaste cyclus van ${cyclusLengte} weken: ${cyclusLengte - 1} weken opbouw, dan 1 week deload — onafhankelijk van ACWR, als structureel vangnet tegen sluipende overbelasting.`,
  };
}
