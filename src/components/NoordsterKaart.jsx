import Gauge from './Gauge';

// North Star: consistentie-/therapietrouw-score met uitleg (premium-principe:
// elke metric is uitlegbaar). `ns` komt uit services/noordster.js → noordster().
export default function NoordsterKaart({ ns, i }) {
  if (!ns) return null;
  return (
    <section className="card stack" style={{ '--i': i, gap: 12 }}>
      <div className="card-title" style={{ margin: 0 }}>Consistentie · je North Star</div>
      <div className="row" style={{ gap: 16, alignItems: 'center' }}>
        {ns.score == null
          ? <Gauge val={0} size={72} label="" sub="—" kleur="var(--text-dim)" />
          : <Gauge val={ns.score} size={72} label="" sub={`${ns.score}`} kleur={ns.kleur} />}
        <div className="grow" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: ns.kleur }}>{ns.label}</div>
          <div className="small dim">{ns.waarom}</div>
        </div>
      </div>
      <details className="small">
        <summary className="dim" style={{ cursor: 'pointer' }}>Hoe wordt dit gemeten?</summary>
        <div className="dim" style={{ marginTop: 8 }}>
          {ns.meetlat} Een gemiste dag is normaal — deze score kijkt naar je
          gemiddelde over meerdere dagen, niet naar één misstap.
        </div>
      </details>
    </section>
  );
}
