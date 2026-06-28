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
import { BLOK_TYPES, SPORTEN } from '../config/appConfig';
import { toMin, toHHMM, addMin } from './tijd';
import { kiesSportVanDag, genereerSportInhoud } from './sportcoach';
import { isBlessureActief, isVerlopenNietGemeld, vermijdSportenVanBlessures, kiesOefeningenVanDag, blessureBlokDuur } from './blessures';

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
    oefeningen: opts.oefeningen || null,
    blessureId: opts.blessureId || null,
  });
}

// Fietsadvies op basis van blessure, Garmin-readiness en weer.
export function berekenFietsAdvies({ sport, blessureActief, vermijdSporten = [], garmin, weer }) {
  if (!sport?.fietsAlsSport) return { fiets: false, reden: 'Fietsen-als-sport staat uit.' };
  if ((blessureActief || vermijdSporten.includes('fietsen')) && !sport.fietsBijBlessure) {
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
  taken = [], reva = [], blessures = [], maaltijden = [], agendaEvents = [],
  garmin = null, weer = null, blessureActief = false, isVakantie = false, geenJudo = false,
  coachNiveau = null,
}) {
  const I = instellingen || {};
  const alg = I.algemeen || {};
  const werk = I.werk || {};
  const sport = I.sport || {};
  const gezondheid = I.gezondheid || {};
  const blok = [];
  const advies = { tekst: [] };
  let werkEindTijd = null;

  const isWo = dagKort === 'wo';

  // Bepaal werkmodus eerst, want het ritme (opstaan/slapen) hangt ervan af.
  const modus = werkModus || 'thuis';
  const werktVandaag = ['thuis', 'kantoor_auto', 'kantoor_fiets'].includes(modus);
  const vrijeDag = !werktVandaag || isVakantie;

  // Ritme verschilt: vrije/vakantiedagen mogen later starten en eindigen.
  const opstaan = vrijeDag ? (alg.opstaanVrij || alg.opstaan || '08:00') : (alg.opstaan || '06:45');
  const slapen = vrijeDag ? (alg.slapenVrij || alg.slapen || '23:30') : (alg.slapen || '22:45');

  // 1) Ochtendroutine + ontbijt
  maakBlok(blok, opstaan, addMin(opstaan, 25), 'Opstaan & klaarmaken', 'routine', { bron: 'routine' });
  maakBlok(blok, addMin(opstaan, 25), addMin(opstaan, 45), 'Ontbijt', 'maaltijd', { bron: 'maaltijd' });

  // 2) Werk + woon-werk
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
      werkEindTijd = addMin(eind, reis);
    } else {
      werkEindTijd = eind;
    }
    // doel-uren feedback
    if (werk.doelUrenPerDag) advies.tekst.push(`Streef naar ±${werk.doelUrenPerDag}u werk (recuperatie-uren).`);
  }

  // 3) Judo les geven (woensdag, tenzij vakantie)
  (sport.judoLesgeven || []).forEach((les, i) => {
    if (les.dag !== dagKort) return;
    if (geenJudo) return;
    if (isVakantie && !les.tijdensVakantie) return;
    const vertrek = addMin(les.start, -(les.vertrekVoorMin || 30));
    maakBlok(blok, addMin(vertrek, -25), addMin(vertrek, -5), 'Snel eten voor judo', 'maaltijd', { bron: 'maaltijd' });
    maakBlok(blok, vertrek, les.start, 'Vertrek naar judoclub', 'woonwerk', { bron: 'judo' });
    maakBlok(blok, les.start, les.eind, 'Judoles geven', 'lesgeven', { bron: 'judo', vast: true, id: `lesgeven-${i}` });
  });

  // 4) Eigen judotraining
  (sport.judoEigenClub || []).forEach((t, i) => {
    if (t.dag !== dagKort) return;
    if (geenJudo) return;
    maakBlok(blok, t.start, t.eind, 'Judotraining', 'judo', { bron: 'judo', vast: true, id: `judo-${i}` });
  });

  // 5) Agenda-events (ICS): o.a. RSCA-matchen. Eigen agenda-afspraken laten we
  //    altijd staan — ook judo-gerelateerde zoals een BBQ of tornooi; dat is
  //    bewust jouw kalender. 'geenJudo' raakt enkel de door de app geplande judo.
  agendaEvents.forEach((ev, i) => {
    const titel = ev.titel || ev.summary || 'Afspraak';
    const isVoetbal = /anderlecht|rsca|voetbal/i.test(titel);
    maakBlok(blok, ev.start, ev.eind || addMin(ev.start, 90), titel,
      isVoetbal ? 'voetbal' : 'vrije_tijd', { bron: 'agenda', vast: true, id: `agenda-${i}` });
  });

  // Judovrij melden als er normaal judo (training of les) gepland zou zijn
  const judoVandaag = (sport.judoEigenClub || []).some((t) => t.dag === dagKort)
    || (sport.judoLesgeven || []).some((l) => l.dag === dagKort);
  if (geenJudo && judoVandaag) {
    advies.tekst.push('🥋 Judovrij (vakantie) — geen training of les vandaag.');
  }

  // Welke sporten een actieve blessure afraadt (zie BLESSURE_REGIOS) — voedt
  // zowel de sportcoach-keuze als het fietsadvies hieronder.
  const vermijdSporten = vermijdSportenVanBlessures(blessures, datum);
  if (judoVandaag && !geenJudo && vermijdSporten.includes('judo')) {
    advies.tekst.push('⚠️ Judo staat gepland, maar een actieve blessure raadt dit af — overweeg te schrappen of aan te passen.');
  }
  blessures.forEach((b) => {
    if (isVerlopenNietGemeld(b, datum)) {
      advies.tekst.push(`ℹ️ Blessure “${b.titel || b.naam || 'onbenoemd'}” liep af op ${b.eindDatum} — controleer of die echt voorbij is.`);
    }
  });

  // 5b) Sportcoach: concreet trainingsblok voor vandaag, zodat het advies van
  //     de coach ook echt in het dagschema staat (niet enkel op de coach-pagina).
  //     Judo heeft hierboven al een eigen vast blok; rustdagen krijgen geen blok.
  if (coachNiveau) {
    const keuze = kiesSportVanDag({ dagKort, weekSchema: sport.weekSchema, niveau: coachNiveau, judoVandaag: judoVandaag && !geenJudo, weer, vermijdSporten });
    if (keuze.sport !== 'rust' && keuze.sport !== 'judo') {
      const inhoud = genereerSportInhoud({
        sport: keuze.sport, niveau: coachNiveau, oefeningen: sport.oefeningen,
        garmin, stappenDoel: gezondheid.stappenDoel, datum, weer,
      });
      const duurMin = inhoud.minuten || { hard: 50, matig: 40, rustig: 30, herstel: 20 }[coachNiveau] || 40;
      const sportStart = werkEindTijd ? addMin(werkEindTijd, 15) : addMin(opstaan, 90);
      const detail = inhoud.type === 'homefitness'
        ? (inhoud.oefeningen.length ? inhoud.oefeningen.map((o) => `${o.naam} ${o.sets}×${o.reps}`).join(', ') : inhoud.waarom[0])
        : inhoud.type === 'fietsen'
          ? `±${inhoud.km} km (~${inhoud.minuten} min) · ${inhoud.zoneTekst}`
          : inhoud.stappenAdvies != null
            ? `Nog ±${Math.round(inhoud.stappenAdvies).toLocaleString('nl-BE')} stappen (±${inhoud.km} km)`
            : `±${inhoud.km} km`;
      maakBlok(blok, sportStart, addMin(sportStart, duurMin), SPORTEN[keuze.sport]?.naam || 'Training', 'sport',
        { bron: 'sportcoach', detail, id: 'sportcoach-blok' });
      if (keuze.overschreven) advies.tekst.push(`🏋️ ${keuze.waarom.join(' ')}`);
    }
  }

  // 5c) Reva: één blok per actieve blessure, met die dag eerlijk-geroteerde
  //     selectie oefeningen als checklist — zichtbaar bij "vandaag".
  const actieveBlessures = blessures.filter((b) => isBlessureActief(b, datum));
  actieveBlessures.forEach((b, i) => {
    const oefeningen = kiesOefeningenVanDag({ oefeningen: b.oefeningen || [], aantalPerDag: b.aantalPerDag, datum });
    if (!oefeningen.length) return;
    const duurMin = blessureBlokDuur(oefeningen.length);
    const start = b.tijd || addMin(opstaan, 60);
    maakBlok(blok, start, addMin(start, duurMin), `Reva — ${b.titel || b.naam || 'oefeningen'}`, 'reva', {
      bron: 'reva', id: `reva-${b.id || i}`, blessureId: b.id || null,
      oefeningen: oefeningen.map((o) => ({ id: o.id, naam: o.naam, sets: o.sets || null })),
      detail: oefeningen.map((o) => o.naam).join(', '),
    });
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

  // 8) Afbouwen + slaap. Het slaapblok loopt van bedtijd tot het opstaan-uur
  //    (over middernacht heen), niet een betekenisloos 1-minuut-blok.
  const slaapDuurMin = ((toMin(opstaan) - toMin(slapen)) + 1440) % 1440 || 480;
  maakBlok(blok, addMin(slapen, -30), slapen, 'Afbouwen — scherm weg, klaarmaken', 'scherm', { bron: 'routine' });
  maakBlok(blok, slapen, opstaan, 'Slapen', 'slaap',
    { bron: 'routine', push: true, detail: `±${(slaapDuurMin / 60).toFixed(1).replace('.0', '')}u tot ${opstaan}` });

  // Sorteer op starttijd
  blok.sort((a, b) => toMin(a.start) - toMin(b.start));

  // Vul gaten tussen einde werk/sport en afbouwen met "vrije tijd"
  vulVrijeTijd(blok, slapen);

  // Advies
  const fietsAdvies = berekenFietsAdvies({ sport, blessureActief, vermijdSporten, garmin, weer });
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

  // Conflictdetectie tussen vaste/belangrijke blokken (overlap in tijd).
  const conflicten = detecteerConflicten(blok);
  conflicten.forEach((c) => advies.tekst.push(`⚠️ Conflict: “${c.a}” overlapt met “${c.b}”.`));

  return { blokken: blok, todos, advies, conflicten };
}

function detecteerConflicten(blok) {
  const belangrijk = blok.filter((b) =>
    b.vast || ['judo', 'agenda', 'werk'].includes(b.bron) || ['judo', 'lesgeven', 'voetbal', 'sport'].includes(b.type)
  );
  const conflicten = [];
  for (let i = 0; i < belangrijk.length; i++) {
    for (let j = i + 1; j < belangrijk.length; j++) {
      const a = belangrijk[i], b = belangrijk[j];
      if (toMin(a.start) < toMin(b.eind) && toMin(a.eind) > toMin(b.start)) {
        a.conflict = true; b.conflict = true;
        conflicten.push({ a: a.titel, b: b.titel });
      }
    }
  }
  return conflicten;
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
