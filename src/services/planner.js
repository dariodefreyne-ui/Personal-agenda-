// =========================================================================
//  Planning-engine: bouwt een gedetailleerde dagindeling op uit
//  instellingen + werkmodus + vaste ankers (judo trainen/lesgeven, RSCA,
//  agenda) + gewoontes/reva/maaltijden. Geeft tijdsloten met push-ankers.
//
//  Resultaat:
//   { blokken: [{id,start,eind,titel,type,kleur,bron,vast,taakId,push}],
//     todos:   [{taakId,titel,...}],   // taken zonder vast tijdslot
//     advies:  { fiets, sport, slaap, tekst[] } }
// =========================================================================
import { BLOK_TYPES } from '../config/appConfig';
import { toMin, toHHMM, addMin } from './tijd';

const kleurVoor = (type) => (BLOK_TYPES[type]?.kleur || BLOK_TYPES.routine.kleur);

function maakBlok(arr, start, eind, titel, type, opts = {}) {
  if (!start || !eind) return;
  arr.push({
    id: opts.id || `${type}-${start}`,
    start, eind, titel, type,
    kleur: kleurVoor(type),
    bron: opts.bron || 'plan',
    vast: opts.vast ?? false,
    taakId: opts.taakId || null,
    push: opts.push ?? true,
    detail: opts.detail || null,
  });
}

// Fietsadvies op basis van blessure, Garmin-readiness en weer.
export function berekenFietsAdvies({ sport, blessureActief, garmin, weer }) {
  if (!sport?.fietsAlsSport) return { fiets: false, reden: 'Fietsen-als-sport staat uit.' };
  if (blessureActief && !sport.fietsBijBlessure) {
    return { fiets: false, reden: 'Blessure actief — neem vandaag de auto.' };
  }
  const readiness = garmin?.trainingReadiness?.score ?? garmin?.trainingReadiness ?? null;
  if (typeof readiness === 'number' && readiness < 35) {
    return { fiets: false, reden: `Lage training readiness (${readiness}/100) — spaar je vandaag.` };
  }
  if (weer) {
    const regen = weer.neerslagKans ?? weer.precipProb ?? 0;
    const wind = weer.windKmh ?? 0;
    if (regen >= 60) return { fiets: false, reden: `Veel kans op regen (${regen}%) — auto is comfortabeler.` };
    if (wind >= 45) return { fiets: false, reden: `Harde wind (${wind} km/u) — minder leuk fietsweer.` };
  }
  return { fiets: true, reden: 'Goede dag om te fietsen (telt als training).' };
}

export function genereerDagPlan({
  datum, dagKort, instellingen, werkModus,
  taken = [], reva = [], maaltijden = [], agendaEvents = [],
  garmin = null, weer = null, blessureActief = false, isVakantie = false,
}) {
  const I = instellingen || {};
  const alg = I.algemeen || {};
  const werk = I.werk || {};
  const sport = I.sport || {};
  const blok = [];
  const advies = { tekst: [] };

  const opstaan = alg.opstaan || '06:45';
  const slapen = alg.slapen || '22:45';
  const isWo = dagKort === 'wo';

  // 1) Ochtendroutine + ontbijt
  maakBlok(blok, opstaan, addMin(opstaan, 25), 'Opstaan & klaarmaken', 'routine', { bron: 'routine' });
  maakBlok(blok, addMin(opstaan, 25), addMin(opstaan, 45), 'Ontbijt', 'maaltijd', { bron: 'maaltijd' });

  // 2) Werk + woon-werk
  const modus = werkModus || 'thuis';
  const werktVandaag = ['thuis', 'kantoor_auto', 'kantoor_fiets'].includes(modus);
  if (werktVandaag) {
    const fiets = modus === 'kantoor_fiets';
    const kantoor = modus !== 'thuis';
    let start = kantoor ? (werk.kantoorStart || '07:45') : (werk.thuisStart || '08:25');
    let eind = kantoor ? (werk.kantoorEind || '17:00') : (werk.thuisEind || '16:00');
    if (isWo) eind = werk.woensdagEind || '16:00'; // vroeg weg om les te geven

    if (kantoor) {
      const reis = fiets ? (werk.fietsReisMin || 45) : (werk.autoReisMin || 45);
      maakBlok(blok, addMin(start, -reis), start,
        fiets ? 'Fietsen naar werk' : 'Rijden naar werk', fiets ? 'sport' : 'woonwerk',
        { bron: 'woonwerk', detail: fiets ? 'Telt als training' : null });
    }

    // Werk opsplitsen rond de middagpauze
    const pauze = werk.middagpauzeMin || 30;
    const lunch = '13:00';
    if (toMin(lunch) > toMin(start) && toMin(lunch) < toMin(eind)) {
      maakBlok(blok, start, lunch, kantoor ? 'Werk (kantoor)' : 'Thuiswerk', 'werk', { bron: 'werk' });
      maakBlok(blok, lunch, addMin(lunch, pauze), 'Middagpauze + lunch', 'maaltijd', { bron: 'maaltijd' });
      maakBlok(blok, addMin(lunch, pauze), eind, kantoor ? 'Werk (kantoor)' : 'Thuiswerk', 'werk', { bron: 'werk', push: false });
    } else {
      maakBlok(blok, start, eind, kantoor ? 'Werk (kantoor)' : 'Thuiswerk', 'werk', { bron: 'werk' });
    }

    if (kantoor) {
      const reis = fiets ? (werk.fietsReisMin || 45) : (werk.autoReisMin || 45);
      maakBlok(blok, eind, addMin(eind, reis),
        fiets ? 'Fietsen naar huis' : 'Rijden naar huis', fiets ? 'sport' : 'woonwerk', { bron: 'woonwerk' });
    }
    // doel-uren feedback
    if (werk.doelUrenPerDag) advies.tekst.push(`Streef naar ±${werk.doelUrenPerDag}u werk (recuperatie-uren).`);
  }

  // 3) Judo les geven (woensdag, tenzij vakantie)
  (sport.judoLesgeven || []).forEach((les, i) => {
    if (les.dag !== dagKort) return;
    if (isVakantie && !les.tijdensVakantie) return;
    const vertrek = addMin(les.start, -(les.vertrekVoorMin || 30));
    maakBlok(blok, addMin(vertrek, -25), addMin(vertrek, -5), 'Snel eten voor judo', 'maaltijd', { bron: 'maaltijd' });
    maakBlok(blok, vertrek, les.start, 'Vertrek naar judoclub', 'woonwerk', { bron: 'judo' });
    maakBlok(blok, les.start, les.eind, 'Judoles geven', 'lesgeven', { bron: 'judo', vast: true, id: `lesgeven-${i}` });
  });

  // 4) Eigen judotraining
  (sport.judoEigenClub || []).forEach((t, i) => {
    if (t.dag !== dagKort) return;
    maakBlok(blok, t.start, t.eind, 'Judotraining', 'judo', { bron: 'judo', vast: true, id: `judo-${i}` });
  });

  // 5) Agenda-events (ICS): o.a. RSCA-matchen
  agendaEvents.forEach((ev, i) => {
    const titel = ev.titel || ev.summary || 'Afspraak';
    const isVoetbal = /anderlecht|rsca|voetbal/i.test(titel);
    maakBlok(blok, ev.start, ev.eind || addMin(ev.start, 90), titel,
      isVoetbal ? 'voetbal' : 'vrije_tijd', { bron: 'agenda', vast: true, id: `agenda-${i}` });
  });

  // 6) Reva + gewoontes met vast tijdslot worden blokken; rest -> todos
  const todos = [];
  const dagTaken = taken.filter((t) => t.actief !== false && (!t.dagen || t.dagen.includes(dagKort)));
  dagTaken.forEach((t) => {
    if (t.tijd) {
      maakBlok(blok, t.tijd, addMin(t.tijd, t.duurMin || 15), t.titel, t.blokType || 'routine',
        { bron: 'taak', taakId: t.id, id: `taak-${t.id}` });
    } else {
      todos.push({ taakId: t.id, titel: t.titel, type: t.type, blokType: t.blokType || 'routine' });
    }
  });

  // 7) Avondeten als er nog niet gegeten is rond de avond
  const heeftAvondeten = blok.some((b) => b.type === 'maaltijd' && toMin(b.start) >= toMin('18:00'));
  if (!heeftAvondeten && werktVandaag) {
    const et = isWo ? null : '18:45';
    if (et) {
      maakBlok(blok, et, addMin(et, 40), 'Avondeten', 'maaltijd', { bron: 'maaltijd' });
    }
  }

  // 8) Afbouwen + slaap
  maakBlok(blok, addMin(slapen, -30), slapen, 'Afbouwen — scherm weg, klaarmaken', 'scherm', { bron: 'routine' });
  maakBlok(blok, slapen, addMin(slapen, 1), 'Slapen', 'slaap', { bron: 'routine', push: true });

  // Sorteer op starttijd
  blok.sort((a, b) => toMin(a.start) - toMin(b.start));

  // Vul gaten tussen einde werk/sport en afbouwen met "vrije tijd"
  vulVrijeTijd(blok, slapen);

  // Advies
  const fietsAdvies = berekenFietsAdvies({ sport, blessureActief, garmin, weer });
  advies.fiets = fietsAdvies;
  if (modus === 'kantoor_fiets' || modus === 'kantoor_auto') {
    advies.tekst.push(fietsAdvies.fiets
      ? `🚲 ${fietsAdvies.reden}`
      : `🚗 ${fietsAdvies.reden}`);
  }
  if (garmin) {
    const slaapU = garmin.sleep?.urenTotaal ?? garmin.sleep?.totalHours ?? null;
    if (slaapU != null) advies.tekst.push(`Slaap vannacht: ${Number(slaapU).toFixed(1)}u.`);
    const rd = garmin.trainingReadiness?.score ?? garmin.trainingReadiness ?? null;
    if (rd != null) {
      advies.tekst.push(rd >= 65 ? `Topreadiness (${rd}/100) — ga ervoor.`
        : rd >= 40 ? `Matige readiness (${rd}/100) — train rustig.`
        : `Lage readiness (${rd}/100) — kies herstel.`);
    }
  }

  return { blokken: blok, todos, advies };
}

// Voegt "vrije tijd"-blokken toe in lege avond-/dagdelen tussen ankers.
function vulVrijeTijd(blok, slapen) {
  const vasteEinde = [...blok].sort((a, b) => toMin(a.start) - toMin(b.start));
  const result = [];
  for (let i = 0; i < vasteEinde.length - 1; i++) {
    const huidig = vasteEinde[i];
    const volgend = vasteEinde[i + 1];
    const gap = toMin(volgend.start) - toMin(huidig.eind);
    // alleen 's avonds (na 17u) en gaten >= 45 min opvullen met vrije tijd
    if (gap >= 45 && toMin(huidig.eind) >= toMin('17:00') && toMin(huidig.eind) < toMin(slapen)) {
      result.push({
        id: `vrij-${huidig.eind}`, start: huidig.eind, eind: volgend.start,
        titel: 'Vrije tijd / ontspanning', type: 'vrije_tijd', kleur: kleurVoor('vrije_tijd'),
        bron: 'auto', vast: false, push: false, taakId: null, detail: 'Tv, lezen, sociaal — bewust ontspannen',
      });
    }
  }
  blok.push(...result);
  blok.sort((a, b) => toMin(a.start) - toMin(b.start));
}
