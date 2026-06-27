import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getGarminDagCached, getDagCached, getCollection, subscribeCollection, addItem, setItem, deleteItem } from '../services/data';
import { garminSamenvatting } from '../services/garmin';
import { doelProgress, doelKleur, METRIEKEN } from '../services/doelen';
import { reflectieSamenvatting, stemmingInfo } from '../services/reflectie';
import { noordster } from '../services/noordster';
import { acwrBerekenen, sessieBelasting } from '../services/belasting';
import { datumKey } from '../services/tijd';
import NoordsterKaart from '../components/NoordsterKaart';
import { IcoFlame, IcoBolt, IcoMoon, IcoPlus, IcoTrash, IcoBike, IcoEdit } from '../components/Icons';
import Gauge from '../components/Gauge';
import Sparkline from '../components/Sparkline';
import BelastingKaart from '../components/BelastingKaart';

// Ruwe Garmin-activiteit -> nette samenvatting (defensief).
function activiteitInfo(a) {
  return {
    id: a.id || String(a.activityId || ''),
    naam: a.activityName || a.activityType?.typeKey || 'Activiteit',
    type: a.activityType?.typeKey || '',
    datum: (a.startTimeLocal || a.startTimeGMT || '').slice(0, 10),
    duurMin: a.duration ? Math.round(a.duration / 60) : null,
    afstandKm: a.distance ? Math.round(a.distance / 100) / 10 : null,
    kcal: a.calories ? Math.round(a.calories) : null,
    hr: a.averageHR ? Math.round(a.averageHR) : null,
  };
}

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
  const [mind, setMind] = useState(null);
  const [ns, setNs] = useState(null);
  const [taken, setTaken] = useState([]);
  const [doelen, setDoelen] = useState([]);
  const [garminVandaag, setGarminVandaag] = useState(null);
  const [activiteiten, setActiviteiten] = useState([]);
  const [rpe, setRpe] = useState({});
  const [form, setForm] = useState(LEEG);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const dagen = laatsteDagen(28);
      const garmin = await Promise.all(dagen.map((d) => getGarminDagCached(user.uid, datumKey(d))));
      const r = dagen.map((d, i) => ({ datum: d, label: d.toLocaleDateString('nl-BE', { weekday: 'short' }), g: garminSamenvatting(garmin[i]) }));
      setReeks(r);
      setGarminVandaag(r[r.length - 1]?.g || null);
      // Weekreview mindset: laatste 7 dagen check-ins (cache-eerst).
      const week = laatsteDagen(7);
      const dagDocs = await Promise.all(week.map((d) => getDagCached(user.uid, datumKey(d))));
      setMind(reflectieSamenvatting(week.map((d, i) => ({
        datum: datumKey(d), label: d.toLocaleDateString('nl-BE', { weekday: 'short' }),
        checkin: dagDocs[i]?.checkin,
      }))));
      setNs(noordster(dagDocs));
      setTaken((await getCollection(user.uid, 'taken')).filter((t) => t.type === 'gewoonte'));
      const acts = (await getCollection(user.uid, 'garminActivities')).map(activiteitInfo)
        .filter((a) => a.datum).sort((a, b) => b.datum.localeCompare(a.datum));
      setActiviteiten(acts);
      setLaden(false);
    })();
    const u1 = subscribeCollection(user.uid, 'doelen', setDoelen);
    const u2 = subscribeCollection(user.uid, 'activiteitLog', (items) =>
      setRpe(Object.fromEntries(items.map((i) => [i.id, i.rpe]))));
    return () => { u1(); u2(); };
  }, [user]);

  const zetRpe = (id, val) => setItem(user.uid, 'activiteitLog', id, { rpe: val });

  // ACWR (opbouw-ratio) uit sRPE-belasting van de activiteiten — herberekent als
  // er RPE's bijkomen. Uitlegbaar + veilige terugval bij te weinig data.
  const acwr = useMemo(() => acwrBerekenen(sessieBelasting(activiteiten, rpe)), [activiteiten, rpe]);

  const startBewerken = (d) => {
    setEditId(d.id);
    setForm({
      titel: d.titel || '', metric: d.metric || 'vo2max',
      start: d.start ?? '', naar: d.naar ?? '', huidige: d.huidige ?? '',
    });
    setOpen(true);
  };
  const sluitForm = () => { setOpen(false); setEditId(null); setForm(LEEG); };

  const bewaarDoel = async () => {
    if (!form.titel.trim()) return toast('Geef je doel een naam.');
    if (form.start === '' || form.naar === '') return toast('Vul start- en doelwaarde in.');
    const payload = {
      titel: form.titel.trim(), metric: form.metric,
      start: Number(form.start), naar: Number(form.naar),
      huidige: form.huidige === '' ? null : Number(form.huidige),
      eenheid: METRIEKEN[form.metric]?.eenheid || '',
    };
    if (editId) {
      await setItem(user.uid, 'doelen', editId, payload);
      toast('Doel bijgewerkt 🎯');
    } else {
      await addItem(user.uid, 'doelen', payload);
      toast('Doel toegevoegd 🎯');
    }
    sluitForm();
  };

  if (laden) return <div className="empty">Statistieken laden…</div>;

  const reeks7 = reeks.slice(-7);
  const readinessReeks = reeks7.map((r) => r.g?.readiness ?? null);
  const slaapReeks = reeks7.map((r) => r.g?.slaapUren ?? null);
  const topStreaks = [...taken].sort((a, b) => (b.streak || 0) - (a.streak || 0)).slice(0, 6);
  const autoMetric = ['vo2max', 'gewicht', 'rusthr'].includes(form.metric);

  // Trends over ~4 weken (alleen metrieken met genoeg data).
  const trendDefs = [
    { key: 'vo2max', label: 'VO₂max', pick: (g) => g?.vo2max, omhoog: true },
    { key: 'gewicht', label: 'Gewicht (kg)', pick: (g) => g?.gewichtKg, omhoog: false },
    { key: 'rusthr', label: 'Rust-HR', pick: (g) => g?.rustHr, omhoog: false },
  ].map((t) => {
    const serie = reeks.map((r) => t.pick(r.g)).filter((v) => typeof v === 'number');
    const eerste = serie[0], laatste = serie[serie.length - 1];
    const delta = serie.length >= 2 ? Math.round((laatste - eerste) * 10) / 10 : null;
    const goed = delta == null ? null : (t.omhoog ? delta >= 0 : delta <= 0);
    return { ...t, serie, laatste, delta, goed };
  }).filter((t) => t.serie.length >= 2);

  return (
    <div className="stack reveal">
      <h1 style={{ margin: 0 }}>Voortgang</h1>

      <NoordsterKaart ns={ns} />

      <BelastingKaart garmin={garminVandaag} readinessReeks={readinessReeks} acwr={acwr} />

      {/* Mindset-weekreview */}
      {mind && mind.aantal > 0 && (
        <section className="card stack">
          <div className="card-title">Mindset · deze week</div>
          <div className="row wrap" style={{ gap: 10 }}>
            <MindStat label="Stemming" val={mind.stemming} emoji={stemmingInfo(Math.round(mind.stemming || 0))?.emoji} />
            <MindStat label="Energie" val={mind.energie} suffix="/5" />
            <MindStat label="Tevreden" val={mind.tevreden} emoji={stemmingInfo(Math.round(mind.tevreden || 0))?.emoji} />
          </div>
          <p className="small dim" style={{ margin: 0 }}>
            Gemiddelde over {mind.aantal} {mind.aantal === 1 ? 'dag' : 'dagen'} met een check-in.
          </p>
        </section>
      )}

      {/* Doelen */}
      <section className="card stack">
        <div className="row between">
          <div className="card-title" style={{ margin: 0 }}>Mijn doelen</div>
          <button className="btn sm" onClick={() => (open ? sluitForm() : setOpen(true))}><IcoPlus width={16} height={16} /> Doel</button>
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
              <button className="icon-btn" onClick={() => startBewerken(d)} aria-label="Bewerken">
                <IcoEdit width={18} height={18} />
              </button>
              <button className="icon-btn" onClick={() => deleteItem(user.uid, 'doelen', d.id)} aria-label="Verwijderen">
                <IcoTrash width={18} height={18} />
              </button>
            </div>
          );
        })}

        {open && (
          <div className="stack" style={{ gap: 10, marginTop: 4 }}>
            <div className="small" style={{ fontWeight: 600 }}>{editId ? 'Doel bewerken' : 'Nieuw doel'}</div>
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
              <button className="btn ghost" onClick={sluitForm}>Annuleren</button>
              <button className="btn primary" onClick={bewaarDoel}>{editId ? 'Wijzigingen bewaren' : 'Doel bewaren'}</button>
            </div>
          </div>
        )}
      </section>

      {/* Trends over ~4 weken */}
      {trendDefs.length > 0 && (
        <section className="card stack">
          <div className="card-title">Trends · ±4 weken</div>
          {trendDefs.map((t) => (
            <div className="row between" key={t.key} style={{ gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{t.label}</div>
                <div className="small dim">
                  nu {Math.round(t.laatste * 10) / 10}
                  {t.delta != null && (
                    <span style={{ color: t.goed ? 'var(--success)' : 'var(--danger)', marginLeft: 6 }}>
                      {t.delta > 0 ? '+' : ''}{t.delta}
                    </span>
                  )}
                </div>
              </div>
              <Sparkline data={t.serie} kleur={t.goed === false ? 'var(--danger)' : 'var(--primary)'} />
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <div className="card-title"><IcoBolt width={14} height={14} /> Training readiness (7 dagen)</div>
        <BarChart reeks={reeks7} waarden={readinessReeks} max={100} eenheid="" />
      </section>

      <section className="card">
        <div className="card-title"><IcoMoon width={14} height={14} /> Slaap (uren, 7 dagen)</div>
        <BarChart reeks={reeks7} waarden={slaapReeks} max={10} eenheid="u" decimal />
      </section>

      {/* Activiteiten + RPE */}
      <section className="card stack">
        <div className="card-title"><IcoBike width={14} height={14} /> Recente trainingen</div>
        {activiteiten.length === 0 && (
          <p className="small muted" style={{ margin: 0 }}>Nog geen Garmin-activiteiten gesynct. Na een training verschijnen ze hier.</p>
        )}
        {activiteiten.slice(0, 8).map((a) => (
          <div className="stack" key={a.id} style={{ gap: 6, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            <div className="row between">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{a.naam}</div>
                <div className="small dim">
                  {a.datum}{a.duurMin ? ` · ${a.duurMin} min` : ''}{a.afstandKm ? ` · ${a.afstandKm} km` : ''}
                  {a.hr ? ` · ${a.hr} bpm` : ''}{a.kcal ? ` · ${a.kcal} kcal` : ''}
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
              <span className="small dim" style={{ marginRight: 4 }}>RPE:</span>
              {[2, 4, 6, 8, 10].map((n) => (
                <button key={n} className={'btn sm' + (rpe[a.id] === n ? ' primary' : '')}
                  style={{ minWidth: 36, padding: '0 8px' }} onClick={() => zetRpe(a.id, n)}>{n}</button>
              ))}
            </div>
          </div>
        ))}
        <p className="small dim" style={{ margin: 0 }}>RPE = hoe zwaar voelde het (2 licht … 10 maximaal). Helpt de coach je belasting fijner inschatten.</p>
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

function MindStat({ label, val, emoji, suffix = '' }) {
  return (
    <div className="card tight grow" style={{ textAlign: 'center', minWidth: 92 }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>
        {val != null ? val : '—'}{val != null ? suffix : ''} {emoji || ''}
      </div>
      <div className="small dim">{label}</div>
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
