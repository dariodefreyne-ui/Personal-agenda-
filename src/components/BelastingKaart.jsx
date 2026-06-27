import { belastingStatus } from '../services/belasting';

const ZEKERHEID_LABEL = { hoog: 'hoge zekerheid', gemiddeld: 'gemiddelde zekerheid', laag: 'lage zekerheid' };

// Belasting/herstel in mensentaal — op basis van Garmin-trainingsstatus + trend,
// plus (Fase 5) de uitlegbare ACWR-belastingsratio voor blessurepreventie.
export default function BelastingKaart({ garmin, readinessReeks = [], acwr = null }) {
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

      {acwr && (
        <div className="stack" style={{ gap: 6, marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div className="row between">
            <span className="small" style={{ fontWeight: 600 }}>Opbouw-ratio (ACWR)</span>
            <span className="badge" style={{ color: acwr.kleur, borderColor: 'color-mix(in srgb, currentColor 40%, var(--border))' }}>
              {acwr.ratio != null ? acwr.ratio.toFixed(2) : '—'} · {acwr.titel}
            </span>
          </div>
          <p className="small muted" style={{ margin: 0 }}>{acwr.tekst}</p>
          <details className="small">
            <summary className="dim" style={{ cursor: 'pointer' }}>
              Hoe berekend? ({ZEKERHEID_LABEL[acwr.zekerheid]})
            </summary>
            <div className="dim" style={{ marginTop: 6 }}>
              {acwr.waarom}<br />{acwr.meetlat}
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
