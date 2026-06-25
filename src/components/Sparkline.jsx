// Minimalistische trendlijn (SVG). Slaat lege punten over.
export default function Sparkline({ data = [], width = 130, height = 38, kleur = 'var(--primary)' }) {
  const pts = data.filter((v) => typeof v === 'number');
  if (pts.length < 2) return <span className="small dim">te weinig data</span>;
  const min = Math.min(...pts), max = Math.max(...pts);
  const rng = max - min || 1;
  const step = width / (pts.length - 1);
  const coords = pts.map((v, i) => [i * step, height - ((v - min) / rng) * (height - 6) - 3]);
  const line = coords.map((c) => c.join(',')).join(' ');
  const last = coords[coords.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ overflow: 'visible' }}>
      <polyline points={line} fill="none" stroke={kleur} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={kleur} />
    </svg>
  );
}
