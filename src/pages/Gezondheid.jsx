import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  getGarminDag, getDocById, saveDag, subscribeCollection,
  addItem, updateItem, deleteItem, getInstellingen, saveInstellingen, getLaatsteGarminSync,
} from '../services/data';
import { garminSamenvatting, syncStatus } from '../services/garmin';
import { coachAdvies, DOELEN } from '../services/coach';
import { datumKey } from '../services/tijd';
import { IcoPlus, IcoTrash, IcoMoon, IcoHeart, IcoFlame } from '../components/Icons';
import Gauge from '../components/Gauge';
import CoachKaart from '../components/CoachKaart';

export default function Gezondheid() {
  const { user } = useAuth();
  const { toast } = useToast();
  const datum = datumKey(new Date());
  const [garmin, setGarmin] = useState(null);
  const [checkin, setCheckin] = useState({ slaapGevoel: 3, energie: 3, pijn: 0, notitie: '' });
  const [reva, setReva] = useState([]);
  const [nieuwReva, setNieuwReva] = useState('');
  const [doel, setDoel] = useState('algemeen');
  const [sync, setSync] = useState(null);

  useEffect(() => {
    if (!user) return;
    getGarminDag(user.uid, datum).then((g) => setGarmin(garminSamenvatting(g)));
    getLaatsteGarminSync(user.uid).then(setSync);
    getDocById(user.uid, 'dagen', datum).then((d) => { if (d?.checkin) setCheckin(d.checkin); });
    getInstellingen(user.uid).then((I) => setDoel(I.gezondheid?.doel || 'algemeen'));
    return subscribeCollection(user.uid, 'reva', setReva);
  }, [user, datum]);

  const blessureActief = (reva || []).some((r) => r.blessureActief);
  const kiesDoel = async (d) => {
    setDoel(d);
    await saveInstellingen(user.uid, 'gezondheid', { doel: d });
    toast('Doel bewaard — de coach past zijn advies aan.');
  };
  const readinessKleur = (r) => (r == null ? 'var(--text-dim)' : r >= 65 ? 'var(--success)' : r >= 40 ? 'var(--warning)' : 'var(--danger)');

  const bewaarCheckin = async () => {
    await saveDag(user.uid, datum, { checkin });
    toast('Check-in bewaard. Je planning houdt hier rekening mee.');
  };

  const voegRevaToe = async () => {
    if (!nieuwReva.trim()) return;
    await addItem(user.uid, 'reva', { naam: nieuwReva.trim(), sets: '3×12', blessureActief: false });
    setNieuwReva('');
  };

  return (
    <div className="stack reveal">
      <h1 style={{ margin: 0 }}>Gezondheid</h1>

      <div className="row" style={{ gap: 10 }}>
        <Link to="/voortgang" className="btn grow">Voortgang & stats</Link>
        <Link to="/maaltijden" className="btn grow">Maaltijden & voeding</Link>
      </div>

      {/* Doel (stuurt de coach) */}
      <section className="card stack">
        <div className="card-title">Mijn doel</div>
        <div className="row wrap" style={{ gap: 8 }}>
          {Object.entries(DOELEN).map(([k, v]) => (
            <button key={k} className={'btn sm' + (doel === k ? ' primary' : '')} onClick={() => kiesDoel(k)}>{v}</button>
          ))}
        </div>
      </section>

      {/* Coach-advies */}
      {(garmin || blessureActief) && (
        <CoachKaart garmin={garmin} goal={doel} blessureActief={blessureActief} />
      )}

      {/* Garmin: gauges + profiel */}
      <section className="card stack">
        <div className="card-title">Garmin — vandaag</div>
        {garmin ? (
          <>
            <div className="row wrap" style={{ gap: 18, justifyContent: 'center' }}>
              <Gauge val={garmin.readiness ?? 0} label="readiness" size={92}
                sub={garmin.readiness ?? '—'} kleur={readinessKleur(garmin.readiness)} />
              <Gauge val={garmin.bodyBattery ?? 0} label="battery" size={92}
                sub={garmin.bodyBattery ?? '—'} kleur="var(--primary-2)" />
              <div className="statline" style={{ justifyContent: 'center' }}>
                <div className="stat"><IcoMoon className="si" width={16} height={16} />
                  <span className="sv">{garmin.slaapUren != null ? garmin.slaapUren.toFixed(1) + 'u' : '—'}</span><span className="sl">slaap</span></div>
                <div className="stat"><IcoHeart className="si" width={16} height={16} />
                  <span className="sv">{garmin.rustHr ?? '—'}</span><span className="sl">rust-HR</span></div>
                <div className="stat"><IcoFlame className="si" width={16} height={16} />
                  <span className="sv">{garmin.stappen != null ? (garmin.stappen / 1000).toFixed(1) + 'k' : '—'}</span><span className="sl">stappen</span></div>
              </div>
            </div>
            <div className="divider" />
            <div className="row wrap" style={{ gap: 8 }}>
              {garmin.vo2max != null && <span className="badge">VO₂max {Math.round(garmin.vo2max)}</span>}
              {garmin.gewichtKg != null && <span className="badge">{garmin.gewichtKg} kg</span>}
              {garmin.vetPct != null && <span className="badge">{Math.round(garmin.vetPct)}% vet</span>}
              {garmin.leeftijd != null && <span className="badge">{garmin.leeftijd} jaar</span>}
              {garmin.lengteCm != null && <span className="badge">{Math.round(garmin.lengteCm)} cm</span>}
              {garmin.trainingStatus && <span className="badge accent">{garmin.trainingStatus}</span>}
            </div>
            {syncStatus(sync).stale && (
              <div className="small" style={{ color: 'var(--warning)', margin: 0 }}>⚠ {syncStatus(sync).tekst} — Garmin-sync hapert mogelijk.</div>
            )}
          </>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            {syncStatus(sync).leeg
              ? 'Nog geen Garmin-data. Koppel Garmin (zie README); de ochtendsync vult dit vanzelf in.'
              : `Geen verse data voor vandaag. ${syncStatus(sync).tekst}.`}
          </p>
        )}
      </section>

      {/* Dagelijkse check-in */}
      <section className="card stack">
        <div className="card-title">Dagelijkse check-in</div>
        <Schaal label="Hoe voelt je slaap?" waarde={checkin.slaapGevoel}
          onChange={(v) => setCheckin({ ...checkin, slaapGevoel: v })} laag="Slecht" hoog="Top" />
        <Schaal label="Energie / fitheid" waarde={checkin.energie}
          onChange={(v) => setCheckin({ ...checkin, energie: v })} laag="Leeg" hoog="Vol" />
        <Schaal label="Pijn / blessure" waarde={checkin.pijn} max={5}
          onChange={(v) => setCheckin({ ...checkin, pijn: v })} laag="Geen" hoog="Veel" />
        <div className="field">
          <label>Notitie (optioneel)</label>
          <textarea className="input" value={checkin.notitie}
            onChange={(e) => setCheckin({ ...checkin, notitie: e.target.value })} placeholder="bv. knie wat gevoelig" />
        </div>
        <button className="btn primary block" onClick={bewaarCheckin}>Check-in bewaren</button>
      </section>

      {/* Revalidatie-oefeningen */}
      <section className="card stack">
        <div className="card-title">Revalidatie-oefeningen</div>
        {reva.length === 0 && <p className="small muted" style={{ margin: 0 }}>Voeg je kine-oefeningen toe.</p>}
        {reva.map((r) => (
          <div className="list-row" key={r.id}>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{r.naam}</div>
              <input className="input sm" style={{ minHeight: 32, marginTop: 4, maxWidth: 140 }}
                value={r.sets || ''} onChange={(e) => updateItem(user.uid, 'reva', r.id, { sets: e.target.value })} />
            </div>
            <label className="row small" style={{ gap: 6 }}>
              <input type="checkbox" checked={!!r.blessureActief}
                onChange={(e) => updateItem(user.uid, 'reva', r.id, { blessureActief: e.target.checked })} />
              blessure actief
            </label>
            <button className="icon-btn" onClick={() => deleteItem(user.uid, 'reva', r.id)} aria-label="Verwijderen">
              <IcoTrash width={18} height={18} />
            </button>
          </div>
        ))}
        <div className="row" style={{ gap: 8 }}>
          <input className="input" value={nieuwReva} onChange={(e) => setNieuwReva(e.target.value)}
            placeholder="Nieuwe oefening…" onKeyDown={(e) => e.key === 'Enter' && voegRevaToe()} />
          <button className="btn primary" onClick={voegRevaToe}><IcoPlus width={18} height={18} /></button>
        </div>
        <p className="small dim" style={{ margin: 0 }}>
          Zet “blessure actief” aan bij een lopende blessure — dan stelt de app geen fietsen voor
          en plant het herstel in.
        </p>
      </section>
    </div>
  );
}

const Kpi = ({ Icon, l, v }) => (
  <div className="card">
    <Icon width={18} height={18} style={{ color: 'var(--primary)' }} />
    <div className="v">{v}</div><div className="l">{l}</div>
  </div>
);

function Schaal({ label, waarde, onChange, laag, hoog, max = 5 }) {
  const min = laag === 'Geen' ? 0 : 1;
  const opties = [];
  for (let n = min; n <= max; n++) opties.push(n);
  return (
    <div className="field">
      <label>{label}</label>
      <div className="row" style={{ gap: 6 }}>
        {opties.map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={'btn sm' + (waarde === n ? ' primary' : '')} style={{ minWidth: 42 }}>{n}</button>
        ))}
      </div>
      <div className="row between small dim"><span>{laag}</span><span>{hoog}</span></div>
    </div>
  );
}
