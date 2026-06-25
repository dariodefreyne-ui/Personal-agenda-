// Client-side push: toestemming vragen, FCM-token ophalen en opslaan onder
// users/{uid}/pushTokens/{token}. De Cloud Functions sturen hiernaar.
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import app, { db } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;
let _messaging = null;
const messagingInstance = () => (_messaging ||= getMessaging(app));

export async function pushOndersteund() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  try { return await isSupported(); } catch { return false; }
}

export async function activeerPush(uid) {
  if (!(await pushOndersteund())) throw new Error('Deze browser/toestel ondersteunt geen push. Voeg de app eerst toe aan je beginscherm.');
  if (!VAPID_KEY) throw new Error('VAPID-sleutel ontbreekt (VITE_VAPID_KEY).');

  const permissie = await Notification.requestPermission();
  if (permissie !== 'granted') throw new Error('Meldingen niet toegestaan.');

  // Firebase registreert zelf /firebase-messaging-sw.js
  const token = await getToken(messagingInstance(), { vapidKey: VAPID_KEY });
  if (!token) throw new Error('Geen push-token ontvangen.');

  await setDoc(doc(db, 'users', uid, 'pushTokens', token), {
    token, actief: true, platform: 'web',
    device: navigator.userAgent.slice(0, 120),
    bijgewerktOp: serverTimestamp(),
  }, { merge: true });

  return token;
}

export async function luisterVoorgrond(cb) {
  if (!(await pushOndersteund())) return () => {};
  return onMessage(messagingInstance(), (payload) => cb?.(payload));
}
