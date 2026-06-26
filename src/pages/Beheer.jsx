import { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { activeerPush } from '../services/push';
import { syncAgendaNu } from '../services/agenda';
import { PUSH_INTENSITEIT, APP_NAAM, DAGEN, DAG_NAMEN } from '../config/appConfig';
import { IcoBell, IcoLogout, IcoPlus, IcoTrash, IcoChevron } from '../components/Icons';

// Gedeelde beheer-helpers bovenop de SettingsContext.
function useBeheer() {
  const { instellingen: I, opslaan } = useSettings();
  const { toast } = useToast();
  const bewaar = (rubriek, patch) => opslaan(rubriek, patch);
  const bewaarMelding = async (rubriek, patch) => { await opslaan(rubriek, patch); toast('Bewaard.'); };
  return { I, bewaar, bewaarMelding, toast };
}

const CATEGORIEEN = [
  ['thema', 'Thema', 'Kleuren & uiterlijk'],
  ['meldingen', 'Meldingen', 'Push, tijden, categorieën, snooze'],
  ['ritme', 'Dagritme & agenda', 'Opstaan/slapen, iPhone-agenda'],
  ['werk', 'Werk', 'Uren, reistijden, streefuren'],
  ['sport', 'Sport & fiets', 'Judo-schema, fietsen'],
  ['voeding', 'Voeding & doelen', 'Eiwit, water, schermtijd'],
  ['account', 'Account', 'Aanmelding & afmelden'],
];

export default function Beheer() {
  return (
    <Routes>
      <Route index element={<Hub />} />
      <Route path="thema" element={<SubThema />} />
      <Route path="meldingen" element={<SubMeldingen />} />
      <Route path="ritme" element={<SubRitme />} />
      <Route path="werk" element={<SubWerk />} />
      <Route path="sport" element={<SubSport />} />
      <Route path="voeding" element={<SubVoeding />} />
      <Route path="account" element={<SubAccount />} />
    </Routes>
  );
}

function Hub() {
  return (
    <div className="stack reveal">
      <h1 style={{ margin: 0 }}>Beheer</h1>
      <section className="card" style={{ padding: '4px 16px' }}>
        {CATEGORIEEN.map(([key, titel, sub]) => (
          <Link key={key} to={`/beheer/${key}`} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{titel}</div>
              <div className="small dim">{sub}</div>
            </div>
            <IcoChevron width={18} height={18} style={{ color: 'var(--text-dim)' }} />
          </Link>
        ))}
      </section>
    </div>
  );
}

function Sub({ titel, children }) {
  return (
    <div className="stack reveal">
      <div className="row" style={{ gap: 10 }}>
        <Link to="/beheer" className="icon-btn" aria-label="Terug naar beheer" style={{ transform: 'scaleX(-1)' }}>
          <IcoChevron width={22} height={22} />
        </Link>
        <h1 style={{ margin: 0 }}>{titel}</h1>
      </div>
      {children}
    </div>
  );
}

const Laden = () => <div className="empty">Instellingen laden…</div>;

// ─── Thema ───────────────────────────────────────────────────────────────
function SubThema() {
  const { I, bewaar } = useBeheer();
  const { thema, setThema, themas } = useTheme();
  if (!I) return <Laden />;
  return (
    <Sub titel="Thema">
      <section className="card">
        <div className="row wrap" style={{ gap: 10 }}>
          {themas.map((t) => (
            <button key={t.id} className={'btn' + (thema === t.id ? ' primary' : '')}
              onClick={() => { setThema(t.id); bewaar('algemeen', { thema: t.id }); }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: t.kleur, display: 'inline-block' }} />
              {t.naam}
            </button>
          ))}
        </div>
      </section>
    </Sub>
  );
}

// ─── Meldingen ───────────────────────────────────────────────────────────
function SubMeldingen() {
  const { I, bewaar, bewaarMelding, toast } = useBeheer();
  const { user } = useAuth();
  if (!I) return <Laden />;
  const zetPush = async () => {
    try { await activeerPush(user.uid); toast('Meldingen geactiveerd op dit toestel.'); }
    catch (e) { toast(e.message); }
  };
  const snoozeActief = I.push?.snoozeTot && Date.parse(I.push.snoozeTot) > Date.now();
  const snoozeLabel = snoozeActief ? new Date(I.push.snoozeTot).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }) : '';
  const snooze = (uren) => bewaarMelding('push', { snoozeTot: new Date(Date.now() + uren * 3600000).toISOString() });
  return (
    <Sub titel="Meldingen">
      <section className="card stack">
        <button className="btn primary block" onClick={zetPush}>
          <IcoBell width={18} height={18} /> Meldingen activeren op dit toestel
        </button>
        <Veld label="Intensiteit">
          <select className="select" value={I.push.intensiteit}
            onChange={(e) => bewaarMelding('push', { intensiteit: e.target.value })}>
            {Object.entries(PUSH_INTENSITEIT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Veld>
        <TweeTijd a={['Ochtendbriefing', I.push.ochtendBriefing, (v) => bewaar('push', { ochtendBriefing: v })]}
          b={['Avondvooruitblik', I.push.avondVooruitblik, (v) => bewaar('push', { avondVooruitblik: v })]} />
        <TweeTijd a={['Readiness-check', I.push.readinessCheck, (v) => bewaar('push', { readinessCheck: v })]}
          b={['Stil vanaf', I.push.stilVan, (v) => bewaar('push', { stilVan: v })]} />
        <label className="row between">
          <span>Anti-scroll nudges ’s avonds</span>
          <input type="checkbox" checked={!!I.push.antiScrollNudges}
            onChange={(e) => bewaarMelding('push', { antiScrollNudges: e.target.checked })} style={{ width: 22, height: 22 }} />
        </label>

        <div className="divider" />
        <div className="card-title" style={{ margin: 0 }}>Welke meldingen?</div>
        {[['ochtend', 'Ochtendbriefing'], ['readiness', 'Readiness-check'], ['slot', 'Herinnering per tijdslot'],
          ['avond', 'Avondvooruitblik'], ['antiscroll', 'Anti-scroll nudges']].map(([key, label]) => (
          <label className="row between" key={key}>
            <span>{label}</span>
            <input type="checkbox" checked={I.push.categorieen?.[key] !== false}
              onChange={(e) => bewaar('push', { categorieen: { ...(I.push.categorieen || {}), [key]: e.target.checked } })}
              style={{ width: 22, height: 22 }} />
          </label>
        ))}

        <div className="divider" />
        <div className="row between">
          <span className="small">{snoozeActief ? `Gepauzeerd tot ${snoozeLabel}` : 'Meldingen pauzeren (snooze)'}</span>
          <div className="row" style={{ gap: 6 }}>
            {snoozeActief
              ? <button className="btn sm" onClick={() => bewaarMelding('push', { snoozeTot: null })}>Hervat</button>
              : <><button className="btn sm" onClick={() => snooze(1)}>1u</button>
                  <button className="btn sm" onClick={() => snooze(3)}>3u</button></>}
          </div>
        </div>
        <p className="small dim" style={{ margin: 0 }}>Tip: voeg de app toe aan je iPhone-beginscherm — anders kan iOS geen push tonen.</p>
      </section>
    </Sub>
  );
}

// ─── Dagritme & agenda ───────────────────────────────────────────────────
function SubRitme() {
  const { I, bewaar, bewaarMelding } = useBeheer();
  const [agenda, setAgenda] = useState(null);
  if (!I) return <Laden />;
  const testAgenda = async () => {
    setAgenda({ laden: true });
    try { const r = await syncAgendaNu(); setAgenda(r); }
    catch (e) { setAgenda({ fout: e?.message || 'onbekende fout' }); }
  };
  return (
    <Sub titel="Dagritme & agenda">
      <section className="card stack">
        <div className="small dim">Werkdag-ritme</div>
        <TweeTijd a={['Opstaan', I.algemeen.opstaan, (v) => bewaar('algemeen', { opstaan: v })]}
          b={['Slapen', I.algemeen.slapen, (v) => bewaar('algemeen', { slapen: v })]} />
        <div className="small dim">Vrije-/vakantiedag-ritme</div>
        <TweeTijd a={['Opstaan (vrij)', I.algemeen.opstaanVrij, (v) => bewaar('algemeen', { opstaanVrij: v })]}
          b={['Slapen (vrij)', I.algemeen.slapenVrij, (v) => bewaar('algemeen', { slapenVrij: v })]} />
        <Veld label="iPhone-agenda — ICS-links (één per lijn)">
          <textarea className="input" rows={3} defaultValue={I.algemeen.icsUrl || ''}
            placeholder={'webcal://p..-caldav.icloud.com/published/..\nhttps://...rsca-matchen.ics'}
            onBlur={(e) => bewaarMelding('algemeen', { icsUrl: e.target.value })} />
        </Veld>
        <p className="small dim" style={{ margin: 0 }}>
          Plak je openbare iCloud-agendalink(en); meerdere onder elkaar mag (eigen agenda + RSCA).
          Alleen-lezen, elke 3 uur ververst. Maak de link: Agenda-app → <b>Agenda’s</b> → <b>ⓘ</b> →
          <b> Openbare agenda</b> aan → <b>Kopieer</b>.
        </p>
        <button className="btn block" onClick={testAgenda} disabled={agenda?.laden}>
          {agenda?.laden ? 'Inlezen…' : 'Agenda nu inlezen & testen'}
        </button>
        {agenda && !agenda.laden && !agenda.fout && (
          <div className="stack" style={{ gap: 4 }}>
            <div className="small" style={{ fontWeight: 600 }}>{agenda.aantal} afspraken uit {agenda.links} link(s)</div>
            {(agenda.perLink || []).map((p, i) => (
              <div key={i} className="small dim">{p.fout ? `⚠️ ${p.link} — ${p.fout}` : `✓ ${p.link} — ${p.aantal} afspraken`}</div>
            ))}
            {agenda.serverTijd && <div className="small dim">Serverklok (Brussel): {agenda.serverTijd}</div>}

            {(agenda.diagnose || []).length > 0 && (
              <details style={{ marginTop: 6 }}>
                <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>🔍 Tijd-diagnose ({agenda.diagnose.length})</summary>
                <div className="stack" style={{ gap: 8, marginTop: 8 }}>
                  {agenda.diagnose.map((d, i) => (
                    <div key={i} className="card tight stack" style={{ gap: 2 }}>
                      <div className="small" style={{ fontWeight: 600 }}>{d.titel || '(geen titel)'}</div>
                      <div className="small dim" style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{d.ruw}</div>
                      <div className="small">
                        → wordt <b>{d.heleDag ? 'hele dag' : d.start}</b> op {d.datum}
                        {' · '}{d.heeftZ ? 'UTC (Z)→Brussel' : d.wandklok ? 'wandklok (zoals bron)' : 'onbekend'}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {(agenda.opgeslagen || []).length > 0 && (
              <details>
                <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>💾 Opgeslagen ({agenda.opgeslagen.length})</summary>
                <div className="stack" style={{ gap: 2, marginTop: 8 }}>
                  {agenda.opgeslagen.map((e, i) => (
                    <div key={i} className="small dim">{e.datum} · <b>{e.start}{e.eind ? `–${e.eind}` : ''}</b> · {e.titel}</div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
        {agenda?.fout && <div className="small" style={{ color: 'var(--danger)' }}>Inlezen mislukt: {agenda.fout}</div>}
      </section>
    </Sub>
  );
}

// ─── Werk ────────────────────────────────────────────────────────────────
function SubWerk() {
  const { I, bewaar, bewaarMelding } = useBeheer();
  if (!I) return <Laden />;
  return (
    <Sub titel="Werk">
      <section className="card stack">
        <TweeTijd a={['Thuis start', I.werk.thuisStart, (v) => bewaar('werk', { thuisStart: v })]}
          b={['Thuis eind', I.werk.thuisEind, (v) => bewaar('werk', { thuisEind: v })]} />
        <TweeTijd a={['Kantoor start', I.werk.kantoorStart, (v) => bewaar('werk', { kantoorStart: v })]}
          b={['Kantoor eind', I.werk.kantoorEind, (v) => bewaar('werk', { kantoorEind: v })]} />
        <TweeTijd a={['Woensdag eind (judoles)', I.werk.woensdagEind, (v) => bewaar('werk', { woensdagEind: v })]}
          b={['Middagpauze (min)', I.werk.middagpauzeMin, (v) => bewaar('werk', { middagpauzeMin: Number(v) }), 'number']} />
        <TweeTijd a={['Reistijd auto (min)', I.werk.autoReisMin, (v) => bewaar('werk', { autoReisMin: Number(v) }), 'number']}
          b={['Reistijd fiets enkel (min)', I.werk.fietsReisMin, (v) => bewaar('werk', { fietsReisMin: Number(v) }), 'number']} />
        <Veld label="Streefuren werk per dag">
          <input className="input" type="number" defaultValue={I.werk.doelUrenPerDag}
            onBlur={(e) => bewaarMelding('werk', { doelUrenPerDag: Number(e.target.value) })} />
        </Veld>
      </section>
    </Sub>
  );
}

// ─── Sport & fiets ───────────────────────────────────────────────────────
function SubSport() {
  const { I, bewaar, bewaarMelding } = useBeheer();
  if (!I) return <Laden />;
  const lijst = (key) => I.sport?.[key] || [];
  const zetLijst = (key, list) => bewaar('sport', { [key]: list });
  const updateRij = (key, idx, patch) => zetLijst(key, lijst(key).map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const verwijderRij = (key, idx) => zetLijst(key, lijst(key).filter((_, i) => i !== idx));
  const voegToe = (key, item) => zetLijst(key, [...lijst(key), item]);
  const toggleElders = (d) => {
    const huidig = I.sport?.elderstrainenDagen || [];
    bewaar('sport', { elderstrainenDagen: huidig.includes(d) ? huidig.filter((x) => x !== d) : [...huidig, d] });
  };
  // Gewone render-functie (géén component) -> geen remount/focusverlies bij typen.
  const tijdRij = (key0, idx, r) => (
    <div className="row wrap" style={{ gap: 8 }}>
      <select className="select" style={{ width: 'auto' }} value={r.dag} onChange={(e) => updateRij(key0, idx, { dag: e.target.value })}>
        {DAGEN.map((d) => <option key={d} value={d}>{DAG_NAMEN[d]}</option>)}
      </select>
      <input className="input" type="time" style={{ width: 110 }} value={r.start || ''} onChange={(e) => updateRij(key0, idx, { start: e.target.value })} />
      <input className="input" type="time" style={{ width: 110 }} value={r.eind || ''} onChange={(e) => updateRij(key0, idx, { eind: e.target.value })} />
      <button className="icon-btn" onClick={() => verwijderRij(key0, idx)} aria-label="Verwijderen"><IcoTrash width={18} height={18} /></button>
    </div>
  );
  return (
    <Sub titel="Sport & fiets">
      <section className="card stack">
        <label className="row between">
          <span>Fietsen naar kantoor telt als sport</span>
          <input type="checkbox" checked={!!I.sport.fietsAlsSport}
            onChange={(e) => bewaarMelding('sport', { fietsAlsSport: e.target.checked })} style={{ width: 22, height: 22 }} />
        </label>
        <label className="row between">
          <span>Fietsen toelaten ondanks blessure</span>
          <input type="checkbox" checked={!!I.sport.fietsBijBlessure}
            onChange={(e) => bewaarMelding('sport', { fietsBijBlessure: e.target.checked })} style={{ width: 22, height: 22 }} />
        </label>

        <div className="divider" />
        <div className="card-title" style={{ margin: 0 }}>Eigen judotraining</div>
        {lijst('judoEigenClub').map((r, idx) => <div key={`e${idx}`}>{tijdRij('judoEigenClub', idx, r)}</div>)}
        <button className="btn sm" onClick={() => voegToe('judoEigenClub', { dag: 'wo', start: '20:00', eind: '21:30', rol: 'training' })}>
          <IcoPlus width={16} height={16} /> Training toevoegen
        </button>

        <div className="divider" />
        <div className="card-title" style={{ margin: 0 }}>Judoles geven</div>
        {lijst('judoLesgeven').map((r, idx) => (
          <div className="stack" style={{ gap: 6 }} key={`l${idx}`}>
            {tijdRij('judoLesgeven', idx, r)}
            <div className="row wrap" style={{ gap: 12 }}>
              <label className="row small" style={{ gap: 6 }}>
                Vertrek vooraf (min):
                <input className="input" type="number" style={{ width: 80, minHeight: 36 }} value={r.vertrekVoorMin ?? 30}
                  onChange={(e) => updateRij('judoLesgeven', idx, { vertrekVoorMin: Number(e.target.value) })} />
              </label>
              <label className="row small" style={{ gap: 6 }}>
                <input type="checkbox" checked={!!r.tijdensVakantie}
                  onChange={(e) => updateRij('judoLesgeven', idx, { tijdensVakantie: e.target.checked })} /> ook tijdens vakantie
              </label>
            </div>
          </div>
        ))}
        <button className="btn sm" onClick={() => voegToe('judoLesgeven', { dag: 'wo', start: '18:30', eind: '19:45', vertrekVoorMin: 30, tijdensVakantie: false })}>
          <IcoPlus width={16} height={16} /> Les toevoegen
        </button>

        <div className="divider" />
        <div className="field">
          <label>Mogelijke dagen om elders te trainen</label>
          <div className="row wrap" style={{ gap: 6 }}>
            {DAGEN.map((d) => (
              <button key={d} type="button" title={DAG_NAMEN[d]}
                className={'btn sm' + ((I.sport?.elderstrainenDagen || []).includes(d) ? ' primary' : '')}
                onClick={() => toggleElders(d)}>{d}</button>
            ))}
          </div>
        </div>
        <p className="small dim" style={{ margin: 0 }}>
          “Vandaag” gebruikt dit schema: eigen trainingen worden vaste blokken; judoles geven plant ook
          een vertrek + snelle maaltijd ervoor (valt weg in vakantie tenzij aangevinkt).
        </p>
      </section>
    </Sub>
  );
}

// ─── Voeding & doelen ────────────────────────────────────────────────────
function SubVoeding() {
  const { I, bewaar, bewaarMelding } = useBeheer();
  if (!I) return <Laden />;
  return (
    <Sub titel="Voeding & doelen">
      <section className="card stack">
        <TweeTijd a={['Eiwitdoel (g/dag)', I.gezondheid.eiwitDoelG, (v) => bewaar('gezondheid', { eiwitDoelG: Number(v) }), 'number']}
          b={['Waterdoel (L/dag)', I.gezondheid.waterDoelL, (v) => bewaar('gezondheid', { waterDoelL: Number(v) }), 'number']} />
        <Veld label="Schermtijd-doel (min/dag)">
          <input className="input" type="number" defaultValue={I.gezondheid.schermtijdDoelMin}
            onBlur={(e) => bewaarMelding('gezondheid', { schermtijdDoelMin: Number(e.target.value) })} />
        </Veld>
      </section>
    </Sub>
  );
}

// ─── Account ─────────────────────────────────────────────────────────────
function SubAccount() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <Sub titel="Account">
      <section className="card stack">
        <p className="small dim" style={{ margin: 0 }}>Aangemeld als {user?.email} · {APP_NAAM}</p>
        <button className="btn danger block" onClick={() => logout().then(() => navigate('/login'))}>
          <IcoLogout width={18} height={18} /> Afmelden
        </button>
      </section>
    </Sub>
  );
}

// ─── Herbruikbare velden ─────────────────────────────────────────────────
const Veld = ({ label, children }) => (<div className="field"><label>{label}</label>{children}</div>);

function TweeTijd({ a, b }) {
  const render = ([label, waarde, onChange, type = 'time']) => (
    <div className="field grow">
      <label>{label}</label>
      <input className="input" type={type} defaultValue={waarde} onBlur={(e) => onChange(e.target.value)} />
    </div>
  );
  return <div className="row wrap" style={{ gap: 12 }}>{render(a)}{render(b)}</div>;
}
