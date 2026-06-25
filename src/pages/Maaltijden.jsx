import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  subscribeCollection, addItem, updateItem, deleteItem,
  getInstellingen, getDocById, saveDag,
} from '../services/data';
import { datumKey } from '../services/tijd';
import { IcoPlus, IcoTrash, IcoEdit, IcoFork } from '../components/Icons';

const TYPES = { ontbijt: 'Ontbijt', lunch: 'Lunch', diner: 'Diner', snack: 'Snack' };
const LEEG = { naam: '', type: 'lunch', eiwitG: 25, kcal: 500 };

export default function Maaltijden() {
  const { user } = useAuth();
  const { toast } = useToast();
  const datum = datumKey(new Date());
  const [maaltijden, setMaaltijden] = useState([]);
  const [doelen, setDoelen] = useState({ eiwitDoelG: 110, waterDoelL: 2.5 });
  const [voeding, setVoeding] = useState({ eiwitG: 0, waterL: 0 });
  const [form, setForm] = useState(LEEG);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    getInstellingen(user.uid).then((I) => setDoelen(I.gezondheid));
    getDocById(user.uid, 'dagen', datum).then((d) => { if (d?.voeding) setVoeding(d.voeding); });
    return subscribeCollection(user.uid, 'maaltijden', setMaaltijden);
  }, [user, datum]);

  const bewaarVoeding = async (patch) => {
    const v = { ...voeding, ...patch };
    setVoeding(v);
    await saveDag(user.uid, datum, { voeding: v });
  };

  const start = (m) => {
    if (m) { setEditId(m.id); setForm({ ...LEEG, ...m }); }
    else { setEditId(null); setForm(LEEG); }
    setOpen(true);
  };
  const bewaar = async () => {
    if (!form.naam.trim()) return toast('Geef een naam.');
    const payload = { naam: form.naam.trim(), type: form.type, eiwitG: Number(form.eiwitG) || 0, kcal: Number(form.kcal) || 0 };
    if (editId) await updateItem(user.uid, 'maaltijden', editId, payload);
    else await addItem(user.uid, 'maaltijden', payload);
    setOpen(false); toast('Bewaard.');
  };

  const eiwitPct = Math.min(100, Math.round((voeding.eiwitG / (doelen.eiwitDoelG || 110)) * 100));
  const waterPct = Math.min(100, Math.round((voeding.waterL / (doelen.waterDoelL || 2.5)) * 100));

  return (
    <div className="stack reveal">
      <h1 style={{ margin: 0 }}>Maaltijden & voeding</h1>

      {/* Dagtracking */}
      <section className="card stack">
        <div className="card-title">Vandaag</div>
        <Tracker label="Eiwit" waarde={voeding.eiwitG} doel={doelen.eiwitDoelG} eenheid="g" pct={eiwitPct}
          stap={10} onPlus={() => bewaarVoeding({ eiwitG: (voeding.eiwitG || 0) + 10 })}
          onMin={() => bewaarVoeding({ eiwitG: Math.max(0, (voeding.eiwitG || 0) - 10) })} />
        <Tracker label="Water" waarde={voeding.waterL} doel={doelen.waterDoelL} eenheid="L" pct={waterPct}
          stap={0.25} onPlus={() => bewaarVoeding({ waterL: Math.round(((voeding.waterL || 0) + 0.25) * 100) / 100 })}
          onMin={() => bewaarVoeding({ waterL: Math.max(0, Math.round(((voeding.waterL || 0) - 0.25) * 100) / 100) })} />
      </section>

      {/* Maaltijdenbibliotheek */}
      <section className="stack" style={{ gap: 10 }}>
        <div className="row between">
          <h2 style={{ margin: 0 }}>Mijn maaltijden</h2>
          <button className="btn primary sm" onClick={() => start(null)}><IcoPlus width={18} height={18} /> Nieuw</button>
        </div>
        {maaltijden.length === 0 && <div className="empty">Nog geen maaltijden. Voeg je vaste gerechten toe.</div>}
        {maaltijden.map((m) => (
          <div className="card tight row between" key={m.id}>
            <div className="row" style={{ gap: 10, minWidth: 0 }}>
              <IcoFork width={18} height={18} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontWeight: 600 }}>{m.naam}</div>
                <div className="small dim">{TYPES[m.type] || m.type} · {m.eiwitG}g eiwit · {m.kcal} kcal</div>
              </div>
            </div>
            <div className="row" style={{ gap: 2 }}>
              <button className="icon-btn" onClick={() => bewaarVoeding({ eiwitG: (voeding.eiwitG || 0) + (m.eiwitG || 0) })}
                title="Vandaag gegeten (+eiwit)"><IcoPlus width={18} height={18} /></button>
              <button className="icon-btn" onClick={() => start(m)} aria-label="Bewerken"><IcoEdit width={18} height={18} /></button>
              <button className="icon-btn" onClick={() => deleteItem(user.uid, 'maaltijden', m.id)} aria-label="Verwijderen"><IcoTrash width={18} height={18} /></button>
            </div>
          </div>
        ))}
      </section>

      {open && (
        <div className="card stack" style={{ position: 'fixed', inset: 'auto 12px 90px 12px', maxWidth: 820, margin: '0 auto', zIndex: 50 }}>
          <h2 style={{ margin: 0 }}>{editId ? 'Maaltijd bewerken' : 'Nieuwe maaltijd'}</h2>
          <div className="field"><label>Naam</label>
            <input className="input" value={form.naam} onChange={(e) => setForm({ ...form, naam: e.target.value })} placeholder="bv. Kip met rijst" /></div>
          <div className="row wrap" style={{ gap: 12 }}>
            <div className="field grow"><label>Type</label>
              <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div className="field" style={{ width: 110 }}><label>Eiwit (g)</label>
              <input className="input" type="number" value={form.eiwitG} onChange={(e) => setForm({ ...form, eiwitG: e.target.value })} /></div>
            <div className="field" style={{ width: 110 }}><label>Kcal</label>
              <input className="input" type="number" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} /></div>
          </div>
          <div className="row between">
            <button className="btn ghost" onClick={() => setOpen(false)}>Annuleren</button>
            <button className="btn primary" onClick={bewaar}>Bewaren</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Tracker({ label, waarde, doel, eenheid, pct, onPlus, onMin }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row between">
        <span>{label}</span>
        <span className="small muted">{(waarde || 0)}{eenheid} / {doel}{eenheid}</span>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn sm" onClick={onMin}>−</button>
        <div className="progress grow"><span style={{ width: `${pct}%` }} /></div>
        <button className="btn sm" onClick={onPlus}>+</button>
      </div>
    </div>
  );
}
