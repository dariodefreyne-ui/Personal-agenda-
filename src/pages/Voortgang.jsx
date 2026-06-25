import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getGarminDag, getCollection, subscribeCollection, addItem, updateItem, deleteItem } from '../services/data';
import { garminSamenvatting } from '../services/garmin';
import { doelProgress, doelKleur, huidigeWaarde, METRIEKEN } from '../services/doelen';
import { datumKey } from '../services/tijd';
import { IcoFlame, IcoBolt, IcoMoon, IcoPlus, IcoTrash } from '../components/Icons';
import Gauge from '../components/Gauge';

function laatsteDagen(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}
const LEEG = { titel: '', metric: 'vo2max', start: '', naar: '', huidige: '' };

export default function Voortgang() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reeks, setReeks] = useState([]);
  const [taken, setTaken] = useState([]);
  const [doelen, setDoelen] = useState([]);
  const [garminVandaag, setGarminVandaag] = useState(null);
  const [form, setForm] = useState(LEEG);
  const [open, setOpen] = useState(false);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const dagen = laatsteDagen(7);
      const garmin = await Promise.all(dagen.map((d) => getGarminDag(user.uid, datumKey(d))));
      const r = dagen.map((d, i) => ({ datum: d, label: d.toLocaleDateString('nl-BE', { weekday: 'short' }), g: garminSamenvatting(garmin[i]) }));
      setReeks(r);
      setGarminVandaag(r[r.length - 1]?.g || null);
      setTaken((await getCollection(user.uid, 'taken')).filter((t) => t.type === 'gewoonte'));
      setLaden(false);
    })();
    return subscribeCollection(user.uid, 'doelen', setDoelen);
  }, [user]);

  const bewaarDoel = async () => {
    if (!form.titel.trim()) return toast('Geef je doel een naam.');
    if (form.start === '' || form.naar === '') return toast('Vul start- en doelwaarde in.');
    await addItem(user.uid, 'doelen', {
      titel: form.titel.trim(), metric: form.metric,
      start: Number(form.start), naar: Number(form.naar),
      huidige: form.huidige === '' ? null : Number(form.huidige),
      eenheid: METRIEKEN[form.metric]?.eenheid || '',
    });
    setForm(LEEG); setOpen(false); toast('Doel toegevoegd 🎯');
  };

  if (laden) return <div className="empty">Statistieken laden…</div>;

  const readinessReeks = reeks.map((r) => r.g?.readiness ?? null);
  const slaapReeks = reeks.map((r) => r.g?.slaapUren ?? null);
  const topStreaks = [...taken].sort((a, b) => (b.streak || 0) - (a.streak || 0)).slice(0, 6);
  const autoMetric = ['vo2max', 'gewicht', 'rusthr'].includes(form.metric);

  return (
    <div className="stack reveal">
      <h1 style={{ margin: 0 }}>Voortgang</h1>

      {/* Doelen */}
      <section className="card stack">
        <div className="row between">
          <div className="card-title" style={{ margin: 0 }}>Mijn doelen</div>
          <button className="btn sm" onClick={() => setOpen((o) => !o)}><IcoPlus width={16} height={16} /> Doel</button>
        </div>

        {doelen.length === 0 && !open && (
          <p className="small muted" style={{ margin: 0 }}>
            Zet één concreet doel (bv. VO₂max 45→55, of gewicht 85→78 kg). De ring vult zich automatisch
            mee met je Garmin-data.
          </p>
        )}

        {doelen.map((d) => {
          const p = doelProgress(d, garminVandaag);
          const m = METRIEKEN[d.metric] || {};
          return (
            <div className="row" key={d.id} style={{ gap: 14, alignItems: 'center' }}>
              <Gauge val={p.pct} size={72} label="" sub={`${p.pct}%`} kleur={doelKleur(p.pct)} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{d.titel}</span>
                  {p.klaar && <span className="badge ok small">behaald 🎉</span>}
                </div>
                <div className="small dim">
                  {m.label}: {p.huidige ?? '—'}{d.eenheid} → {d.naar}{d.eenheid}
                  {p.rest != null && !p.klaar ? ` · nog ${Math.abs(p.rest)}${d.eenheid}` : ''}
                </div>
              </div>
              <button className="icon-btn" onClick={() => deleteItem(user.uid, 'doelen', d.id)} aria-label="Verwijderen">
                <IcoTrash width={18} height={18} />
              </button>
            </div>
          );
        })}

        {open && (
          <div className="stack" style={{ gap: 10, marginTop: 4 }}>
            <div className="field"><label>Naam</label>
              <input className="input" value={form.titel} placeholder="bv. VO₂max omhoog"
                onChange={(e) => setForm({ ...form, titel: e.target.value })} /></div>
            <div className="field"><label>Wat meet je?</label>
              <select className="select" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
                {Object.entries(METRIEKEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select></div>
            <div className="row wrap" style={{ gap: 12 }}>
              <div className="field grow"><label>Start</label>
                <input className="input" type="number" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
              <div className="field grow"><label>Doel</label>
                <input className="input" type="number" value={form.naar} onChange={(e) => setForm({ ...form, naar: e.target.value })} /></div>
              {!autoMetric && (
                <div className="field grow"><label>Huidige</label>
                  <input className="input" type="number" value={form.huidige} onChange={(e) => setForm({ ...form, huidige: e.target.value })} /></div>
              )}
            </div>
            {autoMetric && <p className="small dim" style={{ margin: 0 }}>Huidige waarde komt automatisch uit Garmin.</p>}
            <div className="row between">
              <button className="btn ghost" onClick={() => { setOpen(false); setForm(LEEG); }}>Annuleren</button>
              <button className="btn primary" onClick={bewaarDoel}>Doel bewaren</button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-title"><IcoBolt width={14} height={14} /> Training readiness (7 dagen)</div>
        <BarChart reeks={reeks} waarden={readinessReeks} max={100} eenheid="" />
      </section>

      <section className="card">
        <div className="card-title"><IcoMoon width={14} height={14} /> Slaap (uren, 7 dagen)</div>
        <BarChart reeks={reeks} waarden={slaapReeks} max={10} eenheid="u" decimal />
      </section>

      <section className="card stack">
        <div className="card-title"><IcoFlame width={14} height={14} /> Streaks</div>
        {topStreaks.length === 0 && <p className="small muted" style={{ margin: 0 }}>Nog geen gewoontes met streak. Vink ze af op “Vandaag”.</p>}
        {topStreaks.map((t) => (
          <div className="list-row" key={t.id}>
            <span className="grow">{t.titel}</span>
            <span className="badge warn"><IcoFlame width={12} height={12} /> {t.streak || 0}</span>
            <span className="small dim">beste {t.beste || 0}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function BarChart({ reeks, waarden, max, eenheid, decimal }) {
  const heeftData = waarden.some((v) => v != null);
  if (!heeftData) {
    return <p className="small muted" style={{ margin: 0 }}>Nog geen Garmin-data deze week (dagelijkse sync vult dit aan).</p>;
  }
  return (
    <div className="row" style={{ alignItems: 'flex-end', gap: 8, height: 130, marginTop: 6 }}>
      {reeks.map((r, i) => {
        const v = waarden[i];
        const h = v != null ? Math.max(4, Math.round((v / max) * 110)) : 4;
        return (
          <div key={i} className="grow" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span className="small" style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
              {v != null ? (decimal ? v.toFixed(1) : Math.round(v)) : '—'}
            </span>
            <div style={{
              width: '100%', height: h, borderRadius: 6,
              background: v != null ? 'linear-gradient(180deg, var(--primary), var(--primary-2))' : 'var(--surface-2)',
              opacity: v != null ? 1 : 0.4,
            }} />
            <span className="small dim" style={{ fontSize: '.68rem' }}>{r.label}</span>
          </div>
        );
      })}
    </div>
  );
}
