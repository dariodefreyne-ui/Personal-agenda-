# Handover — Personal Agenda

Werkdocument voor wie verder bouwt. Geeft de **stand van zaken**, wat er onderweg
**gecorrigeerd** is, waar we **lang op hebben vastgezeten** (zodat je dezelfde
valkuilen niet herhaalt) en een **concrete to-do per fase**. Lees ook `CLAUDE.md`
(architectuur + datamodel) en `README.md` (babyproof setup/deploy).

Laatst bijgewerkt: 28/06/2026.

---

## 1. Wat is de app?

Persoonlijke planning/gezondheid-PWA op **Firebase** (Firestore, Auth e-mail, FCM
push, Cloud Functions) + een **Garmin→Firestore** Python-pijplijn. **Eén gebruiker**
(single-user). Doel: alle losse apps vervangen en de dag structureren rond werk
(thuis/kantoor, auto/fiets), sport (judo trainen + lesgeven, fietsen) en vrije
tijd (o.a. RSCA-matchen), met push-herinneringen en gewoontes/streaks. **Alles na
opzet in-app beheerbaar** — geen code meer nodig.

De app is **niet langer alleen een planner**: ze werkt sinds Fase 5/5.5 ook als
**persoonlijke sportcoach**. Concreet (zie §2 voor de code-locaties):
- **Trainingsadvies** (`services/coach.js`) uit Garmin (readiness/body battery/
  slaap/HRV) + zelfrapportage (energie, pijn), per doel (afvallen/kracht/
  uithouding/herstel/algemeen), altijd met `waarom`/`databronnen`/`zekerheid`.
- **Blessure- & revalidatiebeheer** (`services/blessures.js`, `pages/Gezondheid.jsx`):
  blessures met regio + eigen oefenlijst, round-robin in de dagplanning
  (`services/planner.js`), met therapietrouw-tracking per oefening.
- **Trainingsbelasting (ACWR)** (`services/belasting.js`): acute:chronic-ratio
  uit RPE-gewogen sessiebelasting, met zones en blessurepreventie-advies.
- **Periodisering** (`services/periodisering.js`): vaste, kalenderbepaalde cyclus
  van 4 weken (3× opbouw + 1× deload), getoond in `BelastingKaart` als
  "Trainingscyclus". Tempert de coach altijd van 'hard' naar 'matig' in een
  deload-week, los van ACWR/Garmin-signalen — bewust géén data-gok maar een
  voorspelbaar structureel vangnet (zie §4.6).
- **Groot verlof** (`services/vakanties.js`, `pages/Week.jsx`): een
  vakantieperiode kan naast judovrij/verlof ook **buitenland** aanvinden. Verlof
  thuis verlengt de coach-sessieduur licht (niet bij niveau 'herstel'); in het
  buitenland blijft de duur standaard. Doorgegeven als `vakantieType`
  ('thuis'/'buitenland'/null) via `vakantieFlags()` → `coachAdvies()`.
- **North Star-consistentiescore** (`services/noordster.js`): één score voor
  "ben ik consequent", plus een apart **reva-trouw**-getal zodra er actieve
  blessures zijn.

Dit verandert het **doel** van de app: niet enkel "mijn dag plannen", maar "mijn
dag plannen **en** mij coachen naar een gezonder, blessurevrijer trainingsritme" —
zie `CLAUDE.md` → "Productprincipes" voor de explainability-eisen die voor élk
nieuw coach-/planneradvies gelden.

Stack: Vite + React 18 + react-router-dom v6 + vite-plugin-pwa · Firestore met
persistentLocalCache · Cloud Functions v2 (Node 22, CommonJS) · Vitest (unit) +
Playwright (smoke) · deploy via GitHub Actions naar Firebase Hosting + Functions.

---

## 2. Stand van zaken — wat is af

**Fase 1–5 zijn klaar, gedeployed en in gebruik.**

- **Fase 1 — Skelet:** Vite/React/Firebase/PWA, config (thema's, bloktypes,
  werkmodi, `DEFAULT_INSTELLINGEN`).
- **Fase 2 — Basis-app:** Auth (e-mail), 3 donkere thema's, app-shell + routing,
  toasts.
- **Fase 3 — Kern + beheer:** planning-engine (`services/planner.js`) + datamodel +
  Dashboard ("Vandaag"); no-code in-app beheer met **subpagina's** (`pages/Beheer.jsx`
  = hub + sub-routes); push (FCM) + **Cloud Functions** (dispatcher elke 10', icsSync
  elke 3u, weerSync 05:30, weekMail zondag); babyproof README + deploy-workflow.
- **Audit-ronde:** Firestore-reads beperkt (`SettingsContext` laadt instellingen 1×
  per sessie; cache-first Garmin), "nieuwe versie"-melding, `ErrorBoundary`,
  motion-polish, **plan alleen schrijven bij wijziging** (`useDagPlan` vergelijkt het
  nieuwe plan met het opgeslagene en slaat alleen op als het verschilt).
- **Fase 4 — Mindset & reflectie:** ochtend-check-in (stemming + energie) en
  avondreflectie (tevredenheid, dankbaarheid, journal) op het dashboard
  (`components/CheckinKaart.jsx`); weekreview-gemiddelden in Voortgang; de
  zelf-gerapporteerde **energie voedt de coach** (`services/reflectie.js` →
  `energieNudge`, verwerkt in `services/coach.js`). Opgeslagen in
  `dagen/{datum}.checkin`.
- **Fase 4.5 — Vertrouwenslaag:** coach uitlegbaar (`waarom`/`databronnen`/
  `zekerheid`/`meetlat` + UI-uitklap), veilige terugval, **North Star-consistentie-
  score** (`services/noordster.js`) op Dashboard + Voortgang, en **adaptief inhalen**
  van gemiste blokken (`dagen/{datum}.verzet`).
- **Fase 5 — Periodisering (af):** **ACWR** uit RPE-gewogen belasting
  (`services/belasting.js`), uitlegbaar, voedt de coach (blessurepreventie) en
  toont in `BelastingKaart`. Daarbij **expliciete trainingsblokken**
  (`services/periodisering.js`): een vaste 4-wekencyclus (3× opbouw + 1× deload),
  puur kalenderbepaald (geen instelling, geen data-gok), die de coach altijd
  van 'hard' naar 'matig' tempert in een deload-week — zie §4.6.
- **Garmin — HRV + stappen in de UI:** `services/garmin.js` leest nu ook
  HRV-status/-gemiddelde uit; getoond op Dashboard en Gezondheid naast stappen
  (die er al stonden). De coach (`services/coach.js`) neemt HRV mee in zowel
  het niveau-advies (`hrvBijstelling`) als de zekerheid (`bepaalZekerheid`).
- **Garmin-syncfrequentie:** `garmin-daily.yml` draait nu 6×/dag (elke 3u
  tijdens wakkere uren) i.p.v. 1×/dag, zodat stappen/HR voelbaar bijschuiven
  tijdens de dag. Een eerdere poging om dit met een **handmatige "Nu
  synchroniseren"-knop** (Cloud Function `syncGarminNu` + GitHub-token-secret)
  aan te vullen is **terug uitgerold** — het secret bleek niet in te stellen
  vanuit Cloud Shell (geen werkende interactieve terminal-flow voor de
  gebruiker). De cron-sync is en blijft de enige sync-methode; geen extra
  secret nodig.
- **Datumkiezer op het Dashboard (voor correcties op voorbije dagen):**
  `pages/Dashboard.jsx` accepteert nu een gekozen datum (vorige/volgende dag +
  `<input type="date">`, begrensd op vandaag — geen toekomst). `useDagPlan`
  ondersteunde dit al via zijn `datumObj`-parameter; alleen de UI ontbrak.
  Op een voorbije dag: Garmin-/voortgangskaarten en de tijdlijn blijven
  werken (en blijven afvinkbaar — dat IS de correctie), maar dag-specifieke
  "vandaag"-kaarten (check-in, North Star, coach-advies, belasting, "nu"-
  markering in de tijdlijn, "Verzet") worden verborgen omdat ze ofwel
  vandaag-gebonden state gebruiken (North Star/ACWR rekenen altijd vanaf de
  *echte* huidige dag) ofwel betekenisloos zijn op een dag die al voorbij is
  (Verzet schuift naar "later vandaag", wat op een oude datum fout zou zijn).
  **Let op (niet opgelost):** `services/taken.js` → `zetTaakGedaan` telt
  habit-streaks chronologisch (`laatsteGedaan` vs. "gisteren"); een
  gewoonte-taak achteraf op een voorbije dag af- of uitvinken kan de streak
  dus laten kloppen of net laten afwijken, afhankelijk van de volgorde. Geen
  retroactieve streak-herrekening gebouwd — bewust uit scope gehouden.
- **Fase 5.5 — Blessures & revalidatie (volledige feature, audit-gedreven):**
  legacy losse `reva`-oefeningen vervangen door een echt **blessuremodel**
  (`blessures/{id}`: regio, specifiek, start-/einddatum, `aantalPerDag`, eigen
  oefenlijst) met automatische **eenmalige migratie** van oude `reva`-docs
  (`pages/Gezondheid.jsx`, gegated op `blessures.length === 0`). Na een audit
  ("wat heeft de gebruiker nog nodig voor optimaal herstel?") zijn 5 concrete
  gaten gedicht, stuk voor stuk getest:
  1. **Reva-blokken tellen mee in conflictdetectie** (`planner.js` →
     `detecteerConflicten` nam `reva` op in de "belangrijke" bron-/type-lijst) —
     voordien kon een reva-sessie ongemerkt overlappen met een vast agenda-item.
  2. **Zelf-gerapporteerde pijn is een hard veiligheidssignaal**, niet enkel een
     actieve blessure: `coachAdvies({ pijn })` dwingt bij `pijn ≥ 3/5` altijd
     'herstel' + hoge zekerheid af (`coach.js` → `PIJN_HERSTEL_DREMPEL`), en
     tempert het advies al bij lichte pijn (1-2).
  3. **Adaptieve reva-trouw-nudge**: bij een actieve blessure berekent
     `useDagPlan` de reva-therapietrouw van de afgelopen 3 dagen
     (`noordster.js` → `revaTherapietrouw`, via `getDagCached`) en de planner
     waarschuwt (zonder te bestraffen) als die onder 50% zit — premium-principe
     "bouw voor de échte gebruiker, niet de perfecte".
  4. **North Star-score telde reva-blokken met een oefeningenchecklist nooit als
     "gedaan"** (bug): `dagTherapietrouw` keek naar `gedaan[blokId]`, maar reva
     wordt per oefening afgevinkt op het samengestelde id `${blokId}::${oefeningId}`.
     Gefixt met de `isBlokGedaan`-helper in `noordster.js`; vereiste ook dat
     `useDagPlan` de oefening-ids meeschrijft in het persisted plan.
  5. **Blessure-afloop wordt niet stilzwijgend genegeerd**: de dispatcher
     (`functions/index.js`, ochtend-blok) stuurt een push als een blessure z'n
     `eindDatum` voorbij is maar nog niet bevestigd (`eindeGemeld`).
  - **Reva-blok plant zelf rond werk/judo/agenda i.p.v. enkel een conflict te
    melden** (gebruikersfeedback: een reva-sessie kwam standaard op
    `opstaan + 60 min` te liggen, wat bij een laat opstaan-uur middenin de
    werkdag terechtkwam — de planner zag het conflict wél, maar deed er niets
    mee). `planner.js` → nieuwe `vindVrijSlot(blok, vanaf, duurMin)` scant
    vooruit langs de al geplande "belangrijke" blokken (`vast` of bron
    werk/judo/lesgeven/woonwerk/agenda) en geeft het eerste vrije moment van de
    juiste duur terug. De reva-sectie (5c) probeert eerst een slot **na het
    ontbijt en vóór het werk**, anders **na het werk**, telkens via
    `vindVrijSlot` om al ingeplande blokken heen geschoven. Een **expliciet
    gekozen** `blessure.tijd` blijft bewust ongewijzigd — dat is een bewuste
    keuze van de gebruiker, conflictdetectie blijft daar het vangnet. Ook de
    losse, verouderde 7u-"Reva-oefeningen"-gewoonte uit de eerste-login-seed
    (`services/data.js` → `seedDefaultsIfNeeded`) is verwijderd: die was een
    legacy-overblijfsel van vóór het blessuremodel (Fase 5.5) en boekte dubbel
    met het nieuwe auto-blok. **Let op:** dit verwijdert enkel de seed voor
    *nieuwe* gebruikers — een al bestaande, eerder geseede "Reva-oefeningen"-taak
    in Firestore moet de gebruiker zelf verwijderen/deactiveren via de
    Taken-pagina.
  - **Coach-kaart-flicker (Gezondheid-pagina) — twee opeenvolgende bugs, allebei
    gefixt:**
    (a) de pagina las Garmin/check-in/blessures via losse, ongecoördineerde
    `useEffect`/listener-calls, waardoor `CoachKaart` even met onvolledige data
    rendert vóór alles binnen is — opgelost door alles te bundelen in één
    `Promise.all(...)` en het renderen te gaten op `klaar && blessuresKlaar`
    (`pages/Gezondheid.jsx`).
    (b) **de échte hoofdoorzaak**: `firestore.rules` had **geen regel voor de
    `blessures`-collectie** en viel terug op het vangnet `allow write: if false`.
    Elke schrijf (blessure/oefening toevoegen of wijzigen) werd dus door de
    server geweigerd, maar de Firestore-SDK past **eerst optimistisch lokaal**
    toe en draait dat na de afwijzing weer terug — dat liet `blessures`
    (en dus `blessureActief`/de coach-kaart én de Blessures-kaart) **continu**
    heen-en-weer springen tussen de optimistische en teruggedraaide staat.
    Gefixt door `match /blessures/{doc} { allow read, write: if isOwner(userId); }`
    toe te voegen, naast de andere eigenaar-collecties.
    **Les voor de volgende fase:** als een nieuwe top-level subcollectie wordt
    toegevoegd, check **altijd** `firestore.rules` — het vangnet (`{document=**}`)
    is read-only en geeft géén foutmelding in de UI, enkel een stille
    write-rollback die als een "flikkerende" of "niet-opslaande" UI overkomt.

- **Fase 5.6 — Maaltijdplanning (volledige feature):** de coach plant nu per
  maaltijdmoment **exact** wat en hoeveel je eet, uit een eigen receptenbank
  (`maaltijden/{id}`, uitgebreid met `ingredienten`/`doelen`/`houdbaar`/
  `aantalEters` — `eiwitG`/`kcal` blijven voor de bestaande dagtracker). Zelfde
  dag-deterministische round-robin als reva (`tijd.js` → `dagOrdinal`, nu
  gedeeld i.p.v. lokaal in `blessures.js`): `services/maaltijden.js` →
  `kiesSuggesties` geeft 2 suggesties per moment (gefilterd op de — meerdere
  combineerbare — `instellingen.voeding.doelen`), `gekozenMaaltijd` laat een
  expliciete keuze (`dagen/{datum}.maaltijdPlan.{moment}`) altijd winnen. Pure
  functie van datum + recepten → werkt ook voor toekomstige dagen zonder dat
  daarvoor al een dagdoc bestaat (nodig voor de maandvooruitblik, zie verder).
  `planner.js` overschrijft het generieke ontbijt/lunch/dinerblok met het
  gekozen recept + geschaalde ingrediënten (`bron: 'maaltijdplan'`, dus
  afvinkbaar en meegeteld in de North Star — zonder recept blijft het oude
  generieke, niet-afvinkbare blok bestaan, geen regressie). **3 snackmomenten**
  (ook 's avonds, expliciete gebruikerswens) hergebruiken `vindVrijSlot` (de
  reva-fix hierboven) zodat een snack nooit conflicteert met een vast blok;
  uit te zetten via `instellingen.voeding.snacksAan`. **Boodschappenlijst**
  (`genereerBoodschappenlijst`) telt ingrediënten op over een periode en
  splitst ze in **vers** (wekelijks) vs. **houdbaar** (bulk-aankoop), op basis
  van het `houdbaar`-vlag per recept; de maandvooruitblik berekent dit bewust
  **zonder** dagdocs op te halen (geen extra Firestore-reads), de weekweergave
  haalt wél bestaande dagdocs op voor realisme. UI: `pages/Maaltijden.jsx`
  kreeg een "Vandaag kiezen"-sectie (tikbare suggestiekaarten) en een
  "Boodschappenlijst"-sectie (week/maand-toggle + kopiëren naar klembord);
  `pages/Beheer.jsx` kreeg de doelen-multiselect/eters-stepper/snacks-toggle in
  de bestaande "Voeding & doelen"-rubriek. **Bewust uitgesteld** (expliciete
  gebruikerskeuze): AH/Colruyt-scraping voor automatische menu's/winkelwagens,
  en een hogere Garmin-syncfrequentie voor een realtime opstaan-tijd — dat
  laatste is een apart, los te plannen werkpunt.

- **Fix — Garmin-sync: "geen verse data" ondanks gesynct, + exacte sync-tijd.**
  Bugreport: Gezondheid/Dashboard toonde "Geen verse data voor vandaag" terwijl
  Garmin Connect zelf alles al gesynct had. **Hoofdoorzaak**: de GitHub Action
  draait 6x/dag en herschrijft elke run alle velden via `set(payload,
  merge=True)`; `_safe()` in `garmin/fetchers.py` vangt een mislukte/rate-
  gelimiteerde Garmin-API-call op en geeft dan `None` terug i.p.v. te crashen —
  maar Firestore's `merge=True` behandelt een **expliciete** `None` als "zet dit
  veld op null", niet als "laat dit veld ongewijzigd". Een eerder die dag al
  succesvol gesyncte waarde (bv. `readiness`) werd dus stilletjes overschreven
  met null door een latere run waarin diezelfde Garmin-call faalde — vandaar
  wél een `garminDaily/{datum}`-document (dus "gesynct: vandaag" klopte), maar
  met lege velden. **Fix** in `garmin/firestore_db.py` → `write_daily()`: velden
  met waarde `None` worden nu uit de payload gefilterd vóór de merge-write, dus
  een mislukte call op run N overschrijft nooit meer een gelukte waarde van run
  N-1 voor diezelfde dag (`write_activity` ongewijzigd — andere risicoprofiel,
  één volledige fetch per activiteit i.p.v. herhaaldelijk hermergen). Daarnaast
  toont `services/garmin.js` → `syncStatus()` nu het **exacte tijdstip** uit
  `syncedAt` naast de relatieve dag (bv. "Laatst gesynct: vandaag om 07:14"
  i.p.v. enkel "vandaag") — ondersteunt het uitlegbaarheids-principe: "wanneer
  precies" is nuttiger dan "welke dag" bij een pijplijn die meermaals per dag
  draait. Nieuwe tests: `test/garmin.test.js`.

Tests: 162 unit-tests groen (`npm test`). Build groen (`npm run build`).

---

## 3. Belangrijke correcties & nuances (verwerkt)

Dit is door de gebruiker expliciet bijgestuurd — hou hier rekening mee:

- **Nuance "gewone sterveling → topsporter":** de app moet niet alleen plannen,
  maar échte sportopbouw ondersteunen met de **meest eenvoudige UI**. Vandaar de
  coach-laag (Garmin + zelfrapportage → niveau/duur) en de geplande periodisering
  (Fase 5). Geen "AI-standaard" look: dynamisch, leuk, app-gevoel.
- **Judo-nuance:** woensdag = de gebruiker **geeft** zelf judoles (niet zelf
  trainen); andere dagen kan het training zijn. Dit zit in `instellingen/sport`
  (`judoLesgeven` vs `judoEigenClub`) en de planner.
- **Geen Belgische schoolvakanties volgen:** **geen** voorgebakken
  feestdag-/vakantiepresets. Wél: weekends automatisch "vrij", en **per dag een
  dropdown** in het weekoverzicht. Grote periodes voer je zelf in als
  **vakantieperiode** (`vakanties/`).
- **Ritme verschilt** tussen werkdag, kantoordag en vakantie/vrije dag (apart
  opstaan/slapen-uur; zie `instellingen/algemeen.opstaanVrij/slapenVrij`).
- **Verlof retroactief:** een ingegeven verlofperiode moet automatisch het dagtype
  invullen ("verlof") — werk wordt dan niet ingepland. Verwerkt via
  `services/vakanties.js` + de planner-fallback in `hooks/useDagPlan.js`.
- **Meerdere ICS-agenda's:** meerdere iCloud-links (eigen agenda + RSCA), één per
  lijn in Beheer.
- **Alle gegevens corrigeerbaar (recent doorgevoerd):** vakantieperiodes, doelen en
  reva-oefeningen zijn nu **bewerkbaar** (waren enkel toevoegen/verwijderen). Taken
  en maaltijden waren dat al. Zie §4 voor de aanleiding.
- **Onboarding bewust naar de láátste fase** (Fase 8): is voorlopig single-user, dus
  lage prioriteit.

---

## 4. Waar we lang op hebben vastgezeten (lessons learned)

Concreet, met de oplossing — zodat je dit niet opnieuw hoeft uit te zoeken:

### 4.1 De "agenda-uren staan 2 uur verkeerd"-saga (langst)
Symptoom: een afspraak om 18:00 verscheen als 20:00 in de app. We hebben **drie
lagen** moeten uitsluiten voor we de echte oorzaak vonden:
1. **ICS-parser (server):** wandklok-/TZID-tijden zonder `Z` werden als UTC gelezen
   en daarna nóg eens naar Brussel omgezet → +2u. **Gefixt** in `functions/lib/ics.js`
   (`parseDt` geeft `wallClock`; alleen tijden mét `Z` worden naar Europe/Brussels
   omgezet). Hierdoor stond de tijd correct in Firestore (18:00).
2. **Toch nog 2u in de app** terwijl Firestore 18:00 toonde → de echte oorzaak:
   **de PWA draaide een oude build** die nooit ververste, plus een **stale
   Firestore offline-cache** (een eenmalige `getDocs` zonder live listener kan oude/
   verwijderde docs blijven teruggeven). **Gefixt** door (a) agenda server-eerst te
   lezen (`getDocsFromServer` met cache-fallback in `services/data.js`) en (b)
   **`registerType: 'autoUpdate'`** + `skipWaiting`/`clientsClaim` in `vite.config.js`,
   zodat de nieuwste versie vanzelf draait.
3. **Diagnose-tooling** toegevoegd ("Agenda nu inlezen & testen" toont nu de ruwe
   DTSTART-regel + omgezette tijd + serverklok), zodat dit type bug voortaan in
   één klik zichtbaar is.

**Les:** als data in Firestore klopt maar de app iets anders toont, verdenk eerst de
**bundel-/cache-versheid**, niet de logica. De zichtbare **App-versie** (zie hieronder)
is daar nu voor.

### 4.2 App-versie-stempel zelf had óók een UTC-bug
De build-stempel gebruikte `toISOString()` (UTC) → 2u verschil. **Gefixt** met
`Intl.DateTimeFormat(..., { timeZone: 'Europe/Brussels' })`. Staat nu onderaan
**Beheer** (Personal-agenda) en in **Instellingen → Over de app** (clubapp).
Gebruik die stempel om te bevestigen welke versie effectief draait.

### 4.3 GitHub Actions deploy-saga
Meerdere dagen mee bezig geweest: auth → IAM-rollen → ongeldige Firestore-index →
"premature close" (Node keep-alive bug, opgelost met **firebase-tools 15.22.3**) →
hosting-release gaf 400 "is the current active version" (15.22 activeert al bij
finalize; de workflow behandelt dit nu als succes). Zie `.github/workflows/deploy.yml`.
De workflow deployt **rules, indexes, storage, functions én hosting**.

### 4.4 Garmin-pijplijn (geparkeerd)
`garminconnect` liep tegen rate-limiting/security-escalatie (HTTP 429) op
accountniveau aan. `garmin/requirements.txt` staat op 0.3.6 + curl_cffi + ua-generator.
**Status: geparkeerd** — los dit op in Fase 6 (veerkracht/Strava-fallback) of wacht
tot de account-hold voorbij is. **Let op:** plak nooit Garmin-wachtwoorden in de
chat/repo; de repo is publiek.

### 4.5 "Flikkerende" UI die geen render-bug was, maar een ontbrekende security-rule
Symptoom: op Gezondheid sprong de coach-kaart constant tussen twee adviesregels,
en de Blessures-kaart wisselde constant tussen de oefeningenlijst en de lege
"voeg blessure toe"-staat. Eerste (verkeerde) hypothese: een React-laad-volgorde-
race (losse `useEffect`/listener-calls die op verschillende momenten landen) —
die fix (alles bundelen in `Promise.all`, renderen gaten op een `klaar`-vlag) was
op zich een verbetering, maar **loste het probleem niet op**. De échte oorzaak:
`firestore.rules` had **geen expliciete regel voor `blessures`**, dus elke write
viel terug op het vangnet (`allow write: if false`). De Firestore-SDK schrijft
**altijd eerst optimistisch lokaal** vóór de server bevestigt; bij een
permission-denied draait ze die lokale schrijf weer terug — en dat
"schrijven → terugdraaien" in een lus (telkens een blessure/oefening
toevoegen/wijzigen probeert opnieuw) is wat als "constant flikkeren" zichtbaar
werd. **Les:** als de UI data toont die niet blijft "plakken" (verschijnt en
verdwijnt weer, zonder duidelijke gebruikersactie ertussen) en er is een
real-time `onSnapshot`/listener in het spel, verdenk **eerst** een ontbrekende of
te strikte Firestore-rule vóór je een React-timingbug zoekt — permission-denied
op een write geeft in de UI géén foutmelding, enkel een stille rollback. Check
bij elke nieuwe top-level subcollectie meteen of `firestore.rules` een regel
heeft (de catch-all onderaan is bewust read-only).

### 4.6 Periodisering: bewust géén heuristiek, maar een vaste kalenderregel
Bij het afwerken van Fase 5 (expliciete opbouw-/deload-weken) was de eerste
ingeving een *data-gedreven* heuristiek: tel hoeveel weken op rij de
trainingsbelasting steeg (uit `sessieBelasting`) en leid daaruit af of een
deload "verdiend" is. Bewust **niet** gedaan: zo'n streak-detectie is fragiel
(ruis in 1 week breekt de telling), moeilijk uitlegbaar ("waarom precies nu?")
en — belangrijker — in tegenspraak met premium-principe 2 ("vertrouwen >
intelligentie", liever voorspelbaar dan slim). Gekozen oplossing
(`services/periodisering.js` → `periodiseringBepalen`): een **vaste,
kalenderbepaalde cyclus** van 4 weken (3× opbouw, dan 1× deload), als pure
functie van de datum — geen instelling, geen meetdata nodig, dus altijd
`zekerheid: 'hoog'`. ACWR (`services/belasting.js`) blijft de dynamische,
data-gedreven laag die per dag bijstuurt; periodisering is de structurele laag
daarboven die onafhankelijk daarvan een deload-week afdwingt. **Les:** bij
twijfel tussen "slimmer" (heuristiek/streak/score) en "voorspelbaarder" (vaste
regel) voor een coach-achtige beslissing, kies voorspelbaar — dat is letterlijk
premium-principe 2, en het scheelt ook fors in testbaarheid.

---

## 4b. Productrichting — premium = vertrouwen, niet intelligentie

Externe review (LLM-council, juni 2026) legde de grootste blinde vlek bloot: het
ontwerp dacht vanuit **intelligentie**, terwijl premium ontstaat uit **vertrouwen**.
De volledige principes staan canoniek in `CLAUDE.md` → "Productprincipes" en zijn
**de meetlat voor elke nieuwe build**. Kort:

- **Kernprincipe: elke aanbeveling is uitlegbaar** — waarom, op basis van welke data,
  hoe zeker, hoe succes gemeten wordt. (Niet om altijd gelezen te worden, maar omdat
  de uitleg moet bestaan.)
- **Vertrouwen > intelligentie** · **outcome-first, niet feature-first**.
- **Bouw voor de échte gebruiker** (~50–70% therapietrouw), niet de perfecte; plannen
  bewegen mee met gemiste blokken.
- **Beoordeeld op je slechtste advies** → bij onzekerheid conservatief + onzekerheid
  tonen.
- **Adaptief met feedback-loops** · **minder cognitieve last** (de software denkt) ·
  **één North Star-metric** (therapietrouw/consistentie).

**Gevolg voor de planning:** vóór nieuwe coach-features komt **Fase 4.5 —
Vertrouwenslaag** (zie §5): bestaande adviezen uitlegbaar maken + één North
Star-score. Dat verhoogt de waargenomen kwaliteit méér dan welke losse feature ook.

## 5. To-do — concrete fases (volgorde = prioriteit)

> Onthouden in `CLAUDE.md` onder "Roadmap". Onboarding staat bewust laatst.
> **Alle fases: explainable-first.** Een advies zonder "waarom" is niet af.

### Fase 4.5 — Vertrouwenslaag ✓ (af)
Het bestaande uitlegbaar gemaakt — de grootste hefboom voor "premium":
- [x] **Advies-model met `waarom` + `databronnen` + `zekerheid` + `meetlat`** in
      `services/coach.js`; `CoachKaart` toont een korte "waarom"-regel + uitklap.
- [x] **North Star-score** (therapietrouw, `services/noordster.js`) op Dashboard +
      Voortgang, met uitleg.
- [x] **Veilige terugval bij weinig data** (lage zekerheid → geen 'hard'; North Star
      toont géén getal i.p.v. een misleidend cijfer).
- [x] **Plan beweegt mee met gemiste blokken** — "Nog in te halen"-kaart met *Toch
      gedaan* / *Verzet* (`dagen/{datum}.verzet`, toegepast in `useDagPlan`).
- [x] **Datumkiezer op het Dashboard** — voorbije dagen zijn nu navigeerbaar en
      blokken blijven afvinkbaar (= de correctie), zonder dag-specifieke
      "vandaag"-kaarten te tonen op een oude dag. Zie §2.
- [ ] **Diepere dagcorrecties** (nog open, expliciet door gebruiker gevraagd):
      exact tijdstip van ontbijt/maaltijd loggen, een niet-gepland ad-hoc-
      activiteit toevoegen aan een (voorbije) dag, en Garmin-slaap/wektijd als
      basis tonen met handmatige overschrijfmogelijkheid. De datumkiezer is de
      voorwaarde hiervoor (gebouwd); de invoervelden zelf nog niet.
- [ ] **Doelen + beloning** (nog open): dag-/maanddoelen (bv. stappen) met een
      in-app badge/toast bij het behalen ervan — gebruiker koos expliciet voor
      in-app i.p.v. push-notificatie.

### Fase 5 — Periodisering & slimme coach ✓ (af)
Van "plannen" naar echte sportopbouw — **elk signaal uitlegbaar onderbouwd**:
- [x] **Acute:Chronic load-ratio (ACWR)** — `services/belasting.js` → `acwrBerekenen`,
      met zones (laag/optimaal/verhoogd/risico), zekerheid + uitleg.
- [x] **RPE-gewogen belasting** — `sessieBelasting()` (sRPE = duur × RPE) uit de
      RPE-invoer in Voortgang.
- [x] **Blessure-preventie-advies** — ACWR voedt de coach (`acwrZone` → conservatiever
      bij risico) en toont waarschuwing in `BelastingKaart`.
- [x] **Trainingsblokken / periodisering** (expliciete opbouw- vs deload-weken) —
      `services/periodisering.js` → `periodiseringBepalen`: vaste, kalenderbepaalde
      cyclus van 4 weken (3× opbouw + 1× deload), geen instelling/data-gok nodig.
      Tempert de coach altijd van 'hard' naar 'matig' in een deload-week, getoond in
      `BelastingKaart` ("Trainingscyclus", week X/4 + waarom + meetlat). Zie §4.6
      voor de afweging "voorspelbare regel" vs. "data-heuristiek".

### Fase 5.5 — Blessures & revalidatie ✓ (af)
Volledig blessuremodel + reva-therapietrouw, audit-gedreven (zie §4.5 voor de
twee gefixte bugs in deze feature):
- [x] **Blessuremodel** (`blessures/{id}`) met regio, oefenlijst, round-robin in
      de dagplanning, automatische migratie van legacy `reva`-docs.
- [x] **Pijn als hard veiligheidssignaal** in de coach (≥3/5 → altijd herstel).
- [x] **Reva-conflictdetectie** in de planner + **reva-trouw-nudge** (adaptieve
      feedback-loop, niet-bestraffend) + **North Star meet reva-checklists
      correct**.
- [x] **Blessure-afloop-melding** via de push-dispatcher.
- [x] **Firestore-rule voor `blessures`** toegevoegd (was de échte oorzaak van de
      "flikkerende" coach-/blessures-kaart, zie §4.5).
- [ ] **Niet opgelost (bewust uit scope):** geen rate-limiting/dedup op de
      blessure-afloop-push als de gebruiker `eindDatum` meermaals wijzigt op
      één dag — beperkt risico (max. 1×/dag door de bestaande `alGestuurd`-dedup
      per slug, maar geen specifieke test hiervoor).

### Fase 6 — Veerkracht & data
- [ ] **Strava-fallback** als Garmin faalt (zie §4.4).
- [ ] **Data-export** (JSON/CSV) + back-up/herstel.
- [ ] Robuustere sync (retries, statusmeldingen).

### Fase 7 — Levensbreed (optioneel)
- [ ] Financiën, leerdoelen, sociale planning — **alleen** als de kern stabiel is.

### Fase 8 — Onboarding & personalisatie (laatst)
- [ ] Eerste-keer-wizard (naam, doelen, ritme thuis/kantoor, sporttijden).
- [ ] Profiel (leeftijd/gewicht/lengte) zodat Garmin-analyse dat meeneemt.

---

## 6. Snelstart voor de volgende sessie

```bash
npm install
npm run dev      # lokaal draaien
npm test         # 158 unit-tests
npm run build    # productie-build (genereert ook firebase-messaging-sw.js)
```

- **Branch:** ontwikkel op de branch die de sessie/opdracht aangeeft, push
  daarheen. Geen PR aanmaken tenzij gevraagd. Merge naar `main` triggert de
  deploy.
- **Bij een nieuwe top-level Firestore-subcollectie:** voeg altijd meteen een
  regel toe in `firestore.rules` (zie §4.5) — de catch-all is read-only en
  geeft géén foutmelding in de UI bij een geweigerde write.
- **Na deploy:** controleer de **App-versie** onderaan Beheer om te bevestigen dat de
  nieuwe build live staat (iOS-PWA: bij twijfel app verwijderen + opnieuw toevoegen).
- **Tweede repo:** `clubapp-Kodokan` (zelfde branchnaam) — daar staat de app-versie in
  Instellingen → Over de app.
