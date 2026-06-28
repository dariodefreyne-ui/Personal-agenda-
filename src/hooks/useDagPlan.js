import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  getCollection, getDocById, getGarminDag, getWeer, getDagCached,
  getAgendaEventsVoorDag, saveDag, getLaatsteGarminSync, getVakanties, verwijderVerzet,
  verwijderSlaapOverride,
} from '../services/data';
import { genereerDagPlan } from '../services/planner';
import { garminSamenvatting } from '../services/garmin';
import { vakantieFlags } from '../services/vakanties';
import { zetTaakGedaan } from '../services/taken';
import { coachAdvies } from '../services/coach';
import { isBlessureActief, vermijdSportenVanBlessures } from '../services/blessures';
import { revaTherapietrouw } from '../services/noordster';
import { acwrBerekenen, sessieBelasting, belastingStatus } from '../services/belasting';
import { periodiseringBepalen } from '../services/periodisering';
import { datumKey, dagKortVanDatum, weekKey, toMin, toHHMM, nuMin } from '../services/tijd';

// Past een handmatige slaap-correctie toe op de Garmin-samenvatting (begin/eind
// + herberekende duur). Garmin's nachtmeting kan een uur mis zitten; de gebruiker
// mag dat rechtzetten zonder op een nieuwe sync te wachten.
function metSlaapOverride(garminSam, override) {
  if (!garminSam || !override?.begin || !override?.eind) return garminSam;
  let duurMin = toMin(override.eind) - toMin(override.begin);
  if (duurMin <= 0) duurMin += 24 * 60; // slaap loopt over middernacht
  return { ...garminSam, slaapBegin: override.begin, slaapEind: override.eind, slaapUren: duurMin / 60, slaapOverride: true };
}

// Laadt alle dagdata, berekent het plan en biedt afvink-acties.
export function useDagPlan(datumObj = new Date()) {
  const { user } = useAuth();
  const { instellingen, laden: instLaden } = useSettings();
  const uid = user?.uid;
  const datum = datumKey(datumObj);
  const dagKort = dagKortVanDatum(datumObj);

  const [staat, setStaat] = useState({ laden: true });
  const [versie, setVersie] = useState(0);

  useEffect(() => {
    if (!uid || instLaden || !instellingen) return;
    let actief = true;
    (async () => {
      setStaat((s) => ({ ...s, laden: true }));
      const [taken, reva, blessures, maaltijden, garmin, agendaEvents, dag, week, vakanties, garminSync, weer, acts, logs] = await Promise.all([
        getCollection(uid, 'taken'),
        getCollection(uid, 'reva'),
        getCollection(uid, 'blessures'),
        getCollection(uid, 'maaltijden'),
        getGarminDag(uid, datum),
        getAgendaEventsVoorDag(uid, datum),
        getDocById(uid, 'dagen', datum),
        getDocById(uid, 'weken', weekKey(datumObj)),
        getVakanties(uid),
        getLaatsteGarminSync(uid),
        getWeer(uid, datum),
        getCollection(uid, 'garminActivities'),
        getCollection(uid, 'activiteitLog'),
      ]);

      // Vlaggen over ÁLLE overlappende vakantieperiodes (zie vakantieFlags).
      const { verlof, geenJudo, buitenland } = vakantieFlags(vakanties, datum);
      const vakantieType = verlof ? (buitenland ? 'buitenland' : 'thuis') : null;
      const isWeekend = dagKort === 'za' || dagKort === 'zo';
      // Effectief dagtype: verlofperiode wint altijd, ook over een eerder gezette
      // expliciete dagmodus (retroactief verlof mag geen ingepland werk laten staan).
      // Zonder verlof: expliciete keuze, anders weekend -> 'vrij'.
      let werkModus = verlof ? 'verlof' : (week?.dagen?.[dagKort] || null);
      if (!werkModus && isWeekend) werkModus = 'vrij';
      const blessureActief = (blessures || []).some((b) => isBlessureActief(b, datum));
      const vermijdSporten = vermijdSportenVanBlessures(blessures, datum);
      const isVakantie = !!week?.vakantie || verlof;

      // Adaptieve feedback-loop voor reva: als de voorbije dagen de oefeningen
      // structureel zijn gemist, signaleren we dat — niet om te straffen, maar
      // omdat een blessure die niet wordt nageleefd net het risico is dat we
      // willen vermijden (premium-principe 6: adaptief, met feedback-loops).
      let revaTrouw = null;
      if (blessureActief) {
        const vorigeData = new Date(datumObj);
        const vorigeDagen = await Promise.all([1, 2, 3].map((n) => {
          const d = new Date(vorigeData);
          d.setDate(d.getDate() - n);
          return getDagCached(uid, datumKey(d));
        }));
        revaTrouw = revaTherapietrouw(vorigeDagen).score;
      }
      const garminSam = metSlaapOverride(garminSamenvatting(garmin), dag?.slaapOverride);

      // Periodisering (ACWR) + overbelasting: dezelfde signalen die de coach op
      // het Dashboard al gebruikt, zodat het sportadvies overal consistent is.
      const rpeMap = Object.fromEntries((logs || []).map((l) => [l.id, l.rpe]));
      const acwr = acwrBerekenen(sessieBelasting(acts, rpeMap));
      const overbelast = belastingStatus({ trainingStatus: garminSam?.trainingStatus }).key === 'overbelast';
      const periodisering = periodiseringBepalen(datumObj);
      const advies = coachAdvies({
        readiness: garminSam?.readiness ?? null,
        bodyBattery: garminSam?.bodyBattery ?? null,
        slaapUren: garminSam?.slaapUren ?? null,
        energie: dag?.checkin?.ochtend?.energie ?? null,
        hrvStatus: garminSam?.hrvStatus ?? null,
        goal: instellingen.gezondheid?.doel,
        blessureActief, overbelast, acwrZone: acwr?.zone,
        pijn: typeof dag?.checkin?.pijn === 'number' && dag.checkin.pijn > 0 ? dag.checkin.pijn : null,
        periodiseringFase: periodisering.fase,
        vakantieType,
      });

      const plan = genereerDagPlan({
        datum, dagKort, instellingen, werkModus,
        taken, reva, blessures, maaltijden, agendaEvents, garmin: garminSam,
        weer, blessureActief, isVakantie, geenJudo, coachNiveau: advies.niveau, revaTrouw,
      });

      // Adaptief: verzette (ingehaalde) blokken krijgen hun nieuwe tijd. Zo "faalt"
      // een gemist blok niet stil, maar schuift het naar later op de dag.
      const verzet = dag?.verzet || {};
      if (Object.keys(verzet).length) {
        plan.blokken = plan.blokken
          .map((b) => (verzet[b.id] ? { ...b, start: verzet[b.id].start, eind: verzet[b.id].eind, verzet: true } : b))
          .sort((a, b) => toMin(a.start) - toMin(b.start));
      }

      if (!actief) return;
      setStaat({
        laden: false, plan, instellingen, garmin: garminSam, taken,
        gedaan: dag?.gedaan || {}, checkin: dag?.checkin || null, verzet,
        werkModus, datum, dagKort, blessureActief, blessures, vermijdSporten, garminSync, acwr, periodisering, advies, weer, vakantieType,
      });

      // Persisteer het plan zodat de Cloud Functions slot-herinneringen kunnen
      // sturen (ook als de app vandaag niet meer geopend wordt).
      if (datum === datumKey(new Date())) {
        const sleutelTypes = new Set(['judo', 'lesgeven', 'sport', 'reva', 'maaltijd', 'slaap', 'voetbal']);
        // checkbaar = exact dezelfde definitie als op het dashboard, zodat de
        // North Star-score (therapietrouw) op afvinkbare blokken klopt.
        const isCheckbaar = (b) => ['taak', 'judo', 'agenda'].includes(b.bron) || b.type === 'sport' || b.type === 'reva';
        const minimaal = plan.blokken.map((b) => ({
          id: b.id, start: b.start, eind: b.eind, titel: b.titel, type: b.type,
          push: b.push !== false, detail: b.detail || null,
          sleutel: sleutelTypes.has(b.type), checkbaar: isCheckbaar(b),
          // Oefening-id's bewaren zodat de North Star-score een reva-blok met
          // checklist pas als "gedaan" telt wanneer alle oefeningen zijn afgevinkt.
          oefeningen: b.oefeningen?.length ? b.oefeningen.map((o) => o.id) : null,
        }));
        // Alleen schrijven als het plan echt veranderd is — bespaart Firestore-writes.
        if (JSON.stringify(minimaal) !== JSON.stringify(dag?.plan || null)) {
          saveDag(uid, datum, { plan: minimaal, planOp: new Date().toISOString() }).catch(() => {});
        }
      }
    })();
    return () => { actief = false; };
  }, [uid, datum, dagKort, versie, instellingen, instLaden]); // eslint-disable-line react-hooks/exhaustive-deps

  // Blok afvinken (opgeslagen in dagen/{datum}.gedaan) + streak voor taak-blokken.
  const toggleBlok = useCallback(async (blokId, taakId) => {
    if (!uid) return;
    const huidig = !!staat.gedaan?.[blokId];
    const nieuw = !huidig;
    const gedaan = { ...(staat.gedaan || {}), [blokId]: nieuw };
    setStaat((s) => ({ ...s, gedaan }));
    await saveDag(uid, datum, { gedaan });
    if (taakId) {
      const taak = staat.taken?.find((t) => t.id === taakId);
      if (taak) await zetTaakGedaan(uid, taak, datum, nieuw).catch(() => {});
    }
  }, [uid, datum, staat.gedaan, staat.taken]);

  // Check-in (stemming/energie 's ochtends, reflectie 's avonds) bewaren.
  // `deel` is bv. { ochtend: {...} } of { avond: {...} }; wordt samengevoegd.
  const bewaarCheckin = useCallback(async (deel) => {
    if (!uid) return;
    const nieuw = { ...(staat.checkin || {}), ...deel };
    setStaat((s) => ({ ...s, checkin: nieuw }));
    await saveDag(uid, datum, { checkin: nieuw });
  }, [uid, datum, staat.checkin]);

  // Een gemist (sleutel)blok inhalen: verschuif het naar het eerstvolgende
  // kwartier na nu, voor dezelfde duur. Opgeslagen in dagen/{datum}.verzet.
  const verzetBlok = useCallback(async (blokId) => {
    if (!uid) return;
    const blok = staat.plan?.blokken?.find((b) => b.id === blokId);
    if (!blok) return;
    const duur = Math.max(15, toMin(blok.eind) - toMin(blok.start));
    const startMin = Math.min(23 * 60 + 45 - duur, Math.ceil((nuMin() + 5) / 15) * 15);
    const nieuwTijd = { start: toHHMM(startMin), eind: toHHMM(startMin + duur) };
    const verzet = { ...(staat.verzet || {}), [blokId]: nieuwTijd };
    setStaat((s) => ({ ...s, verzet }));
    await saveDag(uid, datum, { verzet });
    herlaad();
  }, [uid, datum, staat.plan, staat.verzet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Direct een blok-tijd corrigeren — in tegenstelling tot verzetBlok (dat altijd
  // naar "later vandaag" schuift) zet dit een willekeurig gekozen start/eind,
  // op élke dag (ook voorbije). Opgeslagen in dagen/{datum}.verzet, net als verzetBlok.
  const wijzigBlokTijd = useCallback(async (blokId, start, eind) => {
    if (!uid) return;
    const verzet = { ...(staat.verzet || {}), [blokId]: { start, eind } };
    setStaat((s) => ({ ...s, verzet }));
    await saveDag(uid, datum, { verzet });
    herlaad();
  }, [uid, datum, staat.verzet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Herstelt een blok naar zijn oorspronkelijk gepland tijdstip.
  const herstelBlokTijd = useCallback(async (blokId) => {
    if (!uid) return;
    const verzet = { ...(staat.verzet || {}) };
    delete verzet[blokId];
    setStaat((s) => ({ ...s, verzet }));
    await verwijderVerzet(uid, datum, blokId);
    herlaad();
  }, [uid, datum, staat.verzet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Slaap-begin/eind handmatig corrigeren — Garmin's nachtmeting zit soms mis.
  const wijzigSlaap = useCallback(async (begin, eind) => {
    if (!uid) return;
    const slaapOverride = { begin, eind };
    setStaat((s) => ({ ...s, garmin: metSlaapOverride(s.garmin, slaapOverride) }));
    await saveDag(uid, datum, { slaapOverride });
  }, [uid, datum]);

  // Herstelt de slaaptijden naar wat Garmin zelf meet (volgende herlaad).
  const herstelSlaap = useCallback(async () => {
    if (!uid) return;
    await verwijderSlaapOverride(uid, datum);
    herlaad();
  }, [uid, datum]); // eslint-disable-line react-hooks/exhaustive-deps

  const herlaad = useCallback(() => setVersie((v) => v + 1), []);

  return { ...staat, toggleBlok, bewaarCheckin, verzetBlok, wijzigBlokTijd, herstelBlokTijd, wijzigSlaap, herstelSlaap, herlaad };
}
