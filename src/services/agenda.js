import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';

// Roept de Cloud Function aan die de ICS-links nu meteen inleest.
export async function syncAgendaNu() {
  const fns = getFunctions(app, 'europe-west1');
  const call = httpsCallable(fns, 'syncAgendaNu');
  const res = await call();
  return res.data; // { aantal, perLink: [{link, aantal|fout}], links }
}
