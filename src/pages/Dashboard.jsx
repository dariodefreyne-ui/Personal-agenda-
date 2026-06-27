import { useEffect, useMemo, useState } from 'react';
import { useDagPlan } from '../hooks/useDagPlan';
import { useAuth } from '../contexts/AuthContext';
import { BLOK_TYPES } from '../config/appConfig';
import { toMin, nuMin, toHHMM, datumKey } from '../services/tijd';
import { syncStatus } from '../services/garmin';
import { getDagCached } from '../services/data';
import { noordster } from '../services/noordster';
import { IcoCheck, IcoMoon, IcoHeart, IcoFlame, IcoClock } from '../components/Icons';
import CoachKaart from '../components/CoachKaart';
import BelastingKaart from '../components/BelastingKaart';
import CheckinKaart from '../components/CheckinKaart';
import NoordsterKaart from '../components/NoordsterKaart';

function tijdvak() {
  const h = new Date().getHours();
  if (h < 6) return { groet: 'Goeienacht', aura: '#818cf8' };
  if (h < 12) return { groet: 'Goeiemorgen', aura: '#f59e0b' };
  if (h < 18) return { groet: 'Goeiemiddag', aura: '#2dd4bf' };
  return { groet: 'Goeienavond', aura: '#a78bfa' };
}
const datumLabel = () =>
  new Date().toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Dashboard() {
  const { laden, plan, garmin, gedaan, toggleBlok, instellingen, blessureActief, garminSync, checkin, bewaarCheckin } = useDagPlan();
  const { user } = useAuth();
  const [popId, setPopId] = useState(null);
  const [ns, setNs] = useState(null);

  // North Star (consistentie) over de laatste 7 dagen — cache-eerst, dus goedkoop.
  useEffect(() => {
    if (!user) return;
    let actief = true;
    (async () => {
      const dagen = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dagen.push(datumKey(d));
      }
      const docs = await Promise.all(dagen.map((dk) => getDagCached(user.uid, dk)));
      if (actief) setNs(noordster(docs));
    })();
    return () => { actief = false; };
  }, [user, gedaan]);

  const checkbare = useMemo(
    () => (plan?.blokken || []).filter((b) => ['taak', 'judo', 'agenda'].includes(b.bron) || b.type === 'sport' || b.type === 'reva'),
    [plan]
  );
  const aantalGedaan = checkbare.filter((b) => gedaan?.[b.id]).length;
  const pct = checkbare.length ? Math.round((aantalGedaan / checkbare.length) * 100) : 0;

  if (laden) return <div className="empty">Je dag wordt geladen…</div>;

  const now = nuMin();
  const vak = tijdvak();
  const tik = (id, taakId) => { setPopId(id); toggleBlok(id, taakId); setTimeout(() => setPopId(null), 360); };

  return (
    <div className="stack reveal">
      <header className="hero" style={{ '--aura': vak.aura, '--i': 0 }}>
        <h1>{vak.groet}<span className="accent">.</span></h1>
        <span className="muted" style={{ textTransform: 'capitalize' }}>{datumLabel()}</span>
      </header>

      {/* Gezondheid: ring + inline stats (geen 4 identieke kaartjes) */}
      <GezondheidKaart garmin={garmin} garminSync={garminSync} i={1} />

      {/* Dagelijkse check-in (stemming/energie 's ochtends, reflectie 's avonds) */}
      <CheckinKaart checkin={checkin} bewaar={bewaarCheckin} i={2} />

      {/* North Star: consistentie over de laatste 7 dagen */}
      {ns && ns.score != null && <NoordsterKaart ns={ns} i={2} />}

      {/* Coach-advies van de dag */}
      {garmin && (garmin.readiness != null || garmin.bodyBattery != null || blessureActief) && (
        <CoachKaart garmin={garmin} goal={instellingen?.gezondheid?.doel}
          blessureActief={blessureActief} energie={checkin?.ochtend?.energie} />
      )}

      {/* Belasting & herstel */}
      {garmin?.trainingStatus && <BelastingKaart garmin={garmin} />}

      {/* Advies */}
      {plan.advies?.tekst?.length > 0 && (
        <section className="card" style={{ '--i': 2 }}>
          <div className="card-title">Advies vandaag</div>
          <ul className="stack" style={{ margin: 0, paddingLeft: 18, gap: 6 }}>
            {plan.advies.tekst.map((t, idx) => <li key={idx} className="small">{t}</li>)}
          </ul>
        </section>
      )}

      {/* Voortgang */}
      <section className="card" style={{ '--i': 3 }}>
        <div className="row between">
          <div className="card-title" style={{ margin: 0 }}>Voortgang vandaag</div>
          <span className="badge accent">{aantalGedaan}/{checkbare.length || 0}</span>
        </div>
        <div className="progress shine" style={{ marginTop: 12 }}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
          {pct === 100 && checkbare.length ? '🎉 Alles afgewerkt — sterk!'
            : pct >= 60 ? 'Goed bezig, hou vol!'
            : pct > 0 ? 'Mooie start. Volgende blok wacht.'
            : 'Begin met je eerstvolgende blok.'}
        </p>
      </section>

      {/* Losse to-do's */}
      {plan.todos?.length > 0 && (
        <section className="card" style={{ '--i': 4 }}>
          <div className="card-title">Nog te doen vandaag</div>
          <div className="stack" style={{ gap: 8 }}>
            {plan.todos.map((t) => {
              const id = `todo-${t.taakId}`;
              const on = !!gedaan?.[id];
              return (
                <button key={id} className="row" onClick={() => tik(id, t.taakId)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                  <span className={'tl-check' + (on ? ' on' : '') + (popId === id ? ' pop' : '')} aria-hidden>
                    {on && <IcoCheck width={16} height={16} />}
                  </span>
                  <span style={{ textDecoration: on ? 'line-through' : 'none', color: on ? 'var(--text-dim)' : 'var(--text)' }}>
                    {t.titel}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Tijdlijn */}
      <section className="stack" style={{ gap: 4, '--i': 5 }}>
        <div className="row between">
          <h2 style={{ margin: '4px 0' }}>Je dag</h2>
          <span className="badge"><IcoClock width={14} height={14} /> {toHHMM(now)}</span>
        </div>
        <div className="timeline">
          {plan.blokken.map((b) => {
            const isNu = toMin(b.start) <= now && now < toMin(b.eind);
            const checkbaar = checkbare.some((c) => c.id === b.id);
            const on = !!gedaan?.[b.id];
            return (
              <div className="tl-item" key={b.id}>
                <div className="tl-time row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                  {isNu && <span className="now-dot" aria-hidden />}{b.start}
                </div>
                <div className={'tl-body' + (on ? ' done' : '') + (isNu ? ' now' : '')}
                  style={{ '--block': b.kleur }}>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="tl-title">
                      {b.titel}{b.conflict && <span className="badge bad small" style={{ marginLeft: 8 }}>conflict</span>}
                    </div>
                    <div className="small dim">
                      {b.start}–{b.eind} · {BLOK_TYPES[b.type]?.naam || b.type}
                      {b.detail ? ` · ${b.detail}` : ''}
                    </div>
                  </div>
                  {checkbaar && (
                    <button className={'tl-check' + (on ? ' on' : '') + (popId === b.id ? ' pop' : '')}
                      onClick={() => tik(b.id, b.taakId)}
                      aria-label={on ? 'Ongedaan maken' : 'Afvinken'}>
                      {on && <IcoCheck width={16} height={16} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function GezondheidKaart({ garmin, garminSync, i }) {
  const s = syncStatus(garminSync);
  if (!garmin || (garmin.readiness == null && garmin.slaapUren == null)) {
    return (
      <section className="card" style={{ '--i': i }}>
        <div className="card-title">Gezondheid</div>
        <p className="small muted" style={{ margin: 0 }}>
          {s.leeg
            ? 'Nog geen Garmin-data. Koppel Garmin (zie README); de ochtendsync vult readiness, slaap en stappen vanzelf in.'
            : `Geen verse data voor vandaag. ${s.tekst}.`}
        </p>
      </section>
    );
  }
  const r = garmin.readiness;
  const kleur = r == null ? 'var(--text-dim)' : r >= 65 ? 'var(--success)' : r >= 40 ? 'var(--warning)' : 'var(--danger)';
  return (
    <section className="card stack" style={{ '--i': i, gap: 12 }}>
      <div className="row" style={{ gap: 18, alignItems: 'center' }}>
        <div className="ring anim" style={{ '--val': r ?? 0, '--primary': kleur }}>
          <div style={{ display: 'grid', placeItems: 'center', gap: 1 }}>
            <span className="ring-v">{r ?? '—'}</span>
            <span className="ring-l">readiness</span>
          </div>
        </div>
        <div className="statline grow">
          <div className="stat"><IcoMoon className="si" width={16} height={16} />
            <span className="sv">{garmin.slaapUren != null ? garmin.slaapUren.toFixed(1) + 'u' : '—'}</span>
            <span className="sl">slaap</span></div>
          <div className="stat"><IcoHeart className="si" width={16} height={16} />
            <span className="sv">{garmin.rustHr ?? '—'}</span><span className="sl">rust-HR</span></div>
          <div className="stat"><IcoFlame className="si" width={16} height={16} />
            <span className="sv">{garmin.stappen != null ? (garmin.stappen / 1000).toFixed(1) + 'k' : '—'}</span>
            <span className="sl">stappen</span></div>
        </div>
      </div>
      {s.stale && !s.leeg && (
        <div className="small" style={{ color: 'var(--warning)', margin: 0 }}>⚠ {s.tekst} — Garmin-sync hapert mogelijk.</div>
      )}
    </section>
  );
}
