import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  getGarminDag, getDocById, saveDag, subscribeCollection,
  addItem, updateItem, deleteItem, getLaatsteGarminSync, getCollection, getVakanties,
} from '../services/data';
import { useSettings } from '../contexts/SettingsContext';
import { garminSamenvatting, syncStatus } from '../services/garmin';
import { DOELEN } from '../services/coach';
import { isBlessureActief, isVerlopenNietGemeld } from '../services/blessures';
import { BLESSURE_REGIOS } from '../config/appConfig';
import { acwrBerekenen, sessieBelasting } from '../services/belasting';
import { periodiseringBepalen } from '../services/periodisering';
import { vakantieFlags } from '../services/vakanties';
import { datumKey } from '../services/tijd';
import { IcoPlus, IcoTrash, IcoMoon, IcoHeart, IcoFlame } from '../components/Icons';
import Gauge from '../components/Gauge';
import CoachKaart from '../components/CoachKaart';

export default function Gezondheid() {
  const { user } = useAuth();
  const { instellingen, opslaan } = useSettings();
  const { toast } = useToast();
  const datum = datumKey(new Date());
  const [garmin, setGarmin] = useState(null);
  const [checkin, setCheckin] = useState({ slaapGevoel: 3, energie: 3, pijn: 0, notitie: '' });
  const [blessures, setBlessures] = useState([]);
  const [nieuweBlessure, setNieuweBlessure] = useState('');
  const [sync, setSync] = useState(null);
  const [acwr, setAcwr] = useState(null);
  const [vakantieType, setVakantieType] = useState(null);
  const [klaar, setKlaar] = useState(false);
  const [blessuresKlaar, setBlessuresKlaar] = useState(false);
  const doel = instellingen?.gezondheid?.doel || 'algemeen';
  const periodisering = periodiseringBepalen(new Date());

  // Alle losse fetches landen samen vóór we de coach-kaart tonen — anders
  // verschijnt eerst de blessure-zin en springt het advies even later naar de
  // pijn-zin zodra de check-in binnenkomt, wat de hele pagina laat "flashen".
  useEffect(() => {
    if (!user) return;
    setKlaar(false);
    Promise.all([
      getGarminDag(user.uid, datum),
      getLaatsteGarminSync(user.uid),
      getDocById(user.uid, 'dagen', datum),
      getCollection(user.uid, 'garminActivities'),
      getCollection(user.uid, 'activiteitLog'),
      getVakanties(user.uid),
    ]).then(([g, s, d, acts, logs, vakanties]) => {
      setGarmin(garminSamenvatting(g));
      setSync(s);
      if (d?.checkin) setCheckin(d.checkin);
      const rpeMap = Object.fromEntries((logs || []).map((l) => [l.id, l.rpe]));
      setAcwr(acwrBerekenen(sessieBelasting(acts, rpeMap)));
      const { verlof, buitenland } = vakantieFlags(vakanties, datum);
      setVakantieType(verlof ? (buitenland ? 'buitenland' : 'thuis') : null);
      setKlaar(true);
    });
    setBlessuresKlaar(false);
    return subscribeCollection(user.uid, 'blessures', (bs) => { setBlessures(bs); setBlessuresKlaar(true); });
  }, [user, datum]);

  // Eenmalige migratie: oude losse reva-oefeningen (vóór het blessure-model)
  // worden samengevoegd tot één "Algemeen"-blessure, zodat niets verloren gaat.
  useEffect(() => {
    if (!user || blessures.length) return;
    getCollection(user.uid, 'reva').then(async (oude) => {
      if (!oude.length) return;
      await addItem(user.uid, 'blessures', {
        titel: 'Algemeen', regio: 'algemeen', specifiek: '', notitie: '',
        startDatum: null, eindDatum: null, actief: true, eindeGemeld: false,
        aantalPerDag: oude.length,
        oefeningen: oude.map((r) => ({ id: r.id, naam: r.naam, sets: r.sets || '3×12', actief: true })),
      });
      await Promise.all(oude.map((r) => deleteItem(user.uid, 'reva', r.id)));
      toast('Je oude reva-oefeningen zijn samengevoegd tot één blessure "Algemeen" — pas gerust regio/naam aan.');
    });
  }, [user, blessures.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const blessureActief = (blessures || []).some((b) => isBlessureActief(b, datum));

  const voegBlessureToe = async () => {
    if (!nieuweBlessure.trim()) return;
    await addItem(user.uid, 'blessures', {
      titel: nieuweBlessure.trim(), regio: 'algemeen', specifiek: '', notitie: '',
      startDatum: datum, eindDatum: null, actief: true, eindeGemeld: false,
      aantalPerDag: 3, oefeningen: [],
    });
    setNieuweBlessure('');
  };

  const bevestigAfgelopen = (b) => updateItem(user.uid, 'blessures', b.id, { actief: false, eindeGemeld: true });

  const voegOefeningToe = (b) => {
    const naam = window.prompt('Naam van de oefening?');
    if (!naam?.trim()) return;
    const oefeningen = [...(b.oefeningen || []), { id: `o${Date.now()}`, naam: naam.trim(), sets: '3×12', actief: true }];
    updateItem(user.uid, 'blessures', b.id, { oefeningen });
  };
  const wijzigOefening = (b, oId, patch) => {
    const oefeningen = (b.oefeningen || []).map((o) => (o.id === oId ? { ...o, ...patch } : o));
    updateItem(user.uid, 'blessures', b.id, { oefeningen });
  };
  const verwijderOefening = (b, oId) => {
    const oefeningen = (b.oefeningen || []).filter((o) => o.id !== oId);
    updateItem(user.uid, 'blessures', b.id, { oefeningen });
  };
  const kiesDoel = async (d) => {
    await opslaan('gezondheid', { doel: d });
    toast('Doel bewaard — de coach past zijn advies aan.');
  };
  const readinessKleur = (r) => (r == null ? 'var(--text-dim)' : r >= 65 ? 'var(--success)' : r >= 40 ? 'var(--warning)' : 'var(--danger)');

  const bewaarCheckin = async () => {
    await saveDag(user.uid, datum, { checkin });
    toast('Check-in bewaard. Je planning houdt hier rekening mee.');
  };

  return (
    <div className="stack reveal">
      <h1 style={{ margin: 0 }}>Gezondheid</h1>

      <div className="row" style={{ gap: 10 }}>
        <Link to="/voortgang" className="btn grow">Voortgang & stats</Link>
        <Link to="/maaltijden" className="btn grow">Maaltijden & voeding</Link>
      </div>

      {/* Doel (stuurt de coach) */}
      <section className="card stack">
        <div className="card-title">Mijn doel</div>
        <div className="row wrap" style={{ gap: 8 }}>
          {Object.entries(DOELEN).map(([k, v]) => (
            <button key={k} className={'btn sm' + (doel === k ? ' primary' : '')} onClick={() => kiesDoel(k)}>{v}</button>
          ))}
        </div>
      </section>

      {/* Coach-advies */}
      {klaar && blessuresKlaar && (garmin || blessureActief) && (
        <CoachKaart garmin={garmin} goal={doel} blessureActief={blessureActief}
          energie={checkin?.ochtend?.energie ?? checkin?.energie ?? null} acwrZone={acwr?.zone ?? null}
          pijn={checkin?.pijn > 0 ? checkin.pijn : null} periodiseringFase={periodisering.fase} vakantieType={vakantieType} />
      )}

      {/* Garmin: gauges + profiel */}
      <section className="card stack">
        <div className="card-title">Garmin — vandaag</div>
        {garmin ? (
          <>
            <div className="row wrap" style={{ gap: 18, justifyContent: 'center' }}>
              <Gauge val={garmin.readiness ?? 0} label="readiness" size={92}
                sub={garmin.readiness ?? '—'} kleur={readinessKleur(garmin.readiness)} />
              <Gauge val={garmin.bodyBattery ?? 0} label="battery" size={92}
                sub={garmin.bodyBattery ?? '—'} kleur="var(--primary-2)" />
              <div className="statline" style={{ justifyContent: 'center' }}>
                <div className="stat"><IcoMoon className="si" width={16} height={16} />
                  <span className="sv">{garmin.slaapUren != null ? garmin.slaapUren.toFixed(1) + 'u' : '—'}</span><span className="sl">slaap</span></div>
                <div className="stat"><IcoHeart className="si" width={16} height={16} />
                  <span className="sv">{garmin.rustHr ?? '—'}</span><span className="sl">rust-HR</span></div>
                <div className="stat"><IcoFlame className="si" width={16} height={16} />
                  <span className="sv">{garmin.stappen != null ? (garmin.stappen / 1000).toFixed(1) + 'k' : '—'}</span><span className="sl">stappen</span></div>
              </div>
            </div>
            <div className="divider" />
            <div className="row wrap" style={{ gap: 8 }}>
              {garmin.hrvStatus && <span className="badge">HRV: {garmin.hrvStatus}{garmin.hrvAvg != null ? ` (${Math.round(garmin.hrvAvg)}ms)` : ''}</span>}
              {garmin.vo2max != null && <span className="badge">VO₂max {Math.round(garmin.vo2max)}</span>}
              {garmin.gewichtKg != null && <span className="badge">{garmin.gewichtKg} kg</span>}
              {garmin.vetPct != null && <span className="badge">{Math.round(garmin.vetPct)}% vet</span>}
              {garmin.leeftijd != null && <span className="badge">{garmin.leeftijd} jaar</span>}
              {garmin.lengteCm != null && <span className="badge">{Math.round(garmin.lengteCm)} cm</span>}
              {garmin.trainingStatus && <span className="badge accent">{garmin.trainingStatus}</span>}
            </div>
            {syncStatus(sync).stale && (
              <div className="small" style={{ color: 'var(--warning)', margin: 0 }}>⚠ {syncStatus(sync).tekst} — Garmin-sync hapert mogelijk.</div>
            )}
          </>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            {syncStatus(sync).leeg
              ? 'Nog geen Garmin-data. Koppel Garmin (zie README); de ochtendsync vult dit vanzelf in.'
              : `Geen verse data voor vandaag. ${syncStatus(sync).tekst}.`}
          </p>
        )}
      </section>

      {/* Dagelijkse check-in */}
      <section className="card stack">
        <div className="card-title">Dagelijkse check-in</div>
        <Schaal label="Hoe voelt je slaap?" waarde={checkin.slaapGevoel}
          onChange={(v) => setCheckin({ ...checkin, slaapGevoel: v })} laag="Slecht" hoog="Top" />
        <Schaal label="Energie / fitheid" waarde={checkin.energie}
          onChange={(v) => setCheckin({ ...checkin, energie: v })} laag="Leeg" hoog="Vol" />
        <Schaal label="Pijn / blessure" waarde={checkin.pijn} max={5}
          onChange={(v) => setCheckin({ ...checkin, pijn: v })} laag="Geen" hoog="Veel" />
        <div className="field">
          <label>Notitie (optioneel)</label>
          <textarea className="input" value={checkin.notitie}
            onChange={(e) => setCheckin({ ...checkin, notitie: e.target.value })} placeholder="bv. knie wat gevoelig" />
        </div>
        <button className="btn primary block" onClick={bewaarCheckin}>Check-in bewaren</button>
      </section>

      {/* Blessures + revalidatie-oefeningen */}
      <section className="card stack">
        <div className="card-title">Blessures & revalidatie</div>
        {blessures.length === 0 && <p className="small muted" style={{ margin: 0 }}>Voeg een blessure toe om revalidatie-oefeningen te plannen.</p>}
        {blessures.map((b) => <BlessureKaart key={b.id} b={b} uid={user.uid} datum={datum}
          bevestigAfgelopen={bevestigAfgelopen} voegOefeningToe={voegOefeningToe}
          wijzigOefening={wijzigOefening} verwijderOefening={verwijderOefening} />)}
        <div className="row" style={{ gap: 8 }}>
          <input className="input" value={nieuweBlessure} onChange={(e) => setNieuweBlessure(e.target.value)}
            placeholder="Nieuwe blessure (bv. knie, of gewoon 'spier')…" onKeyDown={(e) => e.key === 'Enter' && voegBlessureToe()} />
          <button className="btn primary" onClick={voegBlessureToe}><IcoPlus width={18} height={18} /></button>
        </div>
        <p className="small dim" style={{ margin: 0 }}>
          Geen diagnose nodig — “spier” of “onbepaald” mag. Bij een gekozen regio (knie, rug…)
          raadt de coach zelf de juiste sporten af; bij “algemeen” blijft de coach enkel voorzichtiger
          met je niveau. Oefeningen op inactief zetten verwijdert ze niet — handig om op te bouwen
          van makkelijk naar moeilijk.
        </p>
      </section>
    </div>
  );
}

function BlessureKaart({ b, uid, datum, bevestigAfgelopen, voegOefeningToe, wijzigOefening, verwijderOefening }) {
  const actief = isBlessureActief(b, datum);
  const verlopenNietGemeld = isVerlopenNietGemeld(b, datum);
  const oefeningen = b.oefeningen || [];
  return (
    <div className="card" style={{ background: 'var(--bg-2)', padding: 12 }}>
      <div className="stack" style={{ gap: 8 }}>
        <div className="row between" style={{ gap: 8 }}>
          <input className="input sm" style={{ minHeight: 32, fontWeight: 600, flex: 1 }}
            defaultValue={b.titel || ''} aria-label="Titel blessure"
            onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== b.titel && updateItem(uid, 'blessures', b.id, { titel: e.target.value.trim() })} />
          <button className="icon-btn" onClick={() => deleteItem(uid, 'blessures', b.id)} aria-label="Verwijderen">
            <IcoTrash width={18} height={18} />
          </button>
        </div>

        {verlopenNietGemeld && (
          <div className="row between small" style={{ color: 'var(--warning)', gap: 8 }}>
            <span>⚠ Einddatum ({b.eindDatum}) is voorbij — nog actief?</span>
            <button className="btn sm" onClick={() => bevestigAfgelopen(b)}>Bevestig afgelopen</button>
          </div>
        )}

        <div className="row wrap" style={{ gap: 8 }}>
          <div className="field" style={{ minWidth: 160 }}>
            <label>Regio</label>
            <select className="input sm" value={b.regio || 'algemeen'}
              onChange={(e) => updateItem(uid, 'blessures', b.id, { regio: e.target.value })}>
              {Object.entries(BLESSURE_REGIOS).map(([k, v]) => <option key={k} value={k}>{v.naam}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 140 }}>
            <label>Aantal oef./dag</label>
            <input className="input sm" type="number" min={1} value={b.aantalPerDag || 3}
              onChange={(e) => updateItem(uid, 'blessures', b.id, { aantalPerDag: Math.max(1, Number(e.target.value) || 1) })} />
          </div>
          <label className="row small" style={{ gap: 6, alignSelf: 'center' }}>
            <input type="checkbox" checked={b.actief !== false}
              onChange={(e) => updateItem(uid, 'blessures', b.id, { actief: e.target.checked })} />
            actief
          </label>
        </div>

        <input className="input sm" placeholder="Specifiek (optioneel, bv. 'voorste kruisband' of 'spier — niet naar dokter')"
          defaultValue={b.specifiek || ''}
          onBlur={(e) => e.target.value.trim() !== (b.specifiek || '') && updateItem(uid, 'blessures', b.id, { specifiek: e.target.value.trim() })} />

        <div className="row wrap" style={{ gap: 8 }}>
          <div className="field" style={{ minWidth: 140 }}>
            <label>Startdatum</label>
            <input className="input sm" type="date" value={b.startDatum || ''}
              onChange={(e) => updateItem(uid, 'blessures', b.id, { startDatum: e.target.value || null })} />
          </div>
          <div className="field" style={{ minWidth: 140 }}>
            <label>Einddatum</label>
            <input className="input sm" type="date" value={b.eindDatum || ''}
              onChange={(e) => updateItem(uid, 'blessures', b.id, { eindDatum: e.target.value || null, eindeGemeld: false })} />
          </div>
          <label className="row small" style={{ gap: 6, alignSelf: 'center' }}>
            <input type="checkbox" checked={!b.eindDatum}
              onChange={(e) => e.target.checked && updateItem(uid, 'blessures', b.id, { eindDatum: null, eindeGemeld: false })} />
            onbepaald
          </label>
        </div>

        <div className="divider" />
        <div className="small dim">Oefeningen ({oefeningen.filter((o) => o.actief !== false).length} actief van {oefeningen.length})</div>
        {oefeningen.map((o) => (
          <div className="list-row" key={o.id}>
            <div className="grow">
              <input className="input sm" style={{ minHeight: 32 }} defaultValue={o.naam || ''} aria-label="Naam oefening"
                onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== o.naam && wijzigOefening(b, o.id, { naam: e.target.value.trim() })} />
              <input className="input sm" style={{ minHeight: 32, marginTop: 4, maxWidth: 140 }}
                value={o.sets || ''} onChange={(e) => wijzigOefening(b, o.id, { sets: e.target.value })} />
            </div>
            <label className="row small" style={{ gap: 6 }}>
              <input type="checkbox" checked={o.actief !== false}
                onChange={(e) => wijzigOefening(b, o.id, { actief: e.target.checked })} />
              actief
            </label>
            <button className="icon-btn" onClick={() => verwijderOefening(b, o.id)} aria-label="Verwijderen">
              <IcoTrash width={18} height={18} />
            </button>
          </div>
        ))}
        <button className="btn sm" onClick={() => voegOefeningToe(b)}><IcoPlus width={14} height={14} /> Oefening toevoegen</button>
        {!actief && <p className="small dim" style={{ margin: 0 }}>Niet actief — telt niet mee voor de coach of "vandaag".</p>}
      </div>
    </div>
  );
}

const Kpi = ({ Icon, l, v }) => (
  <div className="card">
    <Icon width={18} height={18} style={{ color: 'var(--primary)' }} />
    <div className="v">{v}</div><div className="l">{l}</div>
  </div>
);

function Schaal({ label, waarde, onChange, laag, hoog, max = 5 }) {
  const min = laag === 'Geen' ? 0 : 1;
  const opties = [];
  for (let n = min; n <= max; n++) opties.push(n);
  return (
    <div className="field">
      <label>{label}</label>
      <div className="row" style={{ gap: 6 }}>
        {opties.map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={'btn sm' + (waarde === n ? ' primary' : '')} style={{ minWidth: 42 }}>{n}</button>
        ))}
      </div>
      <div className="row between small dim"><span>{laag}</span><span>{hoog}</span></div>
    </div>
  );
}
