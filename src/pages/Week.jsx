import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getDocById, setItem, subscribeCollection, addItem, deleteItem, getAgendaEvents } from '../services/data';
import { vakantieVoorDatum, vakantieInWeek, vakantieLabel } from '../services/vakanties';
import { WERK_MODI, DAG_NAMEN } from '../config/appConfig';
import { datumKey, weekKey, DAG_KORT } from '../services/tijd';
import { IcoPlus, IcoTrash } from '../components/Icons';

function maandagVan(d) {
  const x = new Date(d);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  x.setHours(12, 0, 0, 0);
  return x;
}
const LEEG_PERIODE = { naam: '', van: '', tot: '', geenJudo: true, verlof: true };

export default function Week() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offset, setOffset] = useState(0);
  const [vakanties, setVakanties] = useState([]);
  const [nieuw, setNieuw] = useState(LEEG_PERIODE);
  const [formOpen, setFormOpen] = useState(false);

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
  const dagDatums = useMemo(() => dagen.map(datumKey), [dagen]);

  const [data, setData] = useState({ dagen: {}, vakantie: false });

  useEffect(() => {
    if (!user) return;
    getDocById(user.uid, 'weken', wkId).then((doc) =>
      setData({ dagen: doc?.dagen || {}, vakantie: !!doc?.vakantie })
    );
  }, [user, wkId]);

  useEffect(() => {
    if (!user) return;
    return subscribeCollection(user.uid, 'vakanties', (items) =>
      setVakanties(items.sort((a, b) => (a.van || '').localeCompare(b.van || ''))));
  }, [user]);

  const [agenda, setAgenda] = useState([]);
  useEffect(() => {
    if (!user) return;
    getAgendaEvents(user.uid).then(setAgenda);
  }, [user]);

  const zetModus = async (dagKort, modus) => {
    const nieuwD = { ...data.dagen, [dagKort]: modus || undefined };
    if (!modus) delete nieuwD[dagKort];
    setData((s) => ({ ...s, dagen: nieuwD }));
    await setItem(user.uid, 'weken', wkId, { dagen: nieuwD });
  };

  const zetVakantie = async (v) => {
    setData((s) => ({ ...s, vakantie: v }));
    await setItem(user.uid, 'weken', wkId, { vakantie: v });
    toast(v ? 'Week op vakantie — judoles geven valt weg.' : 'Vakantie uit.');
  };

  const voegPeriodeToe = async () => {
    if (!nieuw.naam.trim() || !nieuw.van || !nieuw.tot) return toast('Vul naam, van én tot in.');
    if (nieuw.tot < nieuw.van) return toast('“Tot” ligt vóór “van”.');
    await addItem(user.uid, 'vakanties', { ...nieuw, naam: nieuw.naam.trim() });
    setNieuw(LEEG_PERIODE); setFormOpen(false); toast('Vakantieperiode toegevoegd.');
  };

  const weekPeriode = vakantieInWeek(vakanties, dagDatums);
  const weekLabel = `${dagen[0].toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })} – ${dagen[6].toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}`;
  const fmt = (s) => new Date(s + 'T12:00:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' });

  return (
    <div className="stack reveal">
      <div className="row between">
        <h1 style={{ margin: 0 }}>Mijn week</h1>
        <div className="row" style={{ gap: 4 }}>
          <button className="btn sm" onClick={() => setOffset((o) => o - 1)}>‹</button>
          <button className="btn sm" onClick={() => setOffset(0)}>Nu</button>
          <button className="btn sm" onClick={() => setOffset((o) => o + 1)}>›</button>
        </div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>{wkId} · {weekLabel}</p>

      {/* Banner als deze week in een vakantieperiode valt */}
      {weekPeriode && (
        <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--warning) 40%, var(--border))' }}>
          <div className="row" style={{ gap: 10 }}>
            <span style={{ fontSize: 22 }}>🌴</span>
            <div>
              <div style={{ fontWeight: 600 }}>{weekPeriode.naam}</div>
              <div className="small muted">{vakantieLabel(weekPeriode)} · {fmt(weekPeriode.van)}–{fmt(weekPeriode.tot)}
                {weekPeriode.geenJudo ? ' · geen judo (training & les vallen weg)' : ''}</div>
            </div>
          </div>
        </div>
      )}

      <label className="card row between" style={{ cursor: 'pointer' }}>
        <div>
          <div style={{ fontWeight: 600 }}>Deze week als vakantie markeren</div>
          <div className="small dim">Losse weekmarkering (geen judoles geven, soepeler)</div>
        </div>
        <input type="checkbox" checked={data.vakantie}
          onChange={(e) => zetVakantie(e.target.checked)} style={{ width: 22, height: 22 }} />
      </label>

      {/* Dagen */}
      <section className="stack" style={{ gap: 10 }}>
        {DAG_KORT.slice(1).concat(DAG_KORT[0]).map((dk) => {
          const idx = dk === 'zo' ? 6 : DAG_KORT.indexOf(dk) - 1;
          const d = dagen[idx];
          const dDatum = datumKey(d);
          const isVandaag = dDatum === datumKey(new Date());
          const per = vakantieVoorDatum(vakanties, dDatum);
          const judoDag = dk === 'wo' || dk === 'za';
          const dagEvents = agenda
            .filter((e) => e.datum === dDatum)
            .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
          return (
            <div className="card tight stack" key={dk} style={{ gap: 8,
              ...(isVandaag ? { borderColor: 'var(--primary)' } : {}) }}>
              <div className="row between">
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{DAG_NAMEN[dk]}</span>
                    {isVandaag && <span className="badge accent small">vandaag</span>}
                    {per?.geenJudo && judoDag && <span className="badge warn small">judovrij</span>}
                    {(per?.verlof || data.vakantie) && <span className="badge small">verlof</span>}
                  </div>
                  <div className="small dim">
                    {d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                    {dk === 'wo' && (per?.geenJudo ? ' · geen les (vakantie)' : ' · judoles geven 18:30')}
                  </div>
                </div>
                <select className="select" style={{ width: 'auto', minWidth: 140 }}
                  value={data.dagen[dk] || (per?.verlof ? 'verlof' : ((dk === 'za' || dk === 'zo') ? 'vrij' : ''))}
                  onChange={(e) => zetModus(dk, e.target.value)}>
                  <option value="">— kies —</option>
                  {Object.entries(WERK_MODI).map(([k, v]) => (
                    <option key={k} value={k}>{v.naam}</option>
                  ))}
                </select>
              </div>

              {dagEvents.length > 0 && (
                <details className="small">
                  <summary className="dim" style={{ cursor: 'pointer' }}>
                    📅 {dagEvents.length} afspra{dagEvents.length === 1 ? 'ak' : 'aken'}
                  </summary>
                  <div className="stack" style={{ gap: 3, marginTop: 6 }}>
                    {dagEvents.map((ev) => (
                      <div key={ev.id} className="row" style={{ gap: 8 }}>
                        <span className="dim" style={{ minWidth: 64, fontVariantNumeric: 'tabular-nums' }}>
                          {ev.allDay ? 'hele dag' : ev.start}
                        </span>
                        <span className="grow" style={{ minWidth: 0 }}>{ev.titel}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </section>

      {/* Vakantieperiodes (grote periodes) */}
      <section className="card stack">
        <div className="row between">
          <div className="card-title" style={{ margin: 0 }}>Vakantieperiodes</div>
          <button className="btn sm" onClick={() => setFormOpen((o) => !o)}>
            <IcoPlus width={16} height={16} /> Periode
          </button>
        </div>

        {vakanties.length === 0 && !formOpen && (
          <p className="small muted" style={{ margin: 0 }}>
            Voeg grote periodes toe (schoolvakanties, reizen). Markeer of judo dan vrij is
            (clubs dicht: geen training én geen les).
          </p>
        )}

        {vakanties.map((v) => (
          <div className="list-row" key={v.id}>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{v.naam}</div>
              <div className="small dim">{fmt(v.van)} – {fmt(v.tot)} · {vakantieLabel(v)}</div>
            </div>
            <button className="icon-btn" onClick={() => deleteItem(user.uid, 'vakanties', v.id)} aria-label="Verwijderen">
              <IcoTrash width={18} height={18} />
            </button>
          </div>
        ))}

        {formOpen && (
          <div className="stack" style={{ gap: 10, marginTop: 4 }}>
            <div className="field">
              <label>Naam</label>
              <input className="input" value={nieuw.naam} placeholder="bv. Zomervakantie"
                onChange={(e) => setNieuw({ ...nieuw, naam: e.target.value })} />
            </div>
            <div className="row wrap" style={{ gap: 12 }}>
              <div className="field grow"><label>Van</label>
                <input className="input" type="date" value={nieuw.van} onChange={(e) => setNieuw({ ...nieuw, van: e.target.value })} /></div>
              <div className="field grow"><label>Tot</label>
                <input className="input" type="date" value={nieuw.tot} onChange={(e) => setNieuw({ ...nieuw, tot: e.target.value })} /></div>
            </div>
            <label className="row between">
              <span>Judovrij (clubs dicht: geen training & geen les)</span>
              <input type="checkbox" checked={nieuw.geenJudo}
                onChange={(e) => setNieuw({ ...nieuw, geenJudo: e.target.checked })} style={{ width: 22, height: 22 }} />
            </label>
            <label className="row between">
              <span>Persoonlijk verlof (soepeler plannen)</span>
              <input type="checkbox" checked={nieuw.verlof}
                onChange={(e) => setNieuw({ ...nieuw, verlof: e.target.checked })} style={{ width: 22, height: 22 }} />
            </label>
            <div className="row between">
              <button className="btn ghost" onClick={() => { setFormOpen(false); setNieuw(LEEG_PERIODE); }}>Annuleren</button>
              <button className="btn primary" onClick={voegPeriodeToe}>Toevoegen</button>
            </div>
          </div>
        )}
      </section>

      <p className="small dim center">
        Dagmodus bepaalt je planning (thuis/kantoor/vrij). Vakantieperiodes overschrijven judo
        automatisch op “Vandaag”.
      </p>
    </div>
  );
}
