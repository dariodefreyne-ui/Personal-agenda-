import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { getInstellingen, saveInstellingen } from '../services/data';
import { activeerPush } from '../services/push';
import { PUSH_INTENSITEIT, APP_NAAM } from '../config/appConfig';
import { IcoBell, IcoLogout } from '../components/Icons';

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

  if (!I) return <div className="empty">Instellingen laden…</div>;

  return (
    <div className="stack">
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
        <p className="small dim" style={{ margin: 0 }}>Tip: voeg de app toe aan je iPhone-beginscherm — anders kan iOS geen push tonen.</p>
      </Sectie>

      {/* Algemeen / ritme */}
      <Sectie titel="Dagritme & agenda">
        <TweeTijd a={['Opstaan', I.algemeen.opstaan, (v) => bewaar('algemeen', { opstaan: v })]}
          b={['Slapen', I.algemeen.slapen, (v) => bewaar('algemeen', { slapen: v })]} />
        <Veld label="iPhone-agenda (ICS-abonnementslink)">
          <input className="input" value={I.algemeen.icsUrl || ''} placeholder="webcal://… of https://…"
            onChange={(e) => setI({ ...I, algemeen: { ...I.algemeen, icsUrl: e.target.value } })}
            onBlur={(e) => bewaarMelding('algemeen', { icsUrl: e.target.value })} />
        </Veld>
        <p className="small dim" style={{ margin: 0 }}>
          Plak hier de gedeelde/openbare link van je iPhone-kalender. De app leest je afspraken
          en RSCA-matchen automatisch in (alleen-lezen).
        </p>
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
        <p className="small dim" style={{ margin: 0 }}>
          Judo eigen club: wo 20:00–21:30 & za 16:00–18:00. Judoles geven: wo 18:30 (niet in vakantie).
          Elders trainen mogelijk: ma & vr. Pas dit later fijn aan; voor nu vast ingesteld.
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
