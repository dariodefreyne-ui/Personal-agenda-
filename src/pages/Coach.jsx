import { useState } from 'react';
import { useDagPlan } from '../hooks/useDagPlan';
import { datumKey, dagKortVanDatum } from '../services/tijd';
import { kiesSportVanDag, genereerSportInhoud } from '../services/sportcoach';
import { SPORTEN } from '../config/appConfig';
import Daypicker from '../components/Daypicker';
import { IcoChevron, IcoBolt, IcoBike, IcoWalk, IcoMoon } from '../components/Icons';

const datumLabel = (d) => d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });

const SPORT_ICOON = { homefitness: IcoBolt, fietsen: IcoBike, wandelen: IcoWalk, rust: IcoMoon };

export default function Coach() {
  const [datumObj, setDatumObj] = useState(() => new Date());
  const isToday = datumKey(datumObj) === datumKey(new Date());
  const naarDag = (delta) => setDatumObj((d) => { const nd = new Date(d); nd.setDate(nd.getDate() + delta); return nd; });

  const { laden, plan, garmin, instellingen, advies, weer } = useDagPlan(datumObj);

  return (
    <div className="stack reveal">
      <div className="row between" style={{ gap: 8 }}>
        <button className="icon-btn" aria-label="Vorige dag" onClick={() => naarDag(-1)}>
          <IcoChevron width={18} height={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <Daypicker datum={datumObj} onKies={setDatumObj} />
        <button className="icon-btn" aria-label="Volgende dag" onClick={() => naarDag(1)}>
          <IcoChevron width={18} height={18} />
        </button>
        <button className="btn sm" disabled={isToday} onClick={() => setDatumObj(new Date())}>Vandaag</button>
      </div>
      <h1 style={{ margin: 0 }}>Coach</h1>
      <p className="small dim" style={{ margin: 0, textTransform: 'capitalize' }}>{datumLabel(datumObj)}</p>

      {laden || !instellingen || !advies ? (
        <div className="empty">Laden…</div>
      ) : (
        <CoachInhoud datumObj={datumObj} plan={plan} garmin={garmin} instellingen={instellingen}
          advies={advies} weer={weer} />
      )}
    </div>
  );
}

function CoachInhoud({ datumObj, plan, garmin, instellingen, advies, weer }) {
  const dagKort = dagKortVanDatum(datumObj);
  const datum = datumKey(datumObj);
  const judoVandaag = (plan?.blokken || []).some((b) => b.type === 'judo' || b.type === 'lesgeven');

  const keuze = kiesSportVanDag({
    dagKort, weekSchema: instellingen.sport?.weekSchema, niveau: advies.niveau, judoVandaag, weer,
  });

  const inhoud = genereerSportInhoud({
    sport: keuze.sport, niveau: advies.niveau, oefeningen: instellingen.sport?.oefeningen,
    garmin, stappenDoel: instellingen.gezondheid?.stappenDoel, datum, weer,
  });

  const Icoon = SPORT_ICOON[keuze.sport];
  const naam = keuze.sport === 'judo' ? 'Judo' : (SPORTEN[keuze.sport]?.naam || 'Rustdag');

  return (
    <section className="card stack" style={{ gap: 14 }}>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        {Icoon && <Icoon width={22} height={22} style={{ color: 'var(--primary)' }} />}
        <div className="card-title" style={{ margin: 0 }}>{naam}</div>
      </div>

      {keuze.overschreven && (
        <p className="small" style={{ color: 'var(--warning)', margin: 0 }}>
          Aangepast t.o.v. gepland ({SPORTEN[keuze.gepland]?.naam}): {keuze.waarom.join(' ')}
        </p>
      )}

      {inhoud.type === 'homefitness' && (
        inhoud.oefeningen.length ? (
          <ul className="stack" style={{ gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
            {inhoud.oefeningen.map((o, idx) => (
              <li key={o.id || idx} className="stack" style={{ gap: 2 }}>
                <div className="row between" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{o.naam}</span>
                  <span className="small dim">{o.sets} × {o.reps}</span>
                </div>
                {o.waarom && <p className="small dim" style={{ margin: 0 }}>{o.waarom}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>{inhoud.waarom[0]}</p>
        )
      )}

      {inhoud.type === 'fietsen' && (
        <div className="stack" style={{ gap: 4 }}>
          <p style={{ margin: 0 }}>±{inhoud.km} km (~{inhoud.minuten} min)</p>
          <p className="small dim" style={{ margin: 0 }}>{inhoud.zoneTekst}</p>
        </div>
      )}

      {inhoud.type === 'wandelen' && (
        <div className="stack" style={{ gap: 4 }}>
          <p style={{ margin: 0 }}>
            {inhoud.stappenAdvies != null
              ? `Nog ±${inhoud.stappenAdvies.toLocaleString('nl-BE')} stappen (±${inhoud.km} km)`
              : `±${inhoud.km} km`}
          </p>
        </div>
      )}

      {(inhoud.type === 'judo' || inhoud.type === 'rust') && (
        <p className="small muted" style={{ margin: 0 }}>{inhoud.waarom[0]}</p>
      )}

      <details>
        <summary className="small dim" style={{ cursor: 'pointer' }}>Waarom dit advies?</summary>
        <ul className="small dim" style={{ marginTop: 8 }}>
          {inhoud.type !== 'judo' && inhoud.type !== 'rust' && inhoud.waarom.map((w, i) => <li key={`i${i}`}>{w}</li>)}
          {advies.waarom.map((w, i) => <li key={`a${i}`}>{w}</li>)}
        </ul>
        <p className="small dim" style={{ margin: 0 }}>
          Zekerheid: {advies.zekerheid} · Bronnen: {advies.databronnen.join(', ')}
        </p>
      </details>
    </section>
  );
}
