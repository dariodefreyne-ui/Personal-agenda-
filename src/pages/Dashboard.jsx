import { useMemo } from 'react';
import { useDagPlan } from '../hooks/useDagPlan';
import { BLOK_TYPES } from '../config/appConfig';
import { toMin, nuMin, toHHMM } from '../services/tijd';
import { IcoCheck, IcoBolt, IcoMoon, IcoHeart, IcoFlame, IcoClock } from '../components/Icons';

const begroeting = () => {
  const h = new Date().getHours();
  if (h < 6) return 'Goedenacht';
  if (h < 12) return 'Goeiemorgen';
  if (h < 18) return 'Goeiemiddag';
  return 'Goeienavond';
};

const datumLabel = () =>
  new Date().toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Dashboard() {
  const { laden, plan, garmin, gedaan, toggleBlok } = useDagPlan();

  const checkbare = useMemo(
    () => (plan?.blokken || []).filter((b) => ['taak', 'judo', 'agenda'].includes(b.bron) || b.type === 'sport' || b.type === 'reva'),
    [plan]
  );
  const aantalGedaan = checkbare.filter((b) => gedaan?.[b.id]).length;
  const pct = checkbare.length ? Math.round((aantalGedaan / checkbare.length) * 100) : 0;

  if (laden) return <div className="empty">Je dag wordt geladen…</div>;

  const now = nuMin();

  return (
    <div className="stack">
      <header className="stack" style={{ gap: 2 }}>
        <h1 style={{ marginBottom: 0 }}>{begroeting()} 👋</h1>
        <span className="muted" style={{ textTransform: 'capitalize' }}>{datumLabel()}</span>
      </header>

      {/* Gezondheid / readiness */}
      <GezondheidStrip garmin={garmin} />

      {/* Advies van de dag */}
      {plan.advies?.tekst?.length > 0 && (
        <section className="card">
          <div className="card-title">Advies vandaag</div>
          <ul className="stack" style={{ margin: 0, paddingLeft: 18, gap: 6 }}>
            {plan.advies.tekst.map((t, i) => <li key={i} className="small">{t}</li>)}
          </ul>
        </section>
      )}

      {/* Voortgang / beloning */}
      <section className="card">
        <div className="row between">
          <div className="card-title" style={{ margin: 0 }}>Voortgang vandaag</div>
          <span className="badge accent">{aantalGedaan}/{checkbare.length || 0}</span>
        </div>
        <div className="progress" style={{ marginTop: 12 }}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
          {pct === 100 && checkbare.length ? '🎉 Alles afgewerkt — sterk gedaan!'
            : pct >= 60 ? 'Goed bezig, hou vol!'
            : pct > 0 ? 'Mooie start. Volgende blok wacht.'
            : 'Begin met je eerstvolgende blok.'}
        </p>
      </section>

      {/* Losse to-do's (zonder vast tijdslot) */}
      {plan.todos?.length > 0 && (
        <section className="card">
          <div className="card-title">Nog te doen vandaag</div>
          <div className="stack" style={{ gap: 8 }}>
            {plan.todos.map((t) => {
              const id = `todo-${t.taakId}`;
              const on = !!gedaan?.[id];
              return (
                <button key={id} className="row" onClick={() => toggleBlok(id, t.taakId)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                  <span className={'tl-check' + (on ? ' on' : '')} aria-hidden>
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
      <section className="stack" style={{ gap: 4 }}>
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
                <div className="tl-time">{b.start}</div>
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
                    <button className={'tl-check' + (on ? ' on' : '')}
                      onClick={() => toggleBlok(b.id, b.taakId)}
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

function GezondheidStrip({ garmin }) {
  if (!garmin) {
    return (
      <section className="card">
        <div className="card-title">Gezondheid (Garmin)</div>
        <p className="small muted" style={{ margin: 0 }}>
          Nog geen Garmin-data voor vandaag. De dagelijkse sync vult dit automatisch in,
          of update handmatig via de GitHub-actie “Garmin Daily Sync”.
        </p>
      </section>
    );
  }
  const items = [
    { Icon: IcoBolt, l: 'Readiness', v: garmin.readiness != null ? `${garmin.readiness}` : '—' },
    { Icon: IcoMoon, l: 'Slaap', v: garmin.slaapUren != null ? `${garmin.slaapUren.toFixed(1)}u` : '—' },
    { Icon: IcoHeart, l: 'Rust-HR', v: garmin.rustHr != null ? `${garmin.rustHr}` : '—' },
    { Icon: IcoFlame, l: 'Stappen', v: garmin.stappen != null ? `${(garmin.stappen / 1000).toFixed(1)}k` : '—' },
  ];
  return (
    <section className="kpi" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {items.map(({ Icon, l, v }) => (
        <div className="card" key={l}>
          <Icon width={18} height={18} style={{ color: 'var(--primary)' }} />
          <div className="v">{v}</div>
          <div className="l">{l}</div>
        </div>
      ))}
    </section>
  );
}
