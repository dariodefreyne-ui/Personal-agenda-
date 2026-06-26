import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  getCollection, getDocById, getGarminDag,
  getAgendaEventsVoorDag, saveDag, getLaatsteGarminSync,
} from '../services/data';
import { genereerDagPlan } from '../services/planner';
import { garminSamenvatting } from '../services/garmin';
import { vakantieVoorDatum } from '../services/vakanties';
import { zetTaakGedaan } from '../services/taken';
import { datumKey, dagKortVanDatum, weekKey } from '../services/tijd';

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
        getCollection(uid, 'vakanties'),
        getLaatsteGarminSync(uid),
      ]);

      const periode = vakantieVoorDatum(vakanties, datum);
      const isWeekend = dagKort === 'za' || dagKort === 'zo';
      // Effectief dagtype: expliciete keuze wint, anders verlofperiode -> 'verlof',
      // anders weekend -> 'vrij'. Zo wordt er tijdens verlof geen werk gepland.
      let werkModus = week?.dagen?.[dagKort] || null;
      if (!werkModus) {
        if (periode?.verlof) werkModus = 'verlof';
        else if (isWeekend) werkModus = 'vrij';
      }
      const blessureActief = (reva || []).some((r) => r.blessureActief);
      const isVakantie = !!week?.vakantie || !!periode?.verlof;
      const geenJudo = !!periode?.geenJudo;
      const garminSam = garminSamenvatting(garmin);

      const plan = genereerDagPlan({
        datum, dagKort, instellingen, werkModus,
        taken, reva, maaltijden, agendaEvents, garmin: garminSam,
        weer: null, blessureActief, isVakantie, geenJudo,
      });

      if (!actief) return;
      setStaat({
        laden: false, plan, instellingen, garmin: garminSam, taken,
        gedaan: dag?.gedaan || {}, werkModus, datum, dagKort, blessureActief, garminSync,
      });

      // Persisteer het plan zodat de Cloud Functions slot-herinneringen kunnen
      // sturen (ook als de app vandaag niet meer geopend wordt).
      if (datum === datumKey(new Date())) {
        const sleutelTypes = new Set(['judo', 'lesgeven', 'sport', 'reva', 'maaltijd', 'slaap', 'voetbal']);
        const minimaal = plan.blokken.map((b) => ({
          id: b.id, start: b.start, eind: b.eind, titel: b.titel, type: b.type,
          push: b.push !== false, detail: b.detail || null, sleutel: sleutelTypes.has(b.type),
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

  const herlaad = useCallback(() => setVersie((v) => v + 1), []);

  return { ...staat, toggleBlok, herlaad };
}
