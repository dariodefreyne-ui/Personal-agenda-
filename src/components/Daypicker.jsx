import { useEffect, useRef, useState } from 'react';
import { datumKey } from '../services/tijd';
import { IcoAgenda, IcoChevron } from './Icons';

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const WEEKDAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

// Geeft alle dagen van de getoonde maand terug, met lege plekken zodat de
// eerste maandag in kolom 1 valt (Europese weekindeling).
function dagenInMaand(maand) {
  const eersteDag = new Date(maand.getFullYear(), maand.getMonth(), 1);
  const start = (eersteDag.getDay() + 6) % 7;
  const aantal = new Date(maand.getFullYear(), maand.getMonth() + 1, 0).getDate();
  const dagen = [];
  for (let i = 0; i < start; i++) dagen.push(null);
  for (let d = 1; d <= aantal; d++) dagen.push(new Date(maand.getFullYear(), maand.getMonth(), d));
  return dagen;
}

// Kalender-popover om vrij een datum te kiezen — vervangt het natieve
// <input type="date"> (lelijk + liet enkel het verleden toe).
export default function Daypicker({ datum, onKies }) {
  const [open, setOpen] = useState(false);
  const [maand, setMaand] = useState(() => new Date(datum.getFullYear(), datum.getMonth(), 1));
  const ref = useRef(null);

  useEffect(() => {
    if (open) setMaand(new Date(datum.getFullYear(), datum.getMonth(), 1));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const vandaag = datumKey(new Date());
  const gekozen = datumKey(datum);
  const dagen = dagenInMaand(maand);

  return (
    <div className="daypicker" ref={ref}>
      <button type="button" className="btn sm" onClick={() => setOpen((o) => !o)}>
        <IcoAgenda width={16} height={16} />
        <span style={{ textTransform: 'capitalize' }}>
          {datum.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </button>
      {open && (
        <div className="daypicker-pop card">
          <div className="row between" style={{ marginBottom: 8 }}>
            <button type="button" className="icon-btn" aria-label="Vorige maand"
              onClick={() => setMaand((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
              <IcoChevron width={16} height={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <strong style={{ textTransform: 'capitalize' }}>{MAANDEN[maand.getMonth()]} {maand.getFullYear()}</strong>
            <button type="button" className="icon-btn" aria-label="Volgende maand"
              onClick={() => setMaand((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
              <IcoChevron width={16} height={16} />
            </button>
          </div>
          <div className="daypicker-grid">
            {WEEKDAGEN.map((w) => <span key={w} className="small dim daypicker-wd">{w}</span>)}
            {dagen.map((d, i) => {
              if (!d) return <span key={`leeg${i}`} />;
              const key = datumKey(d);
              return (
                <button key={key} type="button"
                  className={'daypicker-dag' + (key === gekozen ? ' on' : '') + (key === vandaag ? ' vandaag' : '')}
                  onClick={() => { onKies(d); setOpen(false); }}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
