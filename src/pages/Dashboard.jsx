import { useEffect, useMemo, useState } from 'react';
import { useDagPlan } from '../hooks/useDagPlan';
import { useAuth } from '../contexts/AuthContext';
import { BLOK_TYPES } from '../config/appConfig';
import { toMin, nuMin, toHHMM, datumKey } from '../services/tijd';
import { syncStatus } from '../services/garmin';
import { getDagCached, getCollection } from '../services/data';
import { noordster } from '../services/noordster';
import { acwrBerekenen, sessieBelasting } from '../services/belasting';
import { IcoCheck, IcoMoon, IcoHeart, IcoFlame, IcoClock, IcoPulse, IcoChevron, IcoEdit } from '../components/Icons';
import CoachKaart from '../components/CoachKaart';
import BelastingKaart from '../components/BelastingKaart';
import CheckinKaart from '../components/CheckinKaart';
import NoordsterKaart from '../components/NoordsterKaart';

function tijdvak() {
  const h = new Date().getHours();
  if (h < 6) return { groet: 'Goeienacht', aura: '#818cf8' };
  if (h < 12) return { groet: 'Goeiemorgen', aura: '#f59e0b' };
  if (h < 18) return { groet: 'Goeiemiddag', aura: '#2dd4bf' };
  return { groet: 'Goeienavond', aura: '#a78bfa' };
}
const datumLabel = (d = new Date()) =>
  d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Dashboard() {
  const [datumObj, setDatumObj] = useState(() => new Date());
  const isToday = datumKey(datumObj) === datumKey(new Date());
  const naarDag = (delta) => setDatumObj((d) => { const nd = new Date(d); nd.setDate(nd.getDate() + delta); return nd; });
  const kiesDatum = (str) => str && setDatumObj(new Date(str + 'T12:00:00'));

  const { laden, plan, garmin, gedaan, toggleBlok, verzetBlok, wijzigBlokTijd, herstelBlokTijd, instellingen, blessureActief, garminSync, checkin, bewaarCheckin } = useDagPlan(datumObj);
  const { user } = useAuth();
  const [popId, setPopId] = useState(null);
  const [ns, setNs] = useState(null);
  const [acwr, setAcwr] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editStart, setEditStart] = useState('');
  const [editEind, setEditEind] = useState('');

  // Opbouw-ratio (ACWR) voor de coach — 1× per sessie laden (geen herlaad bij toggle).
  useEffect(() => {
    if (!user) return;
    let actief = true;
    (async () => {
      const [acts, logs] = await Promise.all([
        getCollection(user.uid, 'garminActivities'),
        getCollection(user.uid, 'activiteitLog'),
      ]);
      const rpe = Object.fromEntries((logs || []).map((l) => [l.id, l.rpe]));
      if (actief) setAcwr(acwrBerekenen(sessieBelasting(acts, rpe)));
    })();
    return () => { actief = false; };
  }, [user]);

  // North Star (consistentie) over de laatste 7 dagen — cache-eerst, dus goedkoop.
  useEffect(() => {
    if (!user) return;
    let actief = true;
    (async () => {
      const dagen = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dagen.push(datumKey(d));
      }
      const docs = await Promise.all(dagen.map((dk) => getDagCached(user.uid, dk)));
      if (actief) setNs(noordster(docs));
    })();
    return () => { actief = false; };
  }, [user, gedaan]);

  const checkbare = useMemo(
    () => (plan?.blokken || []).filter((b) => ['taak', 'judo', 'agenda'].includes(b.bron) || b.type === 'sport' || b.type === 'reva'),
    [plan]
  );
  const aantalGedaan = checkbare.filter((b) => gedaan?.[b.id]).length;
  const pct = checkbare.length ? Math.round((aantalGedaan / checkbare.length) * 100) : 0;

  if (laden) return <div className="empty">Je dag wordt geladen…</div>;

  const now = nuMin();
  const vak = tijdvak();
  const tik = (id, taakId) => { setPopId(id); toggleBlok(id, taakId); setTimeout(() => setPopId(null), 360); };

  // Tijd van een blok aanpassen — bewerkbaar op elke dag, niet enkel gemiste blokken.
  const beginBewerken = (b) => { setEditId(b.id); setEditStart(b.start); setEditEind(b.eind); };
  const stopBewerken = () => setEditId(null);
  const bewaarBewerking = () => {
    if (toMin(editEind) <= toMin(editStart)) return;
    wijzigBlokTijd(editId, editStart, editEind);
    setEditId(null);
  };

  // Gemiste sleutelblokken: vandaag enkel de voorbije + niet-afgevinkte; op een
  // voorbije dag is de hele dag al "voorbij", dus telt elk nog open blok.
  const gemist = isToday
    ? checkbare.filter((b) => toMin(b.eind) <= now && !gedaan?.[b.id])
    : checkbare.filter((b) => !gedaan?.[b.id]);

  return (
    <div className="stack reveal">
      <header className="hero" style={{ '--aura': vak.aura, '--i': 0 }}>
        <h1>{vak.groet}<span className="accent">.</span></h1>
        <span className="muted" style={{ textTransform: 'capitalize' }}>{datumLabel(datumObj)}</span>
      </header>

      {/* Datumkiezer: vorige/volgende dag of vrij kiezen, om correcties op voorbije dagen door te voeren */}
      <div className="row between" style={{ '--i': 0, gap: 8 }}>
        <button className="icon-btn" aria-label="Vorige dag" onClick={() => naarDag(-1)}>
          <IcoChevron width={18} height={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <input type="date" className="input sm" style={{ maxWidth: 170, textAlign: 'center' }}
          value={datumKey(datumObj)} max={datumKey(new Date())}
          onChange={(e) => kiesDatum(e.target.value)} />
        <button className="icon-btn" aria-label="Volgende dag" onClick={() => naarDag(1)} disabled={isToday}>
          <IcoChevron width={18} height={18} />
        </button>
        {!isToday && <button className="btn sm" onClick={() => setDatumObj(new Date())}>Vandaag</button>}
      </div>
      {!isToday && (
        <p className="small muted" style={{ margin: 0 }}>
          Je bekijkt een voorbije dag — vink blokken af om die dag te corrigeren. Wijzigingen aan
          gewoonte-taken kunnen de streak-telling beïnvloeden.
        </p>
      )}

      {/* Gezondheid: ring + inline stats (geen 4 identieke kaartjes) */}
      <GezondheidKaart garmin={garmin} garminSync={garminSync} i={1} />

      {/* Dagelijkse check-in (stemming/energie 's ochtends, reflectie 's avonds) — enkel vandaag */}
      {isToday && <CheckinKaart checkin={checkin} bewaar={bewaarCheckin} i={2} />}

      {/* North Star: consistentie over de laatste 7 dagen — enkel vandaag relevant */}
      {isToday && ns && ns.score != null && <NoordsterKaart ns={ns} i={2} />}

      {/* Coach-advies van de dag — enkel vandaag */}
      {isToday && garmin && (garmin.readiness != null || garmin.bodyBattery != null || blessureActief) && (
        <CoachKaart garmin={garmin} goal={instellingen?.gezondheid?.doel}
          blessureActief={blessureActief} energie={checkin?.ochtend?.energie} acwrZone={acwr?.zone} />
      )}

      {/* Belasting & herstel — enkel vandaag */}
      {isToday && (garmin?.trainingStatus || (acwr && acwr.ratio != null)) && <BelastingKaart garmin={garmin} acwr={acwr} />}

      {/* Advies */}
      {plan.advies?.tekst?.length > 0 && (
        <section className="card" style={{ '--i': 2 }}>
          <div className="card-title">Advies {isToday ? 'vandaag' : 'die dag'}</div>
          <ul className="stack" style={{ margin: 0, paddingLeft: 18, gap: 6 }}>
            {plan.advies.tekst.map((t, idx) => <li key={idx} className="small">{t}</li>)}
          </ul>
        </section>
      )}

      {/* Voortgang */}
      <section className="card" style={{ '--i': 3 }}>
        <div className="row between">
          <div className="card-title" style={{ margin: 0 }}>Voortgang {isToday ? 'vandaag' : 'die dag'}</div>
          <span className="badge accent">{aantalGedaan}/{checkbare.length || 0}</span>
        </div>
        <div className="progress shine" style={{ marginTop: 12 }}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
          {pct === 100 && checkbare.length ? '🎉 Alles afgewerkt — sterk!'
            : pct >= 60 ? 'Goed bezig, hou vol!'
            : pct > 0 ? 'Mooie start. Volgende blok wacht.'
            : 'Begin met je eerstvolgende blok.'}
        </p>
      </section>

      {/* In te halen: gemiste sleutelblokken — geen verwijt, wel een herkansing.
          Op een voorbije dag heeft "verzetten naar later vandaag" geen betekenis,
          dus blijft daar enkel de directe correctie ("Toch gedaan") over. */}
      {gemist.length > 0 && (
        <section className="card stack" style={{ '--i': 4, gap: 10 }}>
          <div className="card-title" style={{ margin: 0 }}>Nog in te halen</div>
          <p className="small muted" style={{ margin: 0 }}>
            {isToday
              ? 'Een blok gemist? Geen probleem — vink het alsnog af of schuif het naar later vandaag.'
              : 'Nog openstaande blokken die dag — vink alsnog af wat je wel deed.'}
          </p>
          {gemist.map((b) => (
            <div className="row between" key={b.id} style={{ gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{b.titel}</div>
                <div className="small dim">stond gepland {b.start}–{b.eind}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                {isToday && <button className="btn sm" onClick={() => verzetBlok(b.id)}>Verzet</button>}
                <button className="btn sm primary" onClick={() => tik(b.id, b.taakId)}>Toch gedaan</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Losse to-do's */}
      {plan.todos?.length > 0 && (
        <section className="card" style={{ '--i': 4 }}>
          <div className="card-title">Nog te doen vandaag</div>
          <div className="stack" style={{ gap: 8 }}>
            {plan.todos.map((t) => {
              const id = `todo-${t.taakId}`;
              const on = !!gedaan?.[id];
              return (
                <button key={id} className="row" onClick={() => tik(id, t.taakId)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                  <span className={'tl-check' + (on ? ' on' : '') + (popId === id ? ' pop' : '')} aria-hidden>
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
      <section className="stack" style={{ gap: 4, '--i': 5 }}>
        <div className="row between">
          <h2 style={{ margin: '4px 0' }}>Je dag</h2>
          {isToday && <span className="badge"><IcoClock width={14} height={14} /> {toHHMM(now)}</span>}
        </div>
        <div className="timeline">
          {plan.blokken.map((b) => {
            const isNu = isToday && toMin(b.start) <= now && now < toMin(b.eind);
            const checkbaar = checkbare.some((c) => c.id === b.id);
            const on = !!gedaan?.[b.id];
            const bewerkt = editId === b.id;
            return (
              <div className="tl-item" key={b.id}>
                <div className="tl-time row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                  {isNu && <span className="now-dot" aria-hidden />}{b.start}
                </div>
                <div className={'tl-body' + (on ? ' done' : '') + (isNu ? ' now' : '')}
                  style={{ '--block': b.kleur }}>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="tl-title">
                      {b.titel}{b.conflict && <span className="badge bad small" style={{ marginLeft: 8 }}>conflict</span>}
                    </div>
                    {bewerkt ? (
                      <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <input type="time" className="input sm" value={editStart}
                          onChange={(e) => setEditStart(e.target.value)} />
                        <span className="dim">–</span>
                        <input type="time" className="input sm" value={editEind}
                          onChange={(e) => setEditEind(e.target.value)} />
                        <button className="btn sm primary" onClick={bewaarBewerking}>Bewaar</button>
                        <button className="btn sm" onClick={stopBewerken}>Annuleer</button>
                      </div>
                    ) : (
                      <div className="small dim">
                        {b.start}–{b.eind} · {BLOK_TYPES[b.type]?.naam || b.type}
                        {b.detail ? ` · ${b.detail}` : ''}
                        {b.verzet && (
                          <button className="btn sm ghost" style={{ marginLeft: 8, padding: '0 6px' }}
                            onClick={() => herstelBlokTijd(b.id)}>Terug naar gepland tijdstip</button>
                        )}
                      </div>
                    )}
                  </div>
                  {!bewerkt && (
                    <button className="icon-btn" aria-label="Tijd aanpassen" onClick={() => beginBewerken(b)}>
                      <IcoEdit width={16} height={16} />
                    </button>
                  )}
                  {checkbaar && !bewerkt && (
                    <button className={'tl-check' + (on ? ' on' : '') + (popId === b.id ? ' pop' : '')}
                      onClick={() => tik(b.id, b.taakId)}
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

function GezondheidKaart({ garmin, garminSync, i }) {
  const s = syncStatus(garminSync);
  if (!garmin || (garmin.readiness == null && garmin.slaapUren == null)) {
    return (
      <section className="card" style={{ '--i': i }}>
        <div className="card-title">Gezondheid</div>
        <p className="small muted" style={{ margin: 0 }}>
          {s.leeg
            ? 'Nog geen Garmin-data. Koppel Garmin (zie README); de ochtendsync vult readiness, slaap en stappen vanzelf in.'
            : `Geen verse data voor vandaag. ${s.tekst}.`}
        </p>
      </section>
    );
  }
  const r = garmin.readiness;
  const kleur = r == null ? 'var(--text-dim)' : r >= 65 ? 'var(--success)' : r >= 40 ? 'var(--warning)' : 'var(--danger)';
  return (
    <section className="card stack" style={{ '--i': i, gap: 12 }}>
      <div className="row" style={{ gap: 18, alignItems: 'center' }}>
        <div className="ring anim" style={{ '--val': r ?? 0, '--primary': kleur }}>
          <div style={{ display: 'grid', placeItems: 'center', gap: 1 }}>
            <span className="ring-v">{r ?? '—'}</span>
            <span className="ring-l">readiness</span>
          </div>
        </div>
        <div className="statline grow">
          <div className="stat"><IcoMoon className="si" width={16} height={16} />
            <span className="sv">{garmin.slaapUren != null ? garmin.slaapUren.toFixed(1) + 'u' : '—'}</span>
            <span className="sl">slaap</span></div>
          <div className="stat"><IcoHeart className="si" width={16} height={16} />
            <span className="sv">{garmin.rustHr ?? '—'}</span><span className="sl">rust-HR</span></div>
          <div className="stat"><IcoFlame className="si" width={16} height={16} />
            <span className="sv">{garmin.stappen != null ? (garmin.stappen / 1000).toFixed(1) + 'k' : '—'}</span>
            <span className="sl">stappen</span></div>
          <div className="stat"><IcoPulse className="si" width={16} height={16} />
            <span className="sv">{garmin.hrvStatus || '—'}</span><span className="sl">HRV</span></div>
        </div>
      </div>
      {s.stale && !s.leeg && (
        <div className="small" style={{ color: 'var(--warning)', margin: 0 }}>⚠ {s.tekst} — Garmin-sync hapert mogelijk.</div>
      )}
    </section>
  );
}
