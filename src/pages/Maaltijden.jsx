import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import {
  subscribeCollection, addItem, updateItem, deleteItem,
  getDocById, saveDag,
} from '../services/data';
import { datumKey } from '../services/tijd';
import {
  MOMENTEN, kiesSuggesties, gekozenMaaltijd, schaalIngredienten, ingredientenTekst,
  genereerBoodschappenlijst,
} from '../services/maaltijden';
import { VOEDINGSDOELEN } from '../config/appConfig';
import { IcoPlus, IcoTrash, IcoEdit, IcoFork, IcoCheck } from '../components/Icons';

const TYPES = { ontbijt: 'Ontbijt', lunch: 'Lunch', diner: 'Diner', snack: 'Snack' };
const MOMENT_LABELS = { ontbijt: 'Ontbijt', lunch: 'Lunch', diner: 'Diner', snack1: 'Snack 1', snack2: 'Snack 2', snack3: 'Snack 3' };
const LEEG = { naam: '', type: 'lunch', eiwitG: 25, kcal: 500, aantalEters: 1, houdbaar: false, doelen: [], ingredienten: [] };

export default function Maaltijden() {
  const { user } = useAuth();
  const { instellingen } = useSettings();
  const { toast } = useToast();
  const datum = datumKey(new Date());
  const [maaltijden, setMaaltijden] = useState([]);
  const doelen = instellingen?.gezondheid || { eiwitDoelG: 110, waterDoelL: 2.5 };
  const voedingInst = instellingen?.voeding || { doelen: ['onderhoud'], aantalEtersStandaard: 1, snacksAan: true };
  const [voeding, setVoeding] = useState({ eiwitG: 0, waterL: 0 });
  const [maaltijdPlan, setMaaltijdPlan] = useState({});
  const [form, setForm] = useState(LEEG);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [periode, setPeriode] = useState('week');
  const [lijst, setLijst] = useState({ vers: [], houdbaar: [] });

  useEffect(() => {
    if (!user) return;
    getDocById(user.uid, 'dagen', datum).then((d) => {
      if (d?.voeding) setVoeding(d.voeding);
      if (d?.maaltijdPlan) setMaaltijdPlan(d.maaltijdPlan);
    });
    return subscribeCollection(user.uid, 'maaltijden', setMaaltijden);
  }, [user, datum]);

  useEffect(() => {
    if (!user || !maaltijden.length) { setLijst({ vers: [], houdbaar: [] }); return; }
    (async () => {
      const dagen = periode === 'week' ? 7 : 28;
      const start = new Date();
      const periodeData = Array.from({ length: dagen }, (_, i) => {
        const d = new Date(start); d.setDate(d.getDate() + i); return datumKey(d);
      });
      // Week: bestaande dagdocs ophalen voor realistische (al gekozen) lijst.
      // Maand: bewust géén dagdocs ophalen — zuiver berekend (geen extra reads).
      let dagDocs = {};
      if (periode === 'week') {
        const docs = await Promise.all(periodeData.map((d) => getDocById(user.uid, 'dagen', d)));
        dagDocs = Object.fromEntries(periodeData.map((d, i) => [d, docs[i]]).filter(([, v]) => v));
      }
      setLijst(genereerBoodschappenlijst({
        periode: periodeData, recepten: maaltijden, doelen: voedingInst.doelen,
        aantalEtersStandaard: voedingInst.aantalEtersStandaard, dagDocs,
      }));
    })();
  }, [user, maaltijden, periode, voedingInst.doelen, voedingInst.aantalEtersStandaard]); // eslint-disable-line react-hooks/exhaustive-deps

  const bewaarVoeding = async (patch) => {
    const v = { ...voeding, ...patch };
    setVoeding(v);
    await saveDag(user.uid, datum, { voeding: v });
  };

  const kiesMaaltijd = async (moment, recipeId, aantalEters) => {
    const plan = { ...maaltijdPlan, [moment]: { recipeId, aantalEters } };
    setMaaltijdPlan(plan);
    await saveDag(user.uid, datum, { maaltijdPlan: plan });
  };

  const start = (m) => {
    if (m) { setEditId(m.id); setForm({ ...LEEG, ...m }); }
    else { setEditId(null); setForm(LEEG); }
    setOpen(true);
  };
  const bewaar = async () => {
    if (!form.naam.trim()) return toast('Geef een naam.');
    const payload = {
      naam: form.naam.trim(), type: form.type, eiwitG: Number(form.eiwitG) || 0, kcal: Number(form.kcal) || 0,
      aantalEters: Number(form.aantalEters) || 1, houdbaar: !!form.houdbaar, doelen: form.doelen || [],
      ingredienten: (form.ingredienten || []).filter((i) => i.naam?.trim()).map((i) => ({
        naam: i.naam.trim(), hoeveelheid: Number(i.hoeveelheid) || 0, eenheid: i.eenheid || '',
      })),
    };
    if (editId) await updateItem(user.uid, 'maaltijden', editId, payload);
    else await addItem(user.uid, 'maaltijden', payload);
    setOpen(false); toast('Bewaard.');
  };

  const wijzigIngredient = (idx, patch) => {
    const ingredienten = [...(form.ingredienten || [])];
    ingredienten[idx] = { ...ingredienten[idx], ...patch };
    setForm({ ...form, ingredienten });
  };
  const voegIngredientToe = () => setForm({ ...form, ingredienten: [...(form.ingredienten || []), { naam: '', hoeveelheid: '', eenheid: 'g' }] });
  const verwijderIngredient = (idx) => setForm({ ...form, ingredienten: (form.ingredienten || []).filter((_, i) => i !== idx) });
  const toggleDoel = (key) => {
    const huidig = form.doelen || [];
    setForm({ ...form, doelen: huidig.includes(key) ? huidig.filter((d) => d !== key) : [...huidig, key] });
  };

  const kopieer = async () => {
    const regel = (i) => `- ${i.hoeveelheid}${i.eenheid} ${i.naam}`;
    const tekst = [
      'Vers (deze week):', ...lijst.vers.map(regel),
      '', 'Houdbaar (bulk):', ...lijst.houdbaar.map(regel),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(tekst);
      toast('Boodschappenlijst gekopieerd.');
    } catch {
      toast('Kopiëren mislukt.');
    }
  };

  const eiwitPct = Math.min(100, Math.round((voeding.eiwitG / (doelen.eiwitDoelG || 110)) * 100));
  const waterPct = Math.min(100, Math.round((voeding.waterL / (doelen.waterDoelL || 2.5)) * 100));
  const momenten = MOMENTEN.filter((m) => voedingInst.snacksAan !== false || !m.startsWith('snack'));

  return (
    <div className="stack reveal">
      <h1 style={{ margin: 0 }}>Maaltijden & voeding</h1>

      {/* Dagtracking */}
      <section className="card stack">
        <div className="card-title">Vandaag</div>
        <Tracker label="Eiwit" waarde={voeding.eiwitG} doel={doelen.eiwitDoelG} eenheid="g" pct={eiwitPct}
          stap={10} onPlus={() => bewaarVoeding({ eiwitG: (voeding.eiwitG || 0) + 10 })}
          onMin={() => bewaarVoeding({ eiwitG: Math.max(0, (voeding.eiwitG || 0) - 10) })} />
        <Tracker label="Water" waarde={voeding.waterL} doel={doelen.waterDoelL} eenheid="L" pct={waterPct}
          stap={0.25} onPlus={() => bewaarVoeding({ waterL: Math.round(((voeding.waterL || 0) + 0.25) * 100) / 100 })}
          onMin={() => bewaarVoeding({ waterL: Math.max(0, Math.round(((voeding.waterL || 0) - 0.25) * 100) / 100) })} />
      </section>

      {/* Vandaag kiezen */}
      <section className="stack" style={{ gap: 10 }}>
        <h2 style={{ margin: 0 }}>Vandaag kiezen</h2>
        {momenten.map((moment) => {
          const suggesties = kiesSuggesties({ recepten: maaltijden, moment, doelen: voedingInst.doelen, datum, aantal: 2 });
          const override = maaltijdPlan[moment] || null;
          const gekozen = gekozenMaaltijd({ recepten: maaltijden, moment, doelen: voedingInst.doelen, datum, override });
          if (!suggesties.length) return null;
          return (
            <div className="card tight stack" key={moment} style={{ gap: 8 }}>
              <div className="small dim">{MOMENT_LABELS[moment]}</div>
              {suggesties.map((recept) => {
                const eters = override?.recipeId === recept.id ? (override.aantalEters || recept.aantalEters || 1) : (voedingInst.aantalEtersStandaard || 1);
                const geschaald = schaalIngredienten(recept.ingredienten || [], recept.aantalEters || 1, eters);
                const actief = gekozen?.recept?.id === recept.id;
                return (
                  <button key={recept.id} className="card tight row between"
                    style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: actief ? '1px solid var(--primary)' : '1px solid var(--border)' }}
                    onClick={() => kiesMaaltijd(moment, recept.id, eters)}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{recept.naam}</div>
                      <div className="small dim">{ingredientenTekst(geschaald) || '—'} · voor {eters} eter(s)</div>
                    </div>
                    {actief && <IcoCheck width={18} height={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          );
        })}
        {momenten.every((m) => !kiesSuggesties({ recepten: maaltijden, moment: m, doelen: voedingInst.doelen, datum }).length) && (
          <div className="empty">Nog geen recepten met ingrediënten — voeg er hieronder toe.</div>
        )}
      </section>

      {/* Boodschappenlijst */}
      <section className="stack" style={{ gap: 10 }}>
        <div className="row between">
          <h2 style={{ margin: 0 }}>Boodschappenlijst</h2>
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn sm${periode === 'week' ? ' primary' : ''}`} onClick={() => setPeriode('week')}>Deze week</button>
            <button className={`btn sm${periode === 'maand' ? ' primary' : ''}`} onClick={() => setPeriode('maand')}>Komende maand</button>
          </div>
        </div>
        {!lijst.vers.length && !lijst.houdbaar.length && <div className="empty">Niets te kopen — voeg recepten met ingrediënten toe.</div>}
        {!!lijst.vers.length && (
          <div className="card tight stack">
            <div className="small dim">Vers (wekelijks)</div>
            {lijst.vers.map((i) => <div key={`${i.naam}|${i.eenheid}`}>{i.hoeveelheid}{i.eenheid} {i.naam}</div>)}
          </div>
        )}
        {!!lijst.houdbaar.length && (
          <div className="card tight stack">
            <div className="small dim">Houdbaar (in bulk)</div>
            {lijst.houdbaar.map((i) => <div key={`${i.naam}|${i.eenheid}`}>{i.hoeveelheid}{i.eenheid} {i.naam}</div>)}
          </div>
        )}
        {(!!lijst.vers.length || !!lijst.houdbaar.length) && (
          <button className="btn ghost sm" onClick={kopieer}>Kopiëren</button>
        )}
      </section>

      {/* Maaltijdenbibliotheek */}
      <section className="stack" style={{ gap: 10 }}>
        <div className="row between">
          <h2 style={{ margin: 0 }}>Mijn recepten</h2>
          <button className="btn primary sm" onClick={() => start(null)}><IcoPlus width={18} height={18} /> Nieuw</button>
        </div>
        {maaltijden.length === 0 && <div className="empty">Nog geen maaltijden. Voeg je vaste gerechten toe.</div>}
        {maaltijden.map((m) => (
          <div className="card tight row between" key={m.id}>
            <div className="row" style={{ gap: 10, minWidth: 0 }}>
              <IcoFork width={18} height={18} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontWeight: 600 }}>{m.naam}</div>
                <div className="small dim">
                  {TYPES[m.type] || m.type} · {m.eiwitG}g eiwit · {m.kcal} kcal
                  {m.ingredienten?.length ? ` · ${ingredientenTekst(m.ingredienten)}` : ''}
                  {m.houdbaar ? ' · houdbaar' : ''}
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 2 }}>
              <button className="icon-btn" onClick={() => bewaarVoeding({ eiwitG: (voeding.eiwitG || 0) + (m.eiwitG || 0) })}
                title="Vandaag gegeten (+eiwit)"><IcoPlus width={18} height={18} /></button>
              <button className="icon-btn" onClick={() => start(m)} aria-label="Bewerken"><IcoEdit width={18} height={18} /></button>
              <button className="icon-btn" onClick={() => deleteItem(user.uid, 'maaltijden', m.id)} aria-label="Verwijderen"><IcoTrash width={18} height={18} /></button>
            </div>
          </div>
        ))}
      </section>

      {open && (
        <div className="card stack" style={{ position: 'fixed', inset: 'auto 12px 90px 12px', maxWidth: 820, margin: '0 auto', zIndex: 50, maxHeight: '80vh', overflowY: 'auto' }}>
          <h2 style={{ margin: 0 }}>{editId ? 'Maaltijd bewerken' : 'Nieuwe maaltijd'}</h2>
          <div className="field"><label>Naam</label>
            <input className="input" value={form.naam} onChange={(e) => setForm({ ...form, naam: e.target.value })} placeholder="bv. Kip met rijst" /></div>
          <div className="row wrap" style={{ gap: 12 }}>
            <div className="field grow"><label>Type</label>
              <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div className="field" style={{ width: 110 }}><label>Eiwit (g)</label>
              <input className="input" type="number" value={form.eiwitG} onChange={(e) => setForm({ ...form, eiwitG: e.target.value })} /></div>
            <div className="field" style={{ width: 110 }}><label>Kcal</label>
              <input className="input" type="number" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} /></div>
            <div className="field" style={{ width: 110 }}><label>Eters</label>
              <input className="input" type="number" min="1" value={form.aantalEters} onChange={(e) => setForm({ ...form, aantalEters: e.target.value })} /></div>
          </div>

          <div className="field">
            <label>Doelen <span className="small dim">(leeg = past bij elk doel)</span></label>
            <div className="row wrap" style={{ gap: 6 }}>
              {Object.entries(VOEDINGSDOELEN).map(([k, v]) => (
                <button key={k} type="button" className={`btn sm${(form.doelen || []).includes(k) ? ' primary' : ' ghost'}`} onClick={() => toggleDoel(k)}>{v.kort}</button>
              ))}
            </div>
          </div>

          <label className="row" style={{ gap: 8 }}>
            <input type="checkbox" checked={!!form.houdbaar} onChange={(e) => setForm({ ...form, houdbaar: e.target.checked })} />
            Houdbaar (bulk-aankoop) i.p.v. vers (wekelijks)
          </label>

          <div className="field stack">
            <div className="row between"><label style={{ margin: 0 }}>Ingrediënten</label>
              <button type="button" className="btn ghost sm" onClick={voegIngredientToe}><IcoPlus width={16} height={16} /> Ingrediënt</button></div>
            {(form.ingredienten || []).map((i, idx) => (
              <div className="row" style={{ gap: 8 }} key={idx}>
                <input className="input grow" placeholder="naam" value={i.naam} onChange={(e) => wijzigIngredient(idx, { naam: e.target.value })} />
                <input className="input" style={{ width: 90 }} type="number" placeholder="hoev." value={i.hoeveelheid} onChange={(e) => wijzigIngredient(idx, { hoeveelheid: e.target.value })} />
                <select className="select" style={{ width: 90 }} value={i.eenheid} onChange={(e) => wijzigIngredient(idx, { eenheid: e.target.value })}>
                  {['g', 'ml', 'stuk', 'el', 'tl'].map((e2) => <option key={e2} value={e2}>{e2}</option>)}
                </select>
                <button type="button" className="icon-btn" onClick={() => verwijderIngredient(idx)} aria-label="Verwijderen"><IcoTrash width={16} height={16} /></button>
              </div>
            ))}
          </div>

          <div className="row between">
            <button className="btn ghost" onClick={() => setOpen(false)}>Annuleren</button>
            <button className="btn primary" onClick={bewaar}>Bewaren</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Tracker({ label, waarde, doel, eenheid, pct, onPlus, onMin }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row between">
        <span>{label}</span>
        <span className="small muted">{(waarde || 0)}{eenheid} / {doel}{eenheid}</span>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn sm" onClick={onMin}>−</button>
        <div className="progress grow"><span style={{ width: `${pct}%` }} /></div>
        <button className="btn sm" onClick={onPlus}>+</button>
      </div>
    </div>
  );
}
