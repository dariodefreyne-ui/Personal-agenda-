import { useEffect, useMemo, useState } from 'react';
import { useDagPlan } from '../hooks/useDagPlan';
import { useAuth } from '../contexts/AuthContext';
import { BLOK_TYPES } from '../config/appConfig';
import { toMin, nuMin, toHHMM, datumKey } from '../services/tijd';
import { syncStatus } from '../services/garmin';
import { getDagCached } from '../services/data';
import { noordster } from '../services/noordster';
import { IcoCheck, IcoMoon, IcoHeart, IcoFlame, IcoClock, IcoPulse, IcoChevron, IcoEdit, IcoBadge } from '../components/Icons';
import CoachKaart from '../components/CoachKaart';
import BelastingKaart from '../components/BelastingKaart';
import CheckinKaart from '../components/CheckinKaart';
import NoordsterKaart from '../components/NoordsterKaart';
import Daypicker from '../components/Daypicker';

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
  const isFuture = datumKey(datumObj) > datumKey(new Date());
  const naarDag = (delta) => setDatumObj((d) => { const nd = new Date(d); nd.setDate(nd.getDate() + delta); return nd; });

  const { laden, plan, garmin, gedaan, toggleBlok, verzetBlok, wijzigBlokTijd, herstelBlokTijd, wijzigSlaap, herstelSlaap, instellingen, blessureActief, garminSync, checkin, bewaarCheckin, acwr } = useDagPlan(datumObj);
  const { user } = useAuth();
  const [popId, setPopId] = useState(null);
  const [ns, setNs] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editStart, setEditStart] = useState('');
  const [editEind, setEditEind] = useState('');

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

  // Reva-blokken met een oefeningen-checklist tellen per oefening (composite id
  // `${blokId}::${oefeningId}`), niet als één geheel — zo blijft North Star precies
  // ook als je maar de helft van de oefeningen deed.
  const checkbare = useMemo(() => {
    const items = [];
    (plan?.blokken || []).forEach((b) => {
      if (b.type === 'reva' && b.oefeningen?.length) {
        b.oefeningen.forEach((o) => items.push({ id: `${b.id}::${o.id}`, start: b.start, eind: b.eind, titel: o.naam, taakId: null }));
      } else if (['taak', 'judo', 'agenda'].includes(b.bron) || b.type === 'sport' || b.type === 'reva') {
        items.push(b);
      }
    });
    return items;
  }, [plan]);
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
  // voorbije dag is de hele dag al "voorbij", dus telt elk nog open blok. Op een
  // toekomstige dag is nog niets "gemist" — die dag is nog niet aan de beurt.
  const gemist = isFuture ? []
    : isToday ? checkbare.filter((b) => toMin(b.eind) <= now && !gedaan?.[b.id])
    : checkbare.filter((b) => !gedaan?.[b.id]);

  return (
    <div className="stack reveal">
      <header className="hero" style={{ '--aura': vak.aura, '--i': 0 }}>
        <h1>{vak.groet}<span className="accent">.</span></h1>
        <span className="muted" style={{ textTransform: 'capitalize' }}>{datumLabel(datumObj)}</span>
      </header>

      {/* Datumkiezer: vorige/volgende dag, vrij kiezen via kalender, of terug naar vandaag —
          zowel voor correcties op voorbije dagen als om toekomstige planning te bekijken */}
      <div className="row between" style={{ '--i': 0, gap: 8 }}>
        <button className="icon-btn" aria-label="Vorige dag" onClick={() => naarDag(-1)}>
          <IcoChevron width={18} height={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <Daypicker datum={datumObj} onKies={setDatumObj} />
        <button className="icon-btn" aria-label="Volgende dag" onClick={() => naarDag(1)}>
          <IcoChevron width={18} height={18} />
        </button>
        <button className="btn sm" disabled={isToday} onClick={() => setDatumObj(new Date())}>Vandaag</button>
      </div>
      {!isToday && (
        <p className="small muted" style={{ margin: 0 }}>
          {isFuture
            ? 'Je bekijkt een toekomstige dag — dit is je geplande dag, nog niets om af te vinken.'
            : 'Je bekijkt een voorbije dag — vink blokken af om die dag te corrigeren. Wijzigingen aan gewoonte-taken kunnen de streak-telling beïnvloeden.'}
        </p>
      )}

      {/* Gezondheid: ring + inline stats (geen 4 identieke kaartjes) */}
      <GezondheidKaart garmin={garmin} garminSync={garminSync} stappenDoel={instellingen?.gezondheid?.stappenDoel}
        wijzigSlaap={wijzigSlaap} herstelSlaap={herstelSlaap} i={1} />

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
            const isRevaChecklist = b.type === 'reva' && b.oefeningen?.length > 0;
            const checkbaar = !isRevaChecklist && checkbare.some((c) => c.id === b.id);
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
                    {isRevaChecklist && !isFuture && (
                      <div className="stack" style={{ gap: 4, marginTop: 8 }}>
                        {b.oefeningen.map((o) => {
                          const oId = `${b.id}::${o.id}`;
                          const oOn = !!gedaan?.[oId];
                          return (
                            <button key={oId} className="row" onClick={() => tik(oId, null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, gap: 8 }}>
                              <span className={'tl-check' + (oOn ? ' on' : '') + (popId === oId ? ' pop' : '')} aria-hidden>
                                {oOn && <IcoCheck width={14} height={14} />}
                              </span>
                              <span className="small" style={{ textDecoration: oOn ? 'line-through' : 'none', color: oOn ? 'var(--text-dim)' : 'var(--text)' }}>
                                {o.naam}{o.sets ? ` · ${o.sets}` : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {!bewerkt && (
                    <button className="icon-btn" aria-label="Tijd aanpassen" onClick={() => beginBewerken(b)}>
                      <IcoEdit width={16} height={16} />
                    </button>
                  )}
                  {checkbaar && !bewerkt && !isFuture && (
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

function GezondheidKaart({ garmin, garminSync, stappenDoel, wijzigSlaap, herstelSlaap, i }) {
  const s = syncStatus(garminSync);
  const [slaapBewerken, setSlaapBewerken] = useState(false);
  const [begin, setBegin] = useState('');
  const [eind, setEind] = useState('');
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
  const doelBehaald = stappenDoel && garmin.stappen != null && garmin.stappen >= stappenDoel;
  const beginSlaapBewerken = () => { setBegin(garmin.slaapBegin || '23:00'); setEind(garmin.slaapEind || '07:00'); setSlaapBewerken(true); };
  const bewaarSlaap = () => { wijzigSlaap(begin, eind); setSlaapBewerken(false); };
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
            <span className="sl">stappen</span>
            {doelBehaald && <IcoBadge width={15} height={15} style={{ color: 'var(--warning)' }} aria-label="Stappendoel behaald" />}
          </div>
          <div className="stat"><IcoPulse className="si" width={16} height={16} />
            <span className="sv">{garmin.hrvStatus || '—'}</span><span className="sl">HRV</span></div>
        </div>
      </div>
      {wijzigSlaap && (garmin.slaapBegin || garmin.slaapEind || garmin.slaapUren != null) && (
        slaapBewerken ? (
          <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
            <input className="input" type="time" value={begin} onChange={(e) => setBegin(e.target.value)} style={{ minHeight: 36, width: 110 }} />
            <span className="small dim">tot</span>
            <input className="input" type="time" value={eind} onChange={(e) => setEind(e.target.value)} style={{ minHeight: 36, width: 110 }} />
            <button className="btn sm primary" onClick={bewaarSlaap}>Bewaar</button>
            <button className="btn sm" onClick={() => setSlaapBewerken(false)}>Annuleer</button>
          </div>
        ) : (
          <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
            <span className="small dim">
              {garmin.slaapBegin && garmin.slaapEind ? `Geslapen: ${garmin.slaapBegin} – ${garmin.slaapEind}` : 'Slaaptijden onbekend'}
              {garmin.slaapOverride && ' (handmatig gecorrigeerd)'}
            </span>
            <button className="icon-btn" aria-label="Slaaptijden corrigeren" onClick={beginSlaapBewerken}>
              <IcoEdit width={15} height={15} />
            </button>
            {garmin.slaapOverride && (
              <button className="btn sm ghost" onClick={herstelSlaap}>Terug naar Garmin-data</button>
            )}
          </div>
        )
      )}
      {s.stale && !s.leeg && (
        <div className="small" style={{ color: 'var(--warning)', margin: 0 }}>⚠ {s.tekst} — Garmin-sync hapert mogelijk.</div>
      )}
    </section>
  );
}
