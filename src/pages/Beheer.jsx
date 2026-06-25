import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { getInstellingen, saveInstellingen } from '../services/data';
import { activeerPush } from '../services/push';
import { syncAgendaNu } from '../services/agenda';
import { PUSH_INTENSITEIT, APP_NAAM, DAGEN, DAG_NAMEN } from '../config/appConfig';
import { IcoBell, IcoLogout, IcoPlus, IcoTrash } from '../components/Icons';

export default function Beheer() {
  const { user, logout } = useAuth();
  const { thema, setThema, themas } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [I, setI] = useState(null);

  useEffect(() => {
    if (user) getInstellingen(user.uid).then(setI);
  }, [user]);

  const bewaar = async (rubriek, patch) => {
    const nieuw = { ...I, [rubriek]: { ...I[rubriek], ...patch } };
    setI(nieuw);
    await saveInstellingen(user.uid, rubriek, nieuw[rubriek]);
  };
  const bewaarMelding = async (rubriek, patch) => { await bewaar(rubriek, patch); toast('Bewaard.'); };

  const zetPush = async () => {
    try { await activeerPush(user.uid); toast('Meldingen geactiveerd op dit toestel.'); }
    catch (e) { toast(e.message); }
  };

  const [agenda, setAgenda] = useState(null);
  const testAgenda = async () => {
    setAgenda({ laden: true });
    try {
      const r = await syncAgendaNu();
      setAgenda(r);
      toast(`✓ ${r.aantal} afspraken ingelezen.`);
    } catch (e) {
      setAgenda(null);
      toast('Inlezen mislukt: ' + (e?.message || 'onbekende fout'));
    }
  };

  // --- Sportschema (in-app beheer) ---
  const sportLijst = (key) => I.sport?.[key] || [];
  const zetSportLijst = (key, list) => bewaar('sport', { [key]: list });
  const updateRij = (key, idx, patch) => {
    const list = sportLijst(key).map((r, i) => (i === idx ? { ...r, ...patch } : r));
    zetSportLijst(key, list);
  };
  const verwijderRij = (key, idx) => zetSportLijst(key, sportLijst(key).filter((_, i) => i !== idx));
  const voegRijToe = (key, item) => zetSportLijst(key, [...sportLijst(key), item]);
  const toggleElders = (d) => {
    const huidig = I.sport?.elderstrainenDagen || [];
    bewaar('sport', { elderstrainenDagen: huidig.includes(d) ? huidig.filter((x) => x !== d) : [...huidig, d] });
  };

  if (!I) return <div className="empty">Instellingen laden…</div>;

  const snoozeActief = I.push?.snoozeTot && Date.parse(I.push.snoozeTot) > Date.now();
  const snoozeLabel = snoozeActief
    ? new Date(I.push.snoozeTot).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }) : '';
  const snooze = (uren) => bewaarMelding('push', { snoozeTot: new Date(Date.now() + uren * 3600000).toISOString() });

  return (
    <div className="stack reveal">
      <h1 style={{ margin: 0 }}>Beheer</h1>

      {/* Thema */}
      <Sectie titel="Thema">
        <div className="row wrap" style={{ gap: 10 }}>
          {themas.map((t) => (
            <button key={t.id} className={'btn' + (thema === t.id ? ' primary' : '')}
              onClick={() => { setThema(t.id); bewaar('algemeen', { thema: t.id }); }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: t.kleur, display: 'inline-block' }} />
              {t.naam}
            </button>
          ))}
        </div>
      </Sectie>

      {/* Meldingen */}
      <Sectie titel="Meldingen (push)">
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
        {[
          ['ochtend', 'Ochtendbriefing'],
          ['readiness', 'Readiness-check'],
          ['slot', 'Herinnering per tijdslot'],
          ['avond', 'Avondvooruitblik'],
          ['antiscroll', 'Anti-scroll nudges'],
        ].map(([key, label]) => (
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
              : <>
                  <button className="btn sm" onClick={() => snooze(1)}>1u</button>
                  <button className="btn sm" onClick={() => snooze(3)}>3u</button>
                </>}
          </div>
        </div>

        <p className="small dim" style={{ margin: 0 }}>Tip: voeg de app toe aan je iPhone-beginscherm — anders kan iOS geen push tonen.</p>
      </Sectie>

      {/* Algemeen / ritme */}
      <Sectie titel="Dagritme & agenda">
        <div className="small dim">Werkdag-ritme</div>
        <TweeTijd a={['Opstaan', I.algemeen.opstaan, (v) => bewaar('algemeen', { opstaan: v })]}
          b={['Slapen', I.algemeen.slapen, (v) => bewaar('algemeen', { slapen: v })]} />
        <div className="small dim">Vrije-/vakantiedag-ritme</div>
        <TweeTijd a={['Opstaan (vrij)', I.algemeen.opstaanVrij, (v) => bewaar('algemeen', { opstaanVrij: v })]}
          b={['Slapen (vrij)', I.algemeen.slapenVrij, (v) => bewaar('algemeen', { slapenVrij: v })]} />
        <Veld label="iPhone-agenda — ICS-links (één per lijn)">
          <textarea className="input" rows={3}
            value={I.algemeen.icsUrl || ''} placeholder={'webcal://p..-caldav.icloud.com/published/..\nhttps://...rsca-matchen.ics'}
            onChange={(e) => setI({ ...I, algemeen: { ...I.algemeen, icsUrl: e.target.value } })}
            onBlur={(e) => bewaarMelding('algemeen', { icsUrl: e.target.value })} />
        </Veld>
        <p className="small dim" style={{ margin: 0 }}>
          Plak je openbare iCloud-agendalink(en) — je mag er meerdere onder elkaar zetten
          (bv. je eigen agenda + de RSCA-matchkalender). Alleen-lezen, elke 3 uur ververst.
          <br />Zo maak je de link op je iPhone: Agenda-app → tabblad <b>Agenda’s</b> → tik op de
          <b> ⓘ</b> naast je agenda → zet <b>Openbare agenda</b> aan → <b>Deel link / Kopieer</b>.
        </p>
        <button className="btn block" onClick={testAgenda} disabled={agenda?.laden}>
          {agenda?.laden ? 'Inlezen…' : 'Agenda nu inlezen & testen'}
        </button>
        {agenda && !agenda.laden && (
          <div className="stack" style={{ gap: 4 }}>
            <div className="small" style={{ fontWeight: 600 }}>
              {agenda.aantal} toekomstige afspraken ingelezen uit {agenda.links} link(s)
            </div>
            {(agenda.perLink || []).map((p, i) => (
              <div key={i} className="small dim">
                {p.fout
                  ? `⚠️ ${p.link} — ${p.fout}`
                  : `✓ ${p.link} — ${p.aantal} afspraken`}
              </div>
            ))}
          </div>
        )}
      </Sectie>

      {/* Werk */}
      <Sectie titel="Werk">
        <TweeTijd a={['Thuis start', I.werk.thuisStart, (v) => bewaar('werk', { thuisStart: v })]}
          b={['Thuis eind', I.werk.thuisEind, (v) => bewaar('werk', { thuisEind: v })]} />
        <TweeTijd a={['Kantoor start', I.werk.kantoorStart, (v) => bewaar('werk', { kantoorStart: v })]}
          b={['Kantoor eind', I.werk.kantoorEind, (v) => bewaar('werk', { kantoorEind: v })]} />
        <TweeTijd a={['Woensdag eind (judoles)', I.werk.woensdagEind, (v) => bewaar('werk', { woensdagEind: v })]}
          b={['Middagpauze (min)', I.werk.middagpauzeMin, (v) => bewaar('werk', { middagpauzeMin: Number(v) }), 'number']} />
        <TweeTijd a={['Reistijd auto (min)', I.werk.autoReisMin, (v) => bewaar('werk', { autoReisMin: Number(v) }), 'number']}
          b={['Reistijd fiets enkel (min)', I.werk.fietsReisMin, (v) => bewaar('werk', { fietsReisMin: Number(v) }), 'number']} />
        <Veld label="Streefuren werk per dag">
          <input className="input" type="number" value={I.werk.doelUrenPerDag}
            onChange={(e) => setI({ ...I, werk: { ...I.werk, doelUrenPerDag: Number(e.target.value) } })}
            onBlur={(e) => bewaarMelding('werk', { doelUrenPerDag: Number(e.target.value) })} />
        </Veld>
      </Sectie>

      {/* Sport */}
      <Sectie titel="Sport & fiets">
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

        {/* Eigen judotrainingen */}
        <div className="card-title" style={{ margin: 0 }}>Eigen judotraining</div>
        {sportLijst('judoEigenClub').map((r, idx) => (
          <div className="row wrap" style={{ gap: 8 }} key={`eigen-${idx}`}>
            <select className="select" style={{ width: 'auto' }} value={r.dag}
              onChange={(e) => updateRij('judoEigenClub', idx, { dag: e.target.value })}>
              {DAGEN.map((d) => <option key={d} value={d}>{DAG_NAMEN[d]}</option>)}
            </select>
            <input className="input" type="time" style={{ width: 110 }} value={r.start || ''}
              onChange={(e) => updateRij('judoEigenClub', idx, { start: e.target.value })} />
            <input className="input" type="time" style={{ width: 110 }} value={r.eind || ''}
              onChange={(e) => updateRij('judoEigenClub', idx, { eind: e.target.value })} />
            <button className="icon-btn" onClick={() => verwijderRij('judoEigenClub', idx)} aria-label="Verwijderen">
              <IcoTrash width={18} height={18} />
            </button>
          </div>
        ))}
        <button className="btn sm" onClick={() => voegRijToe('judoEigenClub', { dag: 'wo', start: '20:00', eind: '21:30', rol: 'training' })}>
          <IcoPlus width={16} height={16} /> Training toevoegen
        </button>

        <div className="divider" />

        {/* Judoles geven */}
        <div className="card-title" style={{ margin: 0 }}>Judoles geven</div>
        {sportLijst('judoLesgeven').map((r, idx) => (
          <div className="stack" style={{ gap: 6 }} key={`les-${idx}`}>
            <div className="row wrap" style={{ gap: 8 }}>
              <select className="select" style={{ width: 'auto' }} value={r.dag}
                onChange={(e) => updateRij('judoLesgeven', idx, { dag: e.target.value })}>
                {DAGEN.map((d) => <option key={d} value={d}>{DAG_NAMEN[d]}</option>)}
              </select>
              <input className="input" type="time" style={{ width: 110 }} value={r.start || ''}
                onChange={(e) => updateRij('judoLesgeven', idx, { start: e.target.value })} />
              <input className="input" type="time" style={{ width: 110 }} value={r.eind || ''}
                onChange={(e) => updateRij('judoLesgeven', idx, { eind: e.target.value })} />
              <button className="icon-btn" onClick={() => verwijderRij('judoLesgeven', idx)} aria-label="Verwijderen">
                <IcoTrash width={18} height={18} />
              </button>
            </div>
            <div className="row wrap" style={{ gap: 12 }}>
              <label className="row small" style={{ gap: 6 }}>
                Vertrek vooraf (min):
                <input className="input" type="number" style={{ width: 80, minHeight: 36 }} value={r.vertrekVoorMin ?? 30}
                  onChange={(e) => updateRij('judoLesgeven', idx, { vertrekVoorMin: Number(e.target.value) })} />
              </label>
              <label className="row small" style={{ gap: 6 }}>
                <input type="checkbox" checked={!!r.tijdensVakantie}
                  onChange={(e) => updateRij('judoLesgeven', idx, { tijdensVakantie: e.target.checked })} />
                ook tijdens vakantie
              </label>
            </div>
          </div>
        ))}
        <button className="btn sm" onClick={() => voegRijToe('judoLesgeven', { dag: 'wo', start: '18:30', eind: '19:45', vertrekVoorMin: 30, tijdensVakantie: false })}>
          <IcoPlus width={16} height={16} /> Les toevoegen
        </button>

        <div className="divider" />

        {/* Elders trainen */}
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
          De planning op “Vandaag” gebruikt dit schema automatisch: eigen trainingen worden vaste
          blokken, judoles geven plant ook een vertrek + snelle maaltijd ervoor (valt weg in vakantie
          tenzij aangevinkt).
        </p>
      </Sectie>

      {/* Voeding / gezondheid */}
      <Sectie titel="Voeding & doelen">
        <TweeTijd a={['Eiwitdoel (g/dag)', I.gezondheid.eiwitDoelG, (v) => bewaar('gezondheid', { eiwitDoelG: Number(v) }), 'number']}
          b={['Waterdoel (L/dag)', I.gezondheid.waterDoelL, (v) => bewaar('gezondheid', { waterDoelL: Number(v) }), 'number']} />
        <Veld label="Schermtijd-doel (min/dag)">
          <input className="input" type="number" value={I.gezondheid.schermtijdDoelMin}
            onChange={(e) => setI({ ...I, gezondheid: { ...I.gezondheid, schermtijdDoelMin: Number(e.target.value) } })}
            onBlur={(e) => bewaarMelding('gezondheid', { schermtijdDoelMin: Number(e.target.value) })} />
        </Veld>
      </Sectie>

      <Sectie titel="Account">
        <p className="small dim" style={{ margin: 0 }}>Aangemeld als {user.email} · {APP_NAAM}</p>
        <button className="btn danger block" onClick={() => logout().then(() => navigate('/login'))}>
          <IcoLogout width={18} height={18} /> Afmelden
        </button>
      </Sectie>
    </div>
  );
}

const Sectie = ({ titel, children }) => (
  <section className="card stack">
    <div className="card-title" style={{ margin: 0 }}>{titel}</div>
    {children}
  </section>
);

const Veld = ({ label, children }) => (
  <div className="field"><label>{label}</label>{children}</div>
);

function TweeTijd({ a, b }) {
  const render = ([label, waarde, onChange, type = 'time']) => (
    <div className="field grow">
      <label>{label}</label>
      <input className="input" type={type} defaultValue={waarde}
        onBlur={(e) => onChange(e.target.value)} />
    </div>
  );
  return <div className="row wrap" style={{ gap: 12 }}>{render(a)}{render(b)}</div>;
}
