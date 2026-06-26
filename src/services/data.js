// Firestore-datalaag. Alles leeft onder users/{uid}/...
import {
  doc, getDoc, getDocFromCache, setDoc, updateDoc, deleteDoc, collection, getDocs,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_INSTELLINGEN } from '../config/appConfig';

const u = (uid, ...rest) => ['users', uid, ...rest];

// ---- Instellingen (één doc per rubriek) ----
export async function getInstellingen(uid) {
  const rubrieken = Object.keys(DEFAULT_INSTELLINGEN);
  const result = {};
  await Promise.all(rubrieken.map(async (r) => {
    const snap = await getDoc(doc(db, ...u(uid, 'instellingen', r)));
    result[r] = { ...DEFAULT_INSTELLINGEN[r], ...(snap.exists() ? snap.data() : {}) };
  }));
  return result;
}

export async function saveInstellingen(uid, rubriek, data) {
  await setDoc(doc(db, ...u(uid, 'instellingen', rubriek)),
    { ...data, bijgewerktOp: serverTimestamp() }, { merge: true });
}

// Seedt defaults + voorbeelddata bij allereerste login.
export async function seedDefaultsIfNeeded(uid, profiel) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data()?.geseed) return;

  const batch = writeBatch(db);
  batch.set(userRef, {
    email: profiel?.email || null,
    naam: profiel?.naam || null,
    geseed: true,
    aangemaaktOp: serverTimestamp(),
  }, { merge: true });

  for (const [rubriek, data] of Object.entries(DEFAULT_INSTELLINGEN)) {
    batch.set(doc(db, ...u(uid, 'instellingen', rubriek)), data, { merge: true });
  }

  // Voorbeeld-gewoontes om mee te starten (in-app aanpasbaar).
  const seedTaken = [
    { titel: 'Reva-oefeningen', type: 'gewoonte', dagen: ['ma', 'wo', 'vr'], tijd: '07:10', blokType: 'reva', icoon: 'reva', volgorde: 1, actief: true },
    { titel: 'Water drinken (2,5 L)', type: 'gewoonte', dagen: ['ma','di','wo','do','vr','za','zo'], tijd: null, blokType: 'routine', volgorde: 2, actief: true },
    { titel: 'Geen scrollen na 22:00', type: 'gewoonte', dagen: ['ma','di','wo','do','vr','za','zo'], tijd: '22:00', blokType: 'scherm', volgorde: 3, actief: true },
    { titel: 'Maaltijd voorbereiden', type: 'gewoonte', dagen: ['zo'], tijd: '17:00', blokType: 'maaltijd', volgorde: 4, actief: true },
  ];
  seedTaken.forEach((t, i) => {
    batch.set(doc(db, ...u(uid, 'taken', `seed${i}`)),
      { ...t, streak: 0, beste: 0, aangemaaktOp: serverTimestamp() });
  });

  await batch.commit();
}

// ---- Generieke collectie-CRUD ----
export function subscribeCollection(uid, naam, cb) {
  return onSnapshot(collection(db, ...u(uid, naam)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function getCollection(uid, naam) {
  const snap = await getDocs(collection(db, ...u(uid, naam)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addItem(uid, naam, data) {
  const ref = doc(collection(db, ...u(uid, naam)));
  await setDoc(ref, { ...data, aangemaaktOp: serverTimestamp() });
  return ref.id;
}

export async function setItem(uid, naam, id, data) {
  await setDoc(doc(db, ...u(uid, naam, id)), data, { merge: true });
}

export async function updateItem(uid, naam, id, data) {
  await updateDoc(doc(db, ...u(uid, naam, id)), data);
}

export async function deleteItem(uid, naam, id) {
  await deleteDoc(doc(db, ...u(uid, naam, id)));
}

export async function getDocById(uid, naam, id) {
  const snap = await getDoc(doc(db, ...u(uid, naam, id)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---- Dag-plan (één doc per datum) ----
export async function getDag(uid, datum) {
  return getDocById(uid, 'dagen', datum);
}
export async function saveDag(uid, datum, data) {
  await setDoc(doc(db, ...u(uid, 'dagen', datum)),
    { ...data, datum, bijgewerktOp: serverTimestamp() }, { merge: true });
}

// Dag-doc cache-eerst (historische dagen wijzigen niet meer → bespaart reads).
export async function getDagCached(uid, datum) {
  const ref = doc(db, ...u(uid, 'dagen', datum));
  try {
    const c = await getDocFromCache(ref);
    if (c.exists()) return { id: c.id, ...c.data() };
  } catch { /* nog niet in cache */ }
  const s = await getDoc(ref);
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

// ---- Garmin (alleen-lezen) ----
export async function getGarminDag(uid, datum) {
  return getDocById(uid, 'garminDaily', datum);
}

// Garmin-dag uit cache eerst (historische dagen wijzigen nooit → bespaart reads).
export async function getGarminDagCached(uid, datum) {
  const ref = doc(db, ...u(uid, 'garminDaily', datum));
  try {
    const c = await getDocFromCache(ref);
    if (c.exists()) return { id: c.id, ...c.data() };
  } catch { /* nog niet in cache */ }
  const s = await getDoc(ref);
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

// Meest recente Garmin-dag + tijdstip van laatste sync (voor "laatst gesynct").
export async function getLaatsteGarminSync(uid) {
  try {
    const snap = await getDocs(query(
      collection(db, ...u(uid, 'garminDaily')), orderBy('date', 'desc'), limit(1),
    ));
    if (snap.empty) return null;
    const d = snap.docs[0].data();
    return {
      datum: d.date || snap.docs[0].id,
      syncedAt: d.syncedAt?.toDate ? d.syncedAt.toDate() : null,
    };
  } catch {
    return null;
  }
}

// ---- Agenda-events uit ICS (alleen-lezen) ----
export async function getAgendaEventsVoorDag(uid, datum) {
  const snap = await getDocs(query(
    collection(db, ...u(uid, 'agendaEvents')),
    where('datum', '==', datum),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export { serverTimestamp };
