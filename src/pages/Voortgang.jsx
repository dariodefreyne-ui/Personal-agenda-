import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getGarminDag, getCollection } from '../services/data';
import { garminSamenvatting } from '../services/garmin';
import { datumKey } from '../services/tijd';
import { IcoFlame, IcoBolt, IcoMoon } from '../components/Icons';

function laatsteDagen(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

export default function Voortgang() {
  const { user } = useAuth();
  const [reeks, setReeks] = useState([]);
  const [taken, setTaken] = useState([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const dagen = laatsteDagen(7);
      const garmin = await Promise.all(dagen.map((d) => getGarminDag(user.uid, datumKey(d))));
      setReeks(dagen.map((d, i) => ({
        datum: d, label: d.toLocaleDateString('nl-BE', { weekday: 'short' }),
        g: garminSamenvatting(garmin[i]),
      })));
      setTaken((await getCollection(user.uid, 'taken')).filter((t) => t.type === 'gewoonte'));
      setLaden(false);
    })();
  }, [user]);

  if (laden) return <div className="empty">Statistieken laden…</div>;

  const readinessReeks = reeks.map((r) => r.g?.readiness ?? null);
  const slaapReeks = reeks.map((r) => r.g?.slaapUren ?? null);
  const topStreaks = [...taken].sort((a, b) => (b.streak || 0) - (a.streak || 0)).slice(0, 6);

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Voortgang</h1>

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
