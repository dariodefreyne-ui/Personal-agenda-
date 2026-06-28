// Sport-coach: bepaalt WELKE sport een dag krijgt (vast weekschema + adaptieve
// override bij laag herstel-niveau) en WAT die sport die dag concreet inhoudt
// (oefeningen + waarom, km/interval/hartslagzone voor fietsen, km/stappen voor
// wandelen). Judo blijft bewust ongedetailleerd — dat is al een vast blok.

import { SPORTEN } from '../config/appConfig';

const NIVEAU_LABEL = { hard: 'hoge belastbaarheid', matig: 'gemiddelde belastbaarheid', rustig: 'lichte belastbaarheid', herstel: 'herstel' };

// Intensiteit-rangorde van de sporten zelf — bepaalt of een override "lichter" is.
const SPORT_INTENSITEIT = { rust: 0, wandelen: 1, homefitness: 2, fietsen: 3 };

// Hybride: vast weekschema, met override naar een lichtere sport bij laag
// herstel — nooit zomaar schrappen, altijd met uitleg.
export function kiesSportVanDag({ dagKort, weekSchema, niveau, judoVandaag, weer = null, vermijdSporten = [] }) {
  if (judoVandaag) return { sport: 'judo', gepland: 'judo', overschreven: false, waarom: [] };

  const gepland = weekSchema?.[dagKort] || 'rust';
  if (gepland === 'rust') return { sport: 'rust', gepland, overschreven: false, waarom: [] };

  const geplandeIntensiteit = SPORT_INTENSITEIT[gepland] ?? 1;
  let sport = gepland;
  const waarom = [];
  if (niveau === 'herstel' && geplandeIntensiteit >= 2) {
    sport = 'wandelen';
    waarom.push(`${gepland === 'fietsen' ? 'Fietsen' : 'Home fitness'} stond gepland, maar je herstel-niveau is laag vandaag — een lichtere wandeling in de plaats.`);
  } else if (niveau === 'rustig' && geplandeIntensiteit >= 3) {
    sport = 'homefitness';
    waarom.push('Fietsen stond gepland, maar gezien je matige belastbaarheid kiezen we een rustigere home fitness-sessie.');
  } else if (gepland === 'fietsen' && sport === 'fietsen') {
    const weerReden = slechtFietsWeer(weer);
    if (weerReden) {
      sport = 'homefitness';
      waarom.push(`Fietsen stond gepland, maar ${weerReden} — een home fitness-sessie in plaats daarvan.`);
    }
  }

  // Blessure-veto: een actieve blessure kan deze sport specifiek afraden (zie
  // BLESSURE_REGIOS). Kies dan het lichtste alternatief dat zelf niet ook
  // afgeraden wordt; pas als alles afgeraden is, valt het terug op rust.
  if (vermijdSporten.includes(sport)) {
    const voorVeto = sport;
    const alternatieven = ['wandelen', 'homefitness', 'rust'];
    sport = alternatieven.find((s) => s === 'rust' || !vermijdSporten.includes(s));
    waarom.push(`${SPORTEN[voorVeto]?.naam || voorVeto} stond gepland, maar dat wordt afgeraden door een actieve blessure — ${
      sport === 'rust' ? 'vandaag rust in plaats daarvan.' : `${SPORTEN[sport]?.naam || sport} in de plaats daarvan.`}`);
  }

  return { sport, gepland, overschreven: sport !== gepland, waarom };
}

// Stabiele "willekeurige" rotatie op basis van de datum, zodat dezelfde dag
// altijd dezelfde oefeningen toont — geen herberekening die elke render wisselt.
function seedGetal(tekst) {
  let h = 0;
  for (const c of String(tekst)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function genereerHomeFitness({ oefeningen = [], niveau, datum }) {
  if (!oefeningen.length) {
    return { oefeningen: [], waarom: ['Nog geen oefeningen ingesteld — vul ze aan via Beheer › Sport & fiets.'] };
  }
  const aantal = { hard: 6, matig: 5, rustig: 4, herstel: 3 }[niveau] ?? 5;
  const seed = seedGetal(datum);
  const geroteerd = oefeningen.map((_, i) => oefeningen[(i + seed) % oefeningen.length]);
  const basis = niveau === 'herstel'
    ? geroteerd.filter((o) => o.categorie === 'mobiliteit' || o.categorie === 'core')
    : geroteerd;
  const gekozen = (basis.length ? basis : geroteerd).slice(0, aantal);
  const factor = niveau === 'hard' ? 1.15 : niveau === 'herstel' ? 0.7 : 1;
  return {
    oefeningen: gekozen.map((o) => ({ ...o, sets: Math.max(1, Math.round((o.sets || 3) * factor)) })),
    waarom: [`Sessie afgestemd op ${NIVEAU_LABEL[niveau] || 'vandaag'} — elke oefening heeft een eigen waarom hieronder.`],
  };
}

// Slecht fietsweer (veel regen/harde wind) -> binnen blijven kan geen kwaad,
// maar we vervangen het advies bewust door een evenwaardige home fitness-sessie
// in plaats van de gebruiker zonder alternatief te laten staan.
function slechtFietsWeer(weer) {
  if (!weer) return null;
  const regen = weer.neerslagKans ?? weer.precipProb ?? 0;
  const wind = weer.windKmh ?? weer.wind ?? 0;
  if (regen >= 60) return `veel kans op regen (${regen}%)`;
  if (wind >= 45) return `harde wind (${wind} km/u)`;
  return null;
}

export function genereerFietsAdvies({ niveau, weer = null }) {
  const minuten = { hard: 75, matig: 50, rustig: 35, herstel: 25 }[niveau] ?? 45;
  const km = Math.round((minuten / 60) * 22); // ±22 km/u gemiddeld
  const zoneTekst = {
    hard: 'Hartslagzone 3-4, met 4-6 intervallen van 3 min stevig / 2 min rustig',
    matig: 'Hartslagzone 2-3, rustig duurtempo zonder intervallen',
    rustig: 'Hartslagzone 1-2, comfortabel tempo',
    herstel: 'Hartslagzone 1, heel licht — vooral de benen losrijden',
  }[niveau] || 'Hartslagzone 2, rustig tempo';
  const weerReden = slechtFietsWeer(weer);
  return {
    km, minuten, zoneTekst, weerWaarschuwing: weerReden,
    waarom: weerReden
      ? [`±${km} km (~${minuten} min) past bij je huidige ${NIVEAU_LABEL[niveau] || 'belastbaarheid'}, maar ${weerReden} — overweeg binnen te trainen.`]
      : [`±${km} km (~${minuten} min) past bij je huidige ${NIVEAU_LABEL[niveau] || 'belastbaarheid'}.`],
  };
}

export function genereerWandelAdvies({ niveau, garmin, stappenDoel }) {
  const km = { hard: 7, matig: 5, rustig: 3.5, herstel: 2.5 }[niveau] ?? 4;
  const stappenVandaag = garmin?.stappen ?? null;
  const restStappen = stappenDoel != null && stappenVandaag != null ? Math.max(0, stappenDoel - stappenVandaag) : null;
  if (restStappen != null && restStappen > 0) {
    return {
      km, stappenAdvies: restStappen,
      waarom: [`Je hebt vandaag nog ${restStappen.toLocaleString('nl-BE')} stappen tot je doel — een wandeling van ±${km} km helpt dat te halen.`],
    };
  }
  return { km, stappenAdvies: null, waarom: [`±${km} km past bij je huidige ${NIVEAU_LABEL[niveau] || 'belastbaarheid'}.`] };
}

export function genereerSportInhoud({ sport, niveau, oefeningen = [], garmin = null, stappenDoel = null, datum, weer = null }) {
  if (sport === 'homefitness') return { type: 'homefitness', ...genereerHomeFitness({ oefeningen, niveau, datum }) };
  if (sport === 'fietsen') return { type: 'fietsen', ...genereerFietsAdvies({ niveau, weer }) };
  if (sport === 'wandelen') return { type: 'wandelen', ...genereerWandelAdvies({ niveau, garmin, stappenDoel }) };
  if (sport === 'judo') return { type: 'judo', waarom: ['Vaste judotraining/-les — geen extra invulling nodig.'] };
  return { type: 'rust', waarom: ['Geplande rustdag — geen training nodig.'] };
}
