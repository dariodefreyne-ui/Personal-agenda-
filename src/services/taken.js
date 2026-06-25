// Afvinken van taken/gewoontes + streak-bijhouden.
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { datumKey } from './tijd';

const logId = (datum, taakId) => `${datum}_${taakId}`;

// Markeer een taak als (on)gedaan voor een dag en werk de streak bij.
export async function zetTaakGedaan(uid, taak, datumObj, gedaan) {
  const datum = typeof datumObj === 'string' ? datumObj : datumKey(datumObj);
  const logRef = doc(db, 'users', uid, 'takenLog', logId(datum, taak.id));
  await setDoc(logRef, { taakId: taak.id, datum, gedaan, op: serverTimestamp() }, { merge: true });

  // Streak alleen relevant voor gewoontes.
  if (taak.type !== 'gewoonte') return;

  const taakRef = doc(db, 'users', uid, 'taken', taak.id);
  const snap = await getDoc(taakRef);
  const t = snap.exists() ? snap.data() : {};
  const gisteren = vorigeDatum(datum);

  let streak = t.streak || 0;
  let beste = t.beste || 0;
  let laatste = t.laatsteGedaan || null;

  if (gedaan) {
    if (laatste === datum) return; // al geteld
    streak = laatste === gisteren ? streak + 1 : 1;
    laatste = datum;
    beste = Math.max(beste, streak);
  } else {
    // ongedaan maken van vandaag: stap één terug
    if (laatste === datum) {
      streak = Math.max(0, streak - 1);
      laatste = streak > 0 ? gisteren : null;
    }
  }
  await updateDoc(taakRef, { streak, beste, laatsteGedaan: laatste });
}

function vorigeDatum(datum) {
  const d = new Date(datum + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return datumKey(d);
}
