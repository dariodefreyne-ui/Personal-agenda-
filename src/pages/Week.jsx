import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getDocById, setItem } from '../services/data';
import { WERK_MODI, DAG_NAMEN } from '../config/appConfig';
import { datumKey, weekKey, DAG_KORT } from '../services/tijd';

function maandagVan(d) {
  const x = new Date(d);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  x.setHours(12, 0, 0, 0);
  return x;
}

export default function Week() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offset, setOffset] = useState(0);

  const maandag = useMemo(() => {
    const m = maandagVan(new Date());
    m.setDate(m.getDate() + offset * 7);
    return m;
  }, [offset]);

  const wkId = weekKey(maandag);
  const dagen = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(maandag);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [maandag]
  );

  const [data, setData] = useState({ dagen: {}, vakantie: false });

  useEffect(() => {
    if (!user) return;
    getDocById(user.uid, 'weken', wkId).then((doc) =>
      setData({ dagen: doc?.dagen || {}, vakantie: !!doc?.vakantie })
    );
  }, [user, wkId]);

  const zetModus = async (dagKort, modus) => {
    const nieuw = { ...data.dagen, [dagKort]: modus || undefined };
    if (!modus) delete nieuw[dagKort];
    setData((s) => ({ ...s, dagen: nieuw }));
    await setItem(user.uid, 'weken', wkId, { dagen: nieuw });
  };

  const zetVakantie = async (v) => {
    setData((s) => ({ ...s, vakantie: v }));
    await setItem(user.uid, 'weken', wkId, { vakantie: v });
    toast(v ? 'Week op vakantie — judoles geven valt weg.' : 'Vakantie uit.');
  };

  const weekLabel = `${dagen[0].toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })} – ${dagen[6].toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}`;

  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ margin: 0 }}>Mijn week</h1>
        <div className="row" style={{ gap: 4 }}>
          <button className="btn sm" onClick={() => setOffset((o) => o - 1)}>‹</button>
          <button className="btn sm" onClick={() => setOffset(0)}>Nu</button>
          <button className="btn sm" onClick={() => setOffset((o) => o + 1)}>›</button>
        </div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>{wkId} · {weekLabel}</p>

      <label className="card row between" style={{ cursor: 'pointer' }}>
        <div>
          <div style={{ fontWeight: 600 }}>Vakantieweek</div>
          <div className="small dim">Geen judoles geven, soepelere planning</div>
        </div>
        <input type="checkbox" checked={data.vakantie}
          onChange={(e) => zetVakantie(e.target.checked)} style={{ width: 22, height: 22 }} />
      </label>

      <section className="stack" style={{ gap: 10 }}>
        {DAG_KORT.slice(1).concat(DAG_KORT[0]).map((dk) => {
          const idx = dk === 'zo' ? 6 : DAG_KORT.indexOf(dk) - 1;
          const d = dagen[idx];
          const isVandaag = datumKey(d) === datumKey(new Date());
          return (
            <div className="card tight row between" key={dk}
              style={isVandaag ? { borderColor: 'var(--primary)' } : undefined}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {DAG_NAMEN[dk]} {isVandaag && <span className="badge accent small">vandaag</span>}
                </div>
                <div className="small dim">{d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                  {dk === 'wo' ? ' · judoles geven 18:30' : ''}</div>
              </div>
              <select className="select" style={{ width: 'auto', minWidth: 150 }}
                value={data.dagen[dk] || ''} onChange={(e) => zetModus(dk, e.target.value)}>
                <option value="">— kies —</option>
                {Object.entries(WERK_MODI).map(([k, v]) => (
                  <option key={k} value={k}>{v.naam}</option>
                ))}
              </select>
            </div>
          );
        })}
      </section>

      <p className="small dim center">
        Stel per dag in of je thuiswerkt, naar kantoor gaat (auto of fiets), of vrij/verlof bent.
        Je dagplanning op “Vandaag” past zich automatisch aan.
      </p>
    </div>
  );
}
