// Centrale app-configuratie en standaardwaarden.
// Deze defaults worden bij eerste login in Firestore gezet en zijn daarna
// volledig in-app bewerkbaar (geen code meer nodig).

export const APP_NAAM = import.meta.env.VITE_APP_NAAM || 'Personal Agenda';

export const THEMES = [
  { id: 'middernacht', naam: 'Middernacht', kleur: '#2dd4bf', beschrijving: 'Diep blauw met teal' },
  { id: 'bos', naam: 'Bos', kleur: '#34d399', beschrijving: 'Donkergroen, rustig' },
  { id: 'ember', naam: 'Ember', kleur: '#f59e0b', beschrijving: 'Warm amber' },
];

// Bloktypes bepalen kleur + categorie in de planning.
export const BLOK_TYPES = {
  werk:      { naam: 'Werk',          kleur: '#38bdf8' },
  woonwerk:  { naam: 'Woon-werk',     kleur: '#60a5fa' },
  sport:     { naam: 'Sport',         kleur: '#34d399' },
  judo:      { naam: 'Judo',          kleur: '#f472b6' },
  lesgeven:  { naam: 'Les geven',     kleur: '#fb7185' },
  reva:      { naam: 'Revalidatie',   kleur: '#a78bfa' },
  maaltijd:  { naam: 'Eten',          kleur: '#fbbf24' },
  rust:      { naam: 'Rust',          kleur: '#94a3b8' },
  slaap:     { naam: 'Slaap',         kleur: '#818cf8' },
  vrije_tijd:{ naam: 'Vrije tijd',    kleur: '#2dd4bf' },
  voetbal:   { naam: 'Voetbal (RSCA)',kleur: '#c084fc' },
  routine:   { naam: 'Routine',       kleur: '#5eead4' },
  scherm:    { naam: 'Schermtijd',    kleur: '#f87171' },
};

// Werkmodi per dag (jij tikt dit per week aan in de app).
export const WERK_MODI = {
  thuis:       { naam: 'Thuiswerk',       kort: 'Thuis' },
  kantoor_auto:{ naam: 'Kantoor (auto)',  kort: 'Auto' },
  kantoor_fiets:{ naam: 'Kantoor (fiets)',kort: 'Fiets' },
  verlof:      { naam: 'Verlof/vakantie', kort: 'Verlof' },
  vrij:        { naam: 'Vrije dag',       kort: 'Vrij' },
};

export const DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
export const DAG_NAMEN = {
  ma: 'Maandag', di: 'Dinsdag', wo: 'Woensdag', do: 'Donderdag',
  vr: 'Vrijdag', za: 'Zaterdag', zo: 'Zondag',
};

// Standaardinstellingen — bewerkbaar via Beheer.
export const DEFAULT_INSTELLINGEN = {
  algemeen: {
    thema: 'middernacht',
    opstaan: '06:45',
    slapen: '22:45',
    opstaanVrij: '08:00',   // ritme op vrije/vakantiedagen
    slapenVrij: '23:30',
    icsUrl: '', // iPhone-agenda abonnementslink
    woonplaats: 'Brussel',
    lat: 50.85,
    lon: 4.35,
  },
  werk: {
    // standaarduren; per week override-baar
    thuisStart: '08:25', thuisEind: '16:00',
    kantoorStart: '07:45', kantoorEind: '17:00',
    doelUrenPerDag: 9,         // streefuren incl. recuperatie
    middagpauzeMin: 30,
    woensdagEind: '16:00',     // vroeg weg om judoles te geven
    autoReisMin: 45,
    fietsReisMin: 45,          // enkele rit; telt als sport
  },
  sport: {
    judoEigenClub: [
      { dag: 'wo', start: '20:00', eind: '21:30', rol: 'training' },
      { dag: 'za', start: '16:00', eind: '18:00', rol: 'training' },
    ],
    judoLesgeven: [
      { dag: 'wo', start: '18:30', eind: '19:45', vertrekVoorMin: 30, tijdensVakantie: false },
    ],
    elderstrainenDagen: ['ma', 'vr'],
    fietsAlsSport: true,
    fietsBijBlessure: false,
  },
  push: {
    intensiteit: 'elk_blok',   // 'elk_blok' | 'sleutel' | 'minimaal'
    ochtendBriefing: '07:00',
    avondVooruitblik: '21:30',
    readinessCheck: '07:15',
    antiScrollNudges: true,
    antiScrollVan: '21:00',
    antiScrollTot: '23:30',
    stilVan: '22:45',          // geen push tijdens slaap
    stilTot: '06:30',
    // Per-categorie aan/uit
    categorieen: { ochtend: true, readiness: true, slot: true, avond: true, antiscroll: true },
    snoozeTot: null,           // ISO-tijdstip; alle push gepauzeerd tot dan
  },
  gezondheid: {
    eiwitDoelG: 110,
    waterDoelL: 2.5,
    schermtijdDoelMin: 120,
    voedingTips: true,
    doel: 'algemeen',   // coach-doel: afvallen|kracht|uithouding|herstel|algemeen
  },
};

export const PUSH_INTENSITEIT = {
  elk_blok: 'Bij elk gepland blok (meeste hulp)',
  sleutel: 'Enkel sleutelmomenten + overgangen',
  minimaal: 'Minimaal (2-3 per dag)',
};
