import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  getGarminDag, getDocById, saveDag, subscribeCollection,
  addItem, updateItem, deleteItem,
} from '../services/data';
import { garminSamenvatting } from '../services/garmin';
import { datumKey } from '../services/tijd';
import { IcoPlus, IcoTrash, IcoBolt, IcoMoon, IcoHeart, IcoFlame } from '../components/Icons';

export default function Gezondheid() {
  const { user } = useAuth();
  const { toast } = useToast();
  const datum = datumKey(new Date());
  const [garmin, setGarmin] = useState(null);
  const [checkin, setCheckin] = useState({ slaapGevoel: 3, energie: 3, pijn: 0, notitie: '' });
  const [reva, setReva] = useState([]);
  const [nieuwReva, setNieuwReva] = useState('');

  useEffect(() => {
    if (!user) return;
    getGarminDag(user.uid, datum).then((g) => setGarmin(garminSamenvatting(g)));
    getDocById(user.uid, 'dagen', datum).then((d) => { if (d?.checkin) setCheckin(d.checkin); });
    return subscribeCollection(user.uid, 'reva', setReva);
  }, [user, datum]);

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

      {/* Garmin vandaag */}
      <section className="card">
        <div className="card-title">Garmin — vandaag</div>
        {garmin ? (
          <div className="kpi" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <Kpi Icon={IcoBolt} l="Readiness" v={garmin.readiness ?? '—'} />
            <Kpi Icon={IcoMoon} l="Slaap" v={garmin.slaapUren != null ? garmin.slaapUren.toFixed(1) + 'u' : '—'} />
            <Kpi Icon={IcoHeart} l="Rust-HR" v={garmin.rustHr ?? '—'} />
            <Kpi Icon={IcoFlame} l="Stappen" v={garmin.stappen != null ? (garmin.stappen / 1000).toFixed(1) + 'k' : '—'} />
          </div>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>Nog geen Garmin-data vandaag (sync draait elke ochtend).</p>
        )}
        {garmin?.trainingStatus && <p className="small dim" style={{ marginTop: 10, marginBottom: 0 }}>Trainingsstatus: {garmin.trainingStatus}</p>}
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
