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

// Sporten die de coach op niet-judo dagen kan inplannen + invullen. Judo blijft
// een vast, niet-gedetailleerd blok (zie sport.judoEigenClub/judoLesgeven).
export const SPORTEN = {
  homefitness: { naam: 'Home fitness', kort: 'Fitness' },
  fietsen: { naam: 'Fietsen', kort: 'Fietsen' },
  wandelen: { naam: 'Wandelen', kort: 'Wandelen' },
  rust: { naam: 'Rustdag', kort: 'Rust' },
};

// Standaard oefeningen-bibliotheek voor home fitness — uitbreidbaar via Beheer.
const STANDAARD_OEFENINGEN = [
  { id: 'squat', naam: 'Squats', waarom: 'Bouwt beenkracht op — ondersteunt judo-explosiviteit en knie-stabiliteit.', sets: 3, reps: 12, categorie: 'kracht' },
  { id: 'pushup', naam: 'Push-ups', waarom: 'Bovenlichaamskracht voor grip- en worpacties bij judo.', sets: 3, reps: 12, categorie: 'kracht' },
  { id: 'plank', naam: 'Plank', waarom: 'Core-stabiliteit beschermt de onderrug bij judo en fietsen.', sets: 3, reps: 1, categorie: 'core' },
  { id: 'lunges', naam: 'Lunges', waarom: 'Eenzijdige beenkracht en balans — verkleint blessurerisico.', sets: 3, reps: 10, categorie: 'kracht' },
  { id: 'rows', naam: 'Rows (elastiek/halter)', waarom: 'Trekkracht voor grip en houding, complement op judo-duwbewegingen.', sets: 3, reps: 12, categorie: 'kracht' },
  { id: 'mobiliteit', naam: 'Heup- & schoudermobiliteit', waarom: 'Houdt gewrichten soepel — verlaagt blessurerisico bij intensieve training.', sets: 2, reps: 8, categorie: 'mobiliteit' },
];

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
    // Vast weekschema voor niet-judo dagen; de coach vult dit dagelijks in met
    // concrete inhoud (oefeningen/km/interval) en mag het bij laag herstel
    // vervangen door iets lichters (uitgelegd, nooit stilzwijgend geschrapt).
    weekSchema: { ma: 'homefitness', di: 'fietsen', do: 'wandelen', vr: 'rust', zo: 'rust' },
    oefeningen: STANDAARD_OEFENINGEN,
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
    stappenDoel: 8000,
    voedingTips: true,
    doel: 'algemeen',   // coach-doel: afvallen|kracht|uithouding|herstel|algemeen
  },
};

export const PUSH_INTENSITEIT = {
  elk_blok: 'Bij elk gepland blok (meeste hulp)',
  sleutel: 'Enkel sleutelmomenten + overgangen',
  minimaal: 'Minimaal (2-3 per dag)',
};
