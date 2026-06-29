// Maaltijdplanning: kiest concrete, exacte suggesties uit de eigen receptenbank
// (geen scraping van winkelsites — bewuste keuze, zie HANDOVER.md), schaalt
// hoeveelheden op het aantal eters, en stelt een boodschappenlijst samen.
// Premium-coach principe: dag-deterministische round-robin (net als
// `blessures.js` → `kiesOefeningenVanDag`), geen willekeur, geen scraping —
// voorspelbaar en uitlegbaar boven "slim".
import { dagOrdinal } from './tijd';

// Drie vaste, herkenbare snackmomenten + de drie hoofdmaaltijden. De recepten
// zelf kennen enkel het brede type 'snack' (zie Maaltijden.jsx) — elk
// snackmoment kiest via een eigen rotatie-offset (slotIndex) zodat ze niet
// stelselmatig hetzelfde voorstellen, met veilige terugval als er maar één
// snackrecept bestaat.
export const MOMENTEN = ['ontbijt', 'lunch', 'diner', 'snack1', 'snack2', 'snack3'];

export function receptType(moment) {
  return moment.startsWith('snack') ? 'snack' : moment;
}

function slotIndex(moment) {
  return moment === 'snack2' ? 1 : moment === 'snack3' ? 2 : 0;
}

// Eerlijke round-robin over de recepten die bij moment + doel passen — geen
// recept gekozen voor `doelen` betekent dat het bij elk doel past (veilige,
// inclusieve terugval, geen recepten verstoppen door een ontbrekend tag).
export function kiesSuggesties({ recepten = [], moment, doelen = [], datum, aantal = 2 }) {
  const type = receptType(moment);
  const passend = recepten.filter((r) =>
    (r.type || r.moment) === type
    && (!r.doelen?.length || !doelen.length || r.doelen.some((d) => doelen.includes(d))));
  if (!passend.length) return [];
  const offset = (dagOrdinal(datum) + slotIndex(moment)) % passend.length;
  const n = Math.min(aantal, passend.length);
  const gekozen = [];
  for (let i = 0; i < n; i++) gekozen.push(passend[(offset + i) % passend.length]);
  return gekozen;
}

// Override (expliciete gebruikerskeuze) wint altijd; anders de eerste van de
// deterministische suggesties. Pure functie van datum + recepten — werkt ook
// voor toekomstige dagen zonder dat daarvoor al een dagdoc bestaat.
export function gekozenMaaltijd({ recepten = [], moment, doelen = [], datum, override = null }) {
  if (override?.recipeId) {
    const recept = recepten.find((r) => r.id === override.recipeId);
    if (recept) return { recept, aantalEters: override.aantalEters || recept.aantalEters || 1 };
  }
  const [recept] = kiesSuggesties({ recepten, moment, doelen, datum, aantal: 1 });
  if (!recept) return null;
  return { recept, aantalEters: recept.aantalEters || 1 };
}

function rondAf(waarde, eenheid) {
  return ['g', 'ml'].includes(eenheid) ? Math.round(waarde / 5) * 5 : Math.round(waarde * 10) / 10;
}

export function schaalIngredienten(ingredienten = [], vanEters, naarEters) {
  const ratio = (naarEters || 1) / (vanEters || 1);
  return ingredienten.map((i) => ({ ...i, hoeveelheid: rondAf((i.hoeveelheid || 0) * ratio, i.eenheid) }));
}

export function ingredientenTekst(ingredienten = []) {
  return ingredienten.map((i) => `${i.hoeveelheid}${i.eenheid || ''} ${i.naam}`).join(', ');
}

// Boodschappenlijst over een periode (datums als "YYYY-MM-DD"), opgeteld per
// (naam, eenheid) en gegroepeerd in vers/houdbaar voor de UI (wekelijks vs.
// maandelijks in bulk). `dagDocs` is optioneel — enkel voor al gerealiseerde
// keuzes (bv. deze week); voor toekomstige dagen zonder dagdoc valt dit terug
// op de deterministische suggestie, dus géén extra Firestore-reads nodig voor
// een vooruitblik van een maand.
export function genereerBoodschappenlijst({ periode = [], recepten = [], doelen = [], aantalEtersStandaard = 1, dagDocs = {} }) {
  const totalen = new Map();
  periode.forEach((datum) => {
    MOMENTEN.forEach((moment) => {
      const override = dagDocs[datum]?.maaltijdPlan?.[moment] || null;
      const gekozen = gekozenMaaltijd({ recepten, moment, doelen, datum, override });
      if (!gekozen) return;
      const eters = override?.aantalEters || aantalEtersStandaard;
      const geschaald = schaalIngredienten(gekozen.recept.ingredienten || [], gekozen.recept.aantalEters || 1, eters);
      geschaald.forEach((i) => {
        const key = `${i.naam}|${i.eenheid || ''}`;
        const bestaand = totalen.get(key) || { naam: i.naam, eenheid: i.eenheid || '', hoeveelheid: 0, houdbaar: !!gekozen.recept.houdbaar };
        bestaand.hoeveelheid += i.hoeveelheid || 0;
        totalen.set(key, bestaand);
      });
    });
  });
  const lijst = [...totalen.values()].sort((a, b) => a.naam.localeCompare(b.naam));
  return {
    vers: lijst.filter((i) => !i.houdbaar),
    houdbaar: lijst.filter((i) => i.houdbaar),
  };
}
