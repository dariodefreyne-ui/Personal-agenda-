import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  getCollection, getDocById, getGarminDag,
  getAgendaEventsVoorDag, saveDag, getLaatsteGarminSync, getVakanties,
} from '../services/data';
import { genereerDagPlan } from '../services/planner';
import { garminSamenvatting } from '../services/garmin';
import { vakantieFlags } from '../services/vakanties';
import { zetTaakGedaan } from '../services/taken';
import { datumKey, dagKortVanDatum, weekKey, toMin, toHHMM, nuMin } from '../services/tijd';

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
      const [taken, reva, maaltijden, garmin, agendaEvents, dag, week, vakanties, garminSync] = await Promise.all([
        getCollection(uid, 'taken'),
        getCollection(uid, 'reva'),
        getCollection(uid, 'maaltijden'),
        getGarminDag(uid, datum),
        getAgendaEventsVoorDag(uid, datum),
        getDocById(uid, 'dagen', datum),
        getDocById(uid, 'weken', weekKey(datumObj)),
        getVakanties(uid),
        getLaatsteGarminSync(uid),
      ]);

      // Vlaggen over ÁLLE overlappende vakantieperiodes (zie vakantieFlags).
      const { verlof, geenJudo } = vakantieFlags(vakanties, datum);
      const isWeekend = dagKort === 'za' || dagKort === 'zo';
      // Effectief dagtype: verlofperiode wint altijd, ook over een eerder gezette
      // expliciete dagmodus (retroactief verlof mag geen ingepland werk laten staan).
      // Zonder verlof: expliciete keuze, anders weekend -> 'vrij'.
      let werkModus = verlof ? 'verlof' : (week?.dagen?.[dagKort] || null);
      if (!werkModus && isWeekend) werkModus = 'vrij';
      const blessureActief = (reva || []).some((r) => r.blessureActief);
      const isVakantie = !!week?.vakantie || verlof;
      const garminSam = garminSamenvatting(garmin);

      const plan = genereerDagPlan({
        datum, dagKort, instellingen, werkModus,
        taken, reva, maaltijden, agendaEvents, garmin: garminSam,
        weer: null, blessureActief, isVakantie, geenJudo,
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
        werkModus, datum, dagKort, blessureActief, garminSync,
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

  const herlaad = useCallback(() => setVersie((v) => v + 1), []);

  return { ...staat, toggleBlok, bewaarCheckin, verzetBlok, herlaad };
}
