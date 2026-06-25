import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { subscribeCollection, addItem, updateItem, deleteItem } from '../services/data';
import { BLOK_TYPES, DAGEN, DAG_NAMEN } from '../config/appConfig';
import { IcoPlus, IcoTrash, IcoEdit, IcoFlame } from '../components/Icons';

const LEEG = { titel: '', type: 'gewoonte', dagen: [...DAGEN], tijd: '', blokType: 'routine', duurMin: 15, actief: true };

export default function Taken() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taken, setTaken] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(LEEG);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeCollection(user.uid, 'taken', (items) =>
      setTaken(items.sort((a, b) => (a.volgorde || 99) - (b.volgorde || 99))));
  }, [user]);

  const start = (t) => {
    if (t) { setEditId(t.id); setForm({ ...LEEG, ...t, tijd: t.tijd || '' }); }
    else { setEditId(null); setForm(LEEG); }
    setOpen(true);
  };

  const bewaar = async () => {
    if (!form.titel.trim()) return toast('Geef een titel.');
    const payload = {
      titel: form.titel.trim(), type: form.type, dagen: form.dagen,
      tijd: form.tijd || null, blokType: form.blokType, duurMin: Number(form.duurMin) || 15,
      actief: form.actief !== false,
    };
    if (editId) await updateItem(user.uid, 'taken', editId, payload);
    else await addItem(user.uid, 'taken', { ...payload, streak: 0, beste: 0, volgorde: taken.length + 1 });
    setOpen(false);
    toast('Bewaard.');
  };

  const verwijder = async (id) => {
    await deleteItem(user.uid, 'taken', id);
    toast('Verwijderd.');
  };

  const toggleDag = (d) =>
    setForm((f) => ({ ...f, dagen: f.dagen.includes(d) ? f.dagen.filter((x) => x !== d) : [...f.dagen, d] }));

  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ margin: 0 }}>Taken & gewoontes</h1>
        <button className="btn primary sm" onClick={() => start(null)}><IcoPlus width={18} height={18} /> Nieuw</button>
      </div>

      {taken.length === 0 && <div className="empty">Nog geen taken. Voeg je eerste gewoonte toe.</div>}

      <div className="stack" style={{ gap: 10 }}>
        {taken.map((t) => (
          <div className="card tight row between" key={t.id} style={{ opacity: t.actief === false ? 0.55 : 1 }}>
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: BLOK_TYPES[t.blokType]?.kleur || 'var(--primary)' }} />
                <span style={{ fontWeight: 600 }}>{t.titel}</span>
                {t.type === 'gewoonte' && t.streak > 0 && (
                  <span className="badge warn small"><IcoFlame width={12} height={12} /> {t.streak}</span>
                )}
              </div>
              <div className="small dim">
                {t.type === 'gewoonte' ? 'Gewoonte' : 'Eenmalig'}
                {t.tijd ? ` · ${t.tijd}` : ' · geen vast uur'}
                {' · '}{t.dagen?.length === 7 ? 'elke dag' : (t.dagen || []).join(', ')}
              </div>
            </div>
            <div className="row" style={{ gap: 2 }}>
              <button className="icon-btn" onClick={() => start(t)} aria-label="Bewerken"><IcoEdit width={18} height={18} /></button>
              <button className="icon-btn" onClick={() => verwijder(t.id)} aria-label="Verwijderen"><IcoTrash width={18} height={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="card stack" style={{ position: 'fixed', inset: 'auto 12px 90px 12px', maxWidth: 820, margin: '0 auto', zIndex: 50 }}>
          <h2 style={{ margin: 0 }}>{editId ? 'Taak bewerken' : 'Nieuwe taak'}</h2>
          <div className="field">
            <label>Titel</label>
            <input className="input" value={form.titel} onChange={(e) => setForm({ ...form, titel: e.target.value })} placeholder="bv. Reva-oefeningen" />
          </div>
          <div className="row wrap" style={{ gap: 12 }}>
            <div className="field grow">
              <label>Type</label>
              <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="gewoonte">Gewoonte (streak)</option>
                <option value="eenmalig">Eenmalig</option>
              </select>
            </div>
            <div className="field grow">
              <label>Categorie/kleur</label>
              <select className="select" value={form.blokType} onChange={(e) => setForm({ ...form, blokType: e.target.value })}>
                {Object.entries(BLOK_TYPES).map(([k, v]) => <option key={k} value={k}>{v.naam}</option>)}
              </select>
            </div>
            <div className="field" style={{ width: 110 }}>
              <label>Tijd</label>
              <input className="input" type="time" value={form.tijd} onChange={(e) => setForm({ ...form, tijd: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Op welke dagen?</label>
            <div className="row wrap" style={{ gap: 6 }}>
              {DAGEN.map((d) => (
                <button key={d} className={'btn sm' + (form.dagen.includes(d) ? ' primary' : '')}
                  onClick={() => toggleDag(d)} type="button" title={DAG_NAMEN[d]}>{d}</button>
              ))}
            </div>
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
