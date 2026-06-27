# Handover — Personal Agenda

Werkdocument voor wie verder bouwt. Geeft de **stand van zaken**, wat er onderweg
**gecorrigeerd** is, waar we **lang op hebben vastgezeten** (zodat je dezelfde
valkuilen niet herhaalt) en een **concrete to-do per fase**. Lees ook `CLAUDE.md`
(architectuur + datamodel) en `README.md` (babyproof setup/deploy).

Laatst bijgewerkt: 27/06/2026.

---

## 1. Wat is de app?

Persoonlijke planning/gezondheid-PWA op **Firebase** (Firestore, Auth e-mail, FCM
push, Cloud Functions) + een **Garmin→Firestore** Python-pijplijn. **Eén gebruiker**
(single-user). Doel: alle losse apps vervangen en de dag structureren rond werk
(thuis/kantoor, auto/fiets), sport (judo trainen + lesgeven, fietsen, reva) en vrije
tijd (o.a. RSCA-matchen), met push-herinneringen, gewoontes/streaks, Garmin-data en
een coach-laag. **Alles na opzet in-app beheerbaar** — geen code meer nodig.

Stack: Vite + React 18 + react-router-dom v6 + vite-plugin-pwa · Firestore met
persistentLocalCache · Cloud Functions v2 (Node 22, CommonJS) · Vitest (unit) +
Playwright (smoke) · deploy via GitHub Actions naar Firebase Hosting + Functions.

---

## 2. Stand van zaken — wat is af

**Fase 1–3 + audit-ronde + Fase 4 zijn klaar, gedeployed en in gebruik.**

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
- **Fase 5 — Periodisering (grotendeels):** **ACWR** uit RPE-gewogen belasting
  (`services/belasting.js`), uitlegbaar, voedt de coach (blessurepreventie) en
  toont in `BelastingKaart`.

Tests: 64 unit-tests groen (`npm test`). Build groen (`npm run build`).

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

### Fase 5 — Periodisering & slimme coach (grotendeels af)
Van "plannen" naar echte sportopbouw — **elk signaal uitlegbaar onderbouwd**:
- [x] **Acute:Chronic load-ratio (ACWR)** — `services/belasting.js` → `acwrBerekenen`,
      met zones (laag/optimaal/verhoogd/risico), zekerheid + uitleg.
- [x] **RPE-gewogen belasting** — `sessieBelasting()` (sRPE = duur × RPE) uit de
      RPE-invoer in Voortgang.
- [x] **Blessure-preventie-advies** — ACWR voedt de coach (`acwrZone` → conservatiever
      bij risico) en toont waarschuwing in `BelastingKaart`.
- [ ] **Trainingsblokken / periodisering** (expliciete opbouw- vs deload-weken) — nog
      open; ACWR geeft nu al de richting.

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
npm test         # 49 unit-tests
npm run build    # productie-build (genereert ook firebase-messaging-sw.js)
```

- **Branch:** ontwikkel op `claude/personal-agenda-app-setup-jmfbm4`, push daarheen.
  Geen PR aanmaken tenzij gevraagd. Merge naar `main`/`Main` triggert de deploy.
- **Na deploy:** controleer de **App-versie** onderaan Beheer om te bevestigen dat de
  nieuwe build live staat (iOS-PWA: bij twijfel app verwijderen + opnieuw toevoegen).
- **Tweede repo:** `clubapp-Kodokan` (zelfde branchnaam) — daar staat de app-versie in
  Instellingen → Over de app.
