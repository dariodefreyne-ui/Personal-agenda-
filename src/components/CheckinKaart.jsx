import { useState } from 'react';
import { STEMMINGEN, ENERGIE, stemmingInfo } from '../services/reflectie';
import { IcoSun, IcoMoon, IcoEdit, IcoCheck } from './Icons';

// Dagelijkse check-in op het dashboard.
//  - Ochtend: stemming + energie (voedt de coach).
//  - Avond: tevredenheid + waar je dankbaar voor bent + korte reflectie.
// Toont vanzelf het juiste paneel op basis van het uur en wat al ingevuld is.
export default function CheckinKaart({ checkin, bewaar, i = 0 }) {
  const uur = new Date().getHours();
  const ochtend = checkin?.ochtend || null;
  const avond = checkin?.avond || null;
  const avondTijd = uur >= 17;

  // Welk paneel standaard open staat (gebruiker kan met de knoppen wisselen).
  const [forceer, setForceer] = useState(null); // 'ochtend' | 'avond' | 'klaar' | null
  const auto = !ochtend ? 'ochtend' : (avondTijd && !avond ? 'avond' : 'klaar');
  const modus = forceer || auto;

  if (modus === 'klaar') {
    return <Samenvatting checkin={checkin} onBewerk={setForceer} avondTijd={avondTijd} i={i} />;
  }
  if (modus === 'ochtend') {
    return <Ochtend ochtend={ochtend} bewaar={bewaar} klaar={() => setForceer('klaar')} i={i} />;
  }
  return <Avond avond={avond} bewaar={bewaar} klaar={() => setForceer('klaar')} i={i} />;
}

function Schaal({ opties, waarde, zet, render }) {
  return (
    <div className="seg" role="group">
      {opties.map((o) => (
        <button key={o.v} type="button"
          className={'seg-btn' + (waarde === o.v ? ' on' : '')}
          aria-pressed={waarde === o.v} title={o.label}
          onClick={() => zet(o.v)}>
          {render(o)}
        </button>
      ))}
    </div>
  );
}

function Ochtend({ ochtend, bewaar, klaar, i }) {
  const [stemming, setStemming] = useState(ochtend?.stemming ?? null);
  const [energie, setEnergie] = useState(ochtend?.energie ?? null);
  const bewaren = () => {
    bewaar({ ochtend: { stemming, energie, op: new Date().toISOString() } });
    klaar();
  };
  return (
    <section className="card stack" style={{ '--i': i, gap: 14 }}>
      <div className="row between">
        <div className="card-title" style={{ margin: 0 }}><IcoSun width={14} height={14} /> Ochtend-check-in</div>
        {ochtend && <button className="icon-btn" aria-label="Sluiten" onClick={klaar}>✕</button>}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="small muted">Hoe voel je je?</span>
        <Schaal opties={STEMMINGEN} waarde={stemming} zet={setStemming}
          render={(o) => <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{o.emoji}</span>} />
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="small muted">Energie</span>
        <Schaal opties={ENERGIE} waarde={energie} zet={setEnergie}
          render={(o) => <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{o.v}</span>} />
        {energie != null && <span className="small dim">{ENERGIE.find((e) => e.v === energie)?.label}</span>}
      </div>
      <button className="btn primary block" disabled={stemming == null && energie == null} onClick={bewaren}>
        Bewaren
      </button>
    </section>
  );
}

function Avond({ avond, bewaar, klaar, i }) {
  const [tevreden, setTevreden] = useState(avond?.tevreden ?? null);
  const [dankbaar, setDankbaar] = useState(avond?.dankbaar ?? '');
  const [reflectie, setReflectie] = useState(avond?.reflectie ?? '');
  const bewaren = () => {
    bewaar({ avond: { tevreden, dankbaar: dankbaar.trim(), reflectie: reflectie.trim(), op: new Date().toISOString() } });
    klaar();
  };
  const leeg = tevreden == null && !dankbaar.trim() && !reflectie.trim();
  return (
    <section className="card stack" style={{ '--i': i, gap: 14 }}>
      <div className="row between">
        <div className="card-title" style={{ margin: 0 }}><IcoMoon width={14} height={14} /> Avondreflectie</div>
        <button className="icon-btn" aria-label="Sluiten" onClick={klaar}>✕</button>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="small muted">Tevreden over vandaag?</span>
        <Schaal opties={STEMMINGEN} waarde={tevreden} zet={setTevreden}
          render={(o) => <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{o.emoji}</span>} />
      </div>
      <div className="field">
        <label>Waar ben je dankbaar voor?</label>
        <input className="input" value={dankbaar} maxLength={140} placeholder="Eén ding volstaat…"
          onChange={(e) => setDankbaar(e.target.value)} />
      </div>
      <div className="field">
        <label>Korte reflectie (optioneel)</label>
        <textarea className="input" rows={3} value={reflectie} maxLength={600}
          placeholder="Wat ging goed, wat kan morgen beter?"
          onChange={(e) => setReflectie(e.target.value)} />
      </div>
      <button className="btn primary block" disabled={leeg} onClick={bewaren}>Bewaren</button>
    </section>
  );
}

function Samenvatting({ checkin, onBewerk, avondTijd, i }) {
  const o = checkin?.ochtend || null;
  const a = checkin?.avond || null;
  const oInfo = o?.stemming ? stemmingInfo(o.stemming) : null;
  const aInfo = a?.tevreden ? stemmingInfo(a.tevreden) : null;
  return (
    <section className="card stack" style={{ '--i': i, gap: 12 }}>
      <div className="row between">
        <div className="card-title" style={{ margin: 0 }}><IcoCheck width={14} height={14} /> Check-in vandaag</div>
        <button className="icon-btn" aria-label="Bewerken"
          onClick={() => onBewerk(avondTijd ? 'avond' : 'ochtend')}>
          <IcoEdit width={18} height={18} />
        </button>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        {oInfo && <span className="badge">{oInfo.emoji} {oInfo.label}</span>}
        {o?.energie != null && <span className="badge accent">Energie {o.energie}/5</span>}
        {aInfo && <span className="badge">🌙 {aInfo.emoji} {aInfo.label}</span>}
        {!o && !a && <span className="small muted">Nog niets ingevuld vandaag.</span>}
      </div>
      {a?.dankbaar && <p className="small" style={{ margin: 0 }}>🙏 {a.dankbaar}</p>}
      {a?.reflectie && <p className="small dim" style={{ margin: 0 }}>{a.reflectie}</p>}
      {!a && avondTijd && (
        <button className="btn sm ghost" onClick={() => onBewerk('avond')}>Avondreflectie toevoegen</button>
      )}
    </section>
  );
}
