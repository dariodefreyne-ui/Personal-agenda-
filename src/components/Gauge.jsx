// Kleine radiale gloei-meter (hergebruikt de .ring-stijl).
export default function Gauge({ val = 0, label, sub, size = 84, kleur }) {
  const v = Math.max(0, Math.min(100, Number(val) || 0));
  return (
    <div className="ring anim" role="img" aria-label={`${label}: ${sub}`}
      style={{ '--val': v, '--size': `${size}px`, '--thick': '8px', ...(kleur ? { '--primary': kleur } : {}) }}>
      <div style={{ display: 'grid', placeItems: 'center', gap: 1 }}>
        <span className="ring-v" style={{ fontSize: size < 80 ? '1.05rem' : '1.3rem' }}>{sub}</span>
        <span className="ring-l">{label}</span>
      </div>
    </div>
  );
}
