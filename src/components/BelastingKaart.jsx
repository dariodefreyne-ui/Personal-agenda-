import { belastingStatus } from '../services/belasting';

// Belasting/herstel in mensentaal — op basis van Garmin-trainingsstatus + trend.
export default function BelastingKaart({ garmin, readinessReeks = [] }) {
  const b = belastingStatus({ trainingStatus: garmin?.trainingStatus, readinessReeks });
  return (
    <section className="card stack" style={{ gap: 8 }}>
      <div className="row between">
        <div className="card-title" style={{ margin: 0 }}>Belasting & herstel</div>
        <span className="badge" style={{ color: b.kleur, borderColor: 'color-mix(in srgb, currentColor 40%, var(--border))' }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          {b.titel}
        </span>
      </div>
      <p className="small muted" style={{ margin: 0 }}>{b.tekst}</p>
      {b.trend != null && (
        <p className="small dim" style={{ margin: 0 }}>
          Readiness-trend deze week: {b.trend > 0 ? '↑ +' : b.trend < 0 ? '↓ ' : '→ '}{b.trend}
        </p>
      )}
    </section>
  );
}
