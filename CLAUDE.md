# Personal Agenda — Claude Code-gids

Persoonlijke planning/gezondheid-PWA op **Firebase** (Firestore, Auth e-mail,
FCM push, Cloud Functions) + **Garmin→Firestore** Python-pijplijn. Eén gebruiker.
Alles na opzet **in-app beheerbaar** (geen code meer nodig). Zie `README.md` voor
de babyproof setup.

## Productprincipes (premium-coach) — ALTIJD toepassen

> Komen uit een externe review (LLM-council, juni 2026). Dit is de meetlat voor
> **elke** nieuwe build. Premium ontstaat niet doordat de AI méér weet, maar
> doordat de gebruiker het systeem **durft te vertrouwen**.

1. **Elke aanbeveling is uitlegbaar.** *(kernprincipe — "every recommendation must
   be explainable")* Bij elk advies hoort: **waarom**, **op basis van welke data**,
   **hoe zeker** en **hoe succes gemeten wordt**. Niet omdat de gebruiker het altijd
   leest, maar omdat de uitleg moet *bestaan*. Concreet: coach-/planner-output draagt
   een `waarom`, `databronnen`, `zekerheid` en (waar zinvol) `meetlat`. Toon minstens
   een korte "waarom"-regel; detail achter een uitklap.
2. **Vertrouwen > intelligentie.** De AI moet vooral *betrouwbaar en consistent*
   zijn, niet zo slim mogelijk. Wees liever voorspelbaar dan verrassend.
3. **Outcome-first, niet feature-first.** Elke feature moet bijdragen aan
   **duidelijkheid, verantwoordelijkheid of consistentie**. Draagt ze aan geen van
   die drie bij → niet bouwen.
4. **Bouw voor de échte gebruiker (50–70% therapietrouw), niet de perfecte.** Plannen
   moeten meebewegen met gemiste blokken (inhalen/herschikken), niet stilzwijgend
   "mislukken". Een gemiste dag is normaal, geen fout.
5. **Je wordt beoordeeld op je slechtste advies, niet je gemiddelde.** Bij
   onzekerheid of dunne data → **conservatief en veilig** adviseren, en de onzekerheid
   tonen. Nooit stellig advies op wankele basis.
6. **Adaptief, met feedback-loops.** Elke beslissing past de volgende aan: uitgevoerd?
   zo niet, waarom niet? Het systeem leert van uitvoering, niet van méér features.
7. **Minder cognitieve last — de software denkt, de gebruiker niet.** Elke extra
   instelling is belasting. Vraag enkel wat echt nodig is; leid de rest af. Goede
   defaults boven keuzes.
8. **Eén North Star-metric.** Eén score die "word ik beter?" samenvat (richting:
   therapietrouw/consistentie/herstel). Onderdelen werken daar naartoe; we tonen ze.

Praktische toetssteen per PR: *(a)* kan elk nieuw advies zijn **waarom** tonen?
*(b)* werkt het bij een gebruiker die ~60% uitvoert? *(c)* wat doet het bij weinig/
geen data (veilig terugvallen)? *(d)* voegt het iets toe aan duidelijkheid,
verantwoordelijkheid of consistentie?

## Structuur
```
src/
  config/appConfig.js     thema's, bloktypes, werkmodi, DEFAULT_INSTELLINGEN
  contexts/               Auth, Theme (3 donkere thema's), Toast
  services/
    data.js               Firestore-CRUD (alles onder users/{uid}/...)
    planner.js            genereert dagindeling uit werkmodus + ankers + advies
    tijd.js               tijd/datum/week-helpers
    garmin.js             leest ruwe Garmin-dag uit tot samenvatting
    coach.js              Garmin + zelfrapportage -> sportadvies (uitlegbaar: waarom/zekerheid)
    maaltijden.js         dag-deterministische receptsuggesties, schaling, boodschappenlijst
    reflectie.js          stemming/energie/tevredenheid-schalen + trend-helpers
    noordster.js          North Star-score (therapietrouw/consistentie) uit dagdata
    push.js               FCM-token registreren (client)
    taken.js              afvinken + streaks
  hooks/useDagPlan.js     laadt dagdata, berekent + persisteert plan
  pages/                  Login, Dashboard(Vandaag), Week, Taken, Gezondheid, Beheer
  components/Shell.jsx, Icons.jsx
functions/                Cloud Functions (CommonJS, Node 22)
  index.js                dispatcher(10'), icsSync(3u), weerSync(05:30), weekMail(zo)
  lib/ics.js              minimale ICS-parser
garmin/                   Python-pijplijn (dagelijkse GitHub Action)
scripts/                  generateMessagingSw.mjs (build), gen_icons.py,
                          gen_codes.sh (regenereert codes.md, zie hieronder)
```

`codes.md` is een gegenereerde audit-bundel (volledige broncode, gegroepeerd in
Config/Backend/Garmin-pijplijn/Frontend/Services/Tests, met ★ voor critical-logic
services) zodat een AI-assistent de hele codebase in 1 bestand kan inlezen.
Regenereren via `npm run gen:codes`; nieuwe/verwijderde bestanden eerst bijwerken
in `scripts/codes_file_meta.tsv`.

## Firestore-datamodel (onder `users/{uid}`)
```
instellingen/{algemeen|werk|sport|push|gezondheid|voeding}
weken/{YYYY-Www}          { dagen: {ma..zo: werkmodus}, vakantie }
blokTemplates/{id}
taken/{id}                gewoonte/eenmalig + streak
takenLog/{datum_taakId}
reva/{id}                 oefening + blessureActief
maaltijden/{id}           naam/type/eiwitG/kcal + ingredienten[], doelen[], houdbaar, aantalEters
dagen/{YYYY-MM-DD}        { gedaan{blokId}, plan[] (incl. checkbaar/sleutel),
                           pushLog{}, verzet{blokId:{start,eind}} (ingehaalde blokken),
                           checkin: { ochtend{stemming,energie}, avond{tevreden,dankbaar,reflectie} },
                           maaltijdPlan: { [moment]: {recipeId, aantalEters} } (override, optioneel) }
garminDaily/{datum}       server-only (Admin SDK)
agendaEvents/{id}         server-only (icsSync)
weer/{datum}              server-only (weerSync)
pushTokens/{token}        FCM
```
Top-level `mail/` = Trigger-Email-extensie (afzendernaam = app-naam).

## Conventies
- UI in het Nederlands; semantische CSS-tokens in `src/styles/global.css`
  (wissel thema via `<html data-theme>`).
- Push-tijden/intensiteit komen uit `instellingen/push`; dispatcher checkt
  Brussel-tijd, stil-uren en dedupt via `dagen/{datum}.pushLog`.
- Per-slot push leest het door de app weggeschreven `dagen/{datum}.plan`.
- Functions = CommonJS; gebruik Node 22 global `fetch`.

## Roadmap
Gedaan (✓):
- **Fase 1 — Skelet:** Vite/React/Firebase/PWA, config (thema's, bloktypes,
  werkmodi, DEFAULT_INSTELLINGEN).
- **Fase 2 — Basis-app:** Auth (e-mail), 3 donkere thema's, app-shell + routing,
  toasts.
- **Fase 3 — Kern + beheer:** planning-engine + datamodel + Dashboard, no-code
  in-app beheer (subpagina's), push (FCM) + Cloud Functions (dispatcher, icsSync,
  weerSync, weekMail), babyproof README + deploy-workflow.
- **Audit-ronde:** Firestore-reads beperkt (SettingsContext, cache-first Garmin),
  "nieuwe versie"-banner, ErrorBoundary, motion-polish, ICS-tijdzone-fix,
  plan alleen schrijven bij wijziging.
- **Fase 4 — Mindset & reflectie:** ochtend-check-in (stemming + energie) en
  avondreflectie (tevredenheid, dankbaarheid, journal) op het dashboard;
  weekreview-gemiddelden in Voortgang; energie voedt de coach (`energieNudge`).

Volgende fases:
> Alle volgende fases bouwen we **explainable-first** en met oog op de North
> Star-metric (zie Productprincipes). Een advies zonder "waarom" is niet af.
- **Fase 4.5 — Vertrouwenslaag (✓):** coach-advies is *uitlegbaar*
  (`waarom` + `databronnen` + `zekerheid` + `meetlat`; UI: korte "waarom"-regel +
  uitklap), met **veilige terugval** (lage zekerheid → geen 'hard'). **North
  Star-score** (therapietrouw, `services/noordster.js`) op Dashboard + Voortgang,
  met uitleg en veilige terugval. **Plan beweegt mee met gemiste blokken**:
  "Nog in te halen"-kaart met *Toch gedaan* / *Verzet* (→ `dagen/{datum}.verzet`,
  toegepast in `useDagPlan`).
- **Fase 5 — Periodisering & slimme coach (✓):** **ACWR**
  (acute:chronic, `services/belasting.js` → `acwrBerekenen`) uit **RPE-gewogen
  sRPE-belasting** (`sessieBelasting`), met zones (laag/optimaal/verhoogd/risico),
  zekerheid en uitleg. Voedt de coach (`acwrZone` → conservatiever bij risico) en
  toont blessurepreventie in `BelastingKaart`. Daarnaast expliciete
  **trainingsblokken/periodisering** (`services/periodisering.js` →
  `periodiseringBepalen`): een vaste, kalenderbepaalde cyclus van 4 weken (3 weken
  opbouw + 1 deload-week) — bewust geen losse instelling of data-gok (premium-
  principe "vertrouwen > intelligentie"). Een deload-week tempert de coach altijd
  van 'hard' naar 'matig', los van ACWR/Garmin; getoond in `BelastingKaart`
  ("Trainingscyclus"). Veilige terugval bij weinig data blijft via ACWR/zekerheid.
  Ook **groot verlof**: een vakantieperiode (`Week.jsx` → `vakanties/{id}`) kan
  naast judovrij/verlof ook **buitenland** aanvinden. Thuis met verlof verlengt
  de coach de sessieduur licht (meer tijd dan gewoonlijk, behalve bij niveau
  'herstel'); in het buitenland blijft de duur standaard (geen aanname over
  faciliteiten daar). `vakantieFlags()` geeft dit door als `vakantieType`
  ('thuis'/'buitenland'/null) aan `coachAdvies()`, met uitleg in `waarom`.
- **Fase 5.6 — Maaltijdplanning (✓):** `services/maaltijden.js` kiest per
  moment (ontbijt/lunch/diner/3 snacks) **2 exacte suggesties** uit de eigen
  receptenbank, dag-deterministisch (`dagOrdinal`, gedeeld met `blessures.js`),
  gefilterd op de actieve voedingsdoelen en geschaald op het aantal eters.
  `planner.js` vervangt het generieke maaltijdblok door het gekozen recept
  (`bron: 'maaltijdplan'`, dus afvinkbaar en telt mee voor de North Star) en
  plant 3 snackmomenten via `vindVrijSlot` (nooit in conflict). Een expliciete
  keuze (`dagen/{datum}.maaltijdPlan`) wint altijd over de suggestie. Zonder
  recepten blijft het bestaande generieke blok ongewijzigd (veilige terugval).
  `genereerBoodschappenlijst` telt ingrediënten op over een periode en splitst
  vers (wekelijks) van houdbaar (maandelijks-bulk); de maandlijst rekent puur
  op recepten (geen extra Firestore-reads), de weeklijst houdt rekening met al
  gekozen dagen. Bewust **niet** gebouwd: AH/Colruyt-scraping of een
  winkelwagen-integratie.
- **Fase 6 — Veerkracht & data:** Strava-fallback als Garmin faalt, data-export
  (JSON/CSV), back-up/herstel, robuustere sync.
- **Fase 7 — Levensbreed (optioneel):** financiën, leerdoelen, sociale planning —
  alleen als de kern stabiel is.
- **Fase 8 — Onboarding & personalisatie (laatst):** eerste-keer-wizard (naam,
  doelen, ritme thuis/kantoor, sporttijden), profiel (leeftijd/gewicht/lengte)
  zodat Garmin-analyse die meeneemt. Lage prioriteit: app is voorlopig single-user.

## Build / deploy
- `npm run dev` / `npm run build` (genereert `public/firebase-messaging-sw.js`).
- Deploy via GitHub Actions (`.github/workflows/deploy.yml`) op push naar `main`.
- Secrets: zie README DEEL C (deploy + Garmin).
```
