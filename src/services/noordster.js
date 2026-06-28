// North Star-metric: één score die "word ik consistenter?" samenvat.
// We meten THERAPIETROUW = welk deel van je geplande, afvinkbare sleutelblokken
// (sport, judo, reva, voetbal, taken...) je effectief afvinkt. Berekend uit de al
// opgeslagen dagdata (dagen/{datum}.plan + .gedaan) — geen extra schrijfwerk.
//
// Premium-principe: deze score is uitlegbaar (zie `waarom`) en valt veilig terug
// bij weinig data (score = null i.p.v. een misleidend getal).

// Welke blokken tellen mee. Nieuwe plannen dragen `checkbaar`; voor oudere docs
// (zonder dat veld) vallen we terug op de kerntypes.
const KERN_TYPES = new Set(['judo', 'lesgeven', 'sport', 'reva', 'voetbal']);
const teltMee = (b) => (typeof b?.checkbaar === 'boolean' ? b.checkbaar : KERN_TYPES.has(b?.type));

// Een reva-blok met een oefeningen-checklist is pas "gedaan" als alle losse
// oefeningen zijn afgevinkt (die staan onder samengestelde id's `${blokId}::${oefId}`).
// Andere blokken blijven gewoon op hun eigen blok-id.
function isBlokGedaan(b, gedaan) {
  if (b.oefeningen?.length) return b.oefeningen.every((oId) => gedaan?.[`${b.id}::${oId}`]);
  return !!gedaan?.[b.id];
}

// Therapietrouw van één dag, of null als er die dag niets te doen viel.
export function dagTherapietrouw(dag) {
  const kern = (dag?.plan || []).filter(teltMee);
  if (!kern.length) return null;
  const gedaan = kern.filter((b) => isBlokGedaan(b, dag?.gedaan)).length;
  return { ratio: gedaan / kern.length, gedaan, totaal: kern.length };
}

// Reva-specifieke therapietrouw (enkel blessure-oefeningen), losstaand van de
// algemene North Star-score. Geeft null als er die dag(en) geen reva gepland stond.
export function dagRevaTherapietrouw(dag) {
  const reva = (dag?.plan || []).filter((b) => b.type === 'reva');
  if (!reva.length) return null;
  const gedaan = reva.filter((b) => isBlokGedaan(b, dag?.gedaan)).length;
  return { ratio: gedaan / reva.length, gedaan, totaal: reva.length };
}

// dagen = reeks dagdocs (oud→nieuw). Geeft een reva-therapietrouw-score + uitleg,
// met dezelfde veilige terugval als de algemene North Star-score bij weinig data.
export function revaTherapietrouw(dagen) {
  const perDag = (dagen || []).map(dagRevaTherapietrouw);
  const metData = perDag.filter((d) => d != null);
  if (!metData.length) {
    return { score: null, dagenMetReva: 0, waarom: 'Nog geen reva-blokken gepland in deze periode.' };
  }
  const score = Math.round((metData.reduce((a, d) => a + d.ratio, 0) / metData.length) * 100);
  const totGedaan = metData.reduce((a, d) => a + d.gedaan, 0);
  const totKern = metData.reduce((a, d) => a + d.totaal, 0);
  return {
    score, dagenMetReva: metData.length,
    waarom: `${totGedaan}/${totKern} reva-blokken volledig afgevinkt over ${metData.length} ${metData.length === 1 ? 'dag' : 'dagen'} met reva gepland.`,
  };
}

function label(score) {
  if (score >= 80) return 'Sterk consistent';
  if (score >= 60) return 'Op koers';
  if (score >= 40) return 'Wisselvallig';
  return 'Pak de draad weer op';
}
function kleur(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--primary)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--danger)';
}

// dagen = reeks dagdocs (oud→nieuw). Geeft de North Star-score + uitleg.
export function noordster(dagen) {
  const perDag = (dagen || []).map(dagTherapietrouw);
  const metData = perDag.filter((d) => d != null);
  const checkinDagen = (dagen || []).filter((d) => d?.checkin?.ochtend || d?.checkin?.avond).length;

  if (!metData.length) {
    return {
      score: null, dagenMetPlan: 0, checkinDagen,
      label: 'Nog te weinig data', kleur: 'var(--text-dim)',
      reeks: perDag.map(() => null),
      waarom: 'Zodra je geplande sleutelblokken afvinkt, verschijnt hier je consistentie.',
      meetlat: 'Consistentie = welk deel van je geplande sleutelblokken je afvinkt.',
    };
  }

  const score = Math.round((metData.reduce((a, d) => a + d.ratio, 0) / metData.length) * 100);
  const totGedaan = metData.reduce((a, d) => a + d.gedaan, 0);
  const totKern = metData.reduce((a, d) => a + d.totaal, 0);
  return {
    score, dagenMetPlan: metData.length, checkinDagen,
    label: label(score), kleur: kleur(score),
    reeks: perDag.map((d) => (d ? Math.round(d.ratio * 100) : null)),
    waarom: `Gemeten aan ${totGedaan}/${totKern} afgevinkte sleutelblokken over ${metData.length} ${metData.length === 1 ? 'dag' : 'dagen'}`
      + (checkinDagen ? `, en ${checkinDagen} dag(en) met een check-in.` : '.'),
    meetlat: 'Consistentie = welk deel van je geplande sleutelblokken je afvinkt.',
  };
}
