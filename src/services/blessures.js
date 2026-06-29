// Blessures: per-blessure revalidatie-oefeningen + automatische sportbeperking.
// Premium-coach principe: elke beperking moet uitlegbaar zijn (welke regio,
// welke sporten en waarom) en het systeem valt veilig terug — geen regio
// gekozen betekent geen automatische sportveto, nooit een stellig "mag niet"
// op wankele basis.
import { BLESSURE_REGIOS } from '../config/appConfig';
import { dagOrdinal } from './tijd';

export function isBlessureActief(b, datum) {
  if (!b || b.actief === false) return false;
  if (b.eindDatum && b.eindDatum < datum) return false;
  return true;
}

// Einddatum verstreken, maar de gebruiker heeft dit nog niet gezien/bevestigd —
// zo'n blessure telt al niet meer mee (isBlessureActief), maar moet nog gemeld
// worden zodat het sluiten niet stilzwijgend gebeurt.
export function isVerlopenNietGemeld(b, datum) {
  return !!(b && b.actief !== false && b.eindDatum && b.eindDatum < datum && !b.eindeGemeld);
}

export function vermijdSportenVanBlessures(blessures = [], datum) {
  const set = new Set();
  blessures.filter((b) => isBlessureActief(b, datum)).forEach((b) => {
    (BLESSURE_REGIOS[b.regio]?.vermijdSport || []).forEach((s) => set.add(s));
  });
  return [...set];
}

// Eerlijke round-robin: elke dag een andere, opeenvolgende schijf van de actieve
// oefeningen, zodat iedereen over de cyclus evenveel aan de beurt komt — geen
// willekeur, dus voorspelbaar (premium-coach principe "vertrouwen > intelligentie").
export function kiesOefeningenVanDag({ oefeningen = [], aantalPerDag, datum }) {
  const actief = oefeningen.filter((o) => o.actief !== false);
  if (!actief.length) return [];
  const n = Math.max(1, Math.min(aantalPerDag || actief.length, actief.length));
  if (n >= actief.length) return actief;
  const offset = (dagOrdinal(datum) * n) % actief.length;
  const gekozen = [];
  for (let i = 0; i < n; i++) gekozen.push(actief[(offset + i) % actief.length]);
  return gekozen;
}

export function blessureBlokDuur(aantalOefeningen) {
  return Math.max(10, aantalOefeningen * 4);
}
