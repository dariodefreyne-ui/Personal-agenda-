import { coachAdvies } from '../services/coach';
import { belastingStatus } from '../services/belasting';
import { IcoBolt, IcoClock } from './Icons';

const NIVEAU_LABEL = { hard: 'Vol gas', matig: 'Matig', rustig: 'Rustig', herstel: 'Herstel' };

// Coach-advies van de dag. Toont sport + intensiteit op basis van Garmin + doel.
// Veiligheidsslot: bij Garmin-overbelasting dwingt de coach herstel af.
export default function CoachKaart({ garmin, goal = 'algemeen', blessureActief = false, energie = null }) {
  const overbelast = belastingStatus({ trainingStatus: garmin?.trainingStatus }).key === 'overbelast';
  const a = coachAdvies({
    readiness: garmin?.readiness ?? null,
    bodyBattery: garmin?.bodyBattery ?? null,
    slaapUren: garmin?.slaapUren ?? null,
    energie,
    goal, blessureActief, overbelast,
  });

  return (
    <section className="card stack" style={{ gap: 12 }}>
      <div className="row between">
        <div className="card-title" style={{ margin: 0 }}>Coach · {a.doelLabel}</div>
        <span className="badge" style={{ color: a.kleur, borderColor: 'color-mix(in srgb, currentColor 40%, var(--border))' }}>
          <IcoBolt width={12} height={12} /> {NIVEAU_LABEL[a.niveau]}
        </span>
      </div>

      <div className="row" style={{ gap: 14, alignItems: 'center' }}>
        <span aria-hidden style={{
          width: 46, height: 46, borderRadius: '50%', flex: 'none',
          background: `radial-gradient(circle at 34% 30%, #ffffffaa, transparent 42%), radial-gradient(circle at 70% 75%, ${a.kleur}, color-mix(in srgb, ${a.kleur} 55%, #000))`,
          boxShadow: `0 6px 18px -4px color-mix(in srgb, ${a.kleur} 60%, transparent)`,
        }} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{a.titel}</div>
          <div className="muted small">{a.sport}</div>
        </div>
      </div>

      <div className="row between small dim">
        <span><IcoClock width={13} height={13} /> ±{a.duurMin} min</span>
        {a.reden && <span style={{ textAlign: 'right', maxWidth: '62%' }}>{a.reden}</span>}
      </div>
    </section>
  );
}
