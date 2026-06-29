# Personal Agenda — Volledige broncode (audit-bundel)

Automatisch gegenereerd bestand. Bevat de volledige inhoud van alle
relevante bron-, config- en testbestanden uit deze repository, samengevoegd
in 1 bestand voor een externe audit. Genereer opnieuw indien verouderd.

Branch: `claude/caveman-full-4o2v2o`

## Inhoudsopgave

- `.env.example`
- `.firebaserc`
- `.github/workflows/deploy.yml`
- `.github/workflows/garmin-auth.yml`
- `.github/workflows/garmin-backfill.yml`
- `.github/workflows/garmin-daily.yml`
- `.gitignore`
- `CLAUDE.md`
- `HANDOVER.md`
- `README.md`
- `firebase.json`
- `firestore.indexes.json`
- `firestore.rules`
- `storage.rules`
- `package.json`
- `vite.config.js`
- `index.html`
- `requirements.txt`
- `functions/index.js`
- `functions/lib/ics.js`
- `functions/package.json`
- `garmin/__init__.py`
- `garmin/auth.py`
- `garmin/auth_ci.py`
- `garmin/backfill.py`
- `garmin/client.py`
- `garmin/config.py`
- `garmin/fetchers.py`
- `garmin/firestore_db.py`
- `garmin/import_export.py`
- `garmin/sync_daily.py`
- `scripts/gen_icons.py`
- `scripts/generateMessagingSw.mjs`
- `src/App.jsx`
- `src/main.jsx`
- `src/firebase.js`
- `src/components/BelastingKaart.jsx`
- `src/components/CheckinKaart.jsx`
- `src/components/CoachKaart.jsx`
- `src/components/Daypicker.jsx`
- `src/components/ErrorBoundary.jsx`
- `src/components/Gauge.jsx`
- `src/components/Icons.jsx`
- `src/components/NoordsterKaart.jsx`
- `src/components/Shell.jsx`
- `src/components/Sparkline.jsx`
- `src/components/UpdateBanner.jsx`
- `src/config/appConfig.js`
- `src/contexts/AuthContext.jsx`
- `src/contexts/SettingsContext.jsx`
- `src/contexts/ThemeContext.jsx`
- `src/contexts/ToastContext.jsx`
- `src/hooks/useDagPlan.js`
- `src/pages/Beheer.jsx`
- `src/pages/Coach.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Gezondheid.jsx`
- `src/pages/Login.jsx`
- `src/pages/Maaltijden.jsx`
- `src/pages/Taken.jsx`
- `src/pages/Voortgang.jsx`
- `src/pages/Week.jsx`
- `src/services/agenda.js`
- `src/services/belasting.js`
- `src/services/blessures.js`
- `src/services/coach.js`
- `src/services/data.js`
- `src/services/doelen.js`
- `src/services/garmin.js`
- `src/services/maaltijden.js`
- `src/services/noordster.js`
- `src/services/periodisering.js`
- `src/services/planner.js`
- `src/services/push.js`
- `src/services/reflectie.js`
- `src/services/sportcoach.js`
- `src/services/taken.js`
- `src/services/tijd.js`
- `src/services/vakanties.js`
- `src/styles/global.css`
- `test/belasting.test.js`
- `test/blessures.test.js`
- `test/coach.test.js`
- `test/doelen.test.js`
- `test/ics.test.js`
- `test/maaltijden.test.js`
- `test/noordster.test.js`
- `test/periodisering.test.js`
- `test/planner.test.js`
- `test/reflectie.test.js`
- `test/sportcoach.test.js`
- `test/tijd.test.js`
- `test/vakanties.test.js`

## `.env.example`

```example
# =========================================================================
#  Personal Agenda — voorbeeld-omgevingsbestand
#  Kopieer dit naar .env.local en vul de echte waarden in.
#  .env.local staat NIET in git (zie .gitignore). In GitHub gebruik je
#  dezelfde inhoud als de secret ENV_LOCAL (zie README).
# =========================================================================

# --- Firebase web-config (tab "Projectinstellingen" > "Je apps") ---
VITE_FB_API_KEY=
VITE_FB_AUTH_DOMAIN=personnal-agenda.firebaseapp.com
VITE_FB_PROJECT_ID=personnal-agenda
VITE_FB_STORAGE_BUCKET=personnal-agenda.firebasestorage.app
VITE_FB_MESSAGING_SENDER_ID=
VITE_FB_APP_ID=
VITE_FB_MEASUREMENT_ID=

# --- Push-meldingen: VAPID-sleutel (Cloud Messaging > Web Push-certificaten) ---
VITE_VAPID_KEY=

# --- App Check (reCAPTCHA v3) — aanbevolen in productie, mag leeg tijdens test ---
VITE_APPCHECK_KEY=

# --- App-identiteit (PWA-naam, thema-kleur) ---
VITE_APP_NAAM=Personal Agenda
VITE_THEME_COLOR=#0b1120

```

## `.firebaserc`

```firebaserc
{
  "projects": {
    "default": "personnal-agenda"
  }
}

```

## `.github/workflows/deploy.yml`

```yml
name: Deploy to Firebase

on:
  push:
    branches:
      - main
      - Main
  workflow_dispatch:

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    env:
      NODE_OPTIONS: --dns-result-order=ipv4first
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          # Gepind (niet enkel "22"): een eerdere 22.x-patch brak node-fetch@2.
          node-version: 22.22.0
          cache: npm

      - name: Install app dependencies
        run: npm install

      - name: Create .env.local from GitHub secret
        run: echo "${{ secrets.ENV_LOCAL }}" > .env.local

      - name: Build app (genereert ook firebase-messaging-sw.js)
        run: npm run build

      - name: Setup Firebase service account
        run: |
          echo '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}' > $HOME/firebase-service-account.json
          echo "GOOGLE_APPLICATION_CREDENTIALS=$HOME/firebase-service-account.json" >> $GITHUB_ENV

      - name: Install Firebase CLI
        run: npm install -g firebase-tools@15.22.3

      - name: Install Functions dependencies
        working-directory: functions
        run: npm install

      - name: Deploy Firestore rules
        run: |
          for i in 1 2 3 4 5 6; do
            firebase deploy --only firestore:rules --project ${{ secrets.FIREBASE_PROJECT_ID }} && break
            if [ "$i" = "6" ]; then exit 1; fi
            echo "Poging $i mislukt (netwerk/auth), opnieuw na 45s..."; sleep 45
          done

      - name: Deploy Firestore indexes
        run: |
          for i in 1 2 3 4 5 6; do
            firebase deploy --only firestore:indexes --project ${{ secrets.FIREBASE_PROJECT_ID }} && break
            if [ "$i" = "6" ]; then exit 1; fi
            echo "Poging $i mislukt, opnieuw na 45s..."; sleep 45
          done

      - name: Deploy Storage rules
        run: |
          for i in 1 2 3 4 5 6; do
            firebase deploy --only storage --project ${{ secrets.FIREBASE_PROJECT_ID }} && break
            if [ "$i" = "6" ]; then exit 1; fi
            echo "Poging $i mislukt, opnieuw na 45s..."; sleep 45
          done

      - name: Deploy Cloud Functions
        run: |
          for i in 1 2 3 4 5 6; do
            firebase deploy --only functions --project ${{ secrets.FIREBASE_PROJECT_ID }} --force && break
            if [ "$i" = "6" ]; then exit 1; fi
            echo "Poging $i mislukt, opnieuw na 45s..."; sleep 45
          done

      - name: Deploy Hosting
        run: |
          for i in 1 2 3 4 5 6; do
            if out=$(firebase deploy --only hosting --project ${{ secrets.FIREBASE_PROJECT_ID }} 2>&1); then
              echo "$out"; echo "Hosting gedeployed."; break
            fi
            echo "$out"
            # firebase-tools 15.22 activeert de versie al bij finalize; de release-call
            # geeft dan deze 400. De site is op dat moment al live -> succes.
            if echo "$out" | grep -q "is the current active version"; then
              echo "Versie staat al live (release-call is een no-op). Behandeld als succes."; break
            fi
            if [ "$i" = "6" ]; then exit 1; fi
            echo "Poging $i mislukt, opnieuw na 30s..."; sleep 30
          done

```

## `.github/workflows/garmin-auth.yml`

```yml
name: Garmin Auth (token aanmaken)

# Handmatig starten: Actions -> "Garmin Auth (token aanmaken)" -> Run workflow.
# Logt in op Garmin en levert de tokenblob als download-artifact.
# Vereist secrets: GARMIN_EMAIL, GARMIN_PASSWORD.
# Heeft je account 2FA? Zet die tijdelijk uit in Garmin, draai dit, zet weer aan
# (de tokens blijven ~6 maanden geldig). Of vul de MFA-code hieronder in.

on:
  workflow_dispatch:
    inputs:
      mfa_code:
        description: "MFA-code (laat leeg als je account geen 2FA heeft)"
        required: false
        default: ""

jobs:
  auth:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Login bij Garmin en maak token
        env:
          GARMIN_EMAIL: ${{ secrets.GARMIN_EMAIL }}
          GARMIN_PASSWORD: ${{ secrets.GARMIN_PASSWORD }}
          GARMIN_MFA: ${{ github.event.inputs.mfa_code }}
          GARMIN_IS_CN: ${{ vars.GARMIN_IS_CN }}
        run: python -m garmin.auth_ci

      - name: Upload token als artifact
        uses: actions/upload-artifact@v4
        with:
          name: garmin-token
          path: garmin_token_b64.txt
          retention-days: 1

```

## `.github/workflows/garmin-backfill.yml`

```yml
name: Garmin Backfill (historiek)

on:
  workflow_dispatch:
    inputs:
      start:
        description: "Startdatum YYYY-MM-DD"
        required: true
      end:
        description: "Einddatum YYYY-MM-DD (leeg = vandaag)"
        required: false
      delay:
        description: "Seconden wachten tussen dagen (default 0.7)"
        required: false
        default: "0.7"

jobs:
  backfill:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run backfill
        env:
          GARMIN_TOKENS_BASE64: ${{ secrets.GARMIN_TOKENS_BASE64 }}
          GARMIN_IS_CN: ${{ vars.GARMIN_IS_CN }}
          FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}
          FIRESTORE_PROJECT_ID: ${{ secrets.FIRESTORE_PROJECT_ID }}
          FIRESTORE_USER_ID: ${{ secrets.FIRESTORE_USER_ID }}
        run: |
          python -m garmin.backfill \
            --start "${{ github.event.inputs.start }}" \
            ${{ github.event.inputs.end != '' && format('--end {0}', github.event.inputs.end) || '' }} \
            --delay "${{ github.event.inputs.delay || '0.7' }}"

```

## `.github/workflows/garmin-daily.yml`

```yml
name: Garmin Daily Sync

on:
  schedule:
    # Elke 3u tijdens wakkere uren (Brussel CEST, UTC+2 in de zomer) zodat
    # stappen/HR voelbaar bijschuiven tijdens de dag, plus 05:00 UTC als
    # vroege ochtendsync voor de afgelopen nacht.
    - cron: "0 5,8,11,14,17,20 * * *"
  workflow_dispatch:
    inputs:
      days_back:
        description: "How many days before today to sync"
        required: false
        default: "1"

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run daily sync
        env:
          GARMIN_TOKENS_BASE64: ${{ secrets.GARMIN_TOKENS_BASE64 }}
          GARMIN_IS_CN: ${{ vars.GARMIN_IS_CN }}
          FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}
          FIRESTORE_PROJECT_ID: ${{ secrets.FIRESTORE_PROJECT_ID }}
          FIRESTORE_USER_ID: ${{ secrets.FIRESTORE_USER_ID }}
        run: python -m garmin.sync_daily --days-back "${{ github.event.inputs.days_back || '1' }}"

```

## `.gitignore`

```gitignore
# --- Node / Vite ---
node_modules/
dist/
dist-ssr/
*.local
.vite/

# --- Environment / secrets — NOOIT committen ---
.env
.env.*
!.env.example
serviceAccount*.json
firebase-*.json
*-service-account.json
.firebase/

# --- Python (Garmin-pipeline) ---
__pycache__/
*.py[cod]
.venv/
venv/
*.egg-info/
.garminconnect/
tokens.tar
*.tar

# Garmin export-dumps
DI_CONNECT/
export/
*.zip

# --- Functions ---
functions/node_modules/

# Gegenereerd bij build uit env (bevat publieke Firebase-config)
public/firebase-messaging-sw.js

# --- OS / editor ---
.DS_Store
.idea/
.vscode/
*.log

```

## `CLAUDE.md`

```md
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
scripts/                  generateMessagingSw.mjs (build), gen_icons.py
```

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

```

## `HANDOVER.md`

```md
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

Tests: 158 unit-tests groen (`npm test`). Build groen (`npm run build`).

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

```

## `README.md`

```md
# Personal Agenda

Een persoonlijke, **gratis** web-app (PWA) die je leven structureert: ze plant je
dag/week minutieus rond **werk** (thuis/kantoor, auto of fiets), **sport** (judo
trainen én lesgeven, fietsen, revalidatie) en **vrije tijd** (o.a. RSCA-matchen),
stuurt je **push-herinneringen** per tijdslot, en laat je taken **afvinken** met
streaks/voortgang.

Daarnaast fungeert de app als **persoonlijke sportcoach**: ze leest je **Garmin**-
data (readiness, body battery, slaap, HRV) en je **zelfrapportage** (energie, pijn)
uit om elke dag een **uitlegbaar** trainingsadvies te geven (welk niveau, hoeveel
tijd, waarom), houdt je **trainingsbelasting bij (ACWR)** én plant een vaste
**opbouw-/deload-cyclus** (3 weken opbouw, dan 1 hersteller) om overbelasting/
blessures te helpen voorkomen. Tijdens **groot verlof** (in te stellen bij Week →
vakantieperiode) sport je vaak met meer tijd thuis, maar niet als je in het
**buitenland** bent — dat geef je apart aan, en de coach verlengt de sessieduur
enkel bij verlof thuis. De app volgt ook actieve **blessures met
revalidatie-oefeningen** op (per blessure een eigen oefenschema, met een
**North Star-therapietrouwscore** die toont hoe consequent je je reva volhoudt).
Bij gemiste reva-sessies of een afgelopen blessure die niet bevestigd is, krijg je
daar zelf een melding over — de app laat niets stil verlopen.

Alles is na de opzet **in de app zelf beheerbaar** — je hoeft nooit meer code te
schrijven.

> **Filosofie — vertrouwen boven slimheid.** Dit wil geen "zo slim mogelijke AI"
> zijn, maar een **betrouwbare beslissingscoach**. Leidend principe: **elk advies is
> uitlegbaar** (waarom, op basis van welke data, hoe zeker, hoe je succes meet). De
> app is gemaakt voor de échte gebruiker die zijn schema ~60% uitvoert — een gemiste
> dag is normaal, geen mislukking — en bij twijfel adviseert ze liever voorzichtig.
> De volledige productprincipes staan in `CLAUDE.md`; ze gelden voor elke nieuwe build.

> Draait op **Firebase** (zelfde aanpak als de clubapp): Firestore-database,
> inloggen met e-mail, push via Firebase Cloud Messaging, automatische deploy via
> GitHub Actions. De Garmin-data komt binnen via een dagelijks Python-script
> (GitHub Action). Open-Meteo levert gratis weer voor het fietsadvies.

---

## Inhoud

- [1. Wat de app doet](#1-wat-de-app-doet)
- [2. Hoe het in elkaar zit](#2-hoe-het-in-elkaar-zit)
- [3. DEEL A — Firebase klaarzetten (babyproof)](#3-deel-a--firebase-klaarzetten-babyproof)
- [4. DEEL B — Mails met de app-naam (Trigger Email)](#4-deel-b--mails-met-de-app-naam-trigger-email)
- [5. DEEL C — GitHub Secrets](#5-deel-c--github-secrets)
- [6. DEEL D — Eerste deploy](#6-deel-d--eerste-deploy)
- [7. DEEL E — Garmin koppelen](#7-deel-e--garmin-koppelen)
- [8. DEEL F — Installeren op je iPhone + push + anti-scroll](#8-deel-f--installeren-op-je-iphone--push--anti-scroll)
- [9. DEEL G — Je iPhone-agenda koppelen (ICS)](#9-deel-g--je-iphone-agenda-koppelen-ics)
- [10. Dagelijks gebruik](#10-dagelijks-gebruik)
- [11. Alles gratis houden](#11-alles-gratis-houden)
- [12. Problemen oplossen](#12-problemen-oplossen)

---

## 1. Wat de app doet

| Onderdeel | Wat |
|---|---|
| **Vandaag** | Gedetailleerde tijdlijn van je dag (opstaan → werk → sport → eten → ontspanning → slapen), met afvinken, “nu”-markering, voortgangsbalk en beloning. |
| **Week** | Per dag aanduiden: thuiswerk, kantoor (auto/fiets), verlof of vrij. Vakantieweek aanvinken (dan valt judoles-geven weg). De dagplanning past zich automatisch aan. |
| **Taken** | Gewoontes/taken beheren met streaks (bv. water drinken, niet scrollen). |
| **Gezondheid** | Garmin-samenvatting (readiness, body battery, slaap, rust-HR, HRV, stappen) + dagelijkse check-in (slaap/energie/pijn). **Sportcoach**: per dag een uitlegbaar trainingsadvies (niveau + duur + waarom/databronnen/zekerheid), aangepast aan je doel (afvallen/kracht/uithouding/herstel/algemeen). **Blessures & revalidatie**: blessures aanmaken/afsluiten met regio, per blessure een eigen oefenlijst die round-robin in de dagplanning verschijnt; een actieve blessure of zelf-gerapporteerde pijn (≥3/5) dwingt de coach altijd naar "herstel", en een blessure-regio kan specifieke sporten (bv. fietsen bij een knieblessure) afraden. |
| **Voortgang** | **North Star-score** (therapietrouw/consistentie over de afgelopen week) + apart een **reva-therapietrouwscore** zodra je actieve blessures hebt, plus ACWR-trainingsbelasting (laag/optimaal/verhoogd/risico) en je huidige **trainingscyclusweek** (opbouw of deload). |
| **Beheer** | Alle instellingen no-code: thema, meldingen, werkuren, reistijden, sport, voeding, agenda-link. |
| **Push** | Ochtendbriefing, readiness-check, herinnering per tijdslot, avondvooruitblik, anti-scroll nudges, **en een melding als een blessure is afgelopen maar nog niet bevestigd in de app**. Intensiteit instelbaar (streng → soepel). |

De planning houdt rekening met jouw vaste regels: **woensdag** vroeg weg om
**judoles te geven** (18:30, niet in vakantie), eigen **judotraining** wo
20:00–21:30 & za 16:00–18:00, **fietsen** naar kantoor telt als sport (maar niet
bij blessure of slecht weer/lage readiness), en streven naar **±9u werk**.

---

## 2. Hoe het in elkaar zit

```
Browser (PWA, React)  ──►  Firebase Auth (e-mail/wachtwoord)
        │
        ├─► Firestore   users/{jouwUid}/...   (instellingen, weken, taken, dagen, …)
        │                         ▲
        │                         │ schrijft enkel server-side:
        ├─► FCM push  ◄── Cloud Functions (dispatcher elke 10', ICS, weer, mail)
        │
Garmin Connect ──► Python-script (GitHub Action, dagelijks) ──► users/{jouwUid}/garminDaily
iPhone-agenda ──► ICS-link ──► Cloud Function icsSync ──► users/{jouwUid}/agendaEvents
Open-Meteo ──► Cloud Function weerSync ──► users/{jouwUid}/weer
```

Deploy gebeurt automatisch via **GitHub Actions** zodra je naar de `main`-branch
pusht (of de workflow handmatig start).

---

## 3. DEEL A — Firebase klaarzetten (babyproof)

> Je project heet **`personnal-agenda`** en bestaat al. Doorloop onderstaande
> stappen één voor één. Telkens als je een waarde tegenkomt die je later nodig
> hebt (sleutels), plak je die in een tijdelijk kladbestand.

### A1 — Blaze-plan (en toch gratis blijven)
1. Ga naar <https://console.firebase.google.com> → kies project **personnal-agenda**.
2. Linksonder **Upgrade** → kies **Blaze (pay as you go)**. Dit is **verplicht**
   voor Cloud Functions, maar je blijft binnen de gratis limieten.
3. Stel meteen een **budgetwaarschuwing** in (zie [hoofdstuk 11](#11-alles-gratis-houden)) zodat je nooit verrast wordt.

### A2 — De web-app registreren en je sleutels ophalen
1. Klik op het **tandwiel** (linksboven) → **Projectinstellingen**.
2. Scroll naar **Je apps**. Staat er nog geen web-app (icoon `</>`)? Klik erop,
   geef als bijnaam `Personal Agenda`, **vink Hosting NIET aan** (doen we via CLI),
   klik **App registreren**.
3. Je ziet nu een `firebaseConfig`-blok. Kopieer deze waarden — ze worden je
   `VITE_FB_*`-secrets:

   | In het blok | Jouw secret |
   |---|---|
   | `apiKey` | `VITE_FB_API_KEY` |
   | `authDomain` | `VITE_FB_AUTH_DOMAIN` |
   | `projectId` | `VITE_FB_PROJECT_ID` |
   | `storageBucket` | `VITE_FB_STORAGE_BUCKET` |
   | `messagingSenderId` | `VITE_FB_MESSAGING_SENDER_ID` |
   | `appId` | `VITE_FB_APP_ID` |
   | `measurementId` | `VITE_FB_MEASUREMENT_ID` |

### A3 — Firestore-database aanmaken
1. Linkermenu → **Build → Firestore Database** → **Database maken**.
2. Locatie: kies **`eur3 (europe-west)`** (dichtbij, gratis-vriendelijk).
3. Start in **productiemodus** (de regels worden bij deploy automatisch gezet).

### A4 — Inloggen met e-mail aanzetten + jouw account maken
1. Linkermenu → **Build → Authentication** → **Aan de slag**.
2. Tabblad **Sign-in method** → **E-mailadres/wachtwoord** → **Inschakelen** → opslaan.
3. Tabblad **Users** → **Gebruiker toevoegen** → vul je e-mail + een wachtwoord in.
   **Dit is je login voor de app.**
4. Klik op de aangemaakte gebruiker en **kopieer de `User UID`** (een lange code).
   ⚠️ Bewaar deze goed — die heb je nodig bij de Garmin-koppeling
   ([DEEL E](#7-deel-e--garmin-koppelen)).

### A5 — Push-sleutel (VAPID)
1. **Projectinstellingen** → tabblad **Cloud Messaging**.
2. Onder **Web Push-certificaten** → **Sleutelpaar genereren**.
3. Kopieer de lange sleutel → dit wordt `VITE_VAPID_KEY`.
   *(Genereer dit maar één keer; een nieuw paar verbreekt bestaande push.)*

### A6 — (Aanbevolen) App Check
1. Linkermenu → **Build → App Check** → registreer je web-app met **reCAPTCHA v3**.
2. Maak op <https://www.google.com/recaptcha/admin> een **v3-sleutel** voor je
   hosting-domein (`personnal-agenda.web.app`). De **site key** wordt `VITE_APPCHECK_KEY`.
   *(Mag je tijdens het testen leeg laten; vul later in voor productie.)*

### A7 — Vereiste Google-Cloud-API’s inschakelen
Voor Cloud Functions **v2** met **planning (scheduler)** moeten een paar API’s aan
staan. Ga naar <https://console.cloud.google.com/apis/library>, kies rechtsboven
project **personnal-agenda**, en schakel elk hiervan in (zoek → **Inschakelen**):

- **Cloud Build API**
- **Artifact Registry API**
- **Cloud Functions API**
- **Cloud Run Admin API**
- **Eventarc API**
- **Cloud Pub/Sub API**
- **Cloud Scheduler API**  ← nodig voor de push-dispatcher/ICS/weer
- **Firebase Cloud Messaging API**

### A8 — Service account (laat GitHub voor je deployen)
1. **Projectinstellingen** → tabblad **Serviceaccounts** → **Nieuwe privésleutel
   genereren** → bevestig. Er wordt een `.json`-bestand gedownload.
2. Bewaar dit bestand veilig (nooit publiek delen). De **volledige inhoud** wordt
   straks de secret `FIREBASE_SERVICE_ACCOUNT` (én `FIREBASE_SERVICE_ACCOUNT_JSON`
   voor Garmin — exact dezelfde inhoud).

---

## 4. DEEL B — Mails met de app-naam (Trigger Email)

Je wil mails kunnen sturen **met afzender “Personal Agenda”**, niet je persoonlijke
naam. Dat doet de officiële Firebase-extensie **Trigger Email from Firestore**: de
app schrijft een document naar de collectie `mail`, de extensie verstuurt het.

### B1 — Een (gratis) verzendkanaal kiezen
Je hebt een SMTP-server nodig. Twee babyproof opties:

- **Brevo (aanrader, gratis 300 mails/dag, eigen afzender):**
  1. Maak gratis account op <https://www.brevo.com>.
  2. Menu **SMTP & API → SMTP**. Noteer: host `smtp-relay.brevo.com`, poort `587`,
     login + **SMTP-key**.
  3. Je SMTP-connectie-URI wordt:
     `smtps://JOUW_LOGIN:JOUW_SMTP_KEY@smtp-relay.brevo.com:587`
- **Gmail (simpelst):**
  1. Zet 2-staps-verificatie aan op je Google-account.
  2. Maak een **App-wachtwoord** (<https://myaccount.google.com/apppasswords>).
  3. URI: `smtps://jouwadres@gmail.com:APP_WACHTWOORD@smtp.gmail.com:465`.
     *(Het afzender-adres blijft je gmail, maar de getoonde **naam** wordt
     “Personal Agenda”. Aangezien jij de enige ontvanger bent, is dat prima.)*

### B2 — De extensie installeren
1. Firebase Console → linkermenu **Extensions** → zoek **“Trigger Email from
   Firestore”** → **Install**.
2. Vul in tijdens de wizard:
   - **SMTP connection URI**: de URI uit B1.
   - **Email documents collection**: `mail`  ← exact zo (de app schrijft hierheen).
   - **Default FROM address**: `Personal Agenda <noreply@personnal-agenda.web.app>`
     (Brevo) of `Personal Agenda <jouwadres@gmail.com>` (Gmail).
     → **Het stuk vóór de `<>` is de afzendernaam die je ziet.**
   - **Default REPLY-TO**: laat leeg of zet je eigen adres.
3. Klik **Install extension** en wacht tot ze klaar is.

> Vanaf nu verstuurt de wekelijkse `weekMail`-functie (zondag 19:00) automatisch
> een mailtje namens **Personal Agenda**. Je kan later in de app meer mails
> toevoegen zonder code.

---

## 5. DEEL C — GitHub Secrets

Ga naar je repo **dariodefreyne-ui/Personal-agenda-** → **Settings → Secrets and
variables → Actions → New repository secret**. Voeg deze toe:

### C1 — Voor het deployen van de app
| Secret | Inhoud |
|---|---|
| `FIREBASE_PROJECT_ID` | `personnal-agenda` |
| `FIREBASE_SERVICE_ACCOUNT` | de **volledige inhoud** van het JSON-bestand uit A8 |
| `ENV_LOCAL` | het volledige blok hieronder, met jouw waarden ingevuld |

**Inhoud van `ENV_LOCAL`** (kopieer en vul aan met A2/A5/A6):
```
VITE_FB_API_KEY=...
VITE_FB_AUTH_DOMAIN=personnal-agenda.firebaseapp.com
VITE_FB_PROJECT_ID=personnal-agenda
VITE_FB_STORAGE_BUCKET=personnal-agenda.firebasestorage.app
VITE_FB_MESSAGING_SENDER_ID=...
VITE_FB_APP_ID=...
VITE_FB_MEASUREMENT_ID=...
VITE_VAPID_KEY=...
VITE_APPCHECK_KEY=
VITE_APP_NAAM=Personal Agenda
VITE_THEME_COLOR=#0b1120
```

### C2 — Voor de dagelijkse Garmin-sync
| Secret | Inhoud |
|---|---|
| `GARMIN_TOKENS_BASE64` | uitvoer van `python -m garmin.auth` (zie DEEL E) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **dezelfde** JSON-inhoud als `FIREBASE_SERVICE_ACCOUNT` |
| `FIRESTORE_PROJECT_ID` | `personnal-agenda` |
| `FIRESTORE_USER_ID` | **jouw User UID uit stap A4** (zodat Garmin-data onder jouw account komt) |

> ⚠️ **Heel belangrijk:** `FIRESTORE_USER_ID` moet **exact** je Firebase-Auth UID
> zijn. Anders schrijft het Garmin-script naar een andere map dan de app leest, en
> blijft je gezondheidswidget leeg.

---

## 6. DEEL D — Eerste deploy

1. Zorg dat alle secrets uit C1 ingevuld zijn.
2. **Merge** deze branch naar `main` (of: GitHub → tabblad **Actions** → workflow
   **Deploy to Firebase** → **Run workflow**).
3. Volg de voortgang in **Actions**. Na ±3–5 min staat alles live op
   **`https://personnal-agenda.web.app`**.
4. Open die URL, log in met je account uit A4. 🎉

*De deploy zet automatisch je Firestore-regels, indexes, storage-regels, de Cloud
Functions én de website online.*

---

## 7. DEEL E — Garmin koppelen

De map `garmin/` bevat een kant-en-klare pijplijn die elke ochtend (05:15 UTC) je
slaap, training readiness, hartslag, stappen en activiteiten naar Firestore haalt.

**Eenmalig token aanmaken (lokaal op je computer):**
```bash
pip install -r requirements.txt
python -m garmin.auth          # log in met je Garmin-account (MFA werkt)
```
Het script print een lange `GARMIN_TOKENS_BASE64`-waarde. Zet die als GitHub-secret
(C2). Tokens blijven ±6 maanden geldig.

**Daarna draait alles vanzelf**, elke 3 uur overdag, via de workflow
`.github/workflows/garmin-daily.yml`. Handmatig bijwerken kan via **Actions →
Garmin Daily Sync → Run workflow**.

**Geen pc? Token via GitHub Actions:** zet secrets `GARMIN_EMAIL`/`GARMIN_PASSWORD`,
merge naar `main`, en draai **Actions → Garmin Auth (token aanmaken)**. Download
nadien het artifact `garmin-token`, kopieer de inhoud naar de secret
`GARMIN_TOKENS_BASE64`.

> **Krijg je `429`/login mislukt?** `garmin.login()` doorloopt zelf een keten van
> 5 strategieën (mobile/SSO-widget/portal, met TLS-impersonation) voor het opgeeft
> — dat is **niet** louter een per-IP-rate-limit, Garmin's huidige rate-limit zit
> per **account + clientId**. Wachten of vanaf een ander netwerk (Cloud Shell)
> proberen helpt dus meestal niet. Test eerst of inloggen via de Garmin Connect-app
> of garmin.com zelf nog probleemloos werkt — zo niet, dan is het account zelf
> geblokkeerd (vaak op te lossen door het wachtwoord te wijzigen, wat de
> serverside sessie reset) en niet iets dat dit script kan omzeilen.
> De **dagelijkse sync** gebruikt enkel de opgeslagen token (geen login-endpoint)
> en is hier dus niet door geraakt.

Volledige geschiedenis inladen (optioneel, eenmalig):
```bash
python -m garmin.backfill --start 2023-01-01
```

---

## 8. DEEL F — Installeren op je iPhone + push + anti-scroll

**App op je beginscherm (verplicht voor push op iOS):**
1. Open `https://personnal-agenda.web.app` in **Safari**.
2. Deel-knop → **Zet op beginscherm** → **Voeg toe**.
3. Open de app **vanaf het beginscherm** (niet meer via Safari).
4. Ga naar **Beheer → Meldingen → “Meldingen activeren”** en sta toe.

**Anti-scroll (een app kan je iPhone niet zelf blokkeren — dit doe je één keer):**
- **Schermtijd**: Instellingen → Schermtijd → **App-limieten** → limiet op sociale
  media (bv. 30 min). En **Stilte voor het slapengaan** instellen.
- **Focus**: Instellingen → Focus → **Slaap**/**Persoonlijk** → blokkeer afleidende
  apps in de avond. De app stuurt je rond die uren **nudges** als extra duwtje.

---

## 9. DEEL G — Je iPhone-agenda koppelen (ICS)

Zo komen je afspraken én **RSCA-matchen** automatisch in je planning. Je kan
**meerdere agenda’s** koppelen (bv. je eigen agenda + de matchkalender).

**Stap 1 — je eigen iCloud-agenda openbaar maken (op de iPhone):**
1. Open de **Agenda**-app.
2. Tik onderaan op **Agenda’s**.
3. Tik op de **ⓘ** (info-knop) naast de agenda die je wil delen.
   *(Let op: dit werkt enkel voor agenda’s die je zélf in iCloud bezit, niet voor
   agenda’s waarop je geabonneerd bent.)*
4. Zet **Openbare agenda** aan.
5. Tik **Deel link** → **Kopieer link**. Die ziet er zo uit:
   `webcal://p##-caldav.icloud.com/published/2/...`

**Stap 2 — in de app plakken:**
1. **Beheer → Dagritme & agenda → iPhone-agenda — ICS-links**.
2. Plak de link. Meerdere agenda’s? Zet elke link **op een nieuwe lijn**.
3. Verlaat het veld (het bewaart automatisch).

**RSCA-matchen:** zoek de **openbare ICS-link** van de matchkalender (vaak een
`https://…/calendar.ics`) en plak die op een aparte lijn. Vind je geen aparte
RSCA-link? Maak dan in iCloud een eigen agenda “Voetbal”, abonneer/zet de matchen
erin, en deel díe agenda zoals in stap 1.

**Stap 3 — automatisch:** de Cloud Function `icsSync` leest alle links elke 3 uur
in (alleen-lezen) en dedupliceert. Herhalende afspraken (wekelijks/maandelijks)
worden 60 dagen vooruit uitgeklapt.

---

## 10. Dagelijks gebruik

1. **Zondag**: open **Week** en tik per dag je werkmodus aan (thuis / kantoor-auto
   / kantoor-fiets / vrij). Vink **Vakantie** aan tijdens schoolvakanties.
2. **Elke ochtend**: je krijgt een **briefing** + **readiness-check**. Doe je
   **check-in** (Gezondheid) als je pijn/vermoeidheid voelt — de planning houdt er
   rekening mee.
3. **Doorheen de dag**: vink blokken/taken af op **Vandaag**. Je ziet je
   voortgang en streaks groeien.
4. **Aanpassen?** Alles staat in **Beheer** en **Taken** — geen code nodig.

---

## 11. Alles gratis houden

- **Budgetalarm**: <https://console.cloud.google.com/billing> → **Budgets &
  alerts** → nieuw budget van bv. **€1**, alert op 50/90/100%. Je krijgt een mail
  lang voordat er echt iets kost.
- De gebruikte diensten vallen ruim binnen de **gratis tier** voor één gebruiker:
  Firestore (50k leesacties/dag), Functions (2M aanroepen/maand), Hosting (10 GB),
  FCM (gratis), Open-Meteo (gratis), Brevo (300 mails/dag).
- De dispatcher draait elke 10 min = ±4.300 aanroepen/maand → verwaarloosbaar.

---

## 12. Problemen oplossen

| Probleem | Oplossing |
|---|---|
| **Actions-deploy faalt: “API not enabled”** | Schakel de ontbrekende API uit A7 in en herstart de workflow. |
| **Geen push op iPhone** | App moet vanaf het **beginscherm** geopend zijn (niet Safari), iOS 16.4+, meldingen toegestaan in Beheer. |
| **Gezondheidswidget blijft leeg** | `FIRESTORE_USER_ID` moet exact je Auth-UID zijn (A4). Draai daarna **Garmin Daily Sync** handmatig. |
| **Functions deployen niet** | Controleer **Cloud Scheduler/Eventarc/Pub-Sub/Cloud Run**-API’s (A7) en dat je op **Blaze** zit. |
| **Mails komen niet aan** | Check de **Trigger Email**-extensie-logs en je SMTP-gegevens; kijk in spam. |
| **Lege pagina na deploy** | Eén van de `VITE_FB_*` in `ENV_LOCAL` ontbreekt/typo. Corrigeer de secret en deploy opnieuw. |
| **Agenda verschijnt niet** | Is de ICS-link openbaar/gedeeld? `icsSync` draait elke 3 uur; even geduld. |

---

*Gemaakt om jouw leven structuur te geven — sport, werk en rust in balans. 💪*

```

## `firebase.json`

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "runtime": "nodejs22",
      "ignore": ["node_modules", ".git", "*.log"]
    }
  ],
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      {
        "source": "/firebase-messaging-sw.js",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      },
      {
        "source": "**/*.@(js|css|woff2|png|svg)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      }
    ]
  }
}

```

## `firestore.indexes.json`

```json
{
  "indexes": [
    {
      "collectionGroup": "taken",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "actief", "order": "ASCENDING" },
        { "fieldPath": "volgorde", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}

```

## `firestore.rules`

```rules
rules_version = '2';

// =========================================================================
//  Personal Agenda — Firestore-beveiligingsregels
//
//  Alles leeft onder users/{userId}. Enkel de ingelogde eigenaar mag zijn
//  eigen data lezen. De eigenaar mag het meeste zelf schrijven vanuit de app
//  (planning, taken, instellingen, ...). Een paar collecties worden ENKEL
//  server-side geschreven door de Garmin-pipeline en de Cloud Functions
//  (Admin SDK omzeilt deze regels): die zetten we op write:false zodat de
//  browser ze nooit kan overschrijven.
// =========================================================================
service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);

      // --- Server-only collecties (Admin SDK schrijft, client leest) ---
      match /garminDaily/{doc} {
        allow read: if isOwner(userId);
        allow write: if false;
      }
      match /garminActivities/{doc} {
        allow read: if isOwner(userId);
        allow write: if false;
      }
      match /agendaEvents/{doc} {
        allow read: if isOwner(userId);
        allow write: if false;
      }
      match /weer/{doc} {
        allow read: if isOwner(userId);
        allow write: if false;
      }
      match /dagAdvies/{doc} {
        allow read: if isOwner(userId);
        allow write: if false;
      }

      // --- Door de eigenaar beheerd vanuit de app ---
      match /instellingen/{doc}      { allow read, write: if isOwner(userId); }
      match /weken/{doc}             { allow read, write: if isOwner(userId); }
      match /blokTemplates/{doc}     { allow read, write: if isOwner(userId); }
      match /taken/{doc}             { allow read, write: if isOwner(userId); }
      match /takenLog/{doc}          { allow read, write: if isOwner(userId); }
      match /reva/{doc}              { allow read, write: if isOwner(userId); }
      match /blessures/{doc}         { allow read, write: if isOwner(userId); }
      match /maaltijden/{doc}        { allow read, write: if isOwner(userId); }
      match /vakanties/{doc}         { allow read, write: if isOwner(userId); }
      match /doelen/{doc}            { allow read, write: if isOwner(userId); }
      match /activiteitLog/{doc}     { allow read, write: if isOwner(userId); }
      match /dagen/{doc}             { allow read, write: if isOwner(userId); }
      match /pushTokens/{doc}        { allow read, write: if isOwner(userId); }

      // Vangnet: overige subcollecties enkel leesbaar door de eigenaar.
      match /{document=**} {
        allow read: if isOwner(userId);
        allow write: if false;
      }
    }

    // De "mail"-collectie wordt door Cloud Functions (Admin SDK) gevuld en door
    // de Trigger-Email-extensie verstuurd. De browser mag er niet bij.
    match /mail/{doc} {
      allow read, write: if false;
    }
  }
}

```

## `storage.rules`

```rules
rules_version = '2';

// Personal Agenda gebruikt voorlopig geen bestandsuploads. We houden Storage
// dicht: enkel de ingelogde eigenaar kan bij een eigen map, niemand anders.
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}

```

## `package.json`

```json
{
  "name": "personal-agenda",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node scripts/generateMessagingSw.mjs && vite",
    "build": "node scripts/generateMessagingSw.mjs && vite build",
    "preview": "vite preview",
    "gen:sw": "node scripts/generateMessagingSw.mjs",
    "test": "vitest run"
  },
  "dependencies": {
    "date-fns": "^3.6.0",
    "firebase": "^10.14.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "playwright-core": "^1.49.1",
    "vite": "^5.4.19",
    "vite-plugin-pwa": "^0.20.5",
    "vitest": "^4.1.9"
  }
}

```

## `vite.config.js`

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// De PWA-naam komt uit een env-var zodat alles in-app/secret beheerbaar blijft.
const APP_NAAM = process.env.VITE_APP_NAAM || 'Personal Agenda';
const THEME_COLOR = process.env.VITE_THEME_COLOR || '#0b1120';

// Build-stempel in Belgische tijd (niet UTC) zodat het uur klopt in de app.
const BUILD_STAMP = new Intl.DateTimeFormat('nl-BE', {
  timeZone: 'Europe/Brussels', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date());

export default defineConfig({
  server: { port: 3000, host: true },
  // Build-stempel zodat we in-app kunnen zien welke versie effectief draait.
  define: {
    __BUILD_TIME__: JSON.stringify(BUILD_STAMP),
  },
  plugins: [
    react(),
    VitePWA({
      // autoUpdate: nieuwe versies activeren vanzelf (geen 'tik om te vernieuwen'
      // die op iOS-PWA vaak nooit verschijnt → anders blijf je op een oude build).
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      // Wij leveren zelf de firebase-messaging service worker; de PWA-SW draait
      // los daarvan voor offline caching van de app-schil.
      manifest: {
        name: APP_NAAM,
        short_name: APP_NAAM,
        description: 'Persoonlijke agenda, planning en gezondheid',
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/__/, /firebase-messaging-sw\.js$/],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Neem direct over zodat de nieuwste app-versie meteen draait.
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});

```

## `index.html`

```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0b1120" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <title>Personal Agenda</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```

## `requirements.txt`

```txt
# Garmin -> Firestore sync pipeline
garminconnect>=0.3.6
curl_cffi
ua-generator
firebase-admin>=6.5.0
python-dotenv>=1.0.1

```

## `functions/index.js`

```js
// =========================================================================
//  Personal Agenda — Cloud Functions
//   - dispatcher: elke 10 min push (slot-herinneringen, ochtend/avond,
//     readiness-check, anti-scroll nudges) — respecteert stil-uren/intensiteit
//   - icsSync: leest de iPhone-agenda (ICS-link) -> agendaEvents
//   - weerSync: Open-Meteo -> weer/{datum} (voor fietsadvies)
//   - weekMail: wekelijkse samenvatting via Trigger-Email-extensie
//  Alles draait per gebruiker (meervoudig veilig, ook al ben jij de enige).
// =========================================================================
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { parseIcs, icsDiagnose } = require('./lib/ics');

admin.initializeApp();
const db = admin.firestore();
const REGIO = 'europe-west1';

// ---- Tijd in Europe/Brussels ----
function brussel(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('nl-BE', {
    timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const map = { ma: 'ma', di: 'di', wo: 'wo', do: 'do', vr: 'vr', za: 'za', zo: 'zo' };
  const wk = { Mon: 'ma', Tue: 'di', Wed: 'wo', Thu: 'do', Fri: 'vr', Sat: 'za', Sun: 'zo' };
  const hhmm = `${p.hour}:${p.minute}`;
  return {
    datum: `${p.year}-${p.month}-${p.day}`,
    hhmm,
    minuten: parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10),
    dagKort: wk[p.weekday] || map[p.weekday] || 'ma',
  };
}
const toMin = (s) => (s ? (+s.split(':')[0]) * 60 + (+s.split(':')[1]) : null);

// Stil-uur (over middernacht): true als push NIET mag.
function isStil(min, vanStr, totStr) {
  const van = toMin(vanStr), tot = toMin(totStr);
  if (van == null || tot == null) return false;
  return van > tot ? (min >= van || min < tot) : (min >= van && min < tot);
}

async function actieveTokens(uid) {
  const snap = await db.collection('users').doc(uid).collection('pushTokens').where('actief', '==', true).get();
  return snap.docs.map((d) => d.id);
}

async function stuurPush(uid, tokens, titel, body, data = {}) {
  if (!tokens.length) return;
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title: titel, body },
    data: Object.fromEntries(Object.entries({ url: '/', ...data }).map(([k, v]) => [k, String(v)])),
    webpush: { fcmOptions: { link: data.url || '/' }, notification: { icon: '/icons/icon-192.png' } },
  });
  // Ruim dode tokens op.
  res.responses.forEach((r, i) => {
    if (!r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(r.error?.code)) {
      db.collection('users').doc(uid).collection('pushTokens').doc(tokens[i]).set({ actief: false }, { merge: true }).catch(() => {});
    }
  });
}

// Onthoudt welke meldingen al verstuurd zijn (per dag) om dubbels te vermijden.
async function alGestuurd(uid, datum, sleutel) {
  const ref = db.collection('users').doc(uid).collection('dagen').doc(datum);
  const snap = await ref.get();
  const log = snap.exists ? (snap.data().pushLog || {}) : {};
  if (log[sleutel]) return true;
  await ref.set({ pushLog: { [sleutel]: true } }, { merge: true });
  return false;
}

async function getInstellingen(uid) {
  const out = {};
  for (const r of ['algemeen', 'werk', 'push', 'gezondheid']) {
    const s = await db.collection('users').doc(uid).collection('instellingen').doc(r).get();
    out[r] = s.exists ? s.data() : {};
  }
  return out;
}

// ---- Lijst van gebruikers (met minstens één actief token) ----
async function gebruikersMetPush() {
  const snap = await db.collection('users').get();
  const ids = [];
  for (const d of snap.docs) {
    const t = await d.ref.collection('pushTokens').where('actief', '==', true).limit(1).get();
    if (!t.empty) ids.push(d.id);
  }
  return ids;
}

// =========================================================================
//  DISPATCHER — elke 10 minuten
// =========================================================================
exports.dispatcher = onSchedule(
  { schedule: 'every 10 minutes', timeZone: 'Europe/Brussels', region: REGIO },
  async () => {
    const nu = brussel();
    const venster = 10; // minuten
    const due = (t) => { const m = toMin(t); return m != null && nu.minuten >= m && nu.minuten < m + venster; };

    for (const uid of await gebruikersMetPush()) {
      const I = await getInstellingen(uid);
      const push = I.push || {};
      if (isStil(nu.minuten, push.stilVan || '22:45', push.stilTot || '06:30')) continue;
      // Globale snooze: alle push gepauzeerd tot snoozeTot.
      if (push.snoozeTot && Date.parse(push.snoozeTot) > Date.now()) continue;
      const cat = push.categorieen || {};
      const tokens = await actieveTokens(uid);
      if (!tokens.length) continue;
      const intensiteit = push.intensiteit || 'elk_blok';

      // 1) Ochtendbriefing
      if (cat.ochtend !== false && due(push.ochtendBriefing || '07:00') && !(await alGestuurd(uid, nu.datum, 'ochtend'))) {
        const plan = await getPlan(uid, nu.datum);
        const eerste = plan.find((b) => toMin(b.start) >= nu.minuten);
        await stuurPush(uid, tokens, 'Goeiemorgen ☀️',
          plan.length ? `${plan.length} blokken vandaag. Eerst: ${eerste ? eerste.titel + ' om ' + eerste.start : 'rustige dag'}.`
            : 'Open de app om je dag te plannen.');
      }

      // 2) Readiness-check
      if (cat.readiness !== false && due(push.readinessCheck || '07:15') && !(await alGestuurd(uid, nu.datum, 'readiness'))) {
        const g = await garminVan(uid, nu.datum);
        const body = g
          ? `Slaap ${g.slaap ?? '?'}u · readiness ${g.readiness ?? '?'}/100. ${g.readiness != null && g.readiness < 40 ? 'Kies vandaag herstel.' : 'Plan je training gerust.'}`
          : 'Hoe voel je je vandaag? Doe je check-in in de app.';
        await stuurPush(uid, tokens, 'Klaar om te trainen? 🏋️', body, { url: '/gezondheid' });
      }

      // 2b) Blessure-afloop niet stil laten verlopen: als een blessure een
      // verstreken einddatum heeft maar nog niet bevestigd is in de app,
      // stuur een herinnering (anders ziet de gebruiker dit pas als hij
      // toevallig Gezondheid opent).
      if (cat.ochtend !== false && due(push.ochtendBriefing || '07:00')) {
        const blessuresSnap = await db.collection('users').doc(uid).collection('blessures').get();
        for (const doc of blessuresSnap.docs) {
          const b = doc.data();
          if (b.actief === false || !b.eindDatum || b.eindDatum >= nu.datum || b.eindeGemeld) continue;
          const sl = `blessure-afloop-${doc.id}`;
          if (await alGestuurd(uid, nu.datum, sl)) continue;
          await stuurPush(uid, tokens, 'Blessure-update nodig',
            `"${b.titel || b.naam || 'Blessure'}" liep af op ${b.eindDatum} — bevestig in de app of zet ze terug actief.`,
            { url: '/gezondheid' });
        }
      }

      // 3) Per-slot herinneringen
      if (intensiteit !== 'minimaal' && cat.slot !== false) {
        const plan = await getPlan(uid, nu.datum);
        for (const b of plan) {
          if (b.push === false) continue;
          if (intensiteit === 'sleutel' && !b.sleutel) continue;
          if (!due(b.start)) continue;
          const sl = `slot-${b.id}`;
          if (await alGestuurd(uid, nu.datum, sl)) continue;
          await stuurPush(uid, tokens, b.titel, `${b.start}–${b.eind}${b.detail ? ' · ' + b.detail : ''}`);
        }
      }

      // 4) Avondvooruitblik
      if (cat.avond !== false && due(push.avondVooruitblik || '21:30') && !(await alGestuurd(uid, nu.datum, 'avond'))) {
        const morgen = volgendeDatum(nu.datum);
        const evs = await db.collection('users').doc(uid).collection('agendaEvents').where('datum', '==', morgen).get();
        await stuurPush(uid, tokens, 'Vooruitblik morgen 🌙',
          `${evs.size ? evs.size + ' afspra(a)k(en) in je agenda. ' : ''}Leg je telefoon weg en rust goed.`, { url: '/week' });
      }

      // 5) Anti-scroll nudges (elk half uur binnen het venster)
      if (push.antiScrollNudges && cat.antiscroll !== false &&
          binnenVenster(nu.minuten, push.antiScrollVan || '21:00', push.antiScrollTot || '23:30') &&
          nu.minuten % 30 < venster) {
        const sl = `scroll-${nu.hhmm}`;
        if (!(await alGestuurd(uid, nu.datum, sl))) {
          await stuurPush(uid, tokens, 'Even loskoppelen 📵', 'Tijd om te stoppen met scrollen. Lezen, stretchen of slapen?');
        }
      }
    }
  }
);

function binnenVenster(min, vanStr, totStr) {
  const van = toMin(vanStr), tot = toMin(totStr);
  if (van == null || tot == null) return false;
  return van > tot ? (min >= van || min < tot) : (min >= van && min < tot);
}
function volgendeDatum(datum) {
  const d = new Date(datum + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Leest het door de app weggeschreven dagplan (blokken).
async function getPlan(uid, datum) {
  const snap = await db.collection('users').doc(uid).collection('dagen').doc(datum).get();
  return snap.exists ? (snap.data().plan || []) : [];
}

async function garminVan(uid, datum) {
  const snap = await db.collection('users').doc(uid).collection('garminDaily').doc(datum).get();
  if (!snap.exists) return null;
  const g = snap.data();
  const tr = Array.isArray(g.trainingReadiness) ? g.trainingReadiness[0] : g.trainingReadiness;
  const slaapSec = g.sleep?.dailySleepDTO?.sleepTimeSeconds;
  return {
    readiness: tr?.score ?? null,
    slaap: slaapSec ? (slaapSec / 3600).toFixed(1) : null,
  };
}

// Leest alle ICS-links van één gebruiker in en schrijft agendaEvents.
// Geeft een status terug (per link het aantal of de fout) + bewaart die status.
async function syncGebruikerAgenda(userRef) {
  const alg = (await userRef.collection('instellingen').doc('algemeen').get()).data() || {};
  const urls = String(alg.icsUrl || '')
    .split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
    .map((u) => u.replace(/^webcal:\/\//i, 'https://'));

  const perLink = [];
  let events = [];
  let diagnose = [];
  for (const url of urls) {
    const kort = url.replace(/^https?:\/\//, '').slice(0, 40);
    try {
      const res = await fetch(url);
      if (!res.ok) { perLink.push({ link: kort, fout: `HTTP ${res.status}` }); continue; }
      const tekst = await res.text();
      const n = parseIcs(tekst);
      events.push(...n);
      if (diagnose.length < 6) diagnose.push(...icsDiagnose(tekst, 4));
      perLink.push({ link: kort, aantal: n.length });
    } catch (e) {
      perLink.push({ link: kort, fout: e.message });
    }
  }
  diagnose = diagnose.slice(0, 6);

  // Ontdubbel op uid.
  const gezien = new Set();
  events = events.filter((e) => (gezien.has(e.uid) ? false : gezien.add(e.uid)));

  const col = userRef.collection('agendaEvents');
  const vandaag = brussel().datum;
  const toekomst = events.filter((e) => e.datum >= vandaag).slice(0, 300);
  const oud = await col.where('datum', '>=', vandaag).get();
  const batch = db.batch();
  oud.forEach((d) => batch.delete(d.ref));
  toekomst.forEach((e) => batch.set(col.doc(e.uid.replace(/[^A-Za-z0-9_-]/g, '_')), e));
  await batch.commit();

  // Steekproef van wat er nét is weggeschreven (zo zien we de opgeslagen tijd).
  const opgeslagen = toekomst.slice(0, 6).map((e) => ({
    titel: (e.titel || '').slice(0, 40), datum: e.datum, start: e.start, eind: e.eind,
  }));
  // Serverklok (Brussel) ter controle of de functie-omgeving de juiste tijd heeft.
  const nu = brussel();

  const status = {
    aantal: toekomst.length, perLink, links: urls.length,
    op: admin.firestore.FieldValue.serverTimestamp(),
  };
  await userRef.collection('instellingen').doc('agendaStatus').set(status, { merge: true });
  return {
    aantal: toekomst.length, perLink, links: urls.length,
    diagnose, opgeslagen, serverTijd: `${nu.datum} ${nu.hhmm}`,
  };
}

// =========================================================================
//  ICS-SYNC — elke 3 uur (alle gebruikers)
// =========================================================================
exports.icsSync = onSchedule(
  { schedule: 'every 3 hours', timeZone: 'Europe/Brussels', region: REGIO },
  async () => {
    const snap = await db.collection('users').get();
    for (const userDoc of snap.docs) {
      try {
        const r = await syncGebruikerAgenda(userDoc.ref);
        if (r.links) console.log('ICS gesynct', userDoc.id, r.aantal, 'events');
      } catch (e) {
        console.warn('ICS-sync fout', userDoc.id, e.message);
      }
    }
  }
);

// Directe sync op verzoek vanuit de app ("Agenda nu inlezen").
exports.syncAgendaNu = onCall({ region: REGIO }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Aanmelden vereist.');
  return await syncGebruikerAgenda(db.collection('users').doc(uid));
});

// =========================================================================
//  WEER-SYNC — dagelijks 05:30 (Open-Meteo, geen sleutel nodig)
// =========================================================================
exports.weerSync = onSchedule(
  { schedule: '30 5 * * *', timeZone: 'Europe/Brussels', region: REGIO },
  async () => {
    const snap = await db.collection('users').get();
    for (const userDoc of snap.docs) {
      const alg = (await userDoc.ref.collection('instellingen').doc('algemeen').get()).data() || {};
      const lat = alg.lat || 50.85, lon = alg.lon || 4.35;
      try {
        const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_probability_max,wind_speed_10m_max,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBrussels&forecast_days=3`;
        const res = await fetch(u);
        if (!res.ok) continue;
        const d = await res.json();
        (d.daily?.time || []).forEach((datum, i) => {
          userDoc.ref.collection('weer').doc(datum).set({
            datum,
            neerslagKans: d.daily.precipitation_probability_max?.[i] ?? null,
            windKmh: Math.round(d.daily.wind_speed_10m_max?.[i] ?? 0),
            tMax: d.daily.temperature_2m_max?.[i] ?? null,
            tMin: d.daily.temperature_2m_min?.[i] ?? null,
          }, { merge: true });
        });
      } catch (e) {
        console.warn('Weer-sync fout', userDoc.id, e.message);
      }
    }
  }
);

// =========================================================================
//  WEEKMAIL — zondag 19:00 via Trigger-Email-extensie (collectie "mail")
//  De afzendernaam (= app-naam) stel je in de extensie in (zie README).
// =========================================================================
exports.weekMail = onSchedule(
  { schedule: '0 19 * * 0', timeZone: 'Europe/Brussels', region: REGIO },
  async () => {
    const snap = await db.collection('users').get();
    for (const userDoc of snap.docs) {
      const u = userDoc.data();
      if (!u?.email) continue;
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;color:#0b1120">
          <h2>Je week in vogelvlucht</h2>
          <p>Een nieuwe week begint. Bekijk je planning, plan je trainingen rond je herstel,
          en hou je gewoontes vol. Je kan alles aanpassen in de app.</p>
          <p style="color:#64748b;font-size:13px">Verstuurd door Personal Agenda.</p>
        </div>`;
      await db.collection('mail').add({
        to: [u.email],
        message: { subject: 'Personal Agenda — je week', html },
        aangemaakt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);

```

## `functions/lib/ics.js`

```js
// Minimale ICS-parser: haalt VEVENTs (SUMMARY, DTSTART, DTEND) eruit.
// Geen RRULE-expansie (Fase 1) — losse afspraken en matchen volstaan.

function unfold(text) {
  // Gevouwen regels (volgende regel begint met spatie/tab) samenvoegen.
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

const pad = (n) => String(n).padStart(2, '0');

// "20240615T194500Z" (UTC) / "20240615T194500" (wandklok/TZID-lokaal) / "20240615" (hele dag).
// De cijfers komen altijd in de UTC-velden; wallClock geeft aan of het al de
// te tonen lokale tijd is (geen Z) of een echt UTC-instant (met Z).
function parseDt(waarde) {
  if (!waarde) return null;
  const m = waarde.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?/);
  if (!m) return null;
  const [, y, mo, d, hh = '00', mm = '00', ss = '00', z] = m;
  const allDay = !waarde.includes('T');
  const date = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss || 0));
  return { date, allDay, wallClock: !z };
}

// Naar te tonen datum/uur. Wandklok = cijfers zoals ze zijn; UTC-instant = naar Brussel.
function fmtDt(date, wallClock) {
  if (wallClock) {
    return {
      datum: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
      tijd: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`,
    };
  }
  const fmt = new Intl.DateTimeFormat('nl-BE', {
    timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { datum: `${p.year}-${p.month}-${p.day}`, tijd: `${p.hour}:${p.minute}` };
}

function parseIcs(text) {
  const events = [];
  const blocks = unfold(text).split('BEGIN:VEVENT').slice(1);
  for (const b of blocks) {
    const body = b.split('END:VEVENT')[0];
    const veld = (naam) => {
      const re = new RegExp(`(?:^|\\n)${naam}(?:;[^:\\n]*)?:(.*)`);
      const m = body.match(re);
      return m ? m[1].trim() : null;
    };
    const summary = (veld('SUMMARY') || '').replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
    const dtStart = parseDt(veld('DTSTART'));
    const dtEnd = parseDt(veld('DTEND'));
    if (!summary || !dtStart) continue;
    const baseUid = (veld('UID') || `${summary}`).slice(0, 100);
    const duurMs = dtEnd ? (dtEnd.date.getTime() - dtStart.date.getTime()) : 0;
    const rrule = veld('RRULE');

    const maakEvent = (startDate) => {
      const s = fmtDt(startDate, dtStart.wallClock);
      const e = duurMs ? fmtDt(new Date(startDate.getTime() + duurMs), dtStart.wallClock) : null;
      events.push({
        titel: summary,
        datum: s.datum,
        start: dtStart.allDay ? '00:00' : s.tijd,
        eind: e ? e.tijd : null,
        allDay: dtStart.allDay,
        uid: `${baseUid}-${s.datum}`.slice(0, 120),
      });
    };

    if (rrule) {
      // Herhalende afspraak: uitklappen voor de komende ~60 dagen.
      const now = new Date();
      const winStart = new Date(now.getTime() - 86400000);
      const winEnd = new Date(now.getTime() + 60 * 86400000);
      const occ = expandRrule(dtStart.date, parseRruleStr(rrule), winStart, winEnd);
      occ.slice(0, 60).forEach(maakEvent);
    } else {
      maakEvent(dtStart.date);
    }
  }
  return events;
}

function parseRruleStr(s) {
  const o = {};
  (s || '').split(';').forEach((p) => {
    const [k, v] = p.split('=');
    if (k) o[k.trim().toUpperCase()] = (v || '').trim();
  });
  return o;
}

// Basis-RRULE-expansie: DAILY / WEEKLY(BYDAY) / MONTHLY, met INTERVAL/COUNT/UNTIL.
function expandRrule(base, rrule, winStart, winEnd) {
  const freq = (rrule.FREQ || '').toUpperCase();
  const interval = Math.max(1, parseInt(rrule.INTERVAL || '1', 10));
  const count = rrule.COUNT ? parseInt(rrule.COUNT, 10) : null;
  const until = rrule.UNTIL ? parseDt(rrule.UNTIL).date : null;
  const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const byday = rrule.BYDAY
    ? rrule.BYDAY.split(',').map((d) => dayMap[d.slice(-2).toUpperCase()]).filter((n) => n != null)
    : null;

  const hh = base.getUTCHours(), mm = base.getUTCMinutes(), ss = base.getUTCSeconds();
  const baseDay = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate());
  const occ = [];
  let made = 0;
  let dayMs = baseDay;
  for (let k = 0; k < 800; k++) {
    if (dayMs > winEnd.getTime()) break;
    if (until && dayMs > until.getTime()) break;
    if (count && made >= count) break;
    const diffDays = Math.round((dayMs - baseDay) / 86400000);
    const d = new Date(dayMs);
    let match = false;
    if (diffDays >= 0) {
      if (freq === 'DAILY') match = diffDays % interval === 0;
      else if (freq === 'WEEKLY') {
        const weekIdx = Math.floor(diffDays / 7);
        match = byday
          ? (weekIdx % interval === 0 && byday.includes(d.getUTCDay()))
          : (diffDays % (7 * interval) === 0);
      } else if (freq === 'MONTHLY') {
        const mDiff = (d.getUTCFullYear() - base.getUTCFullYear()) * 12 + (d.getUTCMonth() - base.getUTCMonth());
        match = d.getUTCDate() === base.getUTCDate() && mDiff >= 0 && mDiff % interval === 0;
      } else {
        match = diffDays === 0;
      }
    }
    if (match) {
      const occDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm, ss));
      if (occDate.getTime() >= winStart.getTime()) occ.push(occDate);
      made++;
    }
    dayMs += 86400000;
  }
  return occ;
}

// Diagnose: toont per afspraak de ruwe DTSTART-regel + wat wij ervan maken.
// Zo zien we meteen of de bron Z (UTC), TZID of een zwevende tijd geeft, en
// welke datum/tijd wij opslaan. max beperkt het aantal voorbeelden.
function icsDiagnose(text, max = 6) {
  const uit = [];
  const blocks = unfold(text).split('BEGIN:VEVENT').slice(1);
  for (const b of blocks) {
    if (uit.length >= max) break;
    const body = b.split('END:VEVENT')[0];
    const veld = (naam) => {
      const re = new RegExp(`(?:^|\\n)${naam}(?:;[^:\\n]*)?:(.*)`);
      const m = body.match(re);
      return m ? m[1].trim() : null;
    };
    const ruweRegel = (naam) => {
      const re = new RegExp(`(?:^|\\n)(${naam}(?:;[^:\\n]*)?:[^\\n\\r]*)`);
      const m = body.match(re);
      return m ? m[1].trim() : null;
    };
    const dtStart = parseDt(veld('DTSTART'));
    if (!dtStart) continue;
    const s = fmtDt(dtStart.date, dtStart.wallClock);
    uit.push({
      titel: (veld('SUMMARY') || '').slice(0, 40),
      ruw: ruweRegel('DTSTART'),
      heeftZ: /\d{6}Z/.test(veld('DTSTART') || ''),
      wandklok: dtStart.wallClock,
      heleDag: dtStart.allDay,
      datum: s.datum,
      start: dtStart.allDay ? '00:00' : s.tijd,
    });
  }
  return uit;
}

module.exports = { parseIcs, icsDiagnose };

```

## `functions/package.json`

```json
{
  "name": "personal-agenda-functions",
  "description": "Cloud Functions voor Personal Agenda (push, ICS, weer, mail)",
  "private": true,
  "main": "index.js",
  "engines": { "node": "22.22.0" },
  "scripts": {
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "dependencies": {
    "firebase-admin": "^13.0.0",
    "firebase-functions": "^6.0.0"
  }
}

```

## `garmin/__init__.py`

```py
"""Garmin Connect -> Firestore sync pipeline.

Modules:
    config         Environment-driven configuration.
    auth           One-time interactive login -> reusable token blob.
    client         Builds an authenticated Garmin client (token-first).
    fetchers       Pulls a day of health data / activities, defensively.
    firestore_db   Firestore connection and document writers.
    sync_daily     Entry point for the daily scheduled sync.
    backfill       Loads a full historical date range via the API.
    import_export  Best-effort importer for Garmin's \"Export Your Data\" zip.
"""

__all__ = [
    "config",
    "auth",
    "client",
    "fetchers",
    "firestore_db",
]

```

## `garmin/auth.py`

```py
"""One-time interactive Garmin login.

Run locally:  python -m garmin.auth

It logs in (handling MFA), saves reusable tokens to GARMIN_TOKENSTORE, and
prints a base64 blob to paste into GARMIN_TOKENS_BASE64 -- locally in .env and
as a GitHub Actions secret. Tokens last ~6 months; re-run when they expire.
"""

import base64
import getpass
import io
import os
import tarfile

from garminconnect import Garmin

from . import config


def _tokens_to_base64(tokenstore: str) -> str:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as tar:
        tar.add(tokenstore, arcname=".")
    return base64.b64encode(buf.getvalue()).decode()


def main() -> None:
    email = config.GARMIN_EMAIL or input("Garmin email: ").strip()
    password = config.GARMIN_PASSWORD or getpass.getpass("Garmin password: ")

    garmin = Garmin(
        email,
        password,
        is_cn=config.GARMIN_IS_CN,
        prompt_mfa=lambda: input("MFA code (blank if none): ").strip(),
    )
    garmin.login()

    tokenstore = config.GARMIN_TOKENSTORE
    os.makedirs(tokenstore, exist_ok=True)
    garmin.client.dump(tokenstore)
    print(f"\nTokens saved to {tokenstore}")

    blob = _tokens_to_base64(tokenstore)
    print("\n=== GARMIN_TOKENS_BASE64 (store as a secret) ===\n")
    print(blob)
    print("\nAdd it to .env and to the repo's GitHub Actions secrets.")


if __name__ == "__main__":
    main()

```

## `garmin/auth_ci.py`

```py
"""CI-variant van de Garmin-login (geen interactieve prompts).

Draait in GitHub Actions. Leest GARMIN_EMAIL / GARMIN_PASSWORD (en optioneel
GARMIN_MFA) uit de omgeving, logt in en schrijft de base64-tokenblob naar
`garmin_token_b64.txt` (door de workflow geüpload als download-artifact).

Daarna plak je die inhoud in de secret GARMIN_TOKENS_BASE64.
"""

import base64
import io
import os
import tarfile

from garminconnect import Garmin

from . import config


def _tokens_to_base64(tokenstore: str) -> str:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as tar:
        tar.add(tokenstore, arcname=".")
    return base64.b64encode(buf.getvalue()).decode()


def main() -> None:
    email = config.GARMIN_EMAIL
    password = config.GARMIN_PASSWORD
    if not email or not password:
        raise SystemExit("Zet de secrets GARMIN_EMAIL en GARMIN_PASSWORD.")

    mfa = os.getenv("GARMIN_MFA", "").strip()

    garmin = Garmin(
        email,
        password,
        is_cn=config.GARMIN_IS_CN,
        # In CI komt de MFA-code uit een workflow-input; leeg = account zonder MFA.
        prompt_mfa=lambda: mfa,
    )
    # garmin.login() doorloopt zelf een 5-strategie-keten (mobile/widget/portal,
    # met TLS-impersonation) en raist pas als alle pogingen mislukken -- met een
    # duidelijke foutmelding (zie garminconnect.exceptions). Geen losse 429-check
    # nodig (en .garth bestaat niet meer op recente garminconnect-versies).
    garmin.login()

    tokenstore = config.GARMIN_TOKENSTORE
    os.makedirs(tokenstore, exist_ok=True)
    garmin.client.dump(tokenstore)

    blob = _tokens_to_base64(tokenstore)
    with open("garmin_token_b64.txt", "w", encoding="utf-8") as fh:
        fh.write(blob)
    print("OK — garmin_token_b64.txt geschreven (", len(blob), "tekens ).")


if __name__ == "__main__":
    main()

```

## `garmin/backfill.py`

```py
"""Backfill a full historical date range via the Garmin API.

    python -m garmin.backfill --start 2023-01-01 --end 2026-06-23
    python -m garmin.backfill --start 2023-01-01            # end = today
    python -m garmin.backfill --start 2023-01-01 --no-activities

Use this to seed Firestore with all history before the daily cron takes over.
A small delay between days keeps the API happy over long ranges.
"""

import argparse
import datetime as dt
import logging
import time

from . import client as client_mod
from . import fetchers, firestore_db

log = logging.getLogger(__name__)


def _daterange(start: dt.date, end: dt.date):
    day = start
    while day <= end:
        yield day
        day += dt.timedelta(days=1)


def run(
    start: str,
    end: str | None = None,
    with_activities: bool = True,
    delay: float = 0.7,
) -> None:
    garmin = client_mod.get_client()
    start_date = dt.date.fromisoformat(start)
    end_date = dt.date.fromisoformat(end) if end else dt.date.today()

    count = 0
    for day in _daterange(start_date, end_date):
        day_str = day.isoformat()
        doc = fetchers.fetch_day(garmin, day_str)
        firestore_db.write_daily(day_str, doc)
        count += 1
        if count % 25 == 0:
            log.info("... %d days written (through %s)", count, day_str)
        time.sleep(delay)
    log.info("daily backfill complete: %d days", count)

    if with_activities:
        activities = fetchers.fetch_activities(
            garmin, start_date.isoformat(), end_date.isoformat()
        )
        for activity in activities:
            activity_id = activity.get("activityId")
            if activity_id is None:
                continue
            firestore_db.write_activity(activity_id, activity)
        log.info("activities backfilled: %d", len(activities))


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill Garmin history")
    parser.add_argument("--start", required=True, help="Start date YYYY-MM-DD")
    parser.add_argument("--end", help="End date YYYY-MM-DD (default: today)")
    parser.add_argument(
        "--no-activities", action="store_true", help="Skip activity backfill"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.7,
        help="Seconds to wait between days (default: 0.7)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    run(
        start=args.start,
        end=args.end,
        with_activities=not args.no_activities,
        delay=args.delay,
    )


if __name__ == "__main__":
    main()

```

## `garmin/client.py`

```py
"""Builds an authenticated `garminconnect.Garmin` client.

Resolution order:
  1. A base64 token blob in GARMIN_TOKENS_BASE64 (preferred, MFA-proof, CI-safe).
  2. Existing token files in GARMIN_TOKENSTORE.
  3. Email + password (only works for accounts without MFA).
"""

import base64
import io
import logging
import os
import tarfile

from garminconnect import Garmin

from . import config

log = logging.getLogger(__name__)


def _restore_tokens(b64: str, dest: str) -> None:
    """Unpack a base64-encoded tar of the token directory into `dest`."""
    os.makedirs(dest, exist_ok=True)
    data = base64.b64decode(b64)
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as tar:
        tar.extractall(dest)


def _has_tokens(tokenstore: str) -> bool:
    if not os.path.isdir(tokenstore):
        return False
    return any(name.endswith(".json") for name in os.listdir(tokenstore))


def get_client() -> Garmin:
    tokenstore = config.GARMIN_TOKENSTORE

    if config.GARMIN_TOKENS_BASE64 and not _has_tokens(tokenstore):
        log.info("Restoring Garmin tokens from GARMIN_TOKENS_BASE64")
        _restore_tokens(config.GARMIN_TOKENS_BASE64, tokenstore)

    # 1 + 2: token-based login.
    if _has_tokens(tokenstore):
        try:
            garmin = Garmin()
            garmin.login(tokenstore)
            log.info("Authenticated with stored Garmin tokens")
            return garmin
        except Exception as exc:  # tokens expired / invalid
            log.warning("Token login failed (%s); trying credentials", exc)

    # 3: credential login (no MFA accounts only).
    if config.GARMIN_EMAIL and config.GARMIN_PASSWORD:
        garmin = Garmin(
            config.GARMIN_EMAIL,
            config.GARMIN_PASSWORD,
            is_cn=config.GARMIN_IS_CN,
        )
        garmin.login()
        try:
            garmin.client.dump(tokenstore)
            log.info("Saved fresh Garmin tokens to %s", tokenstore)
        except Exception:
            pass
        return garmin

    raise RuntimeError(
        "No Garmin credentials available. Run `python -m garmin.auth` to create "
        "a token blob, or set GARMIN_EMAIL / GARMIN_PASSWORD."
    )

```

## `garmin/config.py`

```py
"""Configuration loaded from environment variables (and an optional .env)."""

import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # python-dotenv not installed yet; env vars still work
    pass


def _expand(path: str | None) -> str | None:
    return os.path.expanduser(path) if path else path


# --- Garmin Connect ---
GARMIN_EMAIL = os.getenv("GARMIN_EMAIL")
GARMIN_PASSWORD = os.getenv("GARMIN_PASSWORD")
GARMIN_TOKENS_BASE64 = os.getenv("GARMIN_TOKENS_BASE64")
GARMIN_TOKENSTORE = _expand(os.getenv("GARMIN_TOKENSTORE")) or os.path.expanduser(
    "~/.garminconnect"
)
GARMIN_IS_CN = os.getenv("GARMIN_IS_CN", "false").lower() in ("1", "true", "yes")

# --- Firestore ---
FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
GOOGLE_APPLICATION_CREDENTIALS = _expand(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
FIRESTORE_PROJECT_ID = os.getenv("FIRESTORE_PROJECT_ID")
FIRESTORE_USER_ID = os.getenv("FIRESTORE_USER_ID", "default")

# Firestore collection names (under users/{FIRESTORE_USER_ID}).
DAILY_COLLECTION = os.getenv("FIRESTORE_DAILY_COLLECTION", "garminDaily")
ACTIVITIES_COLLECTION = os.getenv("FIRESTORE_ACTIVITIES_COLLECTION", "garminActivities")

```

## `garmin/fetchers.py`

```py
"""Defensive fetchers: a single failing Garmin endpoint never aborts a sync."""

import logging

log = logging.getLogger(__name__)


def _safe(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception as exc:
        log.warning("%s failed: %s", getattr(fn, "__name__", fn), exc)
        return None


def fetch_day(garmin, date_str: str) -> dict:
    """Pull one calendar day of wellness data. `date_str` is YYYY-MM-DD."""
    return {
        "date": date_str,
        # Daily roll-up: totalSteps, totalKilocalories, floors, etc.
        "summary": _safe(garmin.get_user_summary, date_str),
        "sleep": _safe(garmin.get_sleep_data, date_str),
        "heartRate": _safe(garmin.get_heart_rates, date_str),
        "restingHeartRate": _safe(garmin.get_rhr_day, date_str),
        "trainingReadiness": _safe(garmin.get_training_readiness, date_str),
        "trainingStatus": _safe(garmin.get_training_status, date_str),
        "stepsIntraday": _safe(garmin.get_steps_data, date_str),
        # Fase 3: profiel & lichaamsmetrieken voor de coach-laag.
        "bodyBattery": _safe(garmin.get_body_battery, date_str, date_str),
        "bodyComposition": _safe(garmin.get_body_composition, date_str, date_str),
        "maxMetrics": _safe(garmin.get_max_metrics, date_str),
        "hrv": _safe(garmin.get_hrv_data, date_str),
        # Statisch profiel (leeftijd/lengte/gewicht/geslacht); zelfde elke dag.
        "userProfile": _safe(garmin.get_user_profile),
    }


def fetch_activities(garmin, start_date: str, end_date: str) -> list:
    """Activities between two YYYY-MM-DD dates (inclusive)."""
    return _safe(garmin.get_activities_by_date, start_date, end_date) or []

```

## `garmin/firestore_db.py`

```py
"""Firestore connection and document writers.

Data model (single personal user):
    users/{FIRESTORE_USER_ID}/garminDaily/{YYYY-MM-DD}
    users/{FIRESTORE_USER_ID}/garminActivities/{activityId}

Credentials resolution:
    1. FIREBASE_SERVICE_ACCOUNT_JSON  (raw JSON string, used in CI)
    2. GOOGLE_APPLICATION_CREDENTIALS (path to a key file, used locally)
    3. Application Default Credentials (gcloud / workload identity)
"""

import json
import logging

import firebase_admin
from firebase_admin import credentials, firestore

from . import config

log = logging.getLogger(__name__)

_db = None


def _sanitize(value):
    """Firestore staat geen array-in-array toe (enkel maps in arrays).

    Garmin-intraday-reeksen (hartslag/HRV/stappen) komen terug als lijsten van
    lijsten, bv. [[timestamp, waarde], ...] -- die crashen de write met
    "Property array contains an invalid nested entity". Wrap geneste lijsten
    om tot maps (index -> waarde) zodat Firestore ze accepteert.
    """
    if isinstance(value, dict):
        return {k: _sanitize(v) for k, v in value.items()}
    if isinstance(value, list):
        sanitized = [_sanitize(v) for v in value]
        return [
            {str(i): item for i, item in enumerate(v)} if isinstance(v, list) else v
            for v in sanitized
        ]
    return value


def get_db():
    global _db
    if _db is not None:
        return _db

    if not firebase_admin._apps:
        cred = None
        if config.FIREBASE_SERVICE_ACCOUNT_JSON:
            cred = credentials.Certificate(
                json.loads(config.FIREBASE_SERVICE_ACCOUNT_JSON)
            )
        elif config.GOOGLE_APPLICATION_CREDENTIALS:
            cred = credentials.Certificate(config.GOOGLE_APPLICATION_CREDENTIALS)

        options = {}
        if config.FIRESTORE_PROJECT_ID:
            options["projectId"] = config.FIRESTORE_PROJECT_ID

        if cred is not None:
            firebase_admin.initialize_app(cred, options or None)
        else:
            firebase_admin.initialize_app(options=options or None)

    _db = firestore.client()
    return _db


def _user_doc():
    return get_db().collection("users").document(config.FIRESTORE_USER_ID)


def write_daily(date_str: str, data: dict) -> None:
    payload = _sanitize(data)
    payload["syncedAt"] = firestore.SERVER_TIMESTAMP
    _user_doc().collection(config.DAILY_COLLECTION).document(date_str).set(
        payload, merge=True
    )


def write_activity(activity_id, data: dict) -> None:
    payload = _sanitize(data)
    payload["syncedAt"] = firestore.SERVER_TIMESTAMP
    _user_doc().collection(config.ACTIVITIES_COLLECTION).document(
        str(activity_id)
    ).set(payload, merge=True)

```

## `garmin/import_export.py`

```py
"""Best-effort importer for Garmin's official \"Export Your Data\" archive.

Garmin lets you request a full data export at https://www.garmin.com/account/datamanagement/
which arrives as a zip (DI_CONNECT/...). The API backfill (garmin.backfill) is the
primary bulk loader; use this when you want the complete historic dump without
hitting the API day by day.

    python -m garmin.import_export --path ~/Downloads/DI_CONNECT.zip
    python -m garmin.import_export --path ~/Downloads/DI_CONNECT/

It walks the archive, recognises the common wellness / sleep / activity JSON
files, and writes them to Firestore keyed by their calendar date or activity id.
Garmin changes export layouts over time, so unknown files are logged and skipped
rather than guessed at.
"""

import argparse
import datetime as dt
import json
import logging
import os
import tempfile
import zipfile

from . import firestore_db

log = logging.getLogger(__name__)


def _iter_json_files(root: str):
    for dirpath, _dirs, files in os.walk(root):
        for name in files:
            if name.lower().endswith(".json"):
                yield os.path.join(dirpath, name)


def _load(path: str):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as exc:
        log.warning("could not parse %s: %s", path, exc)
        return None


def _date_from_epoch_ms(value):
    try:
        return dt.datetime.utcfromtimestamp(int(value) / 1000).date().isoformat()
    except Exception:
        return None


def _import_sleep(records):
    n = 0
    for rec in records if isinstance(records, list) else []:
        date = rec.get("calendarDate") or rec.get("sleepStartTimestampLocal")
        if isinstance(date, str):
            date = date[:10]
        if not date:
            continue
        firestore_db.write_daily(date, {"date": date, "sleep": rec})
        n += 1
    return n


def _import_wellness(records):
    n = 0
    for rec in records if isinstance(records, list) else []:
        date = rec.get("calendarDate")
        if not date:
            continue
        firestore_db.write_daily(date[:10], {"date": date[:10], "summary": rec})
        n += 1
    return n


def _import_activities(records):
    n = 0
    for rec in records if isinstance(records, list) else []:
        activity_id = rec.get("activityId")
        if activity_id is None:
            continue
        firestore_db.write_activity(activity_id, rec)
        n += 1
    return n


def _classify_and_import(path: str) -> int:
    name = os.path.basename(path).lower()
    data = _load(path)
    if data is None:
        return 0

    # Garmin nests the list under the file name key in some exports.
    if isinstance(data, dict):
        for value in data.values():
            if isinstance(value, list):
                data = value
                break

    if "sleep" in name:
        return _import_sleep(data)
    if "uds" in name or "wellness" in name or "dailysummary" in name:
        return _import_wellness(data)
    if "activit" in name or "summarizedactivities" in name:
        return _import_activities(data)

    log.info("skipped unrecognised file: %s", os.path.basename(path))
    return 0


def run(path: str) -> None:
    cleanup = None
    root = path
    if path.lower().endswith(".zip"):
        cleanup = tempfile.mkdtemp(prefix="garmin_export_")
        with zipfile.ZipFile(path) as zf:
            zf.extractall(cleanup)
        root = cleanup
        log.info("extracted export to %s", root)

    total = 0
    for json_path in _iter_json_files(root):
        total += _classify_and_import(json_path)
    log.info("import complete: %d records written", total)

    if cleanup:
        log.info("temporary files left in %s (safe to delete)", cleanup)


def main() -> None:
    parser = argparse.ArgumentParser(description="Import a Garmin data export")
    parser.add_argument(
        "--path", required=True, help="Path to the export .zip or extracted folder"
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    run(args.path)


if __name__ == "__main__":
    main()

```

## `garmin/sync_daily.py`

```py
"""Daily sync entry point.

    python -m garmin.sync_daily                 # yesterday + today
    python -m garmin.sync_daily --days-back 3    # last 3 days + today
    python -m garmin.sync_daily --date 2026-06-20

Today is re-synced because its data is still partial; merge=True keeps later
runs updating the same document.
"""

import argparse
import datetime as dt
import logging

from . import client as client_mod
from . import fetchers, firestore_db

log = logging.getLogger(__name__)


def run(date: str | None = None, days_back: int = 1) -> None:
    garmin = client_mod.get_client()

    if date:
        dates = [date]
    else:
        today = dt.date.today()
        dates = [
            (today - dt.timedelta(days=i)).isoformat()
            for i in range(days_back, -1, -1)
        ]

    for day in dates:
        doc = fetchers.fetch_day(garmin, day)
        firestore_db.write_daily(day, doc)
        log.info("daily synced: %s", day)

    start, end = min(dates), max(dates)
    activities = fetchers.fetch_activities(garmin, start, end)
    for activity in activities:
        activity_id = activity.get("activityId")
        if activity_id is None:
            continue
        firestore_db.write_activity(activity_id, activity)
    log.info("activities synced: %d (%s..%s)", len(activities), start, end)


def main() -> None:
    parser = argparse.ArgumentParser(description="Daily Garmin -> Firestore sync")
    parser.add_argument("--date", help="Sync a single day (YYYY-MM-DD)")
    parser.add_argument(
        "--days-back",
        type=int,
        default=1,
        help="How many days before today to include (default: 1)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    run(date=args.date, days_back=args.days_back)


if __name__ == "__main__":
    main()

```

## `scripts/gen_icons.py`

```py
#!/usr/bin/env python3
"""Genereert PWA-iconen (dark bg + teal checkmark) zonder externe libs."""
import os
import struct
import zlib
import math

BG = (11, 17, 32)        # #0b1120
ACCENT = (45, 212, 191)  # #2dd4bf


def dist_point_seg(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def make_png(size, path):
    w = max(1.0, size * 0.085)  # streekdikte
    # genormaliseerde checkmark-punten -> pixels
    p = [(0.27, 0.53), (0.43, 0.69), (0.75, 0.33)]
    pts = [(x * size, y * size) for x, y in p]
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0 per rij
        for x in range(size):
            d1 = dist_point_seg(x + 0.5, y + 0.5, *pts[0], *pts[1])
            d2 = dist_point_seg(x + 0.5, y + 0.5, *pts[1], *pts[2])
            d = min(d1, d2)
            edge = d - w / 2.0
            if edge <= 0:
                col = ACCENT
            elif edge < 1.5:  # zachte rand (anti-alias)
                a = 1.0 - edge / 1.5
                col = tuple(int(ACCENT[i] * a + BG[i] * (1 - a)) for i in range(3))
            else:
                col = BG
            raw += bytes(col)

    comp = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data +
                struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF))

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', comp) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)
    print('geschreven:', path, f'({size}x{size})')


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
    os.makedirs(out, exist_ok=True)
    make_png(192, os.path.join(out, 'icon-192.png'))
    make_png(512, os.path.join(out, 'icon-512.png'))

```

## `scripts/generateMessagingSw.mjs`

```mjs
// Genereert public/firebase-messaging-sw.js uit de VITE_FB_*-omgevingsvariabelen.
// De Firebase web-config is publiek (beveiliging zit in de regels + App Check),
// maar we genereren het bestand bij elke build zodat de echte waarden uit één
// bron (ENV_LOCAL / .env.local) komen en niet in git belanden.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// .env.local lokaal inlezen (in CI komen de waarden uit de echte env).
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(root, '.env.local');
if (existsSync(envFile)) {
  const { readFileSync } = await import('node:fs');
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const cfg = {
  apiKey: process.env.VITE_FB_API_KEY || '',
  authDomain: process.env.VITE_FB_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FB_PROJECT_ID || '',
  storageBucket: process.env.VITE_FB_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FB_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FB_APP_ID || '',
};

const out = `/* AUTOGEGENEREERD door scripts/generateMessagingSw.mjs — niet handmatig bewerken. */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(cfg, null, 2)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const titel = (payload.notification && payload.notification.title) || 'Personal Agenda';
  const opties = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: (payload.data && payload.data.tag) || 'personal-agenda',
    data: payload.data || {},
  };
  self.registration.showNotification(titel, opties);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
`;

const dest = resolve(root, 'public', 'firebase-messaging-sw.js');
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, out);
console.log('[generateMessagingSw] geschreven:', dest, cfg.projectId ? `(project ${cfg.projectId})` : '(LEEG — env ontbreekt)');

```

## `src/App.jsx`

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Shell from './components/Shell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Week from './pages/Week';
import Taken from './pages/Taken';
import Gezondheid from './pages/Gezondheid';
import Maaltijden from './pages/Maaltijden';
import Voortgang from './pages/Voortgang';
import Coach from './pages/Coach';
import Beheer from './pages/Beheer';

function Laden() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--text-dim)' }}>
      Laden…
    </div>
  );
}

function Beveiligd({ children }) {
  const { user, laden } = useAuth();
  if (laden) return <Laden />;
  if (!user) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  const { user, laden } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={laden ? <Laden /> : user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Beveiligd><Dashboard /></Beveiligd>} />
      <Route path="/week" element={<Beveiligd><Week /></Beveiligd>} />
      <Route path="/taken" element={<Beveiligd><Taken /></Beveiligd>} />
      <Route path="/gezondheid" element={<Beveiligd><Gezondheid /></Beveiligd>} />
      <Route path="/maaltijden" element={<Beveiligd><Maaltijden /></Beveiligd>} />
      <Route path="/voortgang" element={<Beveiligd><Voortgang /></Beveiligd>} />
      <Route path="/coach" element={<Beveiligd><Coach /></Beveiligd>} />
      <Route path="/beheer/*" element={<Beveiligd><Beheer /></Beveiligd>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

```

## `src/main.jsx`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/global.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <SettingsProvider>
                <App />
              </SettingsProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);

```

## `src/firebase.js`

```js
// src/firebase.js — centrale Firebase-initialisatie voor de browser.
import { initializeApp, getApps } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
  measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// App Check beschermt je backend tegen misbruik. Optioneel tijdens testen.
const appCheckKey = import.meta.env.VITE_APPCHECK_KEY;
if (appCheckKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckKey),
    isTokenAutoRefreshEnabled: true,
  });
} else if (import.meta.env.DEV) {
  console.warn('[AppCheck] Geen VITE_APPCHECK_KEY — App Check uit in dev.');
}

// Lokale cache: app voelt snel en werkt offline voor reeds geladen data.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
});

// localStorage-persistentie: voorkomt trage koude start op iOS-PWA.
export const auth = initializeAuth(app, { persistence: browserLocalPersistence });

export { serverTimestamp };
export default app;

```

## `src/components/BelastingKaart.jsx`

```jsx
import { belastingStatus } from '../services/belasting';

const ZEKERHEID_LABEL = { hoog: 'hoge zekerheid', gemiddeld: 'gemiddelde zekerheid', laag: 'lage zekerheid' };

const PERIODISERING_KLEUR = { opbouw: 'var(--success)', deload: 'var(--warning)' };
const PERIODISERING_TITEL = { opbouw: 'Opbouwweek', deload: 'Deload-week' };

// Belasting/herstel in mensentaal — op basis van Garmin-trainingsstatus + trend,
// plus (Fase 5) de uitlegbare ACWR-belastingsratio en de vaste periodisering
// (expliciete opbouw-/deload-cyclus) voor blessurepreventie.
export default function BelastingKaart({ garmin, readinessReeks = [], acwr = null, periodisering = null }) {
  const b = belastingStatus({ trainingStatus: garmin?.trainingStatus, readinessReeks });
  return (
    <section className="card stack" style={{ gap: 8 }}>
      <div className="row between">
        <div className="card-title" style={{ margin: 0 }}>Belasting & herstel</div>
        <span className="badge" style={{ color: b.kleur, borderColor: 'color-mix(in srgb, currentColor 40%, var(--border))' }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          {b.titel}
        </span>
      </div>
      <p className="small muted" style={{ margin: 0 }}>{b.tekst}</p>
      {b.trend != null && (
        <p className="small dim" style={{ margin: 0 }}>
          Readiness-trend deze week: {b.trend > 0 ? '↑ +' : b.trend < 0 ? '↓ ' : '→ '}{b.trend}
        </p>
      )}

      {acwr && (
        <div className="stack" style={{ gap: 6, marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div className="row between">
            <span className="small" style={{ fontWeight: 600 }}>Opbouw-ratio (ACWR)</span>
            <span className="badge" style={{ color: acwr.kleur, borderColor: 'color-mix(in srgb, currentColor 40%, var(--border))' }}>
              {acwr.ratio != null ? acwr.ratio.toFixed(2) : '—'} · {acwr.titel}
            </span>
          </div>
          <p className="small muted" style={{ margin: 0 }}>{acwr.tekst}</p>
          <details className="small">
            <summary className="dim" style={{ cursor: 'pointer' }}>
              Hoe berekend? ({ZEKERHEID_LABEL[acwr.zekerheid]})
            </summary>
            <div className="dim" style={{ marginTop: 6 }}>
              {acwr.waarom}<br />{acwr.meetlat}
            </div>
          </details>
        </div>
      )}

      {periodisering && (
        <div className="stack" style={{ gap: 6, marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div className="row between">
            <span className="small" style={{ fontWeight: 600 }}>Trainingscyclus</span>
            <span className="badge" style={{ color: PERIODISERING_KLEUR[periodisering.fase], borderColor: 'color-mix(in srgb, currentColor 40%, var(--border))' }}>
              Week {periodisering.weekInCyclus}/{periodisering.cyclusLengte} · {PERIODISERING_TITEL[periodisering.fase]}
            </span>
          </div>
          <p className="small muted" style={{ margin: 0 }}>{periodisering.waarom}</p>
          <details className="small">
            <summary className="dim" style={{ cursor: 'pointer' }}>Hoe berekend?</summary>
            <div className="dim" style={{ marginTop: 6 }}>{periodisering.meetlat}</div>
          </details>
        </div>
      )}
    </section>
  );
}

```

## `src/components/CheckinKaart.jsx`

```jsx
import { useState } from 'react';
import { STEMMINGEN, ENERGIE, stemmingInfo } from '../services/reflectie';
import { IcoSun, IcoMoon, IcoEdit, IcoCheck } from './Icons';

// Dagelijkse check-in op het dashboard.
//  - Ochtend: stemming + energie (voedt de coach).
//  - Avond: tevredenheid + waar je dankbaar voor bent + korte reflectie.
// Toont vanzelf het juiste paneel op basis van het uur en wat al ingevuld is.
export default function CheckinKaart({ checkin, bewaar, i = 0 }) {
  const uur = new Date().getHours();
  const ochtend = checkin?.ochtend || null;
  const avond = checkin?.avond || null;
  const avondTijd = uur >= 17;

  // Welk paneel standaard open staat (gebruiker kan met de knoppen wisselen).
  const [forceer, setForceer] = useState(null); // 'ochtend' | 'avond' | 'klaar' | null
  const auto = !ochtend ? 'ochtend' : (avondTijd && !avond ? 'avond' : 'klaar');
  const modus = forceer || auto;

  if (modus === 'klaar') {
    return <Samenvatting checkin={checkin} onBewerk={setForceer} avondTijd={avondTijd} i={i} />;
  }
  if (modus === 'ochtend') {
    return <Ochtend ochtend={ochtend} bewaar={bewaar} klaar={() => setForceer('klaar')} i={i} />;
  }
  return <Avond avond={avond} bewaar={bewaar} klaar={() => setForceer('klaar')} i={i} />;
}

function Schaal({ opties, waarde, zet, render }) {
  return (
    <div className="seg" role="group">
      {opties.map((o) => (
        <button key={o.v} type="button"
          className={'seg-btn' + (waarde === o.v ? ' on' : '')}
          aria-pressed={waarde === o.v} title={o.label}
          onClick={() => zet(o.v)}>
          {render(o)}
        </button>
      ))}
    </div>
  );
}

function Ochtend({ ochtend, bewaar, klaar, i }) {
  const [stemming, setStemming] = useState(ochtend?.stemming ?? null);
  const [energie, setEnergie] = useState(ochtend?.energie ?? null);
  const bewaren = () => {
    bewaar({ ochtend: { stemming, energie, op: new Date().toISOString() } });
    klaar();
  };
  return (
    <section className="card stack" style={{ '--i': i, gap: 14 }}>
      <div className="row between">
        <div className="card-title" style={{ margin: 0 }}><IcoSun width={14} height={14} /> Ochtend-check-in</div>
        {ochtend && <button className="icon-btn" aria-label="Sluiten" onClick={klaar}>✕</button>}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="small muted">Hoe voel je je?</span>
        <Schaal opties={STEMMINGEN} waarde={stemming} zet={setStemming}
          render={(o) => <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{o.emoji}</span>} />
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="small muted">Energie</span>
        <Schaal opties={ENERGIE} waarde={energie} zet={setEnergie}
          render={(o) => <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{o.v}</span>} />
        {energie != null && <span className="small dim">{ENERGIE.find((e) => e.v === energie)?.label}</span>}
      </div>
      <button className="btn primary block" disabled={stemming == null && energie == null} onClick={bewaren}>
        Bewaren
      </button>
    </section>
  );
}

function Avond({ avond, bewaar, klaar, i }) {
  const [tevreden, setTevreden] = useState(avond?.tevreden ?? null);
  const [dankbaar, setDankbaar] = useState(avond?.dankbaar ?? '');
  const [reflectie, setReflectie] = useState(avond?.reflectie ?? '');
  const bewaren = () => {
    bewaar({ avond: { tevreden, dankbaar: dankbaar.trim(), reflectie: reflectie.trim(), op: new Date().toISOString() } });
    klaar();
  };
  const leeg = tevreden == null && !dankbaar.trim() && !reflectie.trim();
  return (
    <section className="card stack" style={{ '--i': i, gap: 14 }}>
      <div className="row between">
        <div className="card-title" style={{ margin: 0 }}><IcoMoon width={14} height={14} /> Avondreflectie</div>
        <button className="icon-btn" aria-label="Sluiten" onClick={klaar}>✕</button>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="small muted">Tevreden over vandaag?</span>
        <Schaal opties={STEMMINGEN} waarde={tevreden} zet={setTevreden}
          render={(o) => <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{o.emoji}</span>} />
      </div>
      <div className="field">
        <label>Waar ben je dankbaar voor?</label>
        <input className="input" value={dankbaar} maxLength={140} placeholder="Eén ding volstaat…"
          onChange={(e) => setDankbaar(e.target.value)} />
      </div>
      <div className="field">
        <label>Korte reflectie (optioneel)</label>
        <textarea className="input" rows={3} value={reflectie} maxLength={600}
          placeholder="Wat ging goed, wat kan morgen beter?"
          onChange={(e) => setReflectie(e.target.value)} />
      </div>
      <button className="btn primary block" disabled={leeg} onClick={bewaren}>Bewaren</button>
    </section>
  );
}

function Samenvatting({ checkin, onBewerk, avondTijd, i }) {
  const o = checkin?.ochtend || null;
  const a = checkin?.avond || null;
  const oInfo = o?.stemming ? stemmingInfo(o.stemming) : null;
  const aInfo = a?.tevreden ? stemmingInfo(a.tevreden) : null;
  return (
    <section className="card stack" style={{ '--i': i, gap: 12 }}>
      <div className="row between">
        <div className="card-title" style={{ margin: 0 }}><IcoCheck width={14} height={14} /> Check-in vandaag</div>
        <button className="icon-btn" aria-label="Bewerken"
          onClick={() => onBewerk(avondTijd ? 'avond' : 'ochtend')}>
          <IcoEdit width={18} height={18} />
        </button>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        {oInfo && <span className="badge">{oInfo.emoji} {oInfo.label}</span>}
        {o?.energie != null && <span className="badge accent">Energie {o.energie}/5</span>}
        {aInfo && <span className="badge">🌙 {aInfo.emoji} {aInfo.label}</span>}
        {!o && !a && <span className="small muted">Nog niets ingevuld vandaag.</span>}
      </div>
      {a?.dankbaar && <p className="small" style={{ margin: 0 }}>🙏 {a.dankbaar}</p>}
      {a?.reflectie && <p className="small dim" style={{ margin: 0 }}>{a.reflectie}</p>}
      {!a && avondTijd && (
        <button className="btn sm ghost" onClick={() => onBewerk('avond')}>Avondreflectie toevoegen</button>
      )}
    </section>
  );
}

```

## `src/components/CoachKaart.jsx`

```jsx
import { coachAdvies } from '../services/coach';
import { belastingStatus } from '../services/belasting';
import { IcoBolt, IcoClock } from './Icons';

const NIVEAU_LABEL = { hard: 'Vol gas', matig: 'Matig', rustig: 'Rustig', herstel: 'Herstel' };
const ZEKERHEID_LABEL = { hoog: 'Hoge zekerheid', gemiddeld: 'Gemiddelde zekerheid', laag: 'Lage zekerheid' };
const ZEKERHEID_KLEUR = { hoog: 'var(--success)', gemiddeld: 'var(--warning)', laag: 'var(--text-dim)' };

// Coach-advies van de dag. Toont sport + intensiteit op basis van Garmin + doel.
// Premium-principe: elk advies is uitlegbaar — waarom, welke data, hoe zeker, hoe
// succes gemeten wordt. Veiligheidsslot: bij overbelasting wint herstel; bij weinig
// data adviseert de coach bewust voorzichtiger.
export default function CoachKaart({ garmin, goal = 'algemeen', blessureActief = false, energie = null, acwrZone = null, pijn = null, periodiseringFase = null, vakantieType = null }) {
  const overbelast = belastingStatus({ trainingStatus: garmin?.trainingStatus }).key === 'overbelast';
  const a = coachAdvies({
    readiness: garmin?.readiness ?? null,
    bodyBattery: garmin?.bodyBattery ?? null,
    slaapUren: garmin?.slaapUren ?? null,
    hrvStatus: garmin?.hrvStatus ?? null,
    energie,
    goal, blessureActief, overbelast, acwrZone, pijn, periodiseringFase, vakantieType,
  });

  return (
    <section className="card stack" style={{ gap: 12 }}>
      <div className="row between">
        <div className="card-title" style={{ margin: 0 }}>Coach · {a.doelLabel}</div>
        <span className="badge" style={{ color: a.kleur, borderColor: 'color-mix(in srgb, currentColor 40%, var(--border))' }}>
          <IcoBolt width={12} height={12} /> {NIVEAU_LABEL[a.niveau]}
        </span>
      </div>

      <div className="row" style={{ gap: 14, alignItems: 'center' }}>
        <span aria-hidden style={{
          width: 46, height: 46, borderRadius: '50%', flex: 'none',
          background: `radial-gradient(circle at 34% 30%, #ffffffaa, transparent 42%), radial-gradient(circle at 70% 75%, ${a.kleur}, color-mix(in srgb, ${a.kleur} 55%, #000))`,
          boxShadow: `0 6px 18px -4px color-mix(in srgb, ${a.kleur} 60%, transparent)`,
        }} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{a.titel}</div>
          <div className="muted small">{a.sport}</div>
        </div>
      </div>

      <div className="row between small dim">
        <span><IcoClock width={13} height={13} /> ±{a.duurMin} min</span>
        <span style={{ color: ZEKERHEID_KLEUR[a.zekerheid] }}>● {ZEKERHEID_LABEL[a.zekerheid]}</span>
      </div>

      {/* Waarom: korte regel + detail in uitklap (uitlegbaarheid) */}
      <div className="stack" style={{ gap: 6 }}>
        <div className="small">{a.waarom[0]}</div>
        <details className="small">
          <summary className="dim" style={{ cursor: 'pointer' }}>Waarom dit advies?</summary>
          <div className="stack" style={{ gap: 6, marginTop: 8 }}>
            {a.waarom.length > 1 && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {a.waarom.map((w, i) => <li key={i} className="dim">{w}</li>)}
              </ul>
            )}
            <div className="dim"><b>Op basis van:</b> {a.databronnen.join(' · ')}</div>
            <div className="dim"><b>Meetlat:</b> {a.meetlat}</div>
          </div>
        </details>
      </div>
    </section>
  );
}

```

## `src/components/Daypicker.jsx`

```jsx
import { useEffect, useRef, useState } from 'react';
import { datumKey } from '../services/tijd';
import { IcoAgenda, IcoChevron } from './Icons';

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const WEEKDAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

// Geeft alle dagen van de getoonde maand terug, met lege plekken zodat de
// eerste maandag in kolom 1 valt (Europese weekindeling).
function dagenInMaand(maand) {
  const eersteDag = new Date(maand.getFullYear(), maand.getMonth(), 1);
  const start = (eersteDag.getDay() + 6) % 7;
  const aantal = new Date(maand.getFullYear(), maand.getMonth() + 1, 0).getDate();
  const dagen = [];
  for (let i = 0; i < start; i++) dagen.push(null);
  for (let d = 1; d <= aantal; d++) dagen.push(new Date(maand.getFullYear(), maand.getMonth(), d));
  return dagen;
}

// Kalender-popover om vrij een datum te kiezen — vervangt het natieve
// <input type="date"> (lelijk + liet enkel het verleden toe).
export default function Daypicker({ datum, onKies }) {
  const [open, setOpen] = useState(false);
  const [maand, setMaand] = useState(() => new Date(datum.getFullYear(), datum.getMonth(), 1));
  const ref = useRef(null);

  useEffect(() => {
    if (open) setMaand(new Date(datum.getFullYear(), datum.getMonth(), 1));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const vandaag = datumKey(new Date());
  const gekozen = datumKey(datum);
  const dagen = dagenInMaand(maand);

  return (
    <div className="daypicker" ref={ref}>
      <button type="button" className="btn sm" onClick={() => setOpen((o) => !o)}>
        <IcoAgenda width={16} height={16} />
        <span style={{ textTransform: 'capitalize' }}>
          {datum.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </button>
      {open && (
        <div className="daypicker-pop card">
          <div className="row between" style={{ marginBottom: 8 }}>
            <button type="button" className="icon-btn" aria-label="Vorige maand"
              onClick={() => setMaand((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
              <IcoChevron width={16} height={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <strong style={{ textTransform: 'capitalize' }}>{MAANDEN[maand.getMonth()]} {maand.getFullYear()}</strong>
            <button type="button" className="icon-btn" aria-label="Volgende maand"
              onClick={() => setMaand((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
              <IcoChevron width={16} height={16} />
            </button>
          </div>
          <div className="daypicker-grid">
            {WEEKDAGEN.map((w) => <span key={w} className="small dim daypicker-wd">{w}</span>)}
            {dagen.map((d, i) => {
              if (!d) return <span key={`leeg${i}`} />;
              const key = datumKey(d);
              return (
                <button key={key} type="button"
                  className={'daypicker-dag' + (key === gekozen ? ' on' : '') + (key === vandaag ? ' vandaag' : '')}
                  onClick={() => { onKies(d); setOpen(false); }}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

```

## `src/components/ErrorBoundary.jsx`

```jsx
import { Component } from 'react';

// Vangt render-fouten op zodat de app nooit een wit scherm toont.
export default class ErrorBoundary extends Component {
  state = { fout: null };
  static getDerivedStateFromError(fout) { return { fout }; }
  componentDidCatch(fout, info) { console.error('App-fout:', fout, info); }
  render() {
    if (this.state.fout) {
      return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
          <div className="card stack center" style={{ maxWidth: 360 }}>
            <h2 style={{ margin: 0 }}>Er ging iets mis</h2>
            <p className="small muted" style={{ margin: 0 }}>
              De app liep tegen een onverwachte fout. Herlaad om verder te gaan.
            </p>
            <button className="btn primary block" onClick={() => window.location.reload()}>Herladen</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

```

## `src/components/Gauge.jsx`

```jsx
// Kleine radiale gloei-meter (hergebruikt de .ring-stijl).
export default function Gauge({ val = 0, label, sub, size = 84, kleur }) {
  const v = Math.max(0, Math.min(100, Number(val) || 0));
  return (
    <div className="ring anim" role="img" aria-label={`${label}: ${sub}`}
      style={{ '--val': v, '--size': `${size}px`, '--thick': '8px', ...(kleur ? { '--primary': kleur } : {}) }}>
      <div style={{ display: 'grid', placeItems: 'center', gap: 1 }}>
        <span className="ring-v" style={{ fontSize: size < 80 ? '1.05rem' : '1.3rem' }}>{sub}</span>
        <span className="ring-l">{label}</span>
      </div>
    </div>
  );
}

```

## `src/components/Icons.jsx`

```jsx
// Lichte SVG-iconenset (stroke-stijl, consistent). Geen emoji als icoon.
const base = {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
};

export const IcoHome = (p) => (<svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>);
export const IcoAgenda = (p) => (<svg {...base} {...p}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>);
export const IcoCheck = (p) => (<svg {...base} {...p}><path d="M4 12.5 9 17.5 20 6.5" /></svg>);
export const IcoHeart = (p) => (<svg {...base} {...p}><path d="M12 20s-7-4.6-7-9.6A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.4C19 15.4 12 20 12 20Z" /></svg>);
export const IcoFork = (p) => (<svg {...base} {...p}><path d="M6 3v7a2 2 0 0 0 4 0V3M8 3v18M18 3c-1.5 1-2 3-2 6s.5 4 2 4v8" /></svg>);
export const IcoCog = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>);
export const IcoBell = (p) => (<svg {...base} {...p}><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10.5 20a1.8 1.8 0 0 0 3 0" /></svg>);
export const IcoBolt = (p) => (<svg {...base} {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg>);
export const IcoBike = (p) => (<svg {...base} {...p}><circle cx="6" cy="17" r="3.4" /><circle cx="18" cy="17" r="3.4" /><path d="M6 17l4-7h5l-3 7M10 10l-2-3H6m9 0h3" /></svg>);
export const IcoMoon = (p) => (<svg {...base} {...p}><path d="M20 13.5A8 8 0 1 1 10.5 4 6.3 6.3 0 0 0 20 13.5Z" /></svg>);
export const IcoSun = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>);
export const IcoFlame = (p) => (<svg {...base} {...p}><path d="M12 3c2 3 5 4.5 5 8.5A5 5 0 0 1 7 12c0-1.5.5-2.5 1.5-3.5C9 9.5 10 10 10.5 10c-.5-2 .5-5 1.5-7Z" /></svg>);
export const IcoPlus = (p) => (<svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const IcoTrash = (p) => (<svg {...base} {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>);
export const IcoEdit = (p) => (<svg {...base} {...p}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="M14 6l4 4" /></svg>);
export const IcoLogout = (p) => (<svg {...base} {...p}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 12H3m0 0 3-3m-3 3 3 3" /></svg>);
export const IcoClock = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const IcoChevron = (p) => (<svg {...base} {...p}><path d="M9 6l6 6-6 6" /></svg>);
export const IcoPulse = (p) => (<svg {...base} {...p}><path d="M3 12h4l2-5 4 10 2-5h6" /></svg>);
export const IcoBadge = (p) => (<svg {...base} {...p}><circle cx="12" cy="9" r="6" /><path d="M9 14.5 7.5 21l4.5-2.5 4.5 2.5-1.5-6.5" /></svg>);
export const IcoWalk = (p) => (<svg {...base} {...p}><circle cx="13" cy="4.5" r="1.6" /><path d="M11 8l-1.5 5 2 1.5-.5 6M11 8l3 1 2.5 3M9.5 13l-3.5 1.5M13.5 14.5 11 21" /></svg>);

```

## `src/components/NoordsterKaart.jsx`

```jsx
import Gauge from './Gauge';

// North Star: consistentie-/therapietrouw-score met uitleg (premium-principe:
// elke metric is uitlegbaar). `ns` komt uit services/noordster.js → noordster().
export default function NoordsterKaart({ ns, i }) {
  if (!ns) return null;
  return (
    <section className="card stack" style={{ '--i': i, gap: 12 }}>
      <div className="card-title" style={{ margin: 0 }}>Consistentie · je North Star</div>
      <div className="row" style={{ gap: 16, alignItems: 'center' }}>
        {ns.score == null
          ? <Gauge val={0} size={72} label="" sub="—" kleur="var(--text-dim)" />
          : <Gauge val={ns.score} size={72} label="" sub={`${ns.score}`} kleur={ns.kleur} />}
        <div className="grow" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: ns.kleur }}>{ns.label}</div>
          <div className="small dim">{ns.waarom}</div>
        </div>
      </div>
      <details className="small">
        <summary className="dim" style={{ cursor: 'pointer' }}>Hoe wordt dit gemeten?</summary>
        <div className="dim" style={{ marginTop: 8 }}>
          {ns.meetlat} Een gemiste dag is normaal — deze score kijkt naar je
          gemiddelde over meerdere dagen, niet naar één misstap.
        </div>
      </details>
    </section>
  );
}

```

## `src/components/Shell.jsx`

```jsx
import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { APP_NAAM } from '../config/appConfig';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { luisterVoorgrond } from '../services/push';
import UpdateBanner from './UpdateBanner';
import { IcoHome, IcoAgenda, IcoCheck, IcoHeart, IcoBolt, IcoCog, IcoLogout } from './Icons';

const NAV = [
  { to: '/', label: 'Vandaag', Icon: IcoHome, end: true },
  { to: '/week', label: 'Week', Icon: IcoAgenda },
  { to: '/coach', label: 'Coach', Icon: IcoBolt },
  { to: '/taken', label: 'Taken', Icon: IcoCheck },
  { to: '/gezondheid', label: 'Gezondheid', Icon: IcoHeart },
  { to: '/beheer', label: 'Beheer', Icon: IcoCog },
];

export default function Shell({ children }) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Voorgrondmeldingen: toon push als toast wanneer de app open staat.
  useEffect(() => {
    let stop = () => {};
    luisterVoorgrond((payload) => {
      const n = payload?.notification || {};
      toast(`${n.title || 'Melding'}${n.body ? ' — ' + n.body : ''}`);
    }).then((fn) => { stop = fn; });
    return () => stop();
  }, [toast]);

  return (
    <div className="shell">
      <div className="aurora rich" aria-hidden />
      <UpdateBanner />
      <nav className="sidebar" aria-label="Hoofdnavigatie">
        <div className="title" style={{ padding: '8px 12px 16px', fontWeight: 700 }}>{APP_NAAM}</div>
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => 'navitem' + (isActive ? ' active' : '')}>
            <Icon /> <span>{label}</span>
          </NavLink>
        ))}
        <div className="grow" />
        <button className="navitem" onClick={() => logout().then(() => navigate('/login'))}>
          <IcoLogout /> <span>Afmelden</span>
        </button>
      </nav>

      <div className="grow" style={{ minWidth: 0 }}>
        <header className="appbar">
          <span className="title">{APP_NAAM}</span>
        </header>
        <main className="content">
          <div className="container">{children}</div>
        </main>
      </div>

      <nav className="bottomnav" aria-label="Hoofdnavigatie">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => 'navitem' + (isActive ? ' active' : '')}>
            <Icon /> <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

```

## `src/components/Sparkline.jsx`

```jsx
// Minimalistische trendlijn (SVG). Slaat lege punten over.
export default function Sparkline({ data = [], width = 130, height = 38, kleur = 'var(--primary)' }) {
  const pts = data.filter((v) => typeof v === 'number');
  if (pts.length < 2) return <span className="small dim">te weinig data</span>;
  const min = Math.min(...pts), max = Math.max(...pts);
  const rng = max - min || 1;
  const step = width / (pts.length - 1);
  const coords = pts.map((v, i) => [i * step, height - ((v - min) / rng) * (height - 6) - 3]);
  const line = coords.map((c) => c.join(',')).join(' ');
  const last = coords[coords.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ overflow: 'visible' }}>
      <polyline points={line} fill="none" stroke={kleur} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={kleur} />
    </svg>
  );
}

```

## `src/components/UpdateBanner.jsx`

```jsx
import { useRegisterSW } from 'virtual:pwa-register/react';

// Toont een banner wanneer er een nieuwe app-versie klaarstaat.
export default function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) { console.warn('SW-registratie fout:', err); },
  });

  if (!needRefresh) return null;

  return (
    <div className="update-banner" role="status">
      <span className="grow small">Nieuwe versie beschikbaar</span>
      <button className="btn sm primary" onClick={() => updateServiceWorker(true)}>Vernieuwen</button>
      <button className="icon-btn" aria-label="Later" onClick={() => setNeedRefresh(false)}>✕</button>
    </div>
  );
}

```

## `src/config/appConfig.js`

```js
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
// Voedingsdoelen — meerdere tegelijk combineerbaar (bv. spiermassa + prestatie).
export const VOEDINGSDOELEN = {
  afvallen: { naam: 'Afvallen', kort: 'Afvallen' },
  spiermassa: { naam: 'Spiermassa opbouwen', kort: 'Spiermassa' },
  onderhoud: { naam: 'Onderhoud / gezond eten', kort: 'Onderhoud' },
  prestatie: { naam: 'Prestatie (judo/sport)', kort: 'Prestatie' },
};

export const SPORTEN = {
  homefitness: { naam: 'Home fitness', kort: 'Fitness' },
  fietsen: { naam: 'Fietsen', kort: 'Fietsen' },
  wandelen: { naam: 'Wandelen', kort: 'Wandelen' },
  rust: { naam: 'Rustdag', kort: 'Rust' },
};

// Lichaamsregio's voor blessures -> sporten die de coach/fietsadvies automatisch
// afraadt zolang de blessure actief is. Bewust een grove, uitlegbare vuistregel
// (geen medisch advies): 'algemeen' (bv. "spier", niet naar dokter geweest) geeft
// veilig géén automatische sportveto, maar de coach blijft via de algemene
// blessureActief-vlag (zie services/coach.js) toch voorzichtiger qua niveau.
export const BLESSURE_REGIOS = {
  knie: { naam: 'Knie', vermijdSport: ['fietsen', 'wandelen', 'judo'] },
  heup_lies: { naam: 'Heup / lies', vermijdSport: ['fietsen', 'wandelen', 'judo'] },
  kuit_hamstring: { naam: 'Kuit / hamstring / quadriceps', vermijdSport: ['fietsen', 'wandelen', 'judo'] },
  voet_enkel: { naam: 'Voet / enkel', vermijdSport: ['wandelen', 'judo'] },
  rug: { naam: 'Rug / onderrug', vermijdSport: ['fietsen', 'judo'] },
  schouder: { naam: 'Schouder', vermijdSport: ['judo'] },
  elleboog_pols: { naam: 'Elleboog / pols / hand', vermijdSport: ['judo'] },
  nek: { naam: 'Nek', vermijdSport: ['judo'] },
  algemeen: { naam: 'Algemeen / spier (geen diagnose)', vermijdSport: [] },
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
  voeding: {
    doelen: ['onderhoud'],     // VOEDINGSDOELEN-keys, meerdere tegelijk mogelijk
    aantalEtersStandaard: 1,
    snacksAan: true,
  },
};

export const PUSH_INTENSITEIT = {
  elk_blok: 'Bij elk gepland blok (meeste hulp)',
  sleutel: 'Enkel sleutelmomenten + overgangen',
  minimaal: 'Minimaal (2-3 per dag)',
};

```

## `src/contexts/AuthContext.jsx`

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase';
import { seedDefaultsIfNeeded } from '../services/data';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          await seedDefaultsIfNeeded(u.uid, { email: u.email, naam: u.displayName });
        } catch (e) {
          console.warn('Seed mislukt:', e?.message);
        }
      }
      setUser(u);
      setLaden(false);
    });
  }, []);

  const login = (email, ww) => signInWithEmailAndPassword(auth, email, ww);
  const logout = () => signOut(auth);
  const wachtwoordVergeten = (email) => sendPasswordResetEmail(auth, email);

  return (
    <AuthContext.Provider value={{ user, laden, login, logout, wachtwoordVergeten }}>
      {children}
    </AuthContext.Provider>
  );
}

```

## `src/contexts/SettingsContext.jsx`

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getInstellingen, saveInstellingen } from '../services/data';

// Laadt de instellingen één keer per sessie (i.p.v. 5 reads op elke pagina)
// en houdt ze in geheugen. Schrijven werkt optimistisch + persisteert.
const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [instellingen, setInstellingen] = useState(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    if (!user) { setInstellingen(null); setLaden(false); return; }
    let actief = true;
    setLaden(true);
    getInstellingen(user.uid).then((data) => {
      if (actief) { setInstellingen(data); setLaden(false); }
    });
    return () => { actief = false; };
  }, [user]);

  const opslaan = useCallback(async (rubriek, patch) => {
    if (!user) return;
    let nieuw;
    setInstellingen((cur) => {
      nieuw = { ...(cur || {}), [rubriek]: { ...((cur || {})[rubriek] || {}), ...patch } };
      return nieuw;
    });
    await saveInstellingen(user.uid, rubriek, { ...((instellingen || {})[rubriek] || {}), ...patch });
  }, [user, instellingen]);

  return (
    <SettingsContext.Provider value={{ instellingen, laden, opslaan }}>
      {children}
    </SettingsContext.Provider>
  );
}

```

## `src/contexts/ThemeContext.jsx`

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { THEMES } from '../config/appConfig';

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const KEY = 'pa_theme';
const geldig = (id) => THEMES.some((t) => t.id === id);

export function ThemeProvider({ children }) {
  const [thema, setThemaState] = useState(() => {
    try {
      const v = localStorage.getItem(KEY);
      return geldig(v) ? v : 'middernacht';
    } catch { return 'middernacht'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', thema);
    const meta = document.querySelector('meta[name="theme-color"]');
    const kleurBg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (meta && kleurBg) meta.setAttribute('content', kleurBg);
  }, [thema]);

  const setThema = (id) => {
    if (!geldig(id)) return;
    setThemaState(id);
    try { localStorage.setItem(KEY, id); } catch { /* negeer */ }
  };

  return (
    <ThemeContext.Provider value={{ thema, setThema, themas: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

```

## `src/contexts/ToastContext.jsx`

```jsx
import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [bericht, setBericht] = useState(null);
  const timer = useRef(null);

  const toast = useCallback((tekst) => {
    setBericht(tekst);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBericht(null), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {bericht && <div className="toast" role="status" aria-live="polite">{bericht}</div>}
    </ToastContext.Provider>
  );
}

```

## `src/hooks/useDagPlan.js`

```js
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  getCollection, getDocById, getGarminDag, getWeer, getDagCached,
  getAgendaEventsVoorDag, saveDag, getLaatsteGarminSync, getVakanties, verwijderVerzet,
  verwijderSlaapOverride,
} from '../services/data';
import { genereerDagPlan } from '../services/planner';
import { garminSamenvatting } from '../services/garmin';
import { vakantieFlags } from '../services/vakanties';
import { zetTaakGedaan } from '../services/taken';
import { coachAdvies } from '../services/coach';
import { isBlessureActief, vermijdSportenVanBlessures } from '../services/blessures';
import { revaTherapietrouw } from '../services/noordster';
import { acwrBerekenen, sessieBelasting, belastingStatus } from '../services/belasting';
import { periodiseringBepalen } from '../services/periodisering';
import { datumKey, dagKortVanDatum, weekKey, toMin, toHHMM, nuMin } from '../services/tijd';

// Past een handmatige slaap-correctie toe op de Garmin-samenvatting (begin/eind
// + herberekende duur). Garmin's nachtmeting kan een uur mis zitten; de gebruiker
// mag dat rechtzetten zonder op een nieuwe sync te wachten.
function metSlaapOverride(garminSam, override) {
  if (!garminSam || !override?.begin || !override?.eind) return garminSam;
  let duurMin = toMin(override.eind) - toMin(override.begin);
  if (duurMin <= 0) duurMin += 24 * 60; // slaap loopt over middernacht
  return { ...garminSam, slaapBegin: override.begin, slaapEind: override.eind, slaapUren: duurMin / 60, slaapOverride: true };
}

// Laadt alle dagdata, berekent het plan en biedt afvink-acties.
export function useDagPlan(datumObj = new Date()) {
  const { user } = useAuth();
  const { instellingen, laden: instLaden } = useSettings();
  const uid = user?.uid;
  const datum = datumKey(datumObj);
  const dagKort = dagKortVanDatum(datumObj);

  const [staat, setStaat] = useState({ laden: true });
  const [versie, setVersie] = useState(0);

  useEffect(() => {
    if (!uid || instLaden || !instellingen) return;
    let actief = true;
    (async () => {
      setStaat((s) => ({ ...s, laden: true }));
      const [taken, reva, blessures, maaltijden, garmin, agendaEvents, dag, week, vakanties, garminSync, weer, acts, logs] = await Promise.all([
        getCollection(uid, 'taken'),
        getCollection(uid, 'reva'),
        getCollection(uid, 'blessures'),
        getCollection(uid, 'maaltijden'),
        getGarminDag(uid, datum),
        getAgendaEventsVoorDag(uid, datum),
        getDocById(uid, 'dagen', datum),
        getDocById(uid, 'weken', weekKey(datumObj)),
        getVakanties(uid),
        getLaatsteGarminSync(uid),
        getWeer(uid, datum),
        getCollection(uid, 'garminActivities'),
        getCollection(uid, 'activiteitLog'),
      ]);

      // Vlaggen over ÁLLE overlappende vakantieperiodes (zie vakantieFlags).
      const { verlof, geenJudo, buitenland } = vakantieFlags(vakanties, datum);
      const vakantieType = verlof ? (buitenland ? 'buitenland' : 'thuis') : null;
      const isWeekend = dagKort === 'za' || dagKort === 'zo';
      // Effectief dagtype: verlofperiode wint altijd, ook over een eerder gezette
      // expliciete dagmodus (retroactief verlof mag geen ingepland werk laten staan).
      // Zonder verlof: expliciete keuze, anders weekend -> 'vrij'.
      let werkModus = verlof ? 'verlof' : (week?.dagen?.[dagKort] || null);
      if (!werkModus && isWeekend) werkModus = 'vrij';
      const blessureActief = (blessures || []).some((b) => isBlessureActief(b, datum));
      const vermijdSporten = vermijdSportenVanBlessures(blessures, datum);
      const isVakantie = !!week?.vakantie || verlof;

      // Adaptieve feedback-loop voor reva: als de voorbije dagen de oefeningen
      // structureel zijn gemist, signaleren we dat — niet om te straffen, maar
      // omdat een blessure die niet wordt nageleefd net het risico is dat we
      // willen vermijden (premium-principe 6: adaptief, met feedback-loops).
      let revaTrouw = null;
      if (blessureActief) {
        const vorigeData = new Date(datumObj);
        const vorigeDagen = await Promise.all([1, 2, 3].map((n) => {
          const d = new Date(vorigeData);
          d.setDate(d.getDate() - n);
          return getDagCached(uid, datumKey(d));
        }));
        revaTrouw = revaTherapietrouw(vorigeDagen).score;
      }
      const garminSam = metSlaapOverride(garminSamenvatting(garmin), dag?.slaapOverride);

      // Periodisering (ACWR) + overbelasting: dezelfde signalen die de coach op
      // het Dashboard al gebruikt, zodat het sportadvies overal consistent is.
      const rpeMap = Object.fromEntries((logs || []).map((l) => [l.id, l.rpe]));
      const acwr = acwrBerekenen(sessieBelasting(acts, rpeMap));
      const overbelast = belastingStatus({ trainingStatus: garminSam?.trainingStatus }).key === 'overbelast';
      const periodisering = periodiseringBepalen(datumObj);
      const advies = coachAdvies({
        readiness: garminSam?.readiness ?? null,
        bodyBattery: garminSam?.bodyBattery ?? null,
        slaapUren: garminSam?.slaapUren ?? null,
        energie: dag?.checkin?.ochtend?.energie ?? null,
        hrvStatus: garminSam?.hrvStatus ?? null,
        goal: instellingen.gezondheid?.doel,
        blessureActief, overbelast, acwrZone: acwr?.zone,
        pijn: typeof dag?.checkin?.pijn === 'number' && dag.checkin.pijn > 0 ? dag.checkin.pijn : null,
        periodiseringFase: periodisering.fase,
        vakantieType,
      });

      const plan = genereerDagPlan({
        datum, dagKort, instellingen, werkModus,
        taken, reva, blessures, maaltijden, agendaEvents, garmin: garminSam,
        weer, blessureActief, isVakantie, geenJudo, coachNiveau: advies.niveau, revaTrouw,
        maaltijdPlan: dag?.maaltijdPlan || {},
      });

      // Adaptief: verzette (ingehaalde) blokken krijgen hun nieuwe tijd. Zo "faalt"
      // een gemist blok niet stil, maar schuift het naar later op de dag.
      const verzet = dag?.verzet || {};
      if (Object.keys(verzet).length) {
        plan.blokken = plan.blokken
          .map((b) => (verzet[b.id] ? { ...b, start: verzet[b.id].start, eind: verzet[b.id].eind, verzet: true } : b))
          .sort((a, b) => toMin(a.start) - toMin(b.start));
      }

      if (!actief) return;
      setStaat({
        laden: false, plan, instellingen, garmin: garminSam, taken,
        gedaan: dag?.gedaan || {}, checkin: dag?.checkin || null, verzet,
        werkModus, datum, dagKort, blessureActief, blessures, vermijdSporten, garminSync, acwr, periodisering, advies, weer, vakantieType,
        maaltijden, maaltijdPlan: dag?.maaltijdPlan || {},
      });

      // Persisteer het plan zodat de Cloud Functions slot-herinneringen kunnen
      // sturen (ook als de app vandaag niet meer geopend wordt).
      if (datum === datumKey(new Date())) {
        const sleutelTypes = new Set(['judo', 'lesgeven', 'sport', 'reva', 'maaltijd', 'slaap', 'voetbal']);
        // checkbaar = exact dezelfde definitie als op het dashboard, zodat de
        // North Star-score (therapietrouw) op afvinkbare blokken klopt.
        const isCheckbaar = (b) => ['taak', 'judo', 'agenda', 'maaltijdplan'].includes(b.bron) || b.type === 'sport' || b.type === 'reva';
        const minimaal = plan.blokken.map((b) => ({
          id: b.id, start: b.start, eind: b.eind, titel: b.titel, type: b.type,
          push: b.push !== false, detail: b.detail || null,
          sleutel: sleutelTypes.has(b.type), checkbaar: isCheckbaar(b),
          // Oefening-id's bewaren zodat de North Star-score een reva-blok met
          // checklist pas als "gedaan" telt wanneer alle oefeningen zijn afgevinkt.
          oefeningen: b.oefeningen?.length ? b.oefeningen.map((o) => o.id) : null,
        }));
        // Alleen schrijven als het plan echt veranderd is — bespaart Firestore-writes.
        if (JSON.stringify(minimaal) !== JSON.stringify(dag?.plan || null)) {
          saveDag(uid, datum, { plan: minimaal, planOp: new Date().toISOString() }).catch(() => {});
        }
      }
    })();
    return () => { actief = false; };
  }, [uid, datum, dagKort, versie, instellingen, instLaden]); // eslint-disable-line react-hooks/exhaustive-deps

  // Blok afvinken (opgeslagen in dagen/{datum}.gedaan) + streak voor taak-blokken.
  const toggleBlok = useCallback(async (blokId, taakId) => {
    if (!uid) return;
    const huidig = !!staat.gedaan?.[blokId];
    const nieuw = !huidig;
    const gedaan = { ...(staat.gedaan || {}), [blokId]: nieuw };
    setStaat((s) => ({ ...s, gedaan }));
    await saveDag(uid, datum, { gedaan });
    if (taakId) {
      const taak = staat.taken?.find((t) => t.id === taakId);
      if (taak) await zetTaakGedaan(uid, taak, datum, nieuw).catch(() => {});
    }
  }, [uid, datum, staat.gedaan, staat.taken]);

  // Check-in (stemming/energie 's ochtends, reflectie 's avonds) bewaren.
  // `deel` is bv. { ochtend: {...} } of { avond: {...} }; wordt samengevoegd.
  const bewaarCheckin = useCallback(async (deel) => {
    if (!uid) return;
    const nieuw = { ...(staat.checkin || {}), ...deel };
    setStaat((s) => ({ ...s, checkin: nieuw }));
    await saveDag(uid, datum, { checkin: nieuw });
  }, [uid, datum, staat.checkin]);

  // Een gemist (sleutel)blok inhalen: verschuif het naar het eerstvolgende
  // kwartier na nu, voor dezelfde duur. Opgeslagen in dagen/{datum}.verzet.
  const verzetBlok = useCallback(async (blokId) => {
    if (!uid) return;
    const blok = staat.plan?.blokken?.find((b) => b.id === blokId);
    if (!blok) return;
    const duur = Math.max(15, toMin(blok.eind) - toMin(blok.start));
    const startMin = Math.min(23 * 60 + 45 - duur, Math.ceil((nuMin() + 5) / 15) * 15);
    const nieuwTijd = { start: toHHMM(startMin), eind: toHHMM(startMin + duur) };
    const verzet = { ...(staat.verzet || {}), [blokId]: nieuwTijd };
    setStaat((s) => ({ ...s, verzet }));
    await saveDag(uid, datum, { verzet });
    herlaad();
  }, [uid, datum, staat.plan, staat.verzet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Direct een blok-tijd corrigeren — in tegenstelling tot verzetBlok (dat altijd
  // naar "later vandaag" schuift) zet dit een willekeurig gekozen start/eind,
  // op élke dag (ook voorbije). Opgeslagen in dagen/{datum}.verzet, net als verzetBlok.
  const wijzigBlokTijd = useCallback(async (blokId, start, eind) => {
    if (!uid) return;
    const verzet = { ...(staat.verzet || {}), [blokId]: { start, eind } };
    setStaat((s) => ({ ...s, verzet }));
    await saveDag(uid, datum, { verzet });
    herlaad();
  }, [uid, datum, staat.verzet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Herstelt een blok naar zijn oorspronkelijk gepland tijdstip.
  const herstelBlokTijd = useCallback(async (blokId) => {
    if (!uid) return;
    const verzet = { ...(staat.verzet || {}) };
    delete verzet[blokId];
    setStaat((s) => ({ ...s, verzet }));
    await verwijderVerzet(uid, datum, blokId);
    herlaad();
  }, [uid, datum, staat.verzet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Slaap-begin/eind handmatig corrigeren — Garmin's nachtmeting zit soms mis.
  const wijzigSlaap = useCallback(async (begin, eind) => {
    if (!uid) return;
    const slaapOverride = { begin, eind };
    setStaat((s) => ({ ...s, garmin: metSlaapOverride(s.garmin, slaapOverride) }));
    await saveDag(uid, datum, { slaapOverride });
  }, [uid, datum]);

  // Herstelt de slaaptijden naar wat Garmin zelf meet (volgende herlaad).
  const herstelSlaap = useCallback(async () => {
    if (!uid) return;
    await verwijderSlaapOverride(uid, datum);
    herlaad();
  }, [uid, datum]); // eslint-disable-line react-hooks/exhaustive-deps

  // Expliciete maaltijdkeuze (wint altijd over de deterministische suggestie) —
  // opgeslagen in dagen/{datum}.maaltijdPlan, zelfde merge-patroon als verzet.
  const kiesMaaltijd = useCallback(async (moment, recipeId, aantalEters) => {
    if (!uid) return;
    const maaltijdPlan = { ...(staat.maaltijdPlan || {}), [moment]: { recipeId, aantalEters } };
    setStaat((s) => ({ ...s, maaltijdPlan }));
    await saveDag(uid, datum, { maaltijdPlan });
    herlaad();
  }, [uid, datum, staat.maaltijdPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  const herlaad = useCallback(() => setVersie((v) => v + 1), []);

  return { ...staat, toggleBlok, bewaarCheckin, verzetBlok, wijzigBlokTijd, herstelBlokTijd, wijzigSlaap, herstelSlaap, kiesMaaltijd, herlaad };
}

```

## `src/pages/Beheer.jsx`

```jsx
import { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { activeerPush } from '../services/push';
import { syncAgendaNu } from '../services/agenda';
import { PUSH_INTENSITEIT, APP_NAAM, DAGEN, DAG_NAMEN, SPORTEN, VOEDINGSDOELEN } from '../config/appConfig';
import { IcoBell, IcoLogout, IcoPlus, IcoTrash, IcoChevron } from '../components/Icons';

// Gedeelde beheer-helpers bovenop de SettingsContext.
function useBeheer() {
  const { instellingen: I, opslaan } = useSettings();
  const { toast } = useToast();
  const bewaar = (rubriek, patch) => opslaan(rubriek, patch);
  const bewaarMelding = async (rubriek, patch) => { await opslaan(rubriek, patch); toast('Bewaard.'); };
  return { I, bewaar, bewaarMelding, toast };
}

const CATEGORIEEN = [
  ['thema', 'Thema', 'Kleuren & uiterlijk'],
  ['meldingen', 'Meldingen', 'Push, tijden, categorieën, snooze'],
  ['ritme', 'Dagritme & agenda', 'Opstaan/slapen, iPhone-agenda'],
  ['werk', 'Werk', 'Uren, reistijden, streefuren'],
  ['sport', 'Sport & fiets', 'Judo-schema, fietsen'],
  ['voeding', 'Voeding & doelen', 'Eiwit, water, schermtijd'],
  ['account', 'Account', 'Aanmelding & afmelden'],
];

export default function Beheer() {
  return (
    <Routes>
      <Route index element={<Hub />} />
      <Route path="thema" element={<SubThema />} />
      <Route path="meldingen" element={<SubMeldingen />} />
      <Route path="ritme" element={<SubRitme />} />
      <Route path="werk" element={<SubWerk />} />
      <Route path="sport" element={<SubSport />} />
      <Route path="voeding" element={<SubVoeding />} />
      <Route path="account" element={<SubAccount />} />
    </Routes>
  );
}

function Hub() {
  return (
    <div className="stack reveal">
      <h1 style={{ margin: 0 }}>Beheer</h1>
      <section className="card" style={{ padding: '4px 16px' }}>
        {CATEGORIEEN.map(([key, titel, sub]) => (
          <Link key={key} to={`/beheer/${key}`} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{titel}</div>
              <div className="small dim">{sub}</div>
            </div>
            <IcoChevron width={18} height={18} style={{ color: 'var(--text-dim)' }} />
          </Link>
        ))}
      </section>
      <p className="small dim center" style={{ margin: 0 }}>App-versie: {__BUILD_TIME__}</p>
    </div>
  );
}

function Sub({ titel, children }) {
  return (
    <div className="stack reveal">
      <div className="row" style={{ gap: 10 }}>
        <Link to="/beheer" className="icon-btn" aria-label="Terug naar beheer" style={{ transform: 'scaleX(-1)' }}>
          <IcoChevron width={22} height={22} />
        </Link>
        <h1 style={{ margin: 0 }}>{titel}</h1>
      </div>
      {children}
    </div>
  );
}

const Laden = () => <div className="empty">Instellingen laden…</div>;

// ─── Thema ───────────────────────────────────────────────────────────────
function SubThema() {
  const { I, bewaar } = useBeheer();
  const { thema, setThema, themas } = useTheme();
  if (!I) return <Laden />;
  return (
    <Sub titel="Thema">
      <section className="card">
        <div className="row wrap" style={{ gap: 10 }}>
          {themas.map((t) => (
            <button key={t.id} className={'btn' + (thema === t.id ? ' primary' : '')}
              onClick={() => { setThema(t.id); bewaar('algemeen', { thema: t.id }); }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: t.kleur, display: 'inline-block' }} />
              {t.naam}
            </button>
          ))}
        </div>
      </section>
    </Sub>
  );
}

// ─── Meldingen ───────────────────────────────────────────────────────────
function SubMeldingen() {
  const { I, bewaar, bewaarMelding, toast } = useBeheer();
  const { user } = useAuth();
  if (!I) return <Laden />;
  const zetPush = async () => {
    try { await activeerPush(user.uid); toast('Meldingen geactiveerd op dit toestel.'); }
    catch (e) { toast(e.message); }
  };
  const snoozeActief = I.push?.snoozeTot && Date.parse(I.push.snoozeTot) > Date.now();
  const snoozeLabel = snoozeActief ? new Date(I.push.snoozeTot).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }) : '';
  const snooze = (uren) => bewaarMelding('push', { snoozeTot: new Date(Date.now() + uren * 3600000).toISOString() });
  return (
    <Sub titel="Meldingen">
      <section className="card stack">
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
        {[['ochtend', 'Ochtendbriefing'], ['readiness', 'Readiness-check'], ['slot', 'Herinnering per tijdslot'],
          ['avond', 'Avondvooruitblik'], ['antiscroll', 'Anti-scroll nudges']].map(([key, label]) => (
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
              : <><button className="btn sm" onClick={() => snooze(1)}>1u</button>
                  <button className="btn sm" onClick={() => snooze(3)}>3u</button></>}
          </div>
        </div>
        <p className="small dim" style={{ margin: 0 }}>Tip: voeg de app toe aan je iPhone-beginscherm — anders kan iOS geen push tonen.</p>
      </section>
    </Sub>
  );
}

// ─── Dagritme & agenda ───────────────────────────────────────────────────
function SubRitme() {
  const { I, bewaar, bewaarMelding } = useBeheer();
  const [agenda, setAgenda] = useState(null);
  if (!I) return <Laden />;
  const testAgenda = async () => {
    setAgenda({ laden: true });
    try { const r = await syncAgendaNu(); setAgenda(r); }
    catch (e) { setAgenda({ fout: e?.message || 'onbekende fout' }); }
  };
  return (
    <Sub titel="Dagritme & agenda">
      <section className="card stack">
        <div className="small dim">Werkdag-ritme</div>
        <TweeTijd a={['Opstaan', I.algemeen.opstaan, (v) => bewaar('algemeen', { opstaan: v })]}
          b={['Slapen', I.algemeen.slapen, (v) => bewaar('algemeen', { slapen: v })]} />
        <div className="small dim">Vrije-/vakantiedag-ritme</div>
        <TweeTijd a={['Opstaan (vrij)', I.algemeen.opstaanVrij, (v) => bewaar('algemeen', { opstaanVrij: v })]}
          b={['Slapen (vrij)', I.algemeen.slapenVrij, (v) => bewaar('algemeen', { slapenVrij: v })]} />
        <Veld label="iPhone-agenda — ICS-links (één per lijn)">
          <textarea className="input" rows={3} defaultValue={I.algemeen.icsUrl || ''}
            placeholder={'webcal://p..-caldav.icloud.com/published/..\nhttps://...rsca-matchen.ics'}
            onBlur={(e) => bewaarMelding('algemeen', { icsUrl: e.target.value })} />
        </Veld>
        <p className="small dim" style={{ margin: 0 }}>
          Plak je openbare iCloud-agendalink(en); meerdere onder elkaar mag (eigen agenda + RSCA).
          Alleen-lezen, elke 3 uur ververst. Maak de link: Agenda-app → <b>Agenda’s</b> → <b>ⓘ</b> →
          <b> Openbare agenda</b> aan → <b>Kopieer</b>.
        </p>
        <button className="btn block" onClick={testAgenda} disabled={agenda?.laden}>
          {agenda?.laden ? 'Inlezen…' : 'Agenda nu inlezen & testen'}
        </button>
        {agenda && !agenda.laden && !agenda.fout && (
          <div className="stack" style={{ gap: 4 }}>
            <div className="small" style={{ fontWeight: 600 }}>{agenda.aantal} afspraken uit {agenda.links} link(s)</div>
            {(agenda.perLink || []).map((p, i) => (
              <div key={i} className="small dim">{p.fout ? `⚠️ ${p.link} — ${p.fout}` : `✓ ${p.link} — ${p.aantal} afspraken`}</div>
            ))}
            {agenda.serverTijd && <div className="small dim">Serverklok (Brussel): {agenda.serverTijd}</div>}

            {(agenda.diagnose || []).length > 0 && (
              <details style={{ marginTop: 6 }}>
                <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>🔍 Tijd-diagnose ({agenda.diagnose.length})</summary>
                <div className="stack" style={{ gap: 8, marginTop: 8 }}>
                  {agenda.diagnose.map((d, i) => (
                    <div key={i} className="card tight stack" style={{ gap: 2 }}>
                      <div className="small" style={{ fontWeight: 600 }}>{d.titel || '(geen titel)'}</div>
                      <div className="small dim" style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{d.ruw}</div>
                      <div className="small">
                        → wordt <b>{d.heleDag ? 'hele dag' : d.start}</b> op {d.datum}
                        {' · '}{d.heeftZ ? 'UTC (Z)→Brussel' : d.wandklok ? 'wandklok (zoals bron)' : 'onbekend'}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {(agenda.opgeslagen || []).length > 0 && (
              <details>
                <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>💾 Opgeslagen ({agenda.opgeslagen.length})</summary>
                <div className="stack" style={{ gap: 2, marginTop: 8 }}>
                  {agenda.opgeslagen.map((e, i) => (
                    <div key={i} className="small dim">{e.datum} · <b>{e.start}{e.eind ? `–${e.eind}` : ''}</b> · {e.titel}</div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
        {agenda?.fout && <div className="small" style={{ color: 'var(--danger)' }}>Inlezen mislukt: {agenda.fout}</div>}
      </section>
    </Sub>
  );
}

// ─── Werk ────────────────────────────────────────────────────────────────
function SubWerk() {
  const { I, bewaar, bewaarMelding } = useBeheer();
  if (!I) return <Laden />;
  return (
    <Sub titel="Werk">
      <section className="card stack">
        <TweeTijd a={['Thuis start', I.werk.thuisStart, (v) => bewaar('werk', { thuisStart: v })]}
          b={['Thuis eind', I.werk.thuisEind, (v) => bewaar('werk', { thuisEind: v })]} />
        <TweeTijd a={['Kantoor start', I.werk.kantoorStart, (v) => bewaar('werk', { kantoorStart: v })]}
          b={['Kantoor eind', I.werk.kantoorEind, (v) => bewaar('werk', { kantoorEind: v })]} />
        <TweeTijd a={['Woensdag eind (judoles)', I.werk.woensdagEind, (v) => bewaar('werk', { woensdagEind: v })]}
          b={['Middagpauze (min)', I.werk.middagpauzeMin, (v) => bewaar('werk', { middagpauzeMin: Number(v) }), 'number']} />
        <TweeTijd a={['Reistijd auto (min)', I.werk.autoReisMin, (v) => bewaar('werk', { autoReisMin: Number(v) }), 'number']}
          b={['Reistijd fiets enkel (min)', I.werk.fietsReisMin, (v) => bewaar('werk', { fietsReisMin: Number(v) }), 'number']} />
        <Veld label="Streefuren werk per dag">
          <input className="input" type="number" defaultValue={I.werk.doelUrenPerDag}
            onBlur={(e) => bewaarMelding('werk', { doelUrenPerDag: Number(e.target.value) })} />
        </Veld>
      </section>
    </Sub>
  );
}

// ─── Sport & fiets ───────────────────────────────────────────────────────
function SubSport() {
  const { I, bewaar, bewaarMelding } = useBeheer();
  if (!I) return <Laden />;
  const lijst = (key) => I.sport?.[key] || [];
  const zetLijst = (key, list) => bewaar('sport', { [key]: list });
  const updateRij = (key, idx, patch) => zetLijst(key, lijst(key).map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const verwijderRij = (key, idx) => zetLijst(key, lijst(key).filter((_, i) => i !== idx));
  const voegToe = (key, item) => zetLijst(key, [...lijst(key), item]);
  const toggleElders = (d) => {
    const huidig = I.sport?.elderstrainenDagen || [];
    bewaar('sport', { elderstrainenDagen: huidig.includes(d) ? huidig.filter((x) => x !== d) : [...huidig, d] });
  };
  const zetSchemaDag = (d, sport) => bewaar('sport', { weekSchema: { ...(I.sport?.weekSchema || {}), [d]: sport } });
  const oefeningen = I.sport?.oefeningen || [];
  const updateOefening = (idx, patch) => bewaar('sport', { oefeningen: oefeningen.map((o, i) => (i === idx ? { ...o, ...patch } : o)) });
  const verwijderOefening = (idx) => bewaar('sport', { oefeningen: oefeningen.filter((_, i) => i !== idx) });
  const voegOefeningToe = () => bewaar('sport', { oefeningen: [...oefeningen, { id: `oef-${Date.now()}`, naam: '', waarom: '', sets: 3, reps: 12, categorie: 'kracht' }] });
  // Gewone render-functie (géén component) -> geen remount/focusverlies bij typen.
  const tijdRij = (key0, idx, r) => (
    <div className="row wrap" style={{ gap: 8 }}>
      <select className="select" style={{ width: 'auto' }} value={r.dag} onChange={(e) => updateRij(key0, idx, { dag: e.target.value })}>
        {DAGEN.map((d) => <option key={d} value={d}>{DAG_NAMEN[d]}</option>)}
      </select>
      <input className="input" type="time" style={{ width: 110 }} value={r.start || ''} onChange={(e) => updateRij(key0, idx, { start: e.target.value })} />
      <input className="input" type="time" style={{ width: 110 }} value={r.eind || ''} onChange={(e) => updateRij(key0, idx, { eind: e.target.value })} />
      <button className="icon-btn" onClick={() => verwijderRij(key0, idx)} aria-label="Verwijderen"><IcoTrash width={18} height={18} /></button>
    </div>
  );
  return (
    <Sub titel="Sport & fiets">
      <section className="card stack">
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
        <div className="card-title" style={{ margin: 0 }}>Eigen judotraining</div>
        {lijst('judoEigenClub').map((r, idx) => <div key={`e${idx}`}>{tijdRij('judoEigenClub', idx, r)}</div>)}
        <button className="btn sm" onClick={() => voegToe('judoEigenClub', { dag: 'wo', start: '20:00', eind: '21:30', rol: 'training' })}>
          <IcoPlus width={16} height={16} /> Training toevoegen
        </button>

        <div className="divider" />
        <div className="card-title" style={{ margin: 0 }}>Judoles geven</div>
        {lijst('judoLesgeven').map((r, idx) => (
          <div className="stack" style={{ gap: 6 }} key={`l${idx}`}>
            {tijdRij('judoLesgeven', idx, r)}
            <div className="row wrap" style={{ gap: 12 }}>
              <label className="row small" style={{ gap: 6 }}>
                Vertrek vooraf (min):
                <input className="input" type="number" style={{ width: 80, minHeight: 36 }} value={r.vertrekVoorMin ?? 30}
                  onChange={(e) => updateRij('judoLesgeven', idx, { vertrekVoorMin: Number(e.target.value) })} />
              </label>
              <label className="row small" style={{ gap: 6 }}>
                <input type="checkbox" checked={!!r.tijdensVakantie}
                  onChange={(e) => updateRij('judoLesgeven', idx, { tijdensVakantie: e.target.checked })} /> ook tijdens vakantie
              </label>
            </div>
          </div>
        ))}
        <button className="btn sm" onClick={() => voegToe('judoLesgeven', { dag: 'wo', start: '18:30', eind: '19:45', vertrekVoorMin: 30, tijdensVakantie: false })}>
          <IcoPlus width={16} height={16} /> Les toevoegen
        </button>

        <div className="divider" />
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
          “Vandaag” gebruikt dit schema: eigen trainingen worden vaste blokken; judoles geven plant ook
          een vertrek + snelle maaltijd ervoor (valt weg in vakantie tenzij aangevinkt).
        </p>

        <div className="divider" />
        <div className="card-title" style={{ margin: 0 }}>Sportschema (niet-judo dagen)</div>
        <div className="stack" style={{ gap: 6 }}>
          {DAGEN.map((d) => (
            <label className="row between" key={d}>
              <span>{DAG_NAMEN[d]}</span>
              <select className="select" style={{ width: 'auto' }} value={I.sport?.weekSchema?.[d] || 'rust'}
                onChange={(e) => zetSchemaDag(d, e.target.value)}>
                {Object.entries(SPORTEN).map(([key, s]) => <option key={key} value={key}>{s.naam}</option>)}
              </select>
            </label>
          ))}
        </div>
        <p className="small dim" style={{ margin: 0 }}>
          Op dagen met vaste judotraining/-les negeert de Coach dit schema automatisch. Bij laag herstel
          kiest de Coach zelf een lichtere sport in de plaats (met uitleg), in plaats van te schrappen.
        </p>

        <div className="divider" />
        <div className="card-title" style={{ margin: 0 }}>Home fitness-oefeningen</div>
        {oefeningen.map((o, idx) => (
          <div className="stack" style={{ gap: 6 }} key={o.id || idx}>
            <div className="row wrap" style={{ gap: 8 }}>
              <input className="input" style={{ minWidth: 160, flex: 1 }} value={o.naam} placeholder="Naam"
                onChange={(e) => updateOefening(idx, { naam: e.target.value })} />
              <input className="input" type="number" style={{ width: 70 }} value={o.sets ?? 3} placeholder="sets"
                onChange={(e) => updateOefening(idx, { sets: Number(e.target.value) })} />
              <input className="input" type="number" style={{ width: 70 }} value={o.reps ?? 12} placeholder="reps"
                onChange={(e) => updateOefening(idx, { reps: Number(e.target.value) })} />
              <button className="icon-btn" onClick={() => verwijderOefening(idx)} aria-label="Verwijderen"><IcoTrash width={18} height={18} /></button>
            </div>
            <input className="input" value={o.waarom || ''} placeholder="Waarom deze oefening?"
              onChange={(e) => updateOefening(idx, { waarom: e.target.value })} />
          </div>
        ))}
        <button className="btn sm" onClick={voegOefeningToe}>
          <IcoPlus width={16} height={16} /> Oefening toevoegen
        </button>
        <p className="small dim" style={{ margin: 0 }}>
          De Coach-pagina stelt hieruit elke home fitness-dag een sessie samen, met de “waarom” erbij.
        </p>
      </section>
    </Sub>
  );
}

// ─── Voeding & doelen ────────────────────────────────────────────────────
function SubVoeding() {
  const { I, bewaar, bewaarMelding } = useBeheer();
  if (!I) return <Laden />;
  const voeding = I.voeding || { doelen: ['onderhoud'], aantalEtersStandaard: 1, snacksAan: true };
  const toggleDoel = (key) => {
    const huidig = voeding.doelen || [];
    bewaar('voeding', { doelen: huidig.includes(key) ? huidig.filter((d) => d !== key) : [...huidig, key] });
  };
  return (
    <Sub titel="Voeding & doelen">
      <section className="card stack">
        <TweeTijd a={['Eiwitdoel (g/dag)', I.gezondheid.eiwitDoelG, (v) => bewaar('gezondheid', { eiwitDoelG: Number(v) }), 'number']}
          b={['Waterdoel (L/dag)', I.gezondheid.waterDoelL, (v) => bewaar('gezondheid', { waterDoelL: Number(v) }), 'number']} />
        <Veld label="Schermtijd-doel (min/dag)">
          <input className="input" type="number" defaultValue={I.gezondheid.schermtijdDoelMin}
            onBlur={(e) => bewaarMelding('gezondheid', { schermtijdDoelMin: Number(e.target.value) })} />
        </Veld>
        <Veld label="Stappendoel (per dag)">
          <input className="input" type="number" defaultValue={I.gezondheid.stappenDoel ?? 8000}
            onBlur={(e) => bewaarMelding('gezondheid', { stappenDoel: Number(e.target.value) })} />
        </Veld>
        <p className="small dim" style={{ margin: 0 }}>
          Bij dit aantal stappen verschijnt een badge bij “stappen” op het Dashboard.
        </p>

        <div className="divider" />
        <div className="card-title" style={{ margin: 0 }}>Maaltijdplanning</div>
        <div className="field">
          <label>Voedingsdoelen <span className="small dim">(meerdere combineerbaar)</span></label>
          <div className="row wrap" style={{ gap: 6 }}>
            {Object.entries(VOEDINGSDOELEN).map(([k, v]) => (
              <button key={k} type="button" className={'btn sm' + ((voeding.doelen || []).includes(k) ? ' primary' : ' ghost')}
                onClick={() => toggleDoel(k)}>{v.kort}</button>
            ))}
          </div>
        </div>
        <Veld label="Aantal eters (standaard)">
          <input className="input" type="number" min="1" defaultValue={voeding.aantalEtersStandaard ?? 1}
            onBlur={(e) => bewaarMelding('voeding', { aantalEtersStandaard: Math.max(1, Number(e.target.value) || 1) })} />
        </Veld>
        <label className="row between">
          <span>Snacks inplannen (3 momenten/dag)</span>
          <input type="checkbox" checked={voeding.snacksAan !== false}
            onChange={(e) => bewaarMelding('voeding', { snacksAan: e.target.checked })} style={{ width: 22, height: 22 }} />
        </label>
        <p className="small dim" style={{ margin: 0 }}>
          Bepaalt welke maaltijdsuggesties de Coach toont bij “Vandaag kiezen” (Maaltijden-pagina) en in de
          dagplanning — per maaltijd kan je het aantal eters daar nog overschrijven.
        </p>
      </section>
    </Sub>
  );
}

// ─── Account ─────────────────────────────────────────────────────────────
function SubAccount() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <Sub titel="Account">
      <section className="card stack">
        <p className="small dim" style={{ margin: 0 }}>Aangemeld als {user?.email} · {APP_NAAM}</p>
        <button className="btn danger block" onClick={() => logout().then(() => navigate('/login'))}>
          <IcoLogout width={18} height={18} /> Afmelden
        </button>
      </section>
    </Sub>
  );
}

// ─── Herbruikbare velden ─────────────────────────────────────────────────
const Veld = ({ label, children }) => (<div className="field"><label>{label}</label>{children}</div>);

function TweeTijd({ a, b }) {
  const render = ([label, waarde, onChange, type = 'time']) => (
    <div className="field grow">
      <label>{label}</label>
      <input className="input" type={type} defaultValue={waarde} onBlur={(e) => onChange(e.target.value)} />
    </div>
  );
  return <div className="row wrap" style={{ gap: 12 }}>{render(a)}{render(b)}</div>;
}

```

## `src/pages/Coach.jsx`

```jsx
import { useState } from 'react';
import { useDagPlan } from '../hooks/useDagPlan';
import { datumKey, dagKortVanDatum } from '../services/tijd';
import { kiesSportVanDag, genereerSportInhoud } from '../services/sportcoach';
import { SPORTEN } from '../config/appConfig';
import Daypicker from '../components/Daypicker';
import { IcoChevron, IcoBolt, IcoBike, IcoWalk, IcoMoon } from '../components/Icons';

const datumLabel = (d) => d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });

const SPORT_ICOON = { homefitness: IcoBolt, fietsen: IcoBike, wandelen: IcoWalk, rust: IcoMoon };

export default function Coach() {
  const [datumObj, setDatumObj] = useState(() => new Date());
  const isToday = datumKey(datumObj) === datumKey(new Date());
  const naarDag = (delta) => setDatumObj((d) => { const nd = new Date(d); nd.setDate(nd.getDate() + delta); return nd; });

  const { laden, plan, garmin, instellingen, advies, weer, vermijdSporten } = useDagPlan(datumObj);

  return (
    <div className="stack reveal">
      <div className="row between" style={{ gap: 8 }}>
        <button className="icon-btn" aria-label="Vorige dag" onClick={() => naarDag(-1)}>
          <IcoChevron width={18} height={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <Daypicker datum={datumObj} onKies={setDatumObj} />
        <button className="icon-btn" aria-label="Volgende dag" onClick={() => naarDag(1)}>
          <IcoChevron width={18} height={18} />
        </button>
        <button className="btn sm" disabled={isToday} onClick={() => setDatumObj(new Date())}>Vandaag</button>
      </div>
      <h1 style={{ margin: 0 }}>Coach</h1>
      <p className="small dim" style={{ margin: 0, textTransform: 'capitalize' }}>{datumLabel(datumObj)}</p>

      {laden || !instellingen || !advies ? (
        <div className="empty">Laden…</div>
      ) : (
        <CoachInhoud datumObj={datumObj} plan={plan} garmin={garmin} instellingen={instellingen}
          advies={advies} weer={weer} vermijdSporten={vermijdSporten} />
      )}
    </div>
  );
}

function CoachInhoud({ datumObj, plan, garmin, instellingen, advies, weer, vermijdSporten = [] }) {
  const dagKort = dagKortVanDatum(datumObj);
  const datum = datumKey(datumObj);
  const judoVandaag = (plan?.blokken || []).some((b) => b.type === 'judo' || b.type === 'lesgeven');

  const keuze = kiesSportVanDag({
    dagKort, weekSchema: instellingen.sport?.weekSchema, niveau: advies.niveau, judoVandaag, weer, vermijdSporten,
  });

  const inhoud = genereerSportInhoud({
    sport: keuze.sport, niveau: advies.niveau, oefeningen: instellingen.sport?.oefeningen,
    garmin, stappenDoel: instellingen.gezondheid?.stappenDoel, datum, weer,
  });

  const Icoon = SPORT_ICOON[keuze.sport];
  const naam = keuze.sport === 'judo' ? 'Judo' : (SPORTEN[keuze.sport]?.naam || 'Rustdag');

  return (
    <section className="card stack" style={{ gap: 14 }}>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        {Icoon && <Icoon width={22} height={22} style={{ color: 'var(--primary)' }} />}
        <div className="card-title" style={{ margin: 0 }}>{naam}</div>
      </div>

      {keuze.overschreven && (
        <p className="small" style={{ color: 'var(--warning)', margin: 0 }}>
          Aangepast t.o.v. gepland ({SPORTEN[keuze.gepland]?.naam}): {keuze.waarom.join(' ')}
        </p>
      )}

      {inhoud.type === 'homefitness' && (
        inhoud.oefeningen.length ? (
          <ul className="stack" style={{ gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
            {inhoud.oefeningen.map((o, idx) => (
              <li key={o.id || idx} className="stack" style={{ gap: 2 }}>
                <div className="row between" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{o.naam}</span>
                  <span className="small dim">{o.sets} × {o.reps}</span>
                </div>
                {o.waarom && <p className="small dim" style={{ margin: 0 }}>{o.waarom}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>{inhoud.waarom[0]}</p>
        )
      )}

      {inhoud.type === 'fietsen' && (
        <div className="stack" style={{ gap: 4 }}>
          <p style={{ margin: 0 }}>±{inhoud.km} km (~{inhoud.minuten} min)</p>
          <p className="small dim" style={{ margin: 0 }}>{inhoud.zoneTekst}</p>
        </div>
      )}

      {inhoud.type === 'wandelen' && (
        <div className="stack" style={{ gap: 4 }}>
          <p style={{ margin: 0 }}>
            {inhoud.stappenAdvies != null
              ? `Nog ±${inhoud.stappenAdvies.toLocaleString('nl-BE')} stappen (±${inhoud.km} km)`
              : `±${inhoud.km} km`}
          </p>
        </div>
      )}

      {(inhoud.type === 'judo' || inhoud.type === 'rust') && (
        <p className="small muted" style={{ margin: 0 }}>{inhoud.waarom[0]}</p>
      )}

      <details>
        <summary className="small dim" style={{ cursor: 'pointer' }}>Waarom dit advies?</summary>
        <ul className="small dim" style={{ marginTop: 8 }}>
          {inhoud.type !== 'judo' && inhoud.type !== 'rust' && inhoud.waarom.map((w, i) => <li key={`i${i}`}>{w}</li>)}
          {advies.waarom.map((w, i) => <li key={`a${i}`}>{w}</li>)}
        </ul>
        <p className="small dim" style={{ margin: 0 }}>
          Zekerheid: {advies.zekerheid} · Bronnen: {advies.databronnen.join(', ')}
        </p>
      </details>
    </section>
  );
}

```

## `src/pages/Dashboard.jsx`

```jsx
import { useEffect, useMemo, useState } from 'react';
import { useDagPlan } from '../hooks/useDagPlan';
import { useAuth } from '../contexts/AuthContext';
import { BLOK_TYPES } from '../config/appConfig';
import { toMin, nuMin, toHHMM, datumKey } from '../services/tijd';
import { syncStatus } from '../services/garmin';
import { getDagCached } from '../services/data';
import { noordster } from '../services/noordster';
import { IcoCheck, IcoMoon, IcoHeart, IcoFlame, IcoClock, IcoPulse, IcoChevron, IcoEdit, IcoBadge } from '../components/Icons';
import CoachKaart from '../components/CoachKaart';
import BelastingKaart from '../components/BelastingKaart';
import CheckinKaart from '../components/CheckinKaart';
import NoordsterKaart from '../components/NoordsterKaart';
import Daypicker from '../components/Daypicker';

function tijdvak() {
  const h = new Date().getHours();
  if (h < 6) return { groet: 'Goeienacht', aura: '#818cf8' };
  if (h < 12) return { groet: 'Goeiemorgen', aura: '#f59e0b' };
  if (h < 18) return { groet: 'Goeiemiddag', aura: '#2dd4bf' };
  return { groet: 'Goeienavond', aura: '#a78bfa' };
}
const datumLabel = (d = new Date()) =>
  d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Dashboard() {
  const [datumObj, setDatumObj] = useState(() => new Date());
  const isToday = datumKey(datumObj) === datumKey(new Date());
  const isFuture = datumKey(datumObj) > datumKey(new Date());
  const naarDag = (delta) => setDatumObj((d) => { const nd = new Date(d); nd.setDate(nd.getDate() + delta); return nd; });

  const { laden, plan, garmin, gedaan, toggleBlok, verzetBlok, wijzigBlokTijd, herstelBlokTijd, wijzigSlaap, herstelSlaap, instellingen, blessureActief, garminSync, checkin, bewaarCheckin, acwr, periodisering, vakantieType } = useDagPlan(datumObj);
  const { user } = useAuth();
  const [popId, setPopId] = useState(null);
  const [ns, setNs] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editStart, setEditStart] = useState('');
  const [editEind, setEditEind] = useState('');

  // North Star (consistentie) over de laatste 7 dagen — cache-eerst, dus goedkoop.
  useEffect(() => {
    if (!user) return;
    let actief = true;
    (async () => {
      const dagen = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dagen.push(datumKey(d));
      }
      const docs = await Promise.all(dagen.map((dk) => getDagCached(user.uid, dk)));
      if (actief) setNs(noordster(docs));
    })();
    return () => { actief = false; };
  }, [user, gedaan]);

  // Reva-blokken met een oefeningen-checklist tellen per oefening (composite id
  // `${blokId}::${oefeningId}`), niet als één geheel — zo blijft North Star precies
  // ook als je maar de helft van de oefeningen deed.
  const checkbare = useMemo(() => {
    const items = [];
    (plan?.blokken || []).forEach((b) => {
      if (b.type === 'reva' && b.oefeningen?.length) {
        b.oefeningen.forEach((o) => items.push({ id: `${b.id}::${o.id}`, start: b.start, eind: b.eind, titel: o.naam, taakId: null }));
      } else if (['taak', 'judo', 'agenda'].includes(b.bron) || b.type === 'sport' || b.type === 'reva') {
        items.push(b);
      }
    });
    return items;
  }, [plan]);
  const aantalGedaan = checkbare.filter((b) => gedaan?.[b.id]).length;
  const pct = checkbare.length ? Math.round((aantalGedaan / checkbare.length) * 100) : 0;

  if (laden) return <div className="empty">Je dag wordt geladen…</div>;

  const now = nuMin();
  const vak = tijdvak();
  const tik = (id, taakId) => { setPopId(id); toggleBlok(id, taakId); setTimeout(() => setPopId(null), 360); };

  // Tijd van een blok aanpassen — bewerkbaar op elke dag, niet enkel gemiste blokken.
  const beginBewerken = (b) => { setEditId(b.id); setEditStart(b.start); setEditEind(b.eind); };
  const stopBewerken = () => setEditId(null);
  const bewaarBewerking = () => {
    if (toMin(editEind) <= toMin(editStart)) return;
    wijzigBlokTijd(editId, editStart, editEind);
    setEditId(null);
  };

  // Gemiste sleutelblokken: vandaag enkel de voorbije + niet-afgevinkte; op een
  // voorbije dag is de hele dag al "voorbij", dus telt elk nog open blok. Op een
  // toekomstige dag is nog niets "gemist" — die dag is nog niet aan de beurt.
  const gemist = isFuture ? []
    : isToday ? checkbare.filter((b) => toMin(b.eind) <= now && !gedaan?.[b.id])
    : checkbare.filter((b) => !gedaan?.[b.id]);

  return (
    <div className="stack reveal">
      <header className="hero" style={{ '--aura': vak.aura, '--i': 0 }}>
        <h1>{vak.groet}<span className="accent">.</span></h1>
        <span className="muted" style={{ textTransform: 'capitalize' }}>{datumLabel(datumObj)}</span>
      </header>

      {/* Datumkiezer: vorige/volgende dag, vrij kiezen via kalender, of terug naar vandaag —
          zowel voor correcties op voorbije dagen als om toekomstige planning te bekijken */}
      <div className="row between" style={{ '--i': 0, gap: 8 }}>
        <button className="icon-btn" aria-label="Vorige dag" onClick={() => naarDag(-1)}>
          <IcoChevron width={18} height={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <Daypicker datum={datumObj} onKies={setDatumObj} />
        <button className="icon-btn" aria-label="Volgende dag" onClick={() => naarDag(1)}>
          <IcoChevron width={18} height={18} />
        </button>
        <button className="btn sm" disabled={isToday} onClick={() => setDatumObj(new Date())}>Vandaag</button>
      </div>
      {!isToday && (
        <p className="small muted" style={{ margin: 0 }}>
          {isFuture
            ? 'Je bekijkt een toekomstige dag — dit is je geplande dag, nog niets om af te vinken.'
            : 'Je bekijkt een voorbije dag — vink blokken af om die dag te corrigeren. Wijzigingen aan gewoonte-taken kunnen de streak-telling beïnvloeden.'}
        </p>
      )}

      {/* Gezondheid: ring + inline stats (geen 4 identieke kaartjes) */}
      <GezondheidKaart garmin={garmin} garminSync={garminSync} stappenDoel={instellingen?.gezondheid?.stappenDoel}
        wijzigSlaap={wijzigSlaap} herstelSlaap={herstelSlaap} i={1} />

      {/* Dagelijkse check-in (stemming/energie 's ochtends, reflectie 's avonds) — enkel vandaag */}
      {isToday && <CheckinKaart checkin={checkin} bewaar={bewaarCheckin} i={2} />}

      {/* North Star: consistentie over de laatste 7 dagen — enkel vandaag relevant */}
      {isToday && ns && ns.score != null && <NoordsterKaart ns={ns} i={2} />}

      {/* Coach-advies van de dag — enkel vandaag */}
      {isToday && (garmin?.readiness != null || garmin?.bodyBattery != null || blessureActief || checkin?.pijn > 0) && (
        <CoachKaart garmin={garmin} goal={instellingen?.gezondheid?.doel}
          blessureActief={blessureActief} energie={checkin?.ochtend?.energie} acwrZone={acwr?.zone}
          pijn={checkin?.pijn > 0 ? checkin.pijn : null} periodiseringFase={periodisering?.fase} vakantieType={vakantieType} />
      )}

      {/* Belasting & herstel — enkel vandaag */}
      {isToday && (garmin?.trainingStatus || (acwr && acwr.ratio != null)) && <BelastingKaart garmin={garmin} acwr={acwr} periodisering={periodisering} />}

      {/* Advies */}
      {plan.advies?.tekst?.length > 0 && (
        <section className="card" style={{ '--i': 2 }}>
          <div className="card-title">Advies {isToday ? 'vandaag' : 'die dag'}</div>
          <ul className="stack" style={{ margin: 0, paddingLeft: 18, gap: 6 }}>
            {plan.advies.tekst.map((t, idx) => <li key={idx} className="small">{t}</li>)}
          </ul>
        </section>
      )}

      {/* Voortgang */}
      <section className="card" style={{ '--i': 3 }}>
        <div className="row between">
          <div className="card-title" style={{ margin: 0 }}>Voortgang {isToday ? 'vandaag' : 'die dag'}</div>
          <span className="badge accent">{aantalGedaan}/{checkbare.length || 0}</span>
        </div>
        <div className="progress shine" style={{ marginTop: 12 }}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
          {pct === 100 && checkbare.length ? '🎉 Alles afgewerkt — sterk!'
            : pct >= 60 ? 'Goed bezig, hou vol!'
            : pct > 0 ? 'Mooie start. Volgende blok wacht.'
            : 'Begin met je eerstvolgende blok.'}
        </p>
      </section>

      {/* In te halen: gemiste sleutelblokken — geen verwijt, wel een herkansing.
          Op een voorbije dag heeft "verzetten naar later vandaag" geen betekenis,
          dus blijft daar enkel de directe correctie ("Toch gedaan") over. */}
      {gemist.length > 0 && (
        <section className="card stack" style={{ '--i': 4, gap: 10 }}>
          <div className="card-title" style={{ margin: 0 }}>Nog in te halen</div>
          <p className="small muted" style={{ margin: 0 }}>
            {isToday
              ? 'Een blok gemist? Geen probleem — vink het alsnog af of schuif het naar later vandaag.'
              : 'Nog openstaande blokken die dag — vink alsnog af wat je wel deed.'}
          </p>
          {gemist.map((b) => (
            <div className="row between" key={b.id} style={{ gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{b.titel}</div>
                <div className="small dim">stond gepland {b.start}–{b.eind}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                {isToday && <button className="btn sm" onClick={() => verzetBlok(b.id)}>Verzet</button>}
                <button className="btn sm primary" onClick={() => tik(b.id, b.taakId)}>Toch gedaan</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Losse to-do's */}
      {plan.todos?.length > 0 && (
        <section className="card" style={{ '--i': 4 }}>
          <div className="card-title">Nog te doen vandaag</div>
          <div className="stack" style={{ gap: 8 }}>
            {plan.todos.map((t) => {
              const id = `todo-${t.taakId}`;
              const on = !!gedaan?.[id];
              return (
                <button key={id} className="row" onClick={() => tik(id, t.taakId)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                  <span className={'tl-check' + (on ? ' on' : '') + (popId === id ? ' pop' : '')} aria-hidden>
                    {on && <IcoCheck width={16} height={16} />}
                  </span>
                  <span style={{ textDecoration: on ? 'line-through' : 'none', color: on ? 'var(--text-dim)' : 'var(--text)' }}>
                    {t.titel}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Tijdlijn */}
      <section className="stack" style={{ gap: 4, '--i': 5 }}>
        <div className="row between">
          <h2 style={{ margin: '4px 0' }}>Je dag</h2>
          {isToday && <span className="badge"><IcoClock width={14} height={14} /> {toHHMM(now)}</span>}
        </div>
        <div className="timeline">
          {plan.blokken.map((b) => {
            const isNu = isToday && toMin(b.start) <= now && now < toMin(b.eind);
            const isRevaChecklist = b.type === 'reva' && b.oefeningen?.length > 0;
            const checkbaar = !isRevaChecklist && checkbare.some((c) => c.id === b.id);
            const on = !!gedaan?.[b.id];
            const bewerkt = editId === b.id;
            return (
              <div className="tl-item" key={b.id}>
                <div className="tl-time row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                  {isNu && <span className="now-dot" aria-hidden />}{b.start}
                </div>
                <div className={'tl-body' + (on ? ' done' : '') + (isNu ? ' now' : '')}
                  style={{ '--block': b.kleur }}>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="tl-title">
                      {b.titel}{b.conflict && <span className="badge bad small" style={{ marginLeft: 8 }}>conflict</span>}
                    </div>
                    {bewerkt ? (
                      <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <input type="time" className="input sm" value={editStart}
                          onChange={(e) => setEditStart(e.target.value)} />
                        <span className="dim">–</span>
                        <input type="time" className="input sm" value={editEind}
                          onChange={(e) => setEditEind(e.target.value)} />
                        <button className="btn sm primary" onClick={bewaarBewerking}>Bewaar</button>
                        <button className="btn sm" onClick={stopBewerken}>Annuleer</button>
                      </div>
                    ) : (
                      <div className="small dim">
                        {b.start}–{b.eind} · {BLOK_TYPES[b.type]?.naam || b.type}
                        {b.detail ? ` · ${b.detail}` : ''}
                        {b.verzet && (
                          <button className="btn sm ghost" style={{ marginLeft: 8, padding: '0 6px' }}
                            onClick={() => herstelBlokTijd(b.id)}>Terug naar gepland tijdstip</button>
                        )}
                      </div>
                    )}
                    {isRevaChecklist && !isFuture && (
                      <div className="stack" style={{ gap: 4, marginTop: 8 }}>
                        {b.oefeningen.map((o) => {
                          const oId = `${b.id}::${o.id}`;
                          const oOn = !!gedaan?.[oId];
                          return (
                            <button key={oId} className="row" onClick={() => tik(oId, null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, gap: 8 }}>
                              <span className={'tl-check' + (oOn ? ' on' : '') + (popId === oId ? ' pop' : '')} aria-hidden>
                                {oOn && <IcoCheck width={14} height={14} />}
                              </span>
                              <span className="small" style={{ textDecoration: oOn ? 'line-through' : 'none', color: oOn ? 'var(--text-dim)' : 'var(--text)' }}>
                                {o.naam}{o.sets ? ` · ${o.sets}` : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {!bewerkt && (
                    <button className="icon-btn" aria-label="Tijd aanpassen" onClick={() => beginBewerken(b)}>
                      <IcoEdit width={16} height={16} />
                    </button>
                  )}
                  {checkbaar && !bewerkt && !isFuture && (
                    <button className={'tl-check' + (on ? ' on' : '') + (popId === b.id ? ' pop' : '')}
                      onClick={() => tik(b.id, b.taakId)}
                      aria-label={on ? 'Ongedaan maken' : 'Afvinken'}>
                      {on && <IcoCheck width={16} height={16} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function GezondheidKaart({ garmin, garminSync, stappenDoel, wijzigSlaap, herstelSlaap, i }) {
  const s = syncStatus(garminSync);
  const [slaapBewerken, setSlaapBewerken] = useState(false);
  const [begin, setBegin] = useState('');
  const [eind, setEind] = useState('');
  if (!garmin || (garmin.readiness == null && garmin.slaapUren == null)) {
    return (
      <section className="card" style={{ '--i': i }}>
        <div className="card-title">Gezondheid</div>
        <p className="small muted" style={{ margin: 0 }}>
          {s.leeg
            ? 'Nog geen Garmin-data. Koppel Garmin (zie README); de ochtendsync vult readiness, slaap en stappen vanzelf in.'
            : `Geen verse data voor vandaag. ${s.tekst}.`}
        </p>
      </section>
    );
  }
  const r = garmin.readiness;
  const kleur = r == null ? 'var(--text-dim)' : r >= 65 ? 'var(--success)' : r >= 40 ? 'var(--warning)' : 'var(--danger)';
  const doelBehaald = stappenDoel && garmin.stappen != null && garmin.stappen >= stappenDoel;
  const beginSlaapBewerken = () => { setBegin(garmin.slaapBegin || '23:00'); setEind(garmin.slaapEind || '07:00'); setSlaapBewerken(true); };
  const bewaarSlaap = () => { wijzigSlaap(begin, eind); setSlaapBewerken(false); };
  return (
    <section className="card stack" style={{ '--i': i, gap: 12 }}>
      <div className="row" style={{ gap: 18, alignItems: 'center' }}>
        <div className="ring anim" style={{ '--val': r ?? 0, '--primary': kleur }}>
          <div style={{ display: 'grid', placeItems: 'center', gap: 1 }}>
            <span className="ring-v">{r ?? '—'}</span>
            <span className="ring-l">readiness</span>
          </div>
        </div>
        <div className="statline grow">
          <div className="stat"><IcoMoon className="si" width={16} height={16} />
            <span className="sv">{garmin.slaapUren != null ? garmin.slaapUren.toFixed(1) + 'u' : '—'}</span>
            <span className="sl">slaap</span></div>
          <div className="stat"><IcoHeart className="si" width={16} height={16} />
            <span className="sv">{garmin.rustHr ?? '—'}</span><span className="sl">rust-HR</span></div>
          <div className="stat"><IcoFlame className="si" width={16} height={16} />
            <span className="sv">{garmin.stappen != null ? (garmin.stappen / 1000).toFixed(1) + 'k' : '—'}</span>
            <span className="sl">stappen</span>
            {doelBehaald && <IcoBadge width={15} height={15} style={{ color: 'var(--warning)' }} aria-label="Stappendoel behaald" />}
          </div>
          <div className="stat"><IcoPulse className="si" width={16} height={16} />
            <span className="sv">{garmin.hrvStatus || '—'}</span><span className="sl">HRV</span></div>
        </div>
      </div>
      {wijzigSlaap && (garmin.slaapBegin || garmin.slaapEind || garmin.slaapUren != null) && (
        slaapBewerken ? (
          <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
            <input className="input" type="time" value={begin} onChange={(e) => setBegin(e.target.value)} style={{ minHeight: 36, width: 110 }} />
            <span className="small dim">tot</span>
            <input className="input" type="time" value={eind} onChange={(e) => setEind(e.target.value)} style={{ minHeight: 36, width: 110 }} />
            <button className="btn sm primary" onClick={bewaarSlaap}>Bewaar</button>
            <button className="btn sm" onClick={() => setSlaapBewerken(false)}>Annuleer</button>
          </div>
        ) : (
          <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
            <span className="small dim">
              {garmin.slaapBegin && garmin.slaapEind ? `Geslapen: ${garmin.slaapBegin} – ${garmin.slaapEind}` : 'Slaaptijden onbekend'}
              {garmin.slaapOverride && ' (handmatig gecorrigeerd)'}
            </span>
            <button className="icon-btn" aria-label="Slaaptijden corrigeren" onClick={beginSlaapBewerken}>
              <IcoEdit width={15} height={15} />
            </button>
            {garmin.slaapOverride && (
              <button className="btn sm ghost" onClick={herstelSlaap}>Terug naar Garmin-data</button>
            )}
          </div>
        )
      )}
      {s.stale && !s.leeg && (
        <div className="small" style={{ color: 'var(--warning)', margin: 0 }}>⚠ {s.tekst} — Garmin-sync hapert mogelijk.</div>
      )}
    </section>
  );
}

```

## `src/pages/Gezondheid.jsx`

```jsx
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

```

## `src/pages/Login.jsx`

```jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { APP_NAAM } from '../config/appConfig';

const fouten = {
  'auth/invalid-credential': 'E-mail of wachtwoord klopt niet.',
  'auth/invalid-email': 'Ongeldig e-mailadres.',
  'auth/user-not-found': 'Geen account met dit e-mailadres.',
  'auth/wrong-password': 'Verkeerd wachtwoord.',
  'auth/too-many-requests': 'Te veel pogingen. Probeer straks opnieuw.',
};

export default function Login() {
  const { login, wachtwoordVergeten } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [ww, setWw] = useState('');
  const [bezig, setBezig] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBezig(true);
    try {
      await login(email.trim(), ww);
    } catch (err) {
      toast(fouten[err?.code] || 'Aanmelden mislukt.');
    } finally {
      setBezig(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) return toast('Vul eerst je e-mailadres in.');
    try {
      await wachtwoordVergeten(email.trim());
      toast('Reset-mail verstuurd (check ook spam).');
    } catch {
      toast('Kon reset-mail niet versturen.');
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
      <div className="aurora rich" aria-hidden />
      <div className="card stack" style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        <div className="center stack" style={{ gap: 4 }}>
          <img src="/icon.svg" alt="" width="56" height="56" style={{ margin: '0 auto 6px' }} />
          <h1>{APP_NAAM}</h1>
          <p className="muted small">Meld je aan om verder te gaan</p>
        </div>
        <form className="stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">E-mailadres</label>
            <input id="email" className="input" type="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="ww">Wachtwoord</label>
            <input id="ww" className="input" type="password" autoComplete="current-password"
              value={ww} onChange={(e) => setWw(e.target.value)} required />
          </div>
          <button className="btn primary block" type="submit" disabled={bezig}>
            {bezig ? 'Bezig…' : 'Aanmelden'}
          </button>
        </form>
        <button className="btn ghost sm" onClick={reset}>Wachtwoord vergeten?</button>
      </div>
    </div>
  );
}

```

## `src/pages/Maaltijden.jsx`

```jsx
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

```

## `src/pages/Taken.jsx`

```jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { subscribeCollection, addItem, updateItem, deleteItem } from '../services/data';
import { BLOK_TYPES, DAGEN, DAG_NAMEN } from '../config/appConfig';
import { IcoPlus, IcoTrash, IcoEdit, IcoFlame } from '../components/Icons';

const LEEG = { titel: '', type: 'gewoonte', dagen: [...DAGEN], tijd: '', blokType: 'routine', duurMin: 15, actief: true };

export default function Taken() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taken, setTaken] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(LEEG);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeCollection(user.uid, 'taken', (items) =>
      setTaken(items.sort((a, b) => (a.volgorde || 99) - (b.volgorde || 99))));
  }, [user]);

  const start = (t) => {
    if (t) { setEditId(t.id); setForm({ ...LEEG, ...t, tijd: t.tijd || '' }); }
    else { setEditId(null); setForm(LEEG); }
    setOpen(true);
  };

  const bewaar = async () => {
    if (!form.titel.trim()) return toast('Geef een titel.');
    const payload = {
      titel: form.titel.trim(), type: form.type, dagen: form.dagen,
      tijd: form.tijd || null, blokType: form.blokType, duurMin: Number(form.duurMin) || 15,
      actief: form.actief !== false,
    };
    if (editId) await updateItem(user.uid, 'taken', editId, payload);
    else await addItem(user.uid, 'taken', { ...payload, streak: 0, beste: 0, volgorde: taken.length + 1 });
    setOpen(false);
    toast('Bewaard.');
  };

  const verwijder = async (id) => {
    await deleteItem(user.uid, 'taken', id);
    toast('Verwijderd.');
  };

  const toggleDag = (d) =>
    setForm((f) => ({ ...f, dagen: f.dagen.includes(d) ? f.dagen.filter((x) => x !== d) : [...f.dagen, d] }));

  return (
    <div className="stack reveal">
      <div className="row between">
        <h1 style={{ margin: 0 }}>Taken & gewoontes</h1>
        <button className="btn primary sm" onClick={() => start(null)}><IcoPlus width={18} height={18} /> Nieuw</button>
      </div>

      {taken.length === 0 && <div className="empty">Nog geen taken. Voeg je eerste gewoonte toe.</div>}

      <div className="stack" style={{ gap: 10 }}>
        {taken.map((t) => (
          <div className="card tight row between" key={t.id} style={{ opacity: t.actief === false ? 0.55 : 1 }}>
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: BLOK_TYPES[t.blokType]?.kleur || 'var(--primary)' }} />
                <span style={{ fontWeight: 600 }}>{t.titel}</span>
                {t.type === 'gewoonte' && t.streak > 0 && (
                  <span className="badge warn small"><IcoFlame width={12} height={12} /> {t.streak}</span>
                )}
              </div>
              <div className="small dim">
                {t.type === 'gewoonte' ? 'Gewoonte' : 'Eenmalig'}
                {t.tijd ? ` · ${t.tijd}` : ' · geen vast uur'}
                {' · '}{t.dagen?.length === 7 ? 'elke dag' : (t.dagen || []).join(', ')}
              </div>
            </div>
            <div className="row" style={{ gap: 2 }}>
              <button className="icon-btn" onClick={() => start(t)} aria-label="Bewerken"><IcoEdit width={18} height={18} /></button>
              <button className="icon-btn" onClick={() => verwijder(t.id)} aria-label="Verwijderen"><IcoTrash width={18} height={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="card stack" style={{ position: 'fixed', inset: 'auto 12px 90px 12px', maxWidth: 820, margin: '0 auto', zIndex: 50 }}>
          <h2 style={{ margin: 0 }}>{editId ? 'Taak bewerken' : 'Nieuwe taak'}</h2>
          <div className="field">
            <label>Titel</label>
            <input className="input" value={form.titel} onChange={(e) => setForm({ ...form, titel: e.target.value })} placeholder="bv. Reva-oefeningen" />
          </div>
          <div className="row wrap" style={{ gap: 12 }}>
            <div className="field grow">
              <label>Type</label>
              <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="gewoonte">Gewoonte (streak)</option>
                <option value="eenmalig">Eenmalig</option>
              </select>
            </div>
            <div className="field grow">
              <label>Categorie/kleur</label>
              <select className="select" value={form.blokType} onChange={(e) => setForm({ ...form, blokType: e.target.value })}>
                {Object.entries(BLOK_TYPES).map(([k, v]) => <option key={k} value={k}>{v.naam}</option>)}
              </select>
            </div>
            <div className="field" style={{ width: 110 }}>
              <label>Tijd</label>
              <input className="input" type="time" value={form.tijd} onChange={(e) => setForm({ ...form, tijd: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Op welke dagen?</label>
            <div className="row wrap" style={{ gap: 6 }}>
              {DAGEN.map((d) => (
                <button key={d} className={'btn sm' + (form.dagen.includes(d) ? ' primary' : '')}
                  onClick={() => toggleDag(d)} type="button" title={DAG_NAMEN[d]}>{d}</button>
              ))}
            </div>
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

```

## `src/pages/Voortgang.jsx`

```jsx
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getGarminDagCached, getDagCached, getCollection, subscribeCollection, addItem, setItem, deleteItem } from '../services/data';
import { garminSamenvatting } from '../services/garmin';
import { doelProgress, doelKleur, METRIEKEN } from '../services/doelen';
import { reflectieSamenvatting, stemmingInfo } from '../services/reflectie';
import { noordster, revaTherapietrouw } from '../services/noordster';
import { acwrBerekenen, sessieBelasting } from '../services/belasting';
import { periodiseringBepalen } from '../services/periodisering';
import { datumKey } from '../services/tijd';
import NoordsterKaart from '../components/NoordsterKaart';
import { IcoFlame, IcoBolt, IcoMoon, IcoPlus, IcoTrash, IcoBike, IcoEdit } from '../components/Icons';
import Gauge from '../components/Gauge';
import Sparkline from '../components/Sparkline';
import BelastingKaart from '../components/BelastingKaart';

// Ruwe Garmin-activiteit -> nette samenvatting (defensief).
function activiteitInfo(a) {
  return {
    id: a.id || String(a.activityId || ''),
    naam: a.activityName || a.activityType?.typeKey || 'Activiteit',
    type: a.activityType?.typeKey || '',
    datum: (a.startTimeLocal || a.startTimeGMT || '').slice(0, 10),
    duurMin: a.duration ? Math.round(a.duration / 60) : null,
    afstandKm: a.distance ? Math.round(a.distance / 100) / 10 : null,
    kcal: a.calories ? Math.round(a.calories) : null,
    hr: a.averageHR ? Math.round(a.averageHR) : null,
  };
}

function laatsteDagen(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}
const LEEG = { titel: '', metric: 'vo2max', start: '', naar: '', huidige: '' };

export default function Voortgang() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reeks, setReeks] = useState([]);
  const [mind, setMind] = useState(null);
  const [ns, setNs] = useState(null);
  const [revaTrouw, setRevaTrouw] = useState(null);
  const [taken, setTaken] = useState([]);
  const [doelen, setDoelen] = useState([]);
  const [garminVandaag, setGarminVandaag] = useState(null);
  const [activiteiten, setActiviteiten] = useState([]);
  const [rpe, setRpe] = useState({});
  const [form, setForm] = useState(LEEG);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const dagen = laatsteDagen(28);
      const garmin = await Promise.all(dagen.map((d) => getGarminDagCached(user.uid, datumKey(d))));
      const r = dagen.map((d, i) => ({ datum: d, label: d.toLocaleDateString('nl-BE', { weekday: 'short' }), g: garminSamenvatting(garmin[i]) }));
      setReeks(r);
      setGarminVandaag(r[r.length - 1]?.g || null);
      // Weekreview mindset: laatste 7 dagen check-ins (cache-eerst).
      const week = laatsteDagen(7);
      const dagDocs = await Promise.all(week.map((d) => getDagCached(user.uid, datumKey(d))));
      setMind(reflectieSamenvatting(week.map((d, i) => ({
        datum: datumKey(d), label: d.toLocaleDateString('nl-BE', { weekday: 'short' }),
        checkin: dagDocs[i]?.checkin,
      }))));
      setNs(noordster(dagDocs));
      setRevaTrouw(revaTherapietrouw(dagDocs));
      setTaken((await getCollection(user.uid, 'taken')).filter((t) => t.type === 'gewoonte'));
      const acts = (await getCollection(user.uid, 'garminActivities')).map(activiteitInfo)
        .filter((a) => a.datum).sort((a, b) => b.datum.localeCompare(a.datum));
      setActiviteiten(acts);
      setLaden(false);
    })();
    const u1 = subscribeCollection(user.uid, 'doelen', setDoelen);
    const u2 = subscribeCollection(user.uid, 'activiteitLog', (items) =>
      setRpe(Object.fromEntries(items.map((i) => [i.id, i.rpe]))));
    return () => { u1(); u2(); };
  }, [user]);

  const zetRpe = (id, val) => setItem(user.uid, 'activiteitLog', id, { rpe: val });

  // ACWR (opbouw-ratio) uit sRPE-belasting van de activiteiten — herberekent als
  // er RPE's bijkomen. Uitlegbaar + veilige terugval bij te weinig data.
  const acwr = useMemo(() => acwrBerekenen(sessieBelasting(activiteiten, rpe)), [activiteiten, rpe]);
  const periodisering = periodiseringBepalen(new Date());

  const startBewerken = (d) => {
    setEditId(d.id);
    setForm({
      titel: d.titel || '', metric: d.metric || 'vo2max',
      start: d.start ?? '', naar: d.naar ?? '', huidige: d.huidige ?? '',
    });
    setOpen(true);
  };
  const sluitForm = () => { setOpen(false); setEditId(null); setForm(LEEG); };

  const bewaarDoel = async () => {
    if (!form.titel.trim()) return toast('Geef je doel een naam.');
    if (form.start === '' || form.naar === '') return toast('Vul start- en doelwaarde in.');
    const payload = {
      titel: form.titel.trim(), metric: form.metric,
      start: Number(form.start), naar: Number(form.naar),
      huidige: form.huidige === '' ? null : Number(form.huidige),
      eenheid: METRIEKEN[form.metric]?.eenheid || '',
    };
    if (editId) {
      await setItem(user.uid, 'doelen', editId, payload);
      toast('Doel bijgewerkt 🎯');
    } else {
      await addItem(user.uid, 'doelen', payload);
      toast('Doel toegevoegd 🎯');
    }
    sluitForm();
  };

  if (laden) return <div className="empty">Statistieken laden…</div>;

  const reeks7 = reeks.slice(-7);
  const readinessReeks = reeks7.map((r) => r.g?.readiness ?? null);
  const slaapReeks = reeks7.map((r) => r.g?.slaapUren ?? null);
  const topStreaks = [...taken].sort((a, b) => (b.streak || 0) - (a.streak || 0)).slice(0, 6);
  const autoMetric = ['vo2max', 'gewicht', 'rusthr'].includes(form.metric);

  // Trends over ~4 weken (alleen metrieken met genoeg data).
  const trendDefs = [
    { key: 'vo2max', label: 'VO₂max', pick: (g) => g?.vo2max, omhoog: true },
    { key: 'gewicht', label: 'Gewicht (kg)', pick: (g) => g?.gewichtKg, omhoog: false },
    { key: 'rusthr', label: 'Rust-HR', pick: (g) => g?.rustHr, omhoog: false },
  ].map((t) => {
    const serie = reeks.map((r) => t.pick(r.g)).filter((v) => typeof v === 'number');
    const eerste = serie[0], laatste = serie[serie.length - 1];
    const delta = serie.length >= 2 ? Math.round((laatste - eerste) * 10) / 10 : null;
    const goed = delta == null ? null : (t.omhoog ? delta >= 0 : delta <= 0);
    return { ...t, serie, laatste, delta, goed };
  }).filter((t) => t.serie.length >= 2);

  return (
    <div className="stack reveal">
      <h1 style={{ margin: 0 }}>Voortgang</h1>

      <NoordsterKaart ns={ns} />

      <BelastingKaart garmin={garminVandaag} readinessReeks={readinessReeks} acwr={acwr} periodisering={periodisering} />

      {/* Mindset-weekreview */}
      {mind && mind.aantal > 0 && (
        <section className="card stack">
          <div className="card-title">Mindset · deze week</div>
          <div className="row wrap" style={{ gap: 10 }}>
            <MindStat label="Stemming" val={mind.stemming} emoji={stemmingInfo(Math.round(mind.stemming || 0))?.emoji} />
            <MindStat label="Energie" val={mind.energie} suffix="/5" />
            <MindStat label="Tevreden" val={mind.tevreden} emoji={stemmingInfo(Math.round(mind.tevreden || 0))?.emoji} />
          </div>
          <p className="small dim" style={{ margin: 0 }}>
            Gemiddelde over {mind.aantal} {mind.aantal === 1 ? 'dag' : 'dagen'} met een check-in.
          </p>
        </section>
      )}

      {/* Reva-therapietrouw — enkel relevant als er deze week reva gepland stond */}
      {revaTrouw && revaTrouw.dagenMetReva > 0 && (
        <section className="card stack">
          <div className="card-title">Reva · deze week</div>
          <div className="row" style={{ gap: 14, alignItems: 'center' }}>
            <Gauge val={revaTrouw.score} size={64} label="" sub={`${revaTrouw.score}%`}
              kleur={revaTrouw.score >= 80 ? 'var(--success)' : revaTrouw.score >= 50 ? 'var(--warning)' : 'var(--danger)'} />
            <p className="small dim grow" style={{ margin: 0 }}>{revaTrouw.waarom}</p>
          </div>
        </section>
      )}

      {/* Doelen */}
      <section className="card stack">
        <div className="row between">
          <div className="card-title" style={{ margin: 0 }}>Mijn doelen</div>
          <button className="btn sm" onClick={() => (open ? sluitForm() : setOpen(true))}><IcoPlus width={16} height={16} /> Doel</button>
        </div>

        {doelen.length === 0 && !open && (
          <p className="small muted" style={{ margin: 0 }}>
            Zet één concreet doel (bv. VO₂max 45→55, of gewicht 85→78 kg). De ring vult zich automatisch
            mee met je Garmin-data.
          </p>
        )}

        {doelen.map((d) => {
          const p = doelProgress(d, garminVandaag);
          const m = METRIEKEN[d.metric] || {};
          return (
            <div className="row" key={d.id} style={{ gap: 14, alignItems: 'center' }}>
              <Gauge val={p.pct} size={72} label="" sub={`${p.pct}%`} kleur={doelKleur(p.pct)} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{d.titel}</span>
                  {p.klaar && <span className="badge ok small">behaald 🎉</span>}
                </div>
                <div className="small dim">
                  {m.label}: {p.huidige ?? '—'}{d.eenheid} → {d.naar}{d.eenheid}
                  {p.rest != null && !p.klaar ? ` · nog ${Math.abs(p.rest)}${d.eenheid}` : ''}
                </div>
              </div>
              <button className="icon-btn" onClick={() => startBewerken(d)} aria-label="Bewerken">
                <IcoEdit width={18} height={18} />
              </button>
              <button className="icon-btn" onClick={() => deleteItem(user.uid, 'doelen', d.id)} aria-label="Verwijderen">
                <IcoTrash width={18} height={18} />
              </button>
            </div>
          );
        })}

        {open && (
          <div className="stack" style={{ gap: 10, marginTop: 4 }}>
            <div className="small" style={{ fontWeight: 600 }}>{editId ? 'Doel bewerken' : 'Nieuw doel'}</div>
            <div className="field"><label>Naam</label>
              <input className="input" value={form.titel} placeholder="bv. VO₂max omhoog"
                onChange={(e) => setForm({ ...form, titel: e.target.value })} /></div>
            <div className="field"><label>Wat meet je?</label>
              <select className="select" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
                {Object.entries(METRIEKEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select></div>
            <div className="row wrap" style={{ gap: 12 }}>
              <div className="field grow"><label>Start</label>
                <input className="input" type="number" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
              <div className="field grow"><label>Doel</label>
                <input className="input" type="number" value={form.naar} onChange={(e) => setForm({ ...form, naar: e.target.value })} /></div>
              {!autoMetric && (
                <div className="field grow"><label>Huidige</label>
                  <input className="input" type="number" value={form.huidige} onChange={(e) => setForm({ ...form, huidige: e.target.value })} /></div>
              )}
            </div>
            {autoMetric && <p className="small dim" style={{ margin: 0 }}>Huidige waarde komt automatisch uit Garmin.</p>}
            <div className="row between">
              <button className="btn ghost" onClick={sluitForm}>Annuleren</button>
              <button className="btn primary" onClick={bewaarDoel}>{editId ? 'Wijzigingen bewaren' : 'Doel bewaren'}</button>
            </div>
          </div>
        )}
      </section>

      {/* Trends over ~4 weken */}
      {trendDefs.length > 0 && (
        <section className="card stack">
          <div className="card-title">Trends · ±4 weken</div>
          {trendDefs.map((t) => (
            <div className="row between" key={t.key} style={{ gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{t.label}</div>
                <div className="small dim">
                  nu {Math.round(t.laatste * 10) / 10}
                  {t.delta != null && (
                    <span style={{ color: t.goed ? 'var(--success)' : 'var(--danger)', marginLeft: 6 }}>
                      {t.delta > 0 ? '+' : ''}{t.delta}
                    </span>
                  )}
                </div>
              </div>
              <Sparkline data={t.serie} kleur={t.goed === false ? 'var(--danger)' : 'var(--primary)'} />
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <div className="card-title"><IcoBolt width={14} height={14} /> Training readiness (7 dagen)</div>
        <BarChart reeks={reeks7} waarden={readinessReeks} max={100} eenheid="" />
      </section>

      <section className="card">
        <div className="card-title"><IcoMoon width={14} height={14} /> Slaap (uren, 7 dagen)</div>
        <BarChart reeks={reeks7} waarden={slaapReeks} max={10} eenheid="u" decimal />
      </section>

      {/* Activiteiten + RPE */}
      <section className="card stack">
        <div className="card-title"><IcoBike width={14} height={14} /> Recente trainingen</div>
        {activiteiten.length === 0 && (
          <p className="small muted" style={{ margin: 0 }}>Nog geen Garmin-activiteiten gesynct. Na een training verschijnen ze hier.</p>
        )}
        {activiteiten.slice(0, 8).map((a) => (
          <div className="stack" key={a.id} style={{ gap: 6, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            <div className="row between">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{a.naam}</div>
                <div className="small dim">
                  {a.datum}{a.duurMin ? ` · ${a.duurMin} min` : ''}{a.afstandKm ? ` · ${a.afstandKm} km` : ''}
                  {a.hr ? ` · ${a.hr} bpm` : ''}{a.kcal ? ` · ${a.kcal} kcal` : ''}
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
              <span className="small dim" style={{ marginRight: 4 }}>RPE:</span>
              {[2, 4, 6, 8, 10].map((n) => (
                <button key={n} className={'btn sm' + (rpe[a.id] === n ? ' primary' : '')}
                  style={{ minWidth: 36, padding: '0 8px' }} onClick={() => zetRpe(a.id, n)}>{n}</button>
              ))}
            </div>
          </div>
        ))}
        <p className="small dim" style={{ margin: 0 }}>RPE = hoe zwaar voelde het (2 licht … 10 maximaal). Helpt de coach je belasting fijner inschatten.</p>
      </section>

      <section className="card stack">
        <div className="card-title"><IcoFlame width={14} height={14} /> Streaks</div>
        {topStreaks.length === 0 && <p className="small muted" style={{ margin: 0 }}>Nog geen gewoontes met streak. Vink ze af op “Vandaag”.</p>}
        {topStreaks.map((t) => (
          <div className="list-row" key={t.id}>
            <span className="grow">{t.titel}</span>
            <span className="badge warn"><IcoFlame width={12} height={12} /> {t.streak || 0}</span>
            <span className="small dim">beste {t.beste || 0}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function MindStat({ label, val, emoji, suffix = '' }) {
  return (
    <div className="card tight grow" style={{ textAlign: 'center', minWidth: 92 }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>
        {val != null ? val : '—'}{val != null ? suffix : ''} {emoji || ''}
      </div>
      <div className="small dim">{label}</div>
    </div>
  );
}

function BarChart({ reeks, waarden, max, eenheid, decimal }) {
  const heeftData = waarden.some((v) => v != null);
  if (!heeftData) {
    return <p className="small muted" style={{ margin: 0 }}>Nog geen Garmin-data deze week (dagelijkse sync vult dit aan).</p>;
  }
  return (
    <div className="row" style={{ alignItems: 'flex-end', gap: 8, height: 130, marginTop: 6 }}>
      {reeks.map((r, i) => {
        const v = waarden[i];
        const h = v != null ? Math.max(4, Math.round((v / max) * 110)) : 4;
        return (
          <div key={i} className="grow" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span className="small" style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
              {v != null ? (decimal ? v.toFixed(1) : Math.round(v)) : '—'}
            </span>
            <div style={{
              width: '100%', height: h, borderRadius: 6,
              background: v != null ? 'linear-gradient(180deg, var(--primary), var(--primary-2))' : 'var(--surface-2)',
              opacity: v != null ? 1 : 0.4,
            }} />
            <span className="small dim" style={{ fontSize: '.68rem' }}>{r.label}</span>
          </div>
        );
      })}
    </div>
  );
}

```

## `src/pages/Week.jsx`

```jsx
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { getDocById, setItem, subscribeCollection, addItem, deleteItem, getAgendaEvents } from '../services/data';
import { vakantieFlags, vakantieInWeek, vakantieLabel } from '../services/vakanties';
import { WERK_MODI, DAG_NAMEN } from '../config/appConfig';
import { datumKey, weekKey, DAG_KORT } from '../services/tijd';
import { IcoPlus, IcoTrash, IcoEdit } from '../components/Icons';

function maandagVan(d) {
  const x = new Date(d);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  x.setHours(12, 0, 0, 0);
  return x;
}
const LEEG_PERIODE = { naam: '', van: '', tot: '', geenJudo: true, verlof: true, buitenland: false };

export default function Week() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { instellingen } = useSettings();
  const sport = instellingen?.sport || {};
  const [offset, setOffset] = useState(0);
  const [vakanties, setVakanties] = useState([]);
  const [nieuw, setNieuw] = useState(LEEG_PERIODE);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null); // null = nieuwe periode, anders bewerken

  const maandag = useMemo(() => {
    const m = maandagVan(new Date());
    m.setDate(m.getDate() + offset * 7);
    return m;
  }, [offset]);

  const wkId = weekKey(maandag);
  const dagen = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(maandag);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [maandag]
  );
  const dagDatums = useMemo(() => dagen.map(datumKey), [dagen]);

  const [data, setData] = useState({ dagen: {}, vakantie: false });

  useEffect(() => {
    if (!user) return;
    getDocById(user.uid, 'weken', wkId).then((doc) =>
      setData({ dagen: doc?.dagen || {}, vakantie: !!doc?.vakantie })
    );
  }, [user, wkId]);

  useEffect(() => {
    if (!user) return;
    return subscribeCollection(user.uid, 'vakanties', (items) =>
      setVakanties(items.sort((a, b) => (a.van || '').localeCompare(b.van || ''))));
  }, [user]);

  const [agenda, setAgenda] = useState([]);
  useEffect(() => {
    if (!user) return;
    getAgendaEvents(user.uid).then(setAgenda);
  }, [user]);

  const zetModus = async (dagKort, modus) => {
    const nieuwD = { ...data.dagen, [dagKort]: modus || undefined };
    if (!modus) delete nieuwD[dagKort];
    setData((s) => ({ ...s, dagen: nieuwD }));
    await setItem(user.uid, 'weken', wkId, { dagen: nieuwD });
  };

  const zetVakantie = async (v) => {
    setData((s) => ({ ...s, vakantie: v }));
    await setItem(user.uid, 'weken', wkId, { vakantie: v });
    toast(v ? 'Week op vakantie — judoles geven valt weg.' : 'Vakantie uit.');
  };

  const startBewerken = (v) => {
    setEditId(v.id);
    setNieuw({ naam: v.naam || '', van: v.van || '', tot: v.tot || '',
      geenJudo: v.geenJudo !== false, verlof: v.verlof !== false, buitenland: v.buitenland === true });
    setFormOpen(true);
  };

  const sluitForm = () => { setFormOpen(false); setEditId(null); setNieuw(LEEG_PERIODE); };

  const bewaarPeriode = async () => {
    if (!nieuw.naam.trim() || !nieuw.van || !nieuw.tot) return toast('Vul naam, van én tot in.');
    if (nieuw.tot < nieuw.van) return toast('“Tot” ligt vóór “van”.');
    const payload = { ...nieuw, naam: nieuw.naam.trim() };
    if (editId) {
      await setItem(user.uid, 'vakanties', editId, payload);
      toast('Vakantieperiode bijgewerkt.');
    } else {
      await addItem(user.uid, 'vakanties', payload);
      toast('Vakantieperiode toegevoegd.');
    }
    sluitForm();
  };

  const weekPeriode = vakantieInWeek(vakanties, dagDatums);
  const weekLabel = `${dagen[0].toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })} – ${dagen[6].toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}`;
  const fmt = (s) => new Date(s + 'T12:00:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' });

  return (
    <div className="stack reveal">
      <div className="row between">
        <h1 style={{ margin: 0 }}>Mijn week</h1>
        <div className="row" style={{ gap: 4 }}>
          <button className="btn sm" onClick={() => setOffset((o) => o - 1)}>‹</button>
          <button className="btn sm" onClick={() => setOffset(0)}>Nu</button>
          <button className="btn sm" onClick={() => setOffset((o) => o + 1)}>›</button>
        </div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>{wkId} · {weekLabel}</p>

      {/* Banner als deze week in een vakantieperiode valt */}
      {weekPeriode && (
        <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--warning) 40%, var(--border))' }}>
          <div className="row" style={{ gap: 10 }}>
            <span style={{ fontSize: 22 }}>🌴</span>
            <div>
              <div style={{ fontWeight: 600 }}>{weekPeriode.naam}</div>
              <div className="small muted">{vakantieLabel(weekPeriode)} · {fmt(weekPeriode.van)}–{fmt(weekPeriode.tot)}
                {weekPeriode.geenJudo ? ' · geen judo (training & les vallen weg)' : ''}</div>
            </div>
          </div>
        </div>
      )}

      <label className="card row between" style={{ cursor: 'pointer' }}>
        <div>
          <div style={{ fontWeight: 600 }}>Deze week als vakantie markeren</div>
          <div className="small dim">Losse weekmarkering (geen judoles geven, soepeler)</div>
        </div>
        <input type="checkbox" checked={data.vakantie}
          onChange={(e) => zetVakantie(e.target.checked)} style={{ width: 22, height: 22 }} />
      </label>

      {/* Dagen */}
      <section className="stack" style={{ gap: 10 }}>
        {DAG_KORT.slice(1).concat(DAG_KORT[0]).map((dk) => {
          const idx = dk === 'zo' ? 6 : DAG_KORT.indexOf(dk) - 1;
          const d = dagen[idx];
          const dDatum = datumKey(d);
          const isVandaag = dDatum === datumKey(new Date());
          const per = vakantieFlags(vakanties, dDatum); // gecombineerde vlaggen bij overlap
          // Judo voor deze dag uit je eigen instellingen (niet hardcoded), zodat de
          // "judovrij"-status élke judo-dag dekt en live meegaat met de periode.
          const lesgeven = (sport.judoLesgeven || []).filter((l) => l.dag === dk);
          const eigenJudo = (sport.judoEigenClub || []).filter((t) => t.dag === dk);
          const heeftJudo = lesgeven.length > 0 || eigenJudo.length > 0;
          const judoTekst = lesgeven.length ? `judoles geven${lesgeven[0].start ? ' ' + lesgeven[0].start : ''}`
            : eigenJudo.length ? `judotraining${eigenJudo[0].start ? ' ' + eigenJudo[0].start : ''}` : '';
          const dagEvents = agenda
            .filter((e) => e.datum === dDatum)
            .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
          return (
            <div className="card tight stack" key={dk} style={{ gap: 8,
              ...(isVandaag ? { borderColor: 'var(--primary)' } : {}) }}>
              <div className="row between">
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{DAG_NAMEN[dk]}</span>
                    {isVandaag && <span className="badge accent small">vandaag</span>}
                    {per?.geenJudo && heeftJudo && <span className="badge warn small">judovrij</span>}
                    {(per?.verlof || data.vakantie) && <span className="badge small">verlof</span>}
                  </div>
                  <div className="small dim">
                    {d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                    {heeftJudo && (per?.geenJudo ? ' · judovrij (vakantie)' : ` · ${judoTekst}`)}
                  </div>
                </div>
                <select className="select" style={{ width: 'auto', minWidth: 140 }}
                  value={data.dagen[dk] || (per?.verlof ? 'verlof' : ((dk === 'za' || dk === 'zo') ? 'vrij' : ''))}
                  onChange={(e) => zetModus(dk, e.target.value)}>
                  <option value="">— kies —</option>
                  {Object.entries(WERK_MODI).map(([k, v]) => (
                    <option key={k} value={k}>{v.naam}</option>
                  ))}
                </select>
              </div>

              {dagEvents.length > 0 && (
                <details className="small">
                  <summary className="dim" style={{ cursor: 'pointer' }}>
                    📅 {dagEvents.length} afspra{dagEvents.length === 1 ? 'ak' : 'aken'}
                  </summary>
                  <div className="stack" style={{ gap: 3, marginTop: 6 }}>
                    {dagEvents.map((ev) => (
                      <div key={ev.id} className="row" style={{ gap: 8 }}>
                        <span className="dim" style={{ minWidth: 64, fontVariantNumeric: 'tabular-nums' }}>
                          {ev.allDay ? 'hele dag' : ev.start}
                        </span>
                        <span className="grow" style={{ minWidth: 0 }}>{ev.titel}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </section>

      {/* Vakantieperiodes (grote periodes) */}
      <section className="card stack">
        <div className="row between">
          <div className="card-title" style={{ margin: 0 }}>Vakantieperiodes</div>
          <button className="btn sm" onClick={() => (formOpen ? sluitForm() : setFormOpen(true))}>
            <IcoPlus width={16} height={16} /> Periode
          </button>
        </div>

        {vakanties.length === 0 && !formOpen && (
          <p className="small muted" style={{ margin: 0 }}>
            Voeg grote periodes toe (schoolvakanties, reizen). Markeer of judo dan vrij is
            (clubs dicht: geen training én geen les).
          </p>
        )}

        {vakanties.map((v) => (
          <div className="list-row" key={v.id} style={editId === v.id ? { opacity: 0.6 } : undefined}>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{v.naam}</div>
              <div className="small dim">{fmt(v.van)} – {fmt(v.tot)} · {vakantieLabel(v)}</div>
            </div>
            <button className="icon-btn" onClick={() => startBewerken(v)} aria-label="Bewerken">
              <IcoEdit width={18} height={18} />
            </button>
            <button className="icon-btn" onClick={() => deleteItem(user.uid, 'vakanties', v.id)} aria-label="Verwijderen">
              <IcoTrash width={18} height={18} />
            </button>
          </div>
        ))}

        {formOpen && (
          <div className="stack" style={{ gap: 10, marginTop: 4 }}>
            <div className="small" style={{ fontWeight: 600 }}>
              {editId ? 'Periode bewerken' : 'Nieuwe periode'}
            </div>
            <div className="field">
              <label>Naam</label>
              <input className="input" value={nieuw.naam} placeholder="bv. Zomervakantie"
                onChange={(e) => setNieuw({ ...nieuw, naam: e.target.value })} />
            </div>
            <div className="row wrap" style={{ gap: 12 }}>
              <div className="field grow"><label>Van</label>
                <input className="input" type="date" value={nieuw.van} onChange={(e) => setNieuw({ ...nieuw, van: e.target.value })} /></div>
              <div className="field grow"><label>Tot</label>
                <input className="input" type="date" value={nieuw.tot} onChange={(e) => setNieuw({ ...nieuw, tot: e.target.value })} /></div>
            </div>
            <label className="row between">
              <span>Judovrij (clubs dicht: geen training & geen les)</span>
              <input type="checkbox" checked={nieuw.geenJudo}
                onChange={(e) => setNieuw({ ...nieuw, geenJudo: e.target.checked })} style={{ width: 22, height: 22 }} />
            </label>
            <label className="row between">
              <span>Persoonlijk verlof (soepeler plannen)</span>
              <input type="checkbox" checked={nieuw.verlof}
                onChange={(e) => setNieuw({ ...nieuw, verlof: e.target.checked })} style={{ width: 22, height: 22 }} />
            </label>
            {nieuw.verlof && (
              <label className="row between">
                <span>In het buitenland (coach houdt duur standaard, geen extra tijd)</span>
                <input type="checkbox" checked={nieuw.buitenland}
                  onChange={(e) => setNieuw({ ...nieuw, buitenland: e.target.checked })} style={{ width: 22, height: 22 }} />
              </label>
            )}
            <div className="row between">
              <button className="btn ghost" onClick={sluitForm}>Annuleren</button>
              <button className="btn primary" onClick={bewaarPeriode}>{editId ? 'Bewaren' : 'Toevoegen'}</button>
            </div>
          </div>
        )}
      </section>

      <p className="small dim center">
        Dagmodus bepaalt je planning (thuis/kantoor/vrij). Vakantieperiodes overschrijven judo
        automatisch op “Vandaag”.
      </p>
    </div>
  );
}

```

## `src/services/agenda.js`

```js
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';

// Roept de Cloud Function aan die de ICS-links nu meteen inleest.
export async function syncAgendaNu() {
  const fns = getFunctions(app, 'europe-west1');
  const call = httpsCallable(fns, 'syncAgendaNu');
  const res = await call();
  return res.data; // { aantal, perLink: [{link, aantal|fout}], links }
}

```

## `src/services/belasting.js`

```js
// Belasting/herstel-bewaker: vertaalt Garmin-trainingsstatus (en als back-up de
// readiness-trend) naar mensentaal. Voorkomt overbelasting op weg naar elite.

const STATUS = {
  overbelast: { titel: 'Overbelast', kleur: 'var(--danger)', tekst: 'Je belasting is te hoog. Las 1-2 herstel- of rustdagen in.' },
  herstel:    { titel: 'Herstellend', kleur: 'var(--warning)', tekst: 'Je lichaam herstelt. Hou het licht (wandelen, mobiliteit, reva).' },
  inefficient:{ titel: 'Inefficiënt', kleur: 'var(--warning)', tekst: 'Veel inspanning, weinig winst. Check slaap, voeding en herstel.' },
  opbouwen:   { titel: 'Opbouwend', kleur: 'var(--success)', tekst: 'Mooie progressie — je mag rustig blijven opbouwen.' },
  balans:     { titel: 'In balans', kleur: 'var(--primary)', tekst: 'Je onderhoudt je niveau. Durf iets meer te pushen voor groei.' },
  teweinig:   { titel: 'Te weinig prikkel', kleur: 'var(--primary-2)', tekst: 'Je traint te weinig om te groeien. Voeg een sessie toe.' },
  onbekend:   { titel: 'Nog geen oordeel', kleur: 'var(--text-dim)', tekst: 'Te weinig data. Draag je horloge en sync dagelijks.' },
};

function avg(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }

// ── Periodisering: acute:chronic workload-ratio (ACWR) ────────────────────────
// sRPE-belasting per sessie = duur (min) × RPE (zwaarte 1-10). Zonder RPE nemen we
// een neutrale 5 (matig). Pure functies, makkelijk testbaar.

// Garmin-activiteiten + RPE-map -> [{ datum:'YYYY-MM-DD', load }].
export function sessieBelasting(activiteiten = [], rpeMap = {}) {
  return (activiteiten || []).map((a) => {
    const datum = (a.startTimeLocal || a.startTimeGMT || a.datum || '').slice(0, 10);
    const duurMin = a.duration ? a.duration / 60 : (a.duurMin || 0);
    const rpe = rpeMap[a.id] ?? rpeMap[a.activityId] ?? 5;
    return { datum, load: Math.round(duurMin * rpe) };
  }).filter((s) => s.datum && s.load > 0);
}

const ACWR_ZONES = {
  laag:     { kleur: 'var(--primary-2)', titel: 'Lage belasting', tekst: 'Je trainingsprikkel daalt — ruimte om (voorzichtig) op te bouwen.' },
  optimaal: { kleur: 'var(--success)',   titel: 'Optimale opbouw', tekst: 'Je belasting stijgt in een veilig tempo (sweet spot).' },
  verhoogd: { kleur: 'var(--warning)',   titel: 'Verhoogd risico',  tekst: 'Je bouwt snel op. Hou het deze week in toom.' },
  risico:   { kleur: 'var(--danger)',    titel: 'Blessurerisico',   tekst: 'Te snelle stijging in belasting. Las herstel in vóór je doorgaat.' },
  onbekend: { kleur: 'var(--text-dim)',  titel: 'Nog geen oordeel', tekst: 'Te weinig trainingsdata voor een betrouwbare belastingsratio.' },
};

const dagStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// ACWR = acute (7d) belasting / gemiddelde wekelijkse chronische (28d) belasting.
// Geeft ratio + zone + zekerheid + uitleg (premium-principe: uitlegbaar + veilige
// terugval bij te weinig data).
export function acwrBerekenen(sessies = [], refDatum = new Date()) {
  const ref = dagStart(refDatum).getTime();
  const dag = 86400000;
  const dagenGeleden = (s) => Math.floor((ref - dagStart(new Date(`${s.datum}T12:00:00`)).getTime()) / dag);
  const recent = (sessies || []).filter((s) => { const g = dagenGeleden(s); return g >= 0 && g < 28; });
  const som = (arr) => arr.reduce((a, s) => a + (s.load || 0), 0);

  const acuut = som(recent.filter((s) => dagenGeleden(s) < 7));
  const chronischWeek = som(recent) / 4;

  // Zekerheid: hoeveel weken historiek + aantal sessies dragen dit?
  const weken = recent.length ? Math.min(4, Math.ceil((Math.max(...recent.map(dagenGeleden)) + 1) / 7)) : 0;
  let zekerheid = 'laag';
  if (recent.length >= 4 && weken >= 3) zekerheid = 'hoog';
  else if (recent.length >= 2 && weken >= 2) zekerheid = 'gemiddeld';

  if (chronischWeek <= 0 || recent.length < 2) {
    return {
      ratio: null, zone: 'onbekend', zekerheid: 'laag',
      acuut, chronischWeek: Math.round(chronischWeek),
      waarom: 'Nog te weinig getrainde sessies (min. ~2 weken historiek) voor een betrouwbare ratio.',
      meetlat: 'ACWR = belasting deze week ÷ gemiddelde van de laatste 4 weken. Veilig: 0,8–1,3.',
      ...ACWR_ZONES.onbekend,
    };
  }

  const ratio = Math.round((acuut / chronischWeek) * 100) / 100;
  const zone = ratio < 0.8 ? 'laag' : ratio <= 1.3 ? 'optimaal' : ratio <= 1.5 ? 'verhoogd' : 'risico';
  return {
    ratio, zone, zekerheid,
    acuut: Math.round(acuut), chronischWeek: Math.round(chronischWeek),
    waarom: `Deze week ${Math.round(acuut)} belastingspunten t.o.v. een weekgemiddelde van ${Math.round(chronischWeek)} (ratio ${ratio.toFixed(2)}).`,
    meetlat: 'ACWR = belasting deze week ÷ gemiddelde van de laatste 4 weken. Veilig: 0,8–1,3.',
    ...ACWR_ZONES[zone],
  };
}

export function belastingStatus({ trainingStatus = null, readinessReeks = [] } = {}) {
  const ts = String(trainingStatus || '').toUpperCase();
  let key = null;

  if (/STRAINED|OVERREACH|OVERLOAD/.test(ts)) key = 'overbelast';
  else if (/RECOVERY/.test(ts)) key = 'herstel';
  else if (/UNPRODUCTIVE/.test(ts)) key = 'inefficient';
  else if (/PRODUCTIVE|PEAK/.test(ts)) key = 'opbouwen';
  else if (/MAINTAIN/.test(ts)) key = 'balans';
  else if (/DETRAIN/.test(ts)) key = 'teweinig';

  // Trend van de readiness (laatste helft vs eerste helft) als signaal/back-up.
  const vals = readinessReeks.filter((v) => typeof v === 'number');
  let trend = null;
  if (vals.length >= 4) {
    const h = Math.floor(vals.length / 2);
    trend = Math.round(avg(vals.slice(h)) - avg(vals.slice(0, h)));
  }

  if (!key) {
    if (trend == null) key = 'onbekend';
    else if (trend <= -8) key = 'herstel';
    else if (trend >= 6) key = 'opbouwen';
    else key = 'balans';
  }

  return { key, trend, ...STATUS[key] };
}

```

## `src/services/blessures.js`

```js
// Blessures: per-blessure revalidatie-oefeningen + automatische sportbeperking.
// Premium-coach principe: elke beperking moet uitlegbaar zijn (welke regio,
// welke sporten en waarom) en het systeem valt veilig terug — geen regio
// gekozen betekent geen automatische sportveto, nooit een stellig "mag niet"
// op wankele basis.
import { BLESSURE_REGIOS } from '../config/appConfig';
import { dagOrdinal } from './tijd';

export function isBlessureActief(b, datum) {
  if (!b || b.actief === false) return false;
  if (b.eindDatum && b.eindDatum < datum) return false;
  return true;
}

// Einddatum verstreken, maar de gebruiker heeft dit nog niet gezien/bevestigd —
// zo'n blessure telt al niet meer mee (isBlessureActief), maar moet nog gemeld
// worden zodat het sluiten niet stilzwijgend gebeurt.
export function isVerlopenNietGemeld(b, datum) {
  return !!(b && b.actief !== false && b.eindDatum && b.eindDatum < datum && !b.eindeGemeld);
}

export function vermijdSportenVanBlessures(blessures = [], datum) {
  const set = new Set();
  blessures.filter((b) => isBlessureActief(b, datum)).forEach((b) => {
    (BLESSURE_REGIOS[b.regio]?.vermijdSport || []).forEach((s) => set.add(s));
  });
  return [...set];
}

// Eerlijke round-robin: elke dag een andere, opeenvolgende schijf van de actieve
// oefeningen, zodat iedereen over de cyclus evenveel aan de beurt komt — geen
// willekeur, dus voorspelbaar (premium-coach principe "vertrouwen > intelligentie").
export function kiesOefeningenVanDag({ oefeningen = [], aantalPerDag, datum }) {
  const actief = oefeningen.filter((o) => o.actief !== false);
  if (!actief.length) return [];
  const n = Math.max(1, Math.min(aantalPerDag || actief.length, actief.length));
  if (n >= actief.length) return actief;
  const offset = (dagOrdinal(datum) * n) % actief.length;
  const gekozen = [];
  for (let i = 0; i < n; i++) gekozen.push(actief[(offset + i) % actief.length]);
  return gekozen;
}

export function blessureBlokDuur(aantalOefeningen) {
  return Math.max(10, aantalOefeningen * 4);
}

```

## `src/services/coach.js`

```js
// Coach-laag: vertaalt Garmin-signalen (readiness, body battery, slaap) + je doel
// naar een concreet sportadvies voor vandaag. Pure functie, makkelijk testbaar.

export const DOELEN = {
  afvallen: 'Afvallen',
  kracht: 'Kracht opbouwen',
  uithouding: 'Uithouding',
  herstel: 'Herstel & blessurevrij',
  algemeen: 'Algemeen fit',
};

// Niveaus oplopend in belasting.
const NIVEAU_KLEUR = {
  herstel: 'var(--text-dim)',
  rustig: 'var(--primary-2)',
  matig: 'var(--warning)',
  hard: 'var(--success)',
};

// Advies per doel × niveau: { sport, duurMin }.
const MATRIX = {
  afvallen: {
    hard: { sport: 'Langere cardio (fietsen/lopen) in zone 2', duurMin: 60 },
    matig: { sport: 'Stevige wandeling of rustige fietsrit', duurMin: 45 },
    rustig: { sport: 'Lichte wandeling', duurMin: 30 },
    herstel: { sport: 'Wandelen + mobiliteit', duurMin: 25 },
  },
  kracht: {
    hard: { sport: 'Krachttraining of judo (zwaar)', duurMin: 60 },
    matig: { sport: 'Krachttraining (matig) of techniektraining', duurMin: 45 },
    rustig: { sport: 'Core + mobiliteit', duurMin: 25 },
    herstel: { sport: 'Reva-oefeningen + stretchen', duurMin: 20 },
  },
  uithouding: {
    hard: { sport: 'Intervaltraining of langere duurloop', duurMin: 55 },
    matig: { sport: 'Duurloop/fietsrit in zone 2', duurMin: 45 },
    rustig: { sport: 'Rustige cardio', duurMin: 30 },
    herstel: { sport: 'Herstelwandeling', duurMin: 25 },
  },
  herstel: {
    hard: { sport: 'Lichte techniektraining of mobiliteit', duurMin: 30 },
    matig: { sport: 'Mobiliteit + lichte cardio', duurMin: 25 },
    rustig: { sport: 'Reva-oefeningen + wandelen', duurMin: 20 },
    herstel: { sport: 'Volledige rust of zachte stretching', duurMin: 15 },
  },
  algemeen: {
    hard: { sport: 'Sport naar keuze (judo, fietsen, kracht)', duurMin: 50 },
    matig: { sport: 'Matige training of fietsrit', duurMin: 40 },
    rustig: { sport: 'Lichte beweging of wandeling', duurMin: 30 },
    herstel: { sport: 'Rust + mobiliteit', duurMin: 20 },
  },
};

// HRV-status -> bijstelling van de score. Onbekende/afwezige status telt niet mee.
function hrvBijstelling(hrvStatus) {
  const s = String(hrvStatus || '').toUpperCase();
  if (/UNBALANCED|LOW|POOR/.test(s)) return -10;
  if (/BALANCED/.test(s)) return 4;
  return 0;
}

// Zelf-gerapporteerde pijn (0-5) bij de ochtend-check-in. Vanaf 3 wegen we dit
// even zwaar als een actieve blessure — pijn is een hard veiligheidssignaal,
// ook als er nog geen blessure is aangemaakt.
const PIJN_HERSTEL_DREMPEL = 3;

function bepaalNiveau({ readiness, bodyBattery, slaapUren, energie, hrvStatus, blessureActief, overbelast, pijn }) {
  if (blessureActief || overbelast || (typeof pijn === 'number' && pijn >= PIJN_HERSTEL_DREMPEL)) return 'herstel';
  const r = readiness ?? 55;
  const bb = bodyBattery ?? 60;
  let score = r * 0.6 + bb * 0.4;
  if (typeof slaapUren === 'number') {
    if (slaapUren < 6) score -= 12;
    else if (slaapUren >= 8) score += 6;
  }
  if (typeof energie === 'number') {
    score += { 1: -16, 2: -8, 3: 0, 4: 6, 5: 10 }[energie] ?? 0;
  }
  if (typeof pijn === 'number' && pijn > 0) score -= pijn * 6;
  score += hrvBijstelling(hrvStatus);
  if (score >= 65) return 'hard';
  if (score >= 45) return 'matig';
  if (score >= 30) return 'rustig';
  return 'herstel';
}

// Hoeveel echte meetsignalen zitten er achter het advies? Bepaalt de zekerheid.
// Weinig data -> lage zekerheid -> we adviseren bewust voorzichtiger (zie cap).
function bepaalZekerheid({ readiness, bodyBattery, slaapUren, energie, hrvStatus, blessureActief, overbelast, pijn }) {
  // Blessure/overbelasting/pijn is een duidelijk, hard veiligheidssignaal.
  if (blessureActief || overbelast || (typeof pijn === 'number' && pijn >= PIJN_HERSTEL_DREMPEL)) return 'hoog';
  let n = 0;
  if (readiness != null) n += 1;
  if (bodyBattery != null) n += 1;
  if (typeof slaapUren === 'number') n += 1;
  if (typeof energie === 'number') n += 1;
  if (hrvStatus) n += 1;
  if (typeof pijn === 'number' && pijn > 0) n += 1;
  // ≥2 elkaar bevestigende signalen = hoog; één los getal kan ruis zijn.
  if (n >= 2) return 'hoog';
  if (n === 1) return 'gemiddeld';
  return 'laag';
}

const NIVEAU_RANG = ['herstel', 'rustig', 'matig', 'hard'];

export function coachAdvies({
  readiness = null, bodyBattery = null, slaapUren = null, energie = null, hrvStatus = null,
  goal = 'algemeen', blessureActief = false, overbelast = false, acwrZone = null, pijn = null,
  periodiseringFase = null, vakantieType = null,
} = {}) {
  const doel = MATRIX[goal] ? goal : 'algemeen';
  let niveau = bepaalNiveau({ readiness, bodyBattery, slaapUren, energie, hrvStatus, blessureActief, overbelast, pijn });
  const zekerheid = bepaalZekerheid({ readiness, bodyBattery, slaapUren, energie, hrvStatus, blessureActief, overbelast, pijn });

  // Beoordeeld op je slechtste advies: 'hard' enkel bij hoge zekerheid (≥2 signalen).
  let voorzichtig = false;
  if (zekerheid !== 'hoog' && niveau === 'hard') { niveau = 'matig'; voorzichtig = true; }

  // Periodisering (ACWR): te snelle opbouw remt het advies af (blessurepreventie).
  let acwrRem = null;
  if (acwrZone === 'risico' && NIVEAU_RANG.indexOf(niveau) > NIVEAU_RANG.indexOf('rustig')) {
    niveau = 'rustig'; acwrRem = 'risico';
  } else if (acwrZone === 'verhoogd' && niveau === 'hard') {
    niveau = 'matig'; acwrRem = 'verhoogd';
  }

  // Periodisering: vaste deload-week in de trainingscyclus temperen we altijd
  // af van 'hard', los van hoe de losse meetdata vandaag uitvallen — dit is een
  // structureel vangnet, niet een schatting (zie services/periodisering.js).
  let deload = false;
  if (periodiseringFase === 'deload' && niveau === 'hard') { niveau = 'matig'; deload = true; }

  const advies = MATRIX[doel][niveau];

  // Groot verlof: thuis heb je vaak meer tijd om te sporten dan een gewone dag;
  // we verlengen de sessie licht (niet bij 'herstel' — dat blijft kort, dat is
  // net het punt). In het buitenland verandert er bewust niets: geen aanname
  // over beschikbare tijd/faciliteiten daar, dus standaardduur.
  let duurMin = advies.duurMin;
  let verlofBonus = false;
  if (vakantieType === 'thuis' && niveau !== 'herstel') {
    duurMin = advies.duurMin + 15;
    verlofBonus = true;
  }

  // "Waarom": de signalen die het advies dragen (mensbaar geformuleerd).
  const waarom = [];
  if (overbelast) waarom.push('Garmin meldt overbelasting — herstel gaat voor.');
  if (blessureActief) waarom.push('Blessure actief — we beschermen je herstel.');
  if (typeof pijn === 'number' && pijn >= PIJN_HERSTEL_DREMPEL) waarom.push(`Je gaf pijn ${pijn}/5 op — we kiezen voor herstel.`);
  else if (typeof pijn === 'number' && pijn > 0) waarom.push(`Je gaf pijn ${pijn}/5 op — we temperen het advies.`);
  if (readiness != null) waarom.push(`Readiness ${Math.round(readiness)}/100.`);
  if (bodyBattery != null) waarom.push(`Body battery ${Math.round(bodyBattery)}.`);
  if (typeof slaapUren === 'number') waarom.push(`${slaapUren.toFixed(1)}u slaap.`);
  if (typeof energie === 'number') waarom.push(`Je gaf energie ${energie}/5 op.`);
  if (hrvStatus) waarom.push(`HRV-status: ${hrvStatus}.`);
  if (acwrRem === 'risico') waarom.push('Je trainingsbelasting steeg te snel (blessurerisico) — we temperen.');
  if (acwrRem === 'verhoogd') waarom.push('Je belasting loopt op — vandaag geen volle gas.');
  if (deload) waarom.push('Deze week is een ingeplande hersteller in je trainingscyclus — geen volle gas, ook niet als je je goed voelt.');
  if (verlofBonus) waarom.push('Je bent met verlof thuis — meer tijd dan gewoonlijk, dus iets langere sessie.');
  else if (vakantieType === 'buitenland') waarom.push('Je bent met verlof in het buitenland — we houden de duur standaard, geen aanname over faciliteiten daar.');
  if (voorzichtig) waarom.push('Weinig meetdata vandaag → we houden het bewust voorzichtig.');
  if (!waarom.length) waarom.push('Nog geen meetdata vandaag — dit is een veilig algemeen advies.');

  // Welke databronnen zijn effectief gebruikt.
  const databronnen = [];
  if (readiness != null) databronnen.push('Garmin readiness');
  if (bodyBattery != null) databronnen.push('Body battery');
  if (typeof slaapUren === 'number') databronnen.push('Slaap');
  if (typeof energie === 'number') databronnen.push('Zelf-gerapporteerde energie');
  if (hrvStatus) databronnen.push('HRV-status');
  if (typeof pijn === 'number' && pijn > 0) databronnen.push('Zelf-gerapporteerde pijn');
  if (!databronnen.length) databronnen.push('Geen meetdata');

  const titel = {
    hard: 'Goeie dag om er vol voor te gaan',
    matig: 'Train met mate vandaag',
    rustig: 'Hou het rustig vandaag',
    herstel: 'Kies vandaag voor herstel',
  }[niveau];

  return {
    niveau, titel,
    sport: advies.sport,
    duurMin,
    doelLabel: DOELEN[doel],
    waarom,
    databronnen,
    zekerheid,
    meetlat: 'Geslaagd = je voltooit deze sessie en voelt je morgen niet slechter.',
    reden: waarom.join(' '), // korte samenvatting (backwards-compat)
    kleur: NIVEAU_KLEUR[niveau],
  };
}

```

## `src/services/data.js`

```js
// Firestore-datalaag. Alles leeft onder users/{uid}/...
import {
  doc, getDoc, getDocFromCache, setDoc, updateDoc, deleteDoc, deleteField, collection, getDocs,
  getDocsFromServer, query, where, orderBy, limit, onSnapshot, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_INSTELLINGEN } from '../config/appConfig';

const u = (uid, ...rest) => ['users', uid, ...rest];

// ---- Instellingen (één doc per rubriek) ----
export async function getInstellingen(uid) {
  const rubrieken = Object.keys(DEFAULT_INSTELLINGEN);
  const result = {};
  await Promise.all(rubrieken.map(async (r) => {
    const snap = await getDoc(doc(db, ...u(uid, 'instellingen', r)));
    result[r] = { ...DEFAULT_INSTELLINGEN[r], ...(snap.exists() ? snap.data() : {}) };
  }));
  return result;
}

export async function saveInstellingen(uid, rubriek, data) {
  await setDoc(doc(db, ...u(uid, 'instellingen', rubriek)),
    { ...data, bijgewerktOp: serverTimestamp() }, { merge: true });
}

// Seedt defaults + voorbeelddata bij allereerste login.
export async function seedDefaultsIfNeeded(uid, profiel) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data()?.geseed) return;

  const batch = writeBatch(db);
  batch.set(userRef, {
    email: profiel?.email || null,
    naam: profiel?.naam || null,
    geseed: true,
    aangemaaktOp: serverTimestamp(),
  }, { merge: true });

  for (const [rubriek, data] of Object.entries(DEFAULT_INSTELLINGEN)) {
    batch.set(doc(db, ...u(uid, 'instellingen', rubriek)), data, { merge: true });
  }

  // Voorbeeld-gewoontes om mee te starten (in-app aanpasbaar). Géén losse
  // reva-taak meer: blessures (`pages/Gezondheid.jsx`) plannen hun reva-blok
  // nu zelf in (`services/planner.js`), een losse seed-taak zou dat dubbel
  // boeken.
  const seedTaken = [
    { titel: 'Water drinken (2,5 L)', type: 'gewoonte', dagen: ['ma','di','wo','do','vr','za','zo'], tijd: null, blokType: 'routine', volgorde: 1, actief: true },
    { titel: 'Geen scrollen na 22:00', type: 'gewoonte', dagen: ['ma','di','wo','do','vr','za','zo'], tijd: '22:00', blokType: 'scherm', volgorde: 2, actief: true },
    { titel: 'Maaltijd voorbereiden', type: 'gewoonte', dagen: ['zo'], tijd: '17:00', blokType: 'maaltijd', volgorde: 3, actief: true },
  ];
  seedTaken.forEach((t, i) => {
    batch.set(doc(db, ...u(uid, 'taken', `seed${i}`)),
      { ...t, streak: 0, beste: 0, aangemaaktOp: serverTimestamp() });
  });

  await batch.commit();
}

// ---- Generieke collectie-CRUD ----
export function subscribeCollection(uid, naam, cb) {
  return onSnapshot(collection(db, ...u(uid, naam)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function getCollection(uid, naam) {
  const snap = await getDocs(collection(db, ...u(uid, naam)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addItem(uid, naam, data) {
  const ref = doc(collection(db, ...u(uid, naam)));
  await setDoc(ref, { ...data, aangemaaktOp: serverTimestamp() });
  return ref.id;
}

export async function setItem(uid, naam, id, data) {
  await setDoc(doc(db, ...u(uid, naam, id)), data, { merge: true });
}

export async function updateItem(uid, naam, id, data) {
  await updateDoc(doc(db, ...u(uid, naam, id)), data);
}

export async function deleteItem(uid, naam, id) {
  await deleteDoc(doc(db, ...u(uid, naam, id)));
}

export async function getDocById(uid, naam, id) {
  const snap = await getDoc(doc(db, ...u(uid, naam, id)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---- Dag-plan (één doc per datum) ----
export async function getDag(uid, datum) {
  return getDocById(uid, 'dagen', datum);
}
export async function saveDag(uid, datum, data) {
  await setDoc(doc(db, ...u(uid, 'dagen', datum)),
    { ...data, datum, bijgewerktOp: serverTimestamp() }, { merge: true });
}

// Verwijdert één blok-correctie (terug naar het oorspronkelijk gepland tijdstip).
// Gebruikt deleteField() zodat enkel die sleutel uit de verzet-map verdwijnt,
// in plaats van de hele map te overschrijven (merge:true zou anders niets wissen).
export async function verwijderVerzet(uid, datum, blokId) {
  await setDoc(doc(db, ...u(uid, 'dagen', datum)),
    { [`verzet.${blokId}`]: deleteField(), bijgewerktOp: serverTimestamp() }, { merge: true });
}

// Verwijdert een handmatige slaap-correctie (terug naar wat Garmin meet).
export async function verwijderSlaapOverride(uid, datum) {
  await setDoc(doc(db, ...u(uid, 'dagen', datum)),
    { slaapOverride: deleteField(), bijgewerktOp: serverTimestamp() }, { merge: true });
}

// Dag-doc cache-eerst (historische dagen wijzigen niet meer → bespaart reads).
export async function getDagCached(uid, datum) {
  const ref = doc(db, ...u(uid, 'dagen', datum));
  try {
    const c = await getDocFromCache(ref);
    if (c.exists()) return { id: c.id, ...c.data() };
  } catch { /* nog niet in cache */ }
  const s = await getDoc(ref);
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

// ---- Garmin (alleen-lezen) ----
export async function getGarminDag(uid, datum) {
  return getDocById(uid, 'garminDaily', datum);
}

// ---- Weer (alleen-lezen, server geschreven door weerSync) ----
export async function getWeer(uid, datum) {
  return getDocById(uid, 'weer', datum);
}

// Garmin-dag uit cache eerst (historische dagen wijzigen nooit → bespaart reads).
export async function getGarminDagCached(uid, datum) {
  const ref = doc(db, ...u(uid, 'garminDaily', datum));
  try {
    const c = await getDocFromCache(ref);
    if (c.exists()) return { id: c.id, ...c.data() };
  } catch { /* nog niet in cache */ }
  const s = await getDoc(ref);
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

// Meest recente Garmin-dag + tijdstip van laatste sync (voor "laatst gesynct").
export async function getLaatsteGarminSync(uid) {
  try {
    const snap = await getDocs(query(
      collection(db, ...u(uid, 'garminDaily')), orderBy('date', 'desc'), limit(1),
    ));
    if (snap.empty) return null;
    const d = snap.docs[0].data();
    return {
      datum: d.date || snap.docs[0].id,
      syncedAt: d.syncedAt?.toDate ? d.syncedAt.toDate() : null,
    };
  } catch {
    return null;
  }
}

// Server-eerst lezen met cache-fallback. Nodig voor agendaEvents: de server-sync
// herschrijft die documenten, maar een eenmalige getDocs (zonder live listener)
// kan oude/verwijderde docs uit de offline-cache blijven teruggeven. Server-eerst
// haalt de gecorrigeerde tijden op; offline valt het terug op de cache.
async function getDocsVers(q) {
  try {
    return await getDocsFromServer(q);
  } catch {
    return await getDocs(q);
  }
}

// ---- Agenda-events uit ICS (alleen-lezen) ----
export async function getAgendaEventsVoorDag(uid, datum) {
  const snap = await getDocsVers(query(
    collection(db, ...u(uid, 'agendaEvents')),
    where('datum', '==', datum),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Alle agenda-events (voor het weekoverzicht), server-eerst tegen stale cache.
export async function getAgendaEvents(uid) {
  const snap = await getDocsVers(collection(db, ...u(uid, 'agendaEvents')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Vakantieperiodes server-eerst: bewerkingen (datums, judovrij) moeten meteen
// doorwerken in de planning, niet pas na een cache-verval.
export async function getVakanties(uid) {
  const snap = await getDocsVers(collection(db, ...u(uid, 'vakanties')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export { serverTimestamp };

```

## `src/services/doelen.js`

```js
// Lange-termijndoelen met automatische koppeling aan Garmin waar mogelijk.

export const METRIEKEN = {
  vo2max:  { label: 'VO₂max',   eenheid: '',    omhoog: true },
  gewicht: { label: 'Gewicht',  eenheid: 'kg',  omhoog: false },
  rusthr:  { label: 'Rust-HR',  eenheid: 'bpm', omhoog: false },
  afstand: { label: 'Afstand',  eenheid: 'km',  omhoog: true },
  kracht:  { label: 'Gewicht (kg)', eenheid: 'kg', omhoog: true },
  eigen:   { label: 'Eigen meting', eenheid: '', omhoog: true },
};

// Huidige waarde: uit Garmin als de metriek dat toelaat, anders handmatig.
export function huidigeWaarde(doel, garmin) {
  if (doel.metric === 'vo2max' && garmin?.vo2max != null) return garmin.vo2max;
  if (doel.metric === 'gewicht' && garmin?.gewichtKg != null) return garmin.gewichtKg;
  if (doel.metric === 'rusthr' && garmin?.rustHr != null) return garmin.rustHr;
  return doel.huidige ?? null;
}

export function doelProgress(doel, garmin) {
  const start = Number(doel.start);
  const naar = Number(doel.naar);
  const huidige = huidigeWaarde(doel, garmin);
  if (huidige == null || !Number.isFinite(start) || !Number.isFinite(naar) || start === naar) {
    return { huidige, pct: 0, klaar: false, rest: null };
  }
  let pct = ((Number(huidige) - start) / (naar - start)) * 100;
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  const rest = Math.round((naar - Number(huidige)) * 10) / 10;
  return { huidige: Number(huidige), pct, klaar: pct >= 100, rest };
}

export function doelKleur(pct) {
  if (pct >= 100) return 'var(--success)';
  if (pct >= 50) return 'var(--primary)';
  return 'var(--primary-2)';
}

```

## `src/services/garmin.js`

```js
// Leest defensief een paar bruikbare waarden uit het ruwe Garmin-dagdocument.
// De pipeline bewaart de onbewerkte Garmin-objecten; sleutels kunnen per
// account licht verschillen, dus alles is best-effort met nette fallback.

function eersteGetal(...kandidaten) {
  for (const k of kandidaten) {
    const n = Number(k);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

// Garmin's "Local"-timestamps zijn epoch-ms die het lokale kloktijdstip
// coderen alsof het UTC is — dus UTC-getters gebruiken, geen lokale tijdzone.
function tijdVanEpochLocal(ms) {
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// Vertaalt de laatste-sync-info naar leesbare status + staleness-vlag.
export function syncStatus(laatsteSync) {
  if (!laatsteSync || !laatsteSync.datum) return { tekst: 'Nog niet gesynct', stale: true, leeg: true };
  const d = new Date(laatsteSync.datum + 'T12:00:00');
  const dagen = Math.floor((Date.now() - d.getTime()) / 864e5);
  const rel = dagen <= 0 ? 'vandaag' : dagen === 1 ? 'gisteren' : `${dagen} dagen geleden`;
  return { tekst: `Laatst gesynct: ${rel}`, stale: dagen >= 2, leeg: false, dagen };
}

export function garminSamenvatting(g) {
  if (!g) return null;

  const stappen = eersteGetal(
    g.summary?.totalSteps,
    g.stepsIntraday?.totalSteps,
  );

  const slaapSec = eersteGetal(
    g.sleep?.dailySleepDTO?.sleepTimeSeconds,
    g.sleep?.sleepTimeSeconds,
  );
  const slaapUren = slaapSec ? slaapSec / 3600 : null;

  const dailySleep = g.sleep?.dailySleepDTO || g.sleep;
  const slaapBegin = tijdVanEpochLocal(eersteGetal(
    dailySleep?.sleepStartTimestampLocal,
    g.sleep?.sleepStartTimestampLocal,
  ));
  const slaapEind = tijdVanEpochLocal(eersteGetal(
    dailySleep?.sleepEndTimestampLocal,
    g.sleep?.sleepEndTimestampLocal,
  ));

  // trainingReadiness is meestal een lijst met één object.
  const tr = Array.isArray(g.trainingReadiness) ? g.trainingReadiness[0] : g.trainingReadiness;
  const readiness = eersteGetal(tr?.score, tr?.readinessScore);
  const readinessLabel = tr?.level || tr?.feedbackShort || null;

  const rustHr = eersteGetal(
    g.restingHeartRate?.restingHeartRate,
    g.restingHeartRate?.allMetrics?.metricsMap?.WELLNESS_RESTING_HEART_RATE?.[0]?.value,
    g.summary?.restingHeartRate,
  );

  const kcal = eersteGetal(g.summary?.totalKilocalories, g.summary?.activeKilocalories);

  const status = g.trainingStatus?.latestTrainingStatusData
    ? Object.values(g.trainingStatus.latestTrainingStatusData)[0]?.trainingStatusFeedbackPhrase
    : null;

  // ---- Fase 3: body battery, VO2max, profiel ----
  const bb = Array.isArray(g.bodyBattery) ? g.bodyBattery[0] : g.bodyBattery;
  const bbArray = bb?.bodyBatteryValuesArray || bb?.bodyBatteryValuesArrayLevel;
  let bodyBattery = null, bodyBatteryMax = null;
  if (Array.isArray(bbArray) && bbArray.length) {
    const levels = bbArray.map((p) => (Array.isArray(p) ? p[1] : p?.level)).filter((n) => typeof n === 'number');
    if (levels.length) { bodyBattery = levels[levels.length - 1]; bodyBatteryMax = Math.max(...levels); }
  }

  // HRV-status (Garmin: BALANCED/UNBALANCED/LOW/...) + gemiddelde van afgelopen nacht.
  const hrvSummary = g.hrv?.hrvSummary || g.hrv;
  const hrvStatus = hrvSummary?.status || hrvSummary?.lastNightAvgStatus || null;
  const hrvAvg = eersteGetal(hrvSummary?.lastNightAvg, hrvSummary?.weeklyAvg);

  const mm = Array.isArray(g.maxMetrics) ? g.maxMetrics[0] : g.maxMetrics;
  const vo2max = eersteGetal(mm?.generic?.vo2MaxValue, mm?.vo2MaxValue, g.userProfile?.userData?.vo2Max);

  const bc = g.bodyComposition?.totalAverage || (Array.isArray(g.bodyComposition) ? g.bodyComposition[0] : g.bodyComposition);
  const gewichtG = eersteGetal(bc?.weight, g.userProfile?.userData?.weight);
  const gewichtKg = gewichtG ? Math.round(gewichtG / 1000 * 10) / 10 : null;
  const vetPct = eersteGetal(bc?.bodyFat);

  const ud = g.userProfile?.userData || g.userProfile || {};
  const lengteCm = eersteGetal(ud.height);
  let leeftijd = null;
  if (ud.birthDate) {
    const d = new Date(ud.birthDate);
    if (!isNaN(d)) leeftijd = Math.floor((Date.now() - d.getTime()) / (365.25 * 864e5));
  }

  return {
    stappen,
    slaapUren,
    slaapBegin,
    slaapEind,
    readiness,
    readinessLabel,
    rustHr,
    kcal,
    trainingStatus: status,
    bodyBattery,
    bodyBatteryMax,
    hrvStatus,
    hrvAvg,
    vo2max,
    gewichtKg,
    vetPct,
    leeftijd,
    lengteCm,
    // genormaliseerd voor de planner-advieslogica
    trainingReadiness: readiness != null ? { score: readiness } : null,
    sleep: slaapUren != null ? { urenTotaal: slaapUren } : null,
  };
}

```

## `src/services/maaltijden.js`

```js
// Maaltijdplanning: kiest concrete, exacte suggesties uit de eigen receptenbank
// (geen scraping van winkelsites — bewuste keuze, zie HANDOVER.md), schaalt
// hoeveelheden op het aantal eters, en stelt een boodschappenlijst samen.
// Premium-coach principe: dag-deterministische round-robin (net als
// `blessures.js` → `kiesOefeningenVanDag`), geen willekeur, geen scraping —
// voorspelbaar en uitlegbaar boven "slim".
import { dagOrdinal } from './tijd';

// Drie vaste, herkenbare snackmomenten + de drie hoofdmaaltijden. De recepten
// zelf kennen enkel het brede type 'snack' (zie Maaltijden.jsx) — elk
// snackmoment kiest via een eigen rotatie-offset (slotIndex) zodat ze niet
// stelselmatig hetzelfde voorstellen, met veilige terugval als er maar één
// snackrecept bestaat.
export const MOMENTEN = ['ontbijt', 'lunch', 'diner', 'snack1', 'snack2', 'snack3'];

export function receptType(moment) {
  return moment.startsWith('snack') ? 'snack' : moment;
}

function slotIndex(moment) {
  return moment === 'snack2' ? 1 : moment === 'snack3' ? 2 : 0;
}

// Eerlijke round-robin over de recepten die bij moment + doel passen — geen
// recept gekozen voor `doelen` betekent dat het bij elk doel past (veilige,
// inclusieve terugval, geen recepten verstoppen door een ontbrekend tag).
export function kiesSuggesties({ recepten = [], moment, doelen = [], datum, aantal = 2 }) {
  const type = receptType(moment);
  const passend = recepten.filter((r) =>
    (r.type || r.moment) === type
    && (!r.doelen?.length || !doelen.length || r.doelen.some((d) => doelen.includes(d))));
  if (!passend.length) return [];
  const offset = (dagOrdinal(datum) + slotIndex(moment)) % passend.length;
  const n = Math.min(aantal, passend.length);
  const gekozen = [];
  for (let i = 0; i < n; i++) gekozen.push(passend[(offset + i) % passend.length]);
  return gekozen;
}

// Override (expliciete gebruikerskeuze) wint altijd; anders de eerste van de
// deterministische suggesties. Pure functie van datum + recepten — werkt ook
// voor toekomstige dagen zonder dat daarvoor al een dagdoc bestaat.
export function gekozenMaaltijd({ recepten = [], moment, doelen = [], datum, override = null }) {
  if (override?.recipeId) {
    const recept = recepten.find((r) => r.id === override.recipeId);
    if (recept) return { recept, aantalEters: override.aantalEters || recept.aantalEters || 1 };
  }
  const [recept] = kiesSuggesties({ recepten, moment, doelen, datum, aantal: 1 });
  if (!recept) return null;
  return { recept, aantalEters: recept.aantalEters || 1 };
}

function rondAf(waarde, eenheid) {
  return ['g', 'ml'].includes(eenheid) ? Math.round(waarde / 5) * 5 : Math.round(waarde * 10) / 10;
}

export function schaalIngredienten(ingredienten = [], vanEters, naarEters) {
  const ratio = (naarEters || 1) / (vanEters || 1);
  return ingredienten.map((i) => ({ ...i, hoeveelheid: rondAf((i.hoeveelheid || 0) * ratio, i.eenheid) }));
}

export function ingredientenTekst(ingredienten = []) {
  return ingredienten.map((i) => `${i.hoeveelheid}${i.eenheid || ''} ${i.naam}`).join(', ');
}

// Boodschappenlijst over een periode (datums als "YYYY-MM-DD"), opgeteld per
// (naam, eenheid) en gegroepeerd in vers/houdbaar voor de UI (wekelijks vs.
// maandelijks in bulk). `dagDocs` is optioneel — enkel voor al gerealiseerde
// keuzes (bv. deze week); voor toekomstige dagen zonder dagdoc valt dit terug
// op de deterministische suggestie, dus géén extra Firestore-reads nodig voor
// een vooruitblik van een maand.
export function genereerBoodschappenlijst({ periode = [], recepten = [], doelen = [], aantalEtersStandaard = 1, dagDocs = {} }) {
  const totalen = new Map();
  periode.forEach((datum) => {
    MOMENTEN.forEach((moment) => {
      const override = dagDocs[datum]?.maaltijdPlan?.[moment] || null;
      const gekozen = gekozenMaaltijd({ recepten, moment, doelen, datum, override });
      if (!gekozen) return;
      const eters = override?.aantalEters || aantalEtersStandaard;
      const geschaald = schaalIngredienten(gekozen.recept.ingredienten || [], gekozen.recept.aantalEters || 1, eters);
      geschaald.forEach((i) => {
        const key = `${i.naam}|${i.eenheid || ''}`;
        const bestaand = totalen.get(key) || { naam: i.naam, eenheid: i.eenheid || '', hoeveelheid: 0, houdbaar: !!gekozen.recept.houdbaar };
        bestaand.hoeveelheid += i.hoeveelheid || 0;
        totalen.set(key, bestaand);
      });
    });
  });
  const lijst = [...totalen.values()].sort((a, b) => a.naam.localeCompare(b.naam));
  return {
    vers: lijst.filter((i) => !i.houdbaar),
    houdbaar: lijst.filter((i) => i.houdbaar),
  };
}

```

## `src/services/noordster.js`

```js
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

```

## `src/services/periodisering.js`

```js
// Periodisering: expliciete trainingsblokken (opbouw- vs deload-weken).
// Bewust een vaste, voorspelbare kalendercyclus (geen losse instelling, geen
// data-afhankelijke gok) — premium-principe 2: "vertrouwen > intelligentie",
// liever voorspelbaar dan verrassend. ACWR (services/belasting.js) blijft de
// dynamische, data-gedreven laag; periodisering is de structurele laag erboven:
// elke Nde week (standaard 4) is een ingeplande hersteller, los van hoe de
// belasting die week toevallig uitviel.

const CYCLUS_LENGTE_DEFAULT = 4; // 3 weken opbouw + 1 week deload

// Maandag-gebaseerde, doorlopende weekindex (i.t.t. ISO-weeknummers loopt deze
// door over jaargrenzen, anders zou de cyclus elk jaar rond nieuwjaar haperen).
function weekIndex(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dagSindsMaandag = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dagSindsMaandag);
  return Math.floor(x.getTime() / (7 * 86400000));
}

// Welke fase van de opbouw-/deloadcyclus valt op refDatum? Pure functie van de
// datum — geen meetdata nodig, dus altijd hoge zekerheid.
export function periodiseringBepalen(refDatum = new Date(), cyclusLengte = CYCLUS_LENGTE_DEFAULT) {
  const idx = weekIndex(refDatum);
  const weekInCyclus = (((idx % cyclusLengte) + cyclusLengte) % cyclusLengte) + 1; // 1..cyclusLengte
  const fase = weekInCyclus >= cyclusLengte ? 'deload' : 'opbouw';
  const waarom = fase === 'deload'
    ? `Week ${weekInCyclus}/${cyclusLengte} van je trainingscyclus is een ingeplande hersteller — na ${cyclusLengte - 1} weken opbouwen bouwen we bewust af, los van hoe zwaar deze week toevallig aanvoelt.`
    : `Week ${weekInCyclus}/${cyclusLengte} van je trainingscyclus — een opbouwweek, daarna volgt een hersteller.`;
  return {
    fase, weekInCyclus, cyclusLengte, zekerheid: 'hoog', waarom,
    meetlat: `Vaste cyclus van ${cyclusLengte} weken: ${cyclusLengte - 1} weken opbouw, dan 1 week deload — onafhankelijk van ACWR, als structureel vangnet tegen sluipende overbelasting.`,
  };
}

```

## `src/services/planner.js`

```js
// =========================================================================
//  Planning-engine: bouwt een gedetailleerde dagindeling op uit
//  instellingen + werkmodus + vaste ankers (judo trainen/lesgeven, RSCA,
//  agenda) + gewoontes/reva/maaltijden. Geeft tijdsloten met push-ankers.
//
//  Resultaat:
//   { blokken: [{id,start,eind,titel,type,kleur,bron,vast,taakId,push}],
//     todos:   [{taakId,titel,...}],   // taken zonder vast tijdslot
//     advies:  { fiets, sport, slaap, tekst[] } }
// =========================================================================
import { BLOK_TYPES, SPORTEN } from '../config/appConfig';
import { toMin, toHHMM, addMin } from './tijd';
import { kiesSportVanDag, genereerSportInhoud } from './sportcoach';
import { isBlessureActief, isVerlopenNietGemeld, vermijdSportenVanBlessures, kiesOefeningenVanDag, blessureBlokDuur } from './blessures';
import { gekozenMaaltijd, schaalIngredienten, ingredientenTekst } from './maaltijden';

const kleurVoor = (type) => (BLOK_TYPES[type]?.kleur || BLOK_TYPES.routine.kleur);

const SNACK_DUUR_MIN = 15;

// Maaltijdblok met een concreet, uitlegbaar voorstel (naam + exacte hoeveelheden)
// uit de eigen receptenbank, geschaald op het aantal eters. Geen passend recept
// gevonden (lege bank, of geen match voor het doel) → val veilig terug op het
// generieke blok van vroeger, geen regressie.
function maaltijdBlok(arr, start, eind, label, moment, { recepten, doelen, datum, maaltijdPlan, aantalEtersStandaard }) {
  const override = maaltijdPlan?.[moment] || null;
  const gekozen = gekozenMaaltijd({ recepten, moment, doelen, datum, override });
  if (!gekozen) {
    maakBlok(arr, start, eind, label, 'maaltijd', { bron: 'maaltijd' });
    return;
  }
  const eters = override?.aantalEters || aantalEtersStandaard || 1;
  const detail = ingredientenTekst(schaalIngredienten(gekozen.recept.ingredienten || [], gekozen.recept.aantalEters || 1, eters));
  maakBlok(arr, start, eind, `${label} — ${gekozen.recept.naam}`, 'maaltijd', { bron: 'maaltijdplan', detail, id: `maaltijd-${moment}` });
}

function maakBlok(arr, start, eind, titel, type, opts = {}) {
  if (!start || !eind) return;
  arr.push({
    id: opts.id || `${type}-${start}`,
    start, eind, titel, type,
    kleur: kleurVoor(type),
    bron: opts.bron || 'plan',
    vast: opts.vast ?? false,
    taakId: opts.taakId || null,
    push: opts.push ?? true,
    detail: opts.detail || null,
    oefeningen: opts.oefeningen || null,
    blessureId: opts.blessureId || null,
  });
}

// Zoekt, vanaf een voorkeurstijd, het eerstvolgende moment van duurMin
// minuten dat geen vaste/belangrijke blokken overlapt — zo plant de planner
// zelf rond werk/judo/agenda i.p.v. enkel een conflict te melden.
function vindVrijSlot(blok, vanaf, duurMin) {
  const belangrijk = blok
    .filter((b) => b.vast || ['werk', 'judo', 'lesgeven', 'woonwerk', 'agenda'].includes(b.bron))
    .slice().sort((a, b) => toMin(a.start) - toMin(b.start));
  let kandidaat = vanaf;
  for (const b of belangrijk) {
    if (toMin(addMin(kandidaat, duurMin)) <= toMin(b.start)) return kandidaat;
    if (toMin(kandidaat) < toMin(b.eind)) kandidaat = b.eind;
  }
  return kandidaat;
}

// Fietsadvies op basis van blessure, Garmin-readiness en weer.
export function berekenFietsAdvies({ sport, blessureActief, vermijdSporten = [], garmin, weer }) {
  if (!sport?.fietsAlsSport) return { fiets: false, reden: 'Fietsen-als-sport staat uit.' };
  if ((blessureActief || vermijdSporten.includes('fietsen')) && !sport.fietsBijBlessure) {
    return { fiets: false, reden: 'Blessure actief — neem vandaag de auto.' };
  }
  const readiness = garmin?.trainingReadiness?.score ?? garmin?.trainingReadiness ?? null;
  if (typeof readiness === 'number' && readiness < 35) {
    return { fiets: false, reden: `Lage training readiness (${readiness}/100) — spaar je vandaag.` };
  }
  if (weer) {
    const regen = weer.neerslagKans ?? weer.precipProb ?? 0;
    const wind = weer.windKmh ?? 0;
    if (regen >= 60) return { fiets: false, reden: `Veel kans op regen (${regen}%) — auto is comfortabeler.` };
    if (wind >= 45) return { fiets: false, reden: `Harde wind (${wind} km/u) — minder leuk fietsweer.` };
  }
  return { fiets: true, reden: 'Goede dag om te fietsen (telt als training).' };
}

export function genereerDagPlan({
  datum, dagKort, instellingen, werkModus,
  taken = [], reva = [], blessures = [], maaltijden = [], agendaEvents = [],
  garmin = null, weer = null, blessureActief = false, isVakantie = false, geenJudo = false,
  coachNiveau = null, revaTrouw = null, maaltijdPlan = {},
}) {
  const I = instellingen || {};
  const alg = I.algemeen || {};
  const werk = I.werk || {};
  const sport = I.sport || {};
  const gezondheid = I.gezondheid || {};
  const voeding = I.voeding || {};
  const recepten = maaltijden;
  const maaltijdCtx = {
    recepten, doelen: voeding.doelen || [], datum, maaltijdPlan,
    aantalEtersStandaard: voeding.aantalEtersStandaard || 1,
  };
  const blok = [];
  const advies = { tekst: [] };
  let werkEindTijd = null;
  let werkStartTijd = null;

  const isWo = dagKort === 'wo';

  // Bepaal werkmodus eerst, want het ritme (opstaan/slapen) hangt ervan af.
  const modus = werkModus || 'thuis';
  const werktVandaag = ['thuis', 'kantoor_auto', 'kantoor_fiets'].includes(modus);
  const vrijeDag = !werktVandaag || isVakantie;

  // Ritme verschilt: vrije/vakantiedagen mogen later starten en eindigen.
  const opstaan = vrijeDag ? (alg.opstaanVrij || alg.opstaan || '08:00') : (alg.opstaan || '06:45');
  const slapen = vrijeDag ? (alg.slapenVrij || alg.slapen || '23:30') : (alg.slapen || '22:45');

  // 1) Ochtendroutine + ontbijt
  maakBlok(blok, opstaan, addMin(opstaan, 25), 'Opstaan & klaarmaken', 'routine', { bron: 'routine' });
  maaltijdBlok(blok, addMin(opstaan, 25), addMin(opstaan, 45), 'Ontbijt', 'ontbijt', maaltijdCtx);

  // 2) Werk + woon-werk
  if (werktVandaag) {
    const fiets = modus === 'kantoor_fiets';
    const kantoor = modus !== 'thuis';
    let start = kantoor ? (werk.kantoorStart || '07:45') : (werk.thuisStart || '08:25');
    let eind = kantoor ? (werk.kantoorEind || '17:00') : (werk.thuisEind || '16:00');
    if (isWo) eind = werk.woensdagEind || '16:00'; // vroeg weg om les te geven

    if (kantoor) {
      const reis = fiets ? (werk.fietsReisMin || 45) : (werk.autoReisMin || 45);
      maakBlok(blok, addMin(start, -reis), start,
        fiets ? 'Fietsen naar werk' : 'Rijden naar werk', fiets ? 'sport' : 'woonwerk',
        { bron: 'woonwerk', detail: fiets ? 'Telt als training' : null });
      werkStartTijd = addMin(start, -reis);
    } else {
      werkStartTijd = start;
    }

    // Werk opsplitsen rond de middagpauze
    const pauze = werk.middagpauzeMin || 30;
    const lunch = '13:00';
    if (toMin(lunch) > toMin(start) && toMin(lunch) < toMin(eind)) {
      maakBlok(blok, start, lunch, kantoor ? 'Werk (kantoor)' : 'Thuiswerk', 'werk', { bron: 'werk' });
      maaltijdBlok(blok, lunch, addMin(lunch, pauze), 'Middagpauze + lunch', 'lunch', maaltijdCtx);
      maakBlok(blok, addMin(lunch, pauze), eind, kantoor ? 'Werk (kantoor)' : 'Thuiswerk', 'werk', { bron: 'werk', push: false });
    } else {
      maakBlok(blok, start, eind, kantoor ? 'Werk (kantoor)' : 'Thuiswerk', 'werk', { bron: 'werk' });
    }

    if (kantoor) {
      const reis = fiets ? (werk.fietsReisMin || 45) : (werk.autoReisMin || 45);
      maakBlok(blok, eind, addMin(eind, reis),
        fiets ? 'Fietsen naar huis' : 'Rijden naar huis', fiets ? 'sport' : 'woonwerk', { bron: 'woonwerk' });
      werkEindTijd = addMin(eind, reis);
    } else {
      werkEindTijd = eind;
    }
    // doel-uren feedback
    if (werk.doelUrenPerDag) advies.tekst.push(`Streef naar ±${werk.doelUrenPerDag}u werk (recuperatie-uren).`);
  }

  // 3) Judo les geven (woensdag, tenzij vakantie)
  (sport.judoLesgeven || []).forEach((les, i) => {
    if (les.dag !== dagKort) return;
    if (geenJudo) return;
    if (isVakantie && !les.tijdensVakantie) return;
    const vertrek = addMin(les.start, -(les.vertrekVoorMin || 30));
    maakBlok(blok, addMin(vertrek, -25), addMin(vertrek, -5), 'Snel eten voor judo', 'maaltijd', { bron: 'maaltijd' });
    maakBlok(blok, vertrek, les.start, 'Vertrek naar judoclub', 'woonwerk', { bron: 'judo' });
    maakBlok(blok, les.start, les.eind, 'Judoles geven', 'lesgeven', { bron: 'judo', vast: true, id: `lesgeven-${i}` });
  });

  // 4) Eigen judotraining
  (sport.judoEigenClub || []).forEach((t, i) => {
    if (t.dag !== dagKort) return;
    if (geenJudo) return;
    maakBlok(blok, t.start, t.eind, 'Judotraining', 'judo', { bron: 'judo', vast: true, id: `judo-${i}` });
  });

  // 5) Agenda-events (ICS): o.a. RSCA-matchen. Eigen agenda-afspraken laten we
  //    altijd staan — ook judo-gerelateerde zoals een BBQ of tornooi; dat is
  //    bewust jouw kalender. 'geenJudo' raakt enkel de door de app geplande judo.
  agendaEvents.forEach((ev, i) => {
    const titel = ev.titel || ev.summary || 'Afspraak';
    const isVoetbal = /anderlecht|rsca|voetbal/i.test(titel);
    maakBlok(blok, ev.start, ev.eind || addMin(ev.start, 90), titel,
      isVoetbal ? 'voetbal' : 'vrije_tijd', { bron: 'agenda', vast: true, id: `agenda-${i}` });
  });

  // Judovrij melden als er normaal judo (training of les) gepland zou zijn
  const judoVandaag = (sport.judoEigenClub || []).some((t) => t.dag === dagKort)
    || (sport.judoLesgeven || []).some((l) => l.dag === dagKort);
  if (geenJudo && judoVandaag) {
    advies.tekst.push('🥋 Judovrij (vakantie) — geen training of les vandaag.');
  }

  // Welke sporten een actieve blessure afraadt (zie BLESSURE_REGIOS) — voedt
  // zowel de sportcoach-keuze als het fietsadvies hieronder.
  const vermijdSporten = vermijdSportenVanBlessures(blessures, datum);
  if (judoVandaag && !geenJudo && vermijdSporten.includes('judo')) {
    advies.tekst.push('⚠️ Judo staat gepland, maar een actieve blessure raadt dit af — overweeg te schrappen of aan te passen.');
  }
  blessures.forEach((b) => {
    if (isVerlopenNietGemeld(b, datum)) {
      advies.tekst.push(`ℹ️ Blessure “${b.titel || b.naam || 'onbenoemd'}” liep af op ${b.eindDatum} — controleer of die echt voorbij is.`);
    }
  });
  // Adaptieve feedback-loop: structureel gemiste reva (<50% de voorbije dagen)
  // melden we, zonder te straffen — een blessure die je niet naleeft is precies
  // het risico dat de reva moet voorkomen.
  if (typeof revaTrouw === 'number' && revaTrouw < 50) {
    advies.tekst.push(`⚠️ Je reva-oefeningen lukten de voorbije dagen maar ${revaTrouw}% — overweeg het aantal of de duur te verlagen in Gezondheid, zodat je het wél haalt.`);
  }

  // 5b) Sportcoach: concreet trainingsblok voor vandaag, zodat het advies van
  //     de coach ook echt in het dagschema staat (niet enkel op de coach-pagina).
  //     Judo heeft hierboven al een eigen vast blok; rustdagen krijgen geen blok.
  if (coachNiveau) {
    const keuze = kiesSportVanDag({ dagKort, weekSchema: sport.weekSchema, niveau: coachNiveau, judoVandaag: judoVandaag && !geenJudo, weer, vermijdSporten });
    if (keuze.sport !== 'rust' && keuze.sport !== 'judo') {
      const inhoud = genereerSportInhoud({
        sport: keuze.sport, niveau: coachNiveau, oefeningen: sport.oefeningen,
        garmin, stappenDoel: gezondheid.stappenDoel, datum, weer,
      });
      const duurMin = inhoud.minuten || { hard: 50, matig: 40, rustig: 30, herstel: 20 }[coachNiveau] || 40;
      const sportStart = werkEindTijd ? addMin(werkEindTijd, 15) : addMin(opstaan, 90);
      const detail = inhoud.type === 'homefitness'
        ? (inhoud.oefeningen.length ? inhoud.oefeningen.map((o) => `${o.naam} ${o.sets}×${o.reps}`).join(', ') : inhoud.waarom[0])
        : inhoud.type === 'fietsen'
          ? `±${inhoud.km} km (~${inhoud.minuten} min) · ${inhoud.zoneTekst}`
          : inhoud.stappenAdvies != null
            ? `Nog ±${Math.round(inhoud.stappenAdvies).toLocaleString('nl-BE')} stappen (±${inhoud.km} km)`
            : `±${inhoud.km} km`;
      maakBlok(blok, sportStart, addMin(sportStart, duurMin), SPORTEN[keuze.sport]?.naam || 'Training', 'sport',
        { bron: 'sportcoach', detail, id: 'sportcoach-blok' });
      if (keuze.overschreven) advies.tekst.push(`🏋️ ${keuze.waarom.join(' ')}`);
    }
  }

  // 5c) Reva: één blok per actieve blessure, met die dag eerlijk-geroteerde
  //     selectie oefeningen als checklist — zichtbaar bij "vandaag".
  const actieveBlessures = blessures.filter((b) => isBlessureActief(b, datum));
  actieveBlessures.forEach((b, i) => {
    const oefeningen = kiesOefeningenVanDag({ oefeningen: b.oefeningen || [], aantalPerDag: b.aantalPerDag, datum });
    if (!oefeningen.length) return;
    const duurMin = blessureBlokDuur(oefeningen.length);
    // Geen vaste tijd gekozen: de planner plant zelf rond werk/judo/agenda in
    // plaats van enkel een conflict te melden — bij voorkeur vóór het werk
    // begint (na het ontbijt), anders na het werk, telkens om vaste blokken
    // heen geschoven. Een expliciet gekozen tijd (b.tijd) blijft gerespecteerd
    // — die kiest de gebruiker bewust, daar schuift de planner niet aan.
    let start;
    if (b.tijd) {
      start = b.tijd;
    } else {
      const naOntbijt = addMin(opstaan, 45);
      const pastVoorWerk = !werkStartTijd || toMin(addMin(naOntbijt, duurMin)) <= toMin(werkStartTijd);
      const voorkeur = pastVoorWerk ? naOntbijt : (werkEindTijd ? addMin(werkEindTijd, 15) : addMin(opstaan, 60));
      start = vindVrijSlot(blok, voorkeur, duurMin);
    }
    maakBlok(blok, start, addMin(start, duurMin), `Reva — ${b.titel || b.naam || 'oefeningen'}`, 'reva', {
      bron: 'reva', id: `reva-${b.id || i}`, blessureId: b.id || null,
      oefeningen: oefeningen.map((o) => ({ id: o.id, naam: o.naam, sets: o.sets || null })),
      detail: oefeningen.map((o) => o.naam).join(', '),
    });
  });

  // 6) Reva + gewoontes met vast tijdslot worden blokken; rest -> todos
  const todos = [];
  const dagTaken = taken.filter((t) => t.actief !== false && (!t.dagen || t.dagen.includes(dagKort)));
  dagTaken.forEach((t) => {
    if (t.tijd) {
      maakBlok(blok, t.tijd, addMin(t.tijd, t.duurMin || 15), t.titel, t.blokType || 'routine',
        { bron: 'taak', taakId: t.id, id: `taak-${t.id}` });
    } else {
      todos.push({ taakId: t.id, titel: t.titel, type: t.type, blokType: t.blokType || 'routine' });
    }
  });

  // 7) Avondeten als er nog niet gegeten is rond de avond
  const heeftAvondeten = blok.some((b) => b.type === 'maaltijd' && toMin(b.start) >= toMin('18:00'));
  if (!heeftAvondeten && werktVandaag) {
    const et = isWo ? null : '18:45';
    if (et) {
      maaltijdBlok(blok, et, addMin(et, 40), 'Avondeten', 'diner', maaltijdCtx);
    }
  }

  // 7b) Snacks: 3 vaste momenten (voormiddag/namiddag/avond-ontspanning), elk
  //     via `vindVrijSlot` om werk/judo/agenda heen geschoven zodat ze nooit
  //     een conflict opleveren. Stil overgeslagen zonder passend snackrecept
  //     of zonder ruimte vóór het afbouwen — geen geforceerd blok.
  if (voeding.snacksAan !== false) {
    const voorkeuren = {
      snack1: addMin(opstaan, 210),
      snack2: '15:30',
      snack3: addMin(slapen, -150),
    };
    ['snack1', 'snack2', 'snack3'].forEach((moment) => {
      const override = maaltijdPlan?.[moment] || null;
      const gekozen = gekozenMaaltijd({ recepten, doelen: voeding.doelen || [], datum, moment, override });
      if (!gekozen) return;
      const start = vindVrijSlot(blok, voorkeuren[moment], SNACK_DUUR_MIN);
      const eind = addMin(start, SNACK_DUUR_MIN);
      if (toMin(eind) > toMin(addMin(slapen, -30))) return; // geen ruimte meer vóór het afbouwen
      const eters = override?.aantalEters || voeding.aantalEtersStandaard || 1;
      const detail = ingredientenTekst(schaalIngredienten(gekozen.recept.ingredienten || [], gekozen.recept.aantalEters || 1, eters));
      maakBlok(blok, start, eind, `Snack — ${gekozen.recept.naam}`, 'maaltijd', { bron: 'maaltijdplan', detail, id: `maaltijd-${moment}` });
    });
  }

  // 8) Afbouwen + slaap. Het slaapblok loopt van bedtijd tot het opstaan-uur
  //    (over middernacht heen), niet een betekenisloos 1-minuut-blok.
  const slaapDuurMin = ((toMin(opstaan) - toMin(slapen)) + 1440) % 1440 || 480;
  maakBlok(blok, addMin(slapen, -30), slapen, 'Afbouwen — scherm weg, klaarmaken', 'scherm', { bron: 'routine' });
  maakBlok(blok, slapen, opstaan, 'Slapen', 'slaap',
    { bron: 'routine', push: true, detail: `±${(slaapDuurMin / 60).toFixed(1).replace('.0', '')}u tot ${opstaan}` });

  // Sorteer op starttijd
  blok.sort((a, b) => toMin(a.start) - toMin(b.start));

  // Vul gaten tussen einde werk/sport en afbouwen met "vrije tijd"
  vulVrijeTijd(blok, slapen);

  // Advies
  const fietsAdvies = berekenFietsAdvies({ sport, blessureActief, vermijdSporten, garmin, weer });
  advies.fiets = fietsAdvies;
  if (modus === 'kantoor_fiets' || modus === 'kantoor_auto') {
    advies.tekst.push(fietsAdvies.fiets
      ? `🚲 ${fietsAdvies.reden}`
      : `🚗 ${fietsAdvies.reden}`);
  }
  if (garmin) {
    const slaapU = garmin.sleep?.urenTotaal ?? garmin.sleep?.totalHours ?? null;
    if (slaapU != null) advies.tekst.push(`Slaap vannacht: ${Number(slaapU).toFixed(1)}u.`);
    const rd = garmin.trainingReadiness?.score ?? garmin.trainingReadiness ?? null;
    if (rd != null) {
      advies.tekst.push(rd >= 65 ? `Topreadiness (${rd}/100) — ga ervoor.`
        : rd >= 40 ? `Matige readiness (${rd}/100) — train rustig.`
        : `Lage readiness (${rd}/100) — kies herstel.`);
    }
  }

  // Conflictdetectie tussen vaste/belangrijke blokken (overlap in tijd).
  const conflicten = detecteerConflicten(blok);
  conflicten.forEach((c) => advies.tekst.push(`⚠️ Conflict: “${c.a}” overlapt met “${c.b}”.`));

  return { blokken: blok, todos, advies, conflicten };
}

function detecteerConflicten(blok) {
  const belangrijk = blok.filter((b) =>
    b.vast || ['judo', 'agenda', 'werk', 'reva'].includes(b.bron) || ['judo', 'lesgeven', 'voetbal', 'sport', 'reva'].includes(b.type)
  );
  const conflicten = [];
  for (let i = 0; i < belangrijk.length; i++) {
    for (let j = i + 1; j < belangrijk.length; j++) {
      const a = belangrijk[i], b = belangrijk[j];
      if (toMin(a.start) < toMin(b.eind) && toMin(a.eind) > toMin(b.start)) {
        a.conflict = true; b.conflict = true;
        conflicten.push({ a: a.titel, b: b.titel });
      }
    }
  }
  return conflicten;
}

// Voegt "vrije tijd"-blokken toe in lege avond-/dagdelen tussen ankers.
function vulVrijeTijd(blok, slapen) {
  const vasteEinde = [...blok].sort((a, b) => toMin(a.start) - toMin(b.start));
  const result = [];
  for (let i = 0; i < vasteEinde.length - 1; i++) {
    const huidig = vasteEinde[i];
    const volgend = vasteEinde[i + 1];
    const gap = toMin(volgend.start) - toMin(huidig.eind);
    // alleen 's avonds (na 17u) en gaten >= 45 min opvullen met vrije tijd
    if (gap >= 45 && toMin(huidig.eind) >= toMin('17:00') && toMin(huidig.eind) < toMin(slapen)) {
      result.push({
        id: `vrij-${huidig.eind}`, start: huidig.eind, eind: volgend.start,
        titel: 'Vrije tijd / ontspanning', type: 'vrije_tijd', kleur: kleurVoor('vrije_tijd'),
        bron: 'auto', vast: false, push: false, taakId: null, detail: 'Tv, lezen, sociaal — bewust ontspannen',
      });
    }
  }
  blok.push(...result);
  blok.sort((a, b) => toMin(a.start) - toMin(b.start));
}

```

## `src/services/push.js`

```js
// Client-side push: toestemming vragen, FCM-token ophalen en opslaan onder
// users/{uid}/pushTokens/{token}. De Cloud Functions sturen hiernaar.
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import app, { db } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;
let _messaging = null;
const messagingInstance = () => (_messaging ||= getMessaging(app));

export async function pushOndersteund() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  try { return await isSupported(); } catch { return false; }
}

export async function activeerPush(uid) {
  if (!(await pushOndersteund())) throw new Error('Deze browser/toestel ondersteunt geen push. Voeg de app eerst toe aan je beginscherm.');
  if (!VAPID_KEY) throw new Error('VAPID-sleutel ontbreekt (VITE_VAPID_KEY).');

  const permissie = await Notification.requestPermission();
  if (permissie !== 'granted') throw new Error('Meldingen niet toegestaan.');

  // Firebase registreert zelf /firebase-messaging-sw.js
  const token = await getToken(messagingInstance(), { vapidKey: VAPID_KEY });
  if (!token) throw new Error('Geen push-token ontvangen.');

  await setDoc(doc(db, 'users', uid, 'pushTokens', token), {
    token, actief: true, platform: 'web',
    device: navigator.userAgent.slice(0, 120),
    bijgewerktOp: serverTimestamp(),
  }, { merge: true });

  return token;
}

export async function luisterVoorgrond(cb) {
  if (!(await pushOndersteund())) return () => {};
  return onMessage(messagingInstance(), (payload) => cb?.(payload));
}

```

## `src/services/reflectie.js`

```js
// Mindset & reflectie: schalen voor stemming/energie/tevredenheid + trend-helpers.
// Pure functies, makkelijk testbaar. Check-ins leven in dagen/{datum}.checkin:
//   { ochtend: { stemming, energie, op }, avond: { tevreden, dankbaar, reflectie, op } }

export const STEMMINGEN = [
  { v: 1, emoji: '😣', label: 'Slecht' },
  { v: 2, emoji: '😕', label: 'Matig' },
  { v: 3, emoji: '😐', label: 'Oké' },
  { v: 4, emoji: '🙂', label: 'Goed' },
  { v: 5, emoji: '😄', label: 'Top' },
];

export const ENERGIE = [
  { v: 1, label: 'Uitgeput' },
  { v: 2, label: 'Laag' },
  { v: 3, label: 'Normaal' },
  { v: 4, label: 'Energiek' },
  { v: 5, label: 'Topfit' },
];

export const stemmingInfo = (v) => STEMMINGEN.find((s) => s.v === v) || null;
export const energieInfo = (v) => ENERGIE.find((e) => e.v === v) || null;

// Gemiddelde over numerieke waarden (null/undefined genegeerd), op 1 decimaal.
export function gemiddelde(waarden) {
  const xs = (waarden || []).filter((v) => typeof v === 'number');
  if (!xs.length) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
}

// Reeks dagdocs -> reeks check-in-waarden per dag (voor sparklines/trends).
export function reflectieReeks(dagen) {
  return (dagen || []).map((d) => ({
    datum: d.datum,
    label: d.label || '',
    stemming: d.checkin?.ochtend?.stemming ?? null,
    energie: d.checkin?.ochtend?.energie ?? null,
    tevreden: d.checkin?.avond?.tevreden ?? null,
  }));
}

// Korte samenvatting van een reeks: gemiddelden + of er genoeg data is.
export function reflectieSamenvatting(dagen) {
  const r = reflectieReeks(dagen);
  return {
    stemming: gemiddelde(r.map((x) => x.stemming)),
    energie: gemiddelde(r.map((x) => x.energie)),
    tevreden: gemiddelde(r.map((x) => x.tevreden)),
    aantal: r.filter((x) => x.stemming != null || x.energie != null || x.tevreden != null).length,
    stemmingReeks: r.map((x) => x.stemming),
    energieReeks: r.map((x) => x.energie),
  };
}

// Zelf-gerapporteerde energie (1-5) -> bijsturing van de coach-score.
// Lage energie remt af, hoge energie geeft wat ruimte. 3 = neutraal.
export function energieNudge(energie) {
  if (typeof energie !== 'number') return 0;
  return { 1: -16, 2: -8, 3: 0, 4: 6, 5: 10 }[energie] ?? 0;
}

```

## `src/services/sportcoach.js`

```js
// Sport-coach: bepaalt WELKE sport een dag krijgt (vast weekschema + adaptieve
// override bij laag herstel-niveau) en WAT die sport die dag concreet inhoudt
// (oefeningen + waarom, km/interval/hartslagzone voor fietsen, km/stappen voor
// wandelen). Judo blijft bewust ongedetailleerd — dat is al een vast blok.

import { SPORTEN } from '../config/appConfig';

const NIVEAU_LABEL = { hard: 'hoge belastbaarheid', matig: 'gemiddelde belastbaarheid', rustig: 'lichte belastbaarheid', herstel: 'herstel' };

// Intensiteit-rangorde van de sporten zelf — bepaalt of een override "lichter" is.
const SPORT_INTENSITEIT = { rust: 0, wandelen: 1, homefitness: 2, fietsen: 3 };

// Hybride: vast weekschema, met override naar een lichtere sport bij laag
// herstel — nooit zomaar schrappen, altijd met uitleg.
export function kiesSportVanDag({ dagKort, weekSchema, niveau, judoVandaag, weer = null, vermijdSporten = [] }) {
  if (judoVandaag) return { sport: 'judo', gepland: 'judo', overschreven: false, waarom: [] };

  const gepland = weekSchema?.[dagKort] || 'rust';
  if (gepland === 'rust') return { sport: 'rust', gepland, overschreven: false, waarom: [] };

  const geplandeIntensiteit = SPORT_INTENSITEIT[gepland] ?? 1;
  let sport = gepland;
  const waarom = [];
  if (niveau === 'herstel' && geplandeIntensiteit >= 2) {
    sport = 'wandelen';
    waarom.push(`${gepland === 'fietsen' ? 'Fietsen' : 'Home fitness'} stond gepland, maar je herstel-niveau is laag vandaag — een lichtere wandeling in de plaats.`);
  } else if (niveau === 'rustig' && geplandeIntensiteit >= 3) {
    sport = 'homefitness';
    waarom.push('Fietsen stond gepland, maar gezien je matige belastbaarheid kiezen we een rustigere home fitness-sessie.');
  } else if (gepland === 'fietsen' && sport === 'fietsen') {
    const weerReden = slechtFietsWeer(weer);
    if (weerReden) {
      sport = 'homefitness';
      waarom.push(`Fietsen stond gepland, maar ${weerReden} — een home fitness-sessie in plaats daarvan.`);
    }
  }

  // Blessure-veto: een actieve blessure kan deze sport specifiek afraden (zie
  // BLESSURE_REGIOS). Kies dan het lichtste alternatief dat zelf niet ook
  // afgeraden wordt; pas als alles afgeraden is, valt het terug op rust.
  if (vermijdSporten.includes(sport)) {
    const voorVeto = sport;
    const alternatieven = ['wandelen', 'homefitness', 'rust'];
    sport = alternatieven.find((s) => s === 'rust' || !vermijdSporten.includes(s));
    waarom.push(`${SPORTEN[voorVeto]?.naam || voorVeto} stond gepland, maar dat wordt afgeraden door een actieve blessure — ${
      sport === 'rust' ? 'vandaag rust in plaats daarvan.' : `${SPORTEN[sport]?.naam || sport} in de plaats daarvan.`}`);
  }

  return { sport, gepland, overschreven: sport !== gepland, waarom };
}

// Stabiele "willekeurige" rotatie op basis van de datum, zodat dezelfde dag
// altijd dezelfde oefeningen toont — geen herberekening die elke render wisselt.
function seedGetal(tekst) {
  let h = 0;
  for (const c of String(tekst)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function genereerHomeFitness({ oefeningen = [], niveau, datum }) {
  if (!oefeningen.length) {
    return { oefeningen: [], waarom: ['Nog geen oefeningen ingesteld — vul ze aan via Beheer › Sport & fiets.'] };
  }
  const aantal = { hard: 6, matig: 5, rustig: 4, herstel: 3 }[niveau] ?? 5;
  const seed = seedGetal(datum);
  const geroteerd = oefeningen.map((_, i) => oefeningen[(i + seed) % oefeningen.length]);
  const basis = niveau === 'herstel'
    ? geroteerd.filter((o) => o.categorie === 'mobiliteit' || o.categorie === 'core')
    : geroteerd;
  const gekozen = (basis.length ? basis : geroteerd).slice(0, aantal);
  const factor = niveau === 'hard' ? 1.15 : niveau === 'herstel' ? 0.7 : 1;
  return {
    oefeningen: gekozen.map((o) => ({ ...o, sets: Math.max(1, Math.round((o.sets || 3) * factor)) })),
    waarom: [`Sessie afgestemd op ${NIVEAU_LABEL[niveau] || 'vandaag'} — elke oefening heeft een eigen waarom hieronder.`],
  };
}

// Slecht fietsweer (veel regen/harde wind) -> binnen blijven kan geen kwaad,
// maar we vervangen het advies bewust door een evenwaardige home fitness-sessie
// in plaats van de gebruiker zonder alternatief te laten staan.
function slechtFietsWeer(weer) {
  if (!weer) return null;
  const regen = weer.neerslagKans ?? weer.precipProb ?? 0;
  const wind = weer.windKmh ?? weer.wind ?? 0;
  if (regen >= 60) return `veel kans op regen (${regen}%)`;
  if (wind >= 45) return `harde wind (${wind} km/u)`;
  return null;
}

export function genereerFietsAdvies({ niveau, weer = null }) {
  const minuten = { hard: 75, matig: 50, rustig: 35, herstel: 25 }[niveau] ?? 45;
  const km = Math.round((minuten / 60) * 22); // ±22 km/u gemiddeld
  const zoneTekst = {
    hard: 'Hartslagzone 3-4, met 4-6 intervallen van 3 min stevig / 2 min rustig',
    matig: 'Hartslagzone 2-3, rustig duurtempo zonder intervallen',
    rustig: 'Hartslagzone 1-2, comfortabel tempo',
    herstel: 'Hartslagzone 1, heel licht — vooral de benen losrijden',
  }[niveau] || 'Hartslagzone 2, rustig tempo';
  const weerReden = slechtFietsWeer(weer);
  return {
    km, minuten, zoneTekst, weerWaarschuwing: weerReden,
    waarom: weerReden
      ? [`±${km} km (~${minuten} min) past bij je huidige ${NIVEAU_LABEL[niveau] || 'belastbaarheid'}, maar ${weerReden} — overweeg binnen te trainen.`]
      : [`±${km} km (~${minuten} min) past bij je huidige ${NIVEAU_LABEL[niveau] || 'belastbaarheid'}.`],
  };
}

export function genereerWandelAdvies({ niveau, garmin, stappenDoel }) {
  const km = { hard: 7, matig: 5, rustig: 3.5, herstel: 2.5 }[niveau] ?? 4;
  const stappenVandaag = garmin?.stappen ?? null;
  const restStappen = stappenDoel != null && stappenVandaag != null ? Math.max(0, stappenDoel - stappenVandaag) : null;
  if (restStappen != null && restStappen > 0) {
    return {
      km, stappenAdvies: restStappen,
      waarom: [`Je hebt vandaag nog ${restStappen.toLocaleString('nl-BE')} stappen tot je doel — een wandeling van ±${km} km helpt dat te halen.`],
    };
  }
  return { km, stappenAdvies: null, waarom: [`±${km} km past bij je huidige ${NIVEAU_LABEL[niveau] || 'belastbaarheid'}.`] };
}

export function genereerSportInhoud({ sport, niveau, oefeningen = [], garmin = null, stappenDoel = null, datum, weer = null }) {
  if (sport === 'homefitness') return { type: 'homefitness', ...genereerHomeFitness({ oefeningen, niveau, datum }) };
  if (sport === 'fietsen') return { type: 'fietsen', ...genereerFietsAdvies({ niveau, weer }) };
  if (sport === 'wandelen') return { type: 'wandelen', ...genereerWandelAdvies({ niveau, garmin, stappenDoel }) };
  if (sport === 'judo') return { type: 'judo', waarom: ['Vaste judotraining/-les — geen extra invulling nodig.'] };
  return { type: 'rust', waarom: ['Geplande rustdag — geen training nodig.'] };
}

```

## `src/services/taken.js`

```js
// Afvinken van taken/gewoontes + streak-bijhouden.
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { datumKey } from './tijd';

const logId = (datum, taakId) => `${datum}_${taakId}`;

// Markeer een taak als (on)gedaan voor een dag en werk de streak bij.
export async function zetTaakGedaan(uid, taak, datumObj, gedaan) {
  const datum = typeof datumObj === 'string' ? datumObj : datumKey(datumObj);
  const logRef = doc(db, 'users', uid, 'takenLog', logId(datum, taak.id));
  await setDoc(logRef, { taakId: taak.id, datum, gedaan, op: serverTimestamp() }, { merge: true });

  // Streak alleen relevant voor gewoontes.
  if (taak.type !== 'gewoonte') return;

  const taakRef = doc(db, 'users', uid, 'taken', taak.id);
  const snap = await getDoc(taakRef);
  const t = snap.exists() ? snap.data() : {};
  const gisteren = vorigeDatum(datum);

  let streak = t.streak || 0;
  let beste = t.beste || 0;
  let laatste = t.laatsteGedaan || null;

  if (gedaan) {
    if (laatste === datum) return; // al geteld
    streak = laatste === gisteren ? streak + 1 : 1;
    laatste = datum;
    beste = Math.max(beste, streak);
  } else {
    // ongedaan maken van vandaag: stap één terug
    if (laatste === datum) {
      streak = Math.max(0, streak - 1);
      laatste = streak > 0 ? gisteren : null;
    }
  }
  await updateDoc(taakRef, { streak, beste, laatsteGedaan: laatste });
}

function vorigeDatum(datum) {
  const d = new Date(datum + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return datumKey(d);
}

```

## `src/services/tijd.js`

```js
// Kleine tijd-helpers. Tijden zijn strings "HH:MM"; intern rekenen we in minuten.
export const toMin = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};
export const toHHMM = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
export const addMin = (hhmm, delta) => toHHMM(toMin(hhmm) + delta);
export const duurMin = (a, b) => toMin(b) - toMin(a);

export const DAG_KORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
export const dagKortVanDatum = (d) => DAG_KORT[d.getDay()];

export const datumKey = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

// ISO-weeknummer + jaar -> "YYYY-Www"
export function weekKey(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(x.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((x - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${x.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const nuMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

// Dagnummer sinds epoch — basis voor deterministische, eerlijke round-robin-
// rotaties (reva-oefeningen, maaltijdsuggesties) zonder willekeur.
export const dagOrdinal = (datum) => Math.floor(new Date(`${datum}T00:00:00Z`).getTime() / 86400000);

```

## `src/services/vakanties.js`

```js
// Vakantieperiodes als datum-reeksen (YYYY-MM-DD; string-vergelijking volstaat).
// Een periode kan 'verlof' zijn (jij bent vrij) en/of 'geenJudo' (clubs dicht:
// geen eigen training én geen lesgeven).

export function vakantieVoorDatum(lijst, datum) {
  for (const v of lijst || []) {
    if (v.van && v.tot && datum >= v.van && datum <= v.tot) return v;
  }
  return null;
}

// Gecombineerde vlaggen over ÁLLE periodes die deze datum overlappen. Belangrijk
// bij overlap: als één periode 'geenJudo' is en een andere 'verlof', gelden beide.
// (Anders zou alleen de eerst-gevonden periode tellen en kon judovrij wegvallen.)
export function vakantieFlags(lijst, datum) {
  let verlof = false, geenJudo = false, buitenland = false, periode = null;
  for (const v of lijst || []) {
    if (v.van && v.tot && datum >= v.van && datum <= v.tot) {
      if (!periode) periode = v;
      if (v.verlof) verlof = true;
      if (v.geenJudo) geenJudo = true;
      if (v.buitenland) buitenland = true;
    }
  }
  return { verlof, geenJudo, buitenland, periode };
}

// Eerste periode die een van de gegeven dagdatums overlapt (voor weekbanner).
export function vakantieInWeek(lijst, datums) {
  for (const v of lijst || []) {
    if (v.van && v.tot && datums.some((d) => d >= v.van && d <= v.tot)) return v;
  }
  return null;
}

export function vakantieLabel(v) {
  if (!v) return '';
  const suffix = v.buitenland ? ' (buitenland)' : '';
  if (v.geenJudo && v.verlof) return `Verlof + judovrij${suffix}`;
  if (v.geenJudo) return `Judovrij (clubs dicht)${suffix}`;
  if (v.verlof) return `Persoonlijk verlof${suffix}`;
  return 'Vakantie';
}

```

## `src/styles/global.css`

```css
/* =========================================================================
   Personal Agenda — globale stijl + 3 donkere thema's
   Semantische tokens; wissel van thema via <html data-theme="...">.
   ========================================================================= */

/* ---- Thema 1: Middernacht (blauw/teal) — standaard ---- */
:root,
[data-theme='middernacht'] {
  --bg: #0b1120;
  --bg-2: #0e1526;
  --surface: #131c31;
  --surface-2: #1a2540;
  --border: #243152;
  --text: #eef2fb;
  --text-muted: #aeb9d4;
  --text-dim: #7c89aa;
  --primary: #2dd4bf;
  --primary-2: #38bdf8;
  --on-primary: #04121a;
  --success: #34d399;
  --warning: #fbbf24;
  --danger: #fb7185;
  --ring: #2dd4bf;
  --shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.6);
}

/* ---- Thema 2: Bos (groen) ---- */
[data-theme='bos'] {
  --bg: #0a130d;
  --bg-2: #0d1812;
  --surface: #13211a;
  --surface-2: #1b2e24;
  --border: #244033;
  --text: #ecf6ef;
  --text-muted: #aac7b6;
  --text-dim: #7ba089;
  --primary: #34d399;
  --primary-2: #a3e635;
  --on-primary: #05140d;
  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #f87171;
  --ring: #34d399;
  --shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.6);
}

/* ---- Thema 3: Ember (warm amber) ---- */
[data-theme='ember'] {
  --bg: #130f0b;
  --bg-2: #18120d;
  --surface: #221a12;
  --surface-2: #2e2318;
  --border: #43321f;
  --text: #f8f0e7;
  --text-muted: #d2bfa8;
  --text-dim: #a18a6f;
  --primary: #f59e0b;
  --primary-2: #fb7185;
  --on-primary: #1a1003;
  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #f87171;
  --ring: #f59e0b;
  --shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.65);
}

* { box-sizing: border-box; }

html, body, #root { height: 100%; }

body {
  margin: 0;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  font-feature-settings: 'tnum' 1;
  line-height: 1.5;
}

h1, h2, h3, h4 { margin: 0 0 .2em; font-weight: 600; line-height: 1.25; }
h1 { font-size: 1.5rem; }
h2 { font-size: 1.2rem; }
h3 { font-size: 1.02rem; }
p { margin: 0 0 .6em; }
a { color: var(--primary); text-decoration: none; }

:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; border-radius: 6px; }

button, input, select, textarea { font: inherit; color: inherit; }

/* ---- Layout-schaal ---- */
.container { width: 100%; max-width: 880px; margin: 0 auto; padding: 16px; }
.stack { display: flex; flex-direction: column; gap: 14px; }
.row { display: flex; align-items: center; gap: 10px; }
.row.between { justify-content: space-between; }
.wrap { flex-wrap: wrap; }
.grow { flex: 1; }
.muted { color: var(--text-muted); }
.dim { color: var(--text-dim); }
.small { font-size: .82rem; }
.center { text-align: center; }

/* ---- Kaart ---- */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
}
.card.tight { padding: 12px; }
.card-title { font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; color: var(--text-dim); margin-bottom: 10px; }

/* ---- Knoppen ---- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 44px; padding: 0 16px;
  background: var(--surface-2); color: var(--text);
  border: 1px solid var(--border); border-radius: 12px;
  cursor: pointer; font-weight: 500;
  transition: transform .12s var(--ease-out-quart), background .15s ease, border-color .15s ease, opacity .15s ease;
}
.btn:hover { border-color: var(--text-dim); }
.btn:active { transform: scale(.97); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn.primary { background: var(--primary); color: var(--on-primary); border-color: transparent; font-weight: 600; }
.btn.ghost { background: transparent; }
.btn.danger { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 40%, var(--border)); }
.btn.block { width: 100%; }
.btn.sm { min-height: 36px; padding: 0 12px; font-size: .88rem; border-radius: 10px; }
.icon-btn { min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid transparent; border-radius: 12px; cursor: pointer; color: var(--text-muted); }
.icon-btn:hover { color: var(--text); background: var(--surface-2); }

/* ---- Daypicker (kalender-popover) ---- */
.daypicker { position: relative; }
.daypicker-pop {
  position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%);
  z-index: 40; width: 280px; padding: 14px; box-shadow: var(--shadow);
}
.daypicker-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.daypicker-wd { text-align: center; padding: 4px 0; text-transform: uppercase; }
.daypicker-dag {
  aspect-ratio: 1; min-height: 0; display: grid; place-items: center;
  background: transparent; border: 1px solid transparent; border-radius: 10px;
  color: var(--text); cursor: pointer; font-size: .88rem;
}
.daypicker-dag:hover { background: var(--surface-2); }
.daypicker-dag.vandaag { border-color: var(--text-dim); }
.daypicker-dag.on { background: var(--primary); color: var(--on-primary); font-weight: 600; border-color: transparent; }

/* ---- Formulier ---- */
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: .85rem; color: var(--text-muted); }
.input, .select, textarea.input {
  width: 100%; min-height: 44px; padding: 10px 12px;
  background: var(--bg-2); border: 1px solid var(--border); border-radius: 12px; color: var(--text);
}
.input::placeholder { color: var(--text-dim); }
textarea.input { min-height: 80px; resize: vertical; }

/* ---- Segment-schaal (stemming/energie-keuze) ---- */
.seg { display: flex; gap: 8px; }
.seg-btn {
  flex: 1; min-height: 48px; display: grid; place-items: center;
  background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px;
  color: var(--text-muted); cursor: pointer;
  transition: transform .12s var(--ease-out-quart), border-color .15s ease, background .15s ease;
}
.seg-btn:hover { border-color: var(--text-dim); }
.seg-btn:active { transform: scale(.94); }
.seg-btn.on {
  border-color: var(--primary); color: var(--text);
  background: color-mix(in srgb, var(--primary) 18%, var(--surface-2));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 55%, transparent);
}

/* ---- Voortgangsbalk ---- */
.progress { height: 10px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.progress > span { display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--primary), var(--primary-2));
  transition: width .35s var(--ease-out-quart); }

/* ---- Badge / chip ---- */
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px;
  font-size: .76rem; font-weight: 600; background: var(--surface-2); color: var(--text-muted); border: 1px solid var(--border); }
.badge.ok { color: var(--success); border-color: color-mix(in srgb, var(--success) 35%, var(--border)); }
.badge.warn { color: var(--warning); border-color: color-mix(in srgb, var(--warning) 35%, var(--border)); }
.badge.bad { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 35%, var(--border)); }
.badge.accent { color: var(--primary); border-color: color-mix(in srgb, var(--primary) 35%, var(--border)); }

/* ---- Tijdlijn ---- */
.timeline { display: flex; flex-direction: column; }
.tl-item { display: grid; grid-template-columns: 58px 1fr; gap: 12px; padding: 8px 0; }
.tl-time { font-variant-numeric: tabular-nums; color: var(--text-muted); font-size: .9rem; padding-top: 12px; }
.tl-body { background: var(--surface); border: 1px solid var(--border); border-left: 4px solid var(--block, var(--primary));
  border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 12px; }
.tl-body.done { opacity: .55; }
.tl-body.now { box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 60%, transparent); }
.tl-title { font-weight: 600; }
.tl-check { min-width: 30px; min-height: 30px; border-radius: 50%; border: 2px solid var(--border);
  background: transparent; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--success); }
.tl-check.on { background: var(--success); border-color: var(--success); color: var(--on-primary); }

/* ---- App-shell ---- */
.appbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 12px 16px; padding-top: max(12px, env(safe-area-inset-top));
  background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); }
.appbar .title { font-weight: 700; letter-spacing: -.01em; }
.shell { display: flex; min-height: 100%; }
.content { flex: 1; padding-bottom: calc(78px + env(safe-area-inset-bottom)); }

/* bottom-nav (mobiel) */
.bottomnav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: flex; justify-content: space-around;
  background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(12px);
  border-top: 1px solid var(--border); padding: 6px 6px calc(6px + env(safe-area-inset-bottom)); }
.navitem { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 2px;
  background: none; border: none; cursor: pointer; color: var(--text-dim); border-radius: 12px; font-size: .68rem; }
.navitem.active { color: var(--primary); }
.navitem svg { width: 22px; height: 22px; }

/* sidebar (desktop) */
.sidebar { display: none; }
@media (min-width: 900px) {
  .bottomnav { display: none; }
  .content { padding-bottom: 24px; }
  .sidebar { display: flex; flex-direction: column; gap: 4px; width: 220px; padding: 16px 12px;
    border-right: 1px solid var(--border); position: sticky; top: 0; height: 100vh; }
  .sidebar .navitem { flex-direction: row; justify-content: flex-start; gap: 12px; font-size: .92rem; padding: 11px 12px; }
  .sidebar .navitem.active { background: var(--surface); }
  .container { padding: 24px; }
}

/* ---- Diversen ---- */
.empty { text-align: center; color: var(--text-dim); padding: 28px 12px; }
.divider { height: 1px; background: var(--border); margin: 6px 0; }
.kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.kpi .card { padding: 12px; text-align: center; }
.kpi .v { font-size: 1.3rem; font-weight: 700; }
.kpi .l { font-size: .72rem; color: var(--text-dim); }
.list-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.list-row:last-child { border-bottom: none; }
.toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(90px + env(safe-area-inset-bottom));
  z-index: 60; background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
  padding: 12px 16px; border-radius: 12px; box-shadow: var(--shadow); max-width: 90%; }

.update-banner { position: fixed; left: 12px; right: 12px; bottom: calc(86px + env(safe-area-inset-bottom));
  z-index: 55; display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow); }
@media (min-width: 900px) { .update-banner { left: auto; right: 24px; bottom: 24px; max-width: 340px; } }

/* =========================================================================
   Beweging, diepte & persoonlijkheid
   ========================================================================= */
@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes popIn { from { transform: scale(.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes nowPing { 0% { transform: scale(1); opacity: .5; } 70%, 100% { transform: scale(2.4); opacity: 0; } }
@keyframes auraDrift { 0% { transform: translate(-12%, -8%) scale(1); } 50% { transform: translate(10%, 6%) scale(1.15); } 100% { transform: translate(-12%, -8%) scale(1); } }

/* Staggerde binnenkomst voor directe kinderen van .reveal */
.reveal > * { animation: fadeUp .26s var(--ease-out-quint) backwards; }
.reveal > *:nth-child(1) { animation-delay: 30ms; }
.reveal > *:nth-child(2) { animation-delay: 65ms; }
.reveal > *:nth-child(3) { animation-delay: 100ms; }
.reveal > *:nth-child(4) { animation-delay: 135ms; }
.reveal > *:nth-child(5) { animation-delay: 170ms; }
.reveal > *:nth-child(6) { animation-delay: 200ms; }
.reveal > *:nth-child(n+7) { animation-delay: 220ms; }

/* Tijd-van-dag aura achter de hero */
.hero { position: relative; isolation: isolate; padding: 8px 0 2px; }
.hero::before {
  content: ''; position: absolute; z-index: -1; inset: -40px -30% auto -10%;
  height: 220px; border-radius: 50%;
  background: radial-gradient(closest-side,
    color-mix(in srgb, var(--aura, var(--primary)) 38%, transparent), transparent 70%);
  filter: blur(36px); opacity: .55; animation: auraDrift 18s ease-in-out infinite;
}
.hero h1 { font-size: clamp(1.7rem, 7vw, 2.4rem); font-weight: 700; letter-spacing: -.02em; text-wrap: balance; }
.hero .accent { color: var(--primary); }

/* Readiness/score-ring (conic) */
.ring { --val: 0; --size: 92px; --thick: 9px;
  width: var(--size); height: var(--size); border-radius: 50%; position: relative; flex: none;
  background:
    radial-gradient(closest-side, var(--surface) calc(100% - var(--thick) - 1px), transparent calc(100% - var(--thick)) 100%),
    conic-gradient(from -90deg, var(--primary), var(--primary-2) calc(var(--val) * 1%), var(--surface-2) 0);
  display: grid; place-items: center;
}
.ring.anim { animation: popIn .24s var(--ease-out-quint) backwards; }
.ring .ring-v { font-size: 1.35rem; font-weight: 700; line-height: 1; }
.ring .ring-l { font-size: .62rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: .08em; }

/* Inline mini-stats naast de ring (geen identieke kaartjes-grid) */
.statline { display: flex; flex-direction: column; gap: 10px; }
.stat { display: flex; align-items: baseline; gap: 8px; }
.stat .sv { font-size: 1.05rem; font-weight: 650; font-variant-numeric: tabular-nums; }
.stat .sl { font-size: .8rem; color: var(--text-muted); }
.stat .si { color: var(--primary); }

/* Voortgangsbalk: gloed + gradient (geen oneindige shimmer) */
.progress.shine > span {
  background-image: linear-gradient(90deg, var(--primary), var(--primary-2));
}

/* Tijdlijn-spine + levende nu-indicator */
.timeline { position: relative; padding-left: 4px; }
.tl-check.pop { animation: popIn .2s var(--ease-out-quint); }
.tl-body.now { position: relative; }
.tl-body.now::after {
  content: 'nu'; position: absolute; top: -9px; right: 12px;
  font-size: .62rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: var(--on-primary); background: var(--primary); padding: 1px 7px; border-radius: 999px;
}
.now-dot { position: relative; width: 12px; height: 12px; border-radius: 50%; background: var(--primary); flex: none; }
.now-dot::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: var(--primary);
  animation: nowPing 2s var(--ease-out-quart) infinite; }

.fab-press:active { transform: scale(.92); }

/* App-brede ambient aurora: trage, zachte gloed-blobs in themakleuren */
@keyframes auroraA { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(14vw,8vh) scale(1.25); } 100% { transform: translate(0,0) scale(1); } }
@keyframes auroraB { 0% { transform: translate(0,0) scale(1.1); } 50% { transform: translate(-12vw,-6vh) scale(1); } 100% { transform: translate(0,0) scale(1.1); } }
.aurora { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.aurora::before, .aurora::after {
  content: ''; position: absolute; width: 62vmax; height: 62vmax; border-radius: 50%;
  filter: blur(90px); opacity: .15;
}
.aurora::before { top: -22vmax; left: -16vmax; background: radial-gradient(closest-side, var(--primary), transparent 70%); animation: auroraA 28s ease-in-out infinite; }
.aurora::after { bottom: -26vmax; right: -16vmax; background: radial-gradient(closest-side, var(--primary-2), transparent 70%); animation: auroraB 34s ease-in-out infinite; }
.aurora.rich::before { opacity: .22; }
.aurora.rich::after { opacity: .2; }

/* Content boven de aurora */
.content, .sidebar { position: relative; z-index: 1; }

/* Consistente paginakop */
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
.page-head h1 { font-size: clamp(1.5rem, 6vw, 2rem); letter-spacing: -.02em; margin: 0; }

h1, h2, h3 { text-wrap: balance; }

/* =========================================================================
   "Kosmos" look — gradient diepte, glas, gloeiende meters & orbs
   ========================================================================= */
:root {
  --grad-cool: linear-gradient(135deg, #22d3ee, #6366f1);
  --grad-warm: linear-gradient(135deg, #a855f7, #ec4899);
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}

body {
  background:
    radial-gradient(135% 90% at 50% -15%, color-mix(in srgb, var(--primary) 20%, var(--bg)), transparent 55%),
    radial-gradient(100% 70% at 100% 0%, color-mix(in srgb, var(--primary-2) 16%, transparent), transparent 50%),
    var(--bg);
  background-attachment: fixed;
}

/* Glas-kaart: zachte gradient, glans-rand bovenaan, diepte-schaduw */
.card {
  background:
    linear-gradient(180deg, color-mix(in srgb, #ffffff 5%, transparent), transparent 40%),
    linear-gradient(165deg, color-mix(in srgb, var(--surface) 88%, var(--primary) 12%), var(--surface));
  border: 1px solid color-mix(in srgb, var(--text) 10%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #ffffff 10%, transparent),
    0 18px 40px -22px rgba(0,0,0,.75);
  backdrop-filter: blur(6px);
}

/* Hero-orb: glanzende planeet rechtsboven */
.hero { padding-right: 70px; }
.hero::after {
  content: ''; position: absolute; z-index: -1; top: -6px; right: 4px;
  width: 64px; height: 64px; border-radius: 50%;
  background:
    radial-gradient(circle at 32% 28%, #ffffffcc, transparent 38%),
    radial-gradient(circle at 70% 75%, color-mix(in srgb, var(--aura, var(--primary)) 90%, #000), color-mix(in srgb, var(--aura, var(--primary)) 55%, #000));
  box-shadow: 0 8px 26px -6px color-mix(in srgb, var(--aura, var(--primary)) 60%, transparent),
    inset -6px -8px 16px rgba(0,0,0,.45);
}

/* Gloeiende gradient-ring */
.ring {
  background:
    radial-gradient(closest-side, var(--surface) calc(100% - var(--thick) - 1px), transparent calc(100% - var(--thick)) 100%),
    conic-gradient(from -90deg, #22d3ee, #6366f1 calc(var(--val) * .55%), #a855f7 calc(var(--val) * 1%), color-mix(in srgb, var(--surface-2) 80%, transparent) 0);
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--primary) 45%, transparent));
}
.ring::before {
  content: ''; position: absolute; inset: 6px; border-radius: 50%;
  background: radial-gradient(circle at 38% 30%, color-mix(in srgb, #ffffff 14%, transparent), transparent 45%);
  pointer-events: none;
}

/* Voortgangsbalk met gloed */
.progress { background: color-mix(in srgb, var(--surface-2) 80%, transparent); }
.progress > span { box-shadow: 0 0 14px -2px color-mix(in srgb, var(--primary) 70%, transparent); }

/* Badges iets glossier */
.badge.accent { background: color-mix(in srgb, var(--primary) 16%, var(--surface-2)); }

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
  .hero::before { opacity: .35; }
  .aurora::before, .aurora::after { opacity: .12; }
}

```

## `test/belasting.test.js`

```js
import { describe, it, expect } from 'vitest';
import { belastingStatus, sessieBelasting, acwrBerekenen } from '../src/services/belasting.js';

const REF = new Date('2026-06-27T12:00:00');
const dagGeleden = (n) => { const d = new Date(REF); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

describe('belastingStatus', () => {
  it('herkent overbelasting uit Garmin-trainingsstatus', () => {
    expect(belastingStatus({ trainingStatus: 'STRAINED' }).key).toBe('overbelast');
    expect(belastingStatus({ trainingStatus: 'OVERREACHING_1' }).key).toBe('overbelast');
  });

  it('herkent productieve opbouw', () => {
    expect(belastingStatus({ trainingStatus: 'PRODUCTIVE_2' }).key).toBe('opbouwen');
  });

  it('herkent herstel en onderhoud', () => {
    expect(belastingStatus({ trainingStatus: 'RECOVERY_LESS_THAN_24' }).key).toBe('herstel');
    expect(belastingStatus({ trainingStatus: 'MAINTAINING_2' }).key).toBe('balans');
  });

  it('valt terug op readiness-trend zonder Garmin-status', () => {
    const dalend = belastingStatus({ readinessReeks: [70, 68, 60, 50, 45, 40] });
    expect(dalend.key).toBe('herstel');
    const stijgend = belastingStatus({ readinessReeks: [40, 45, 50, 60, 66, 70] });
    expect(stijgend.key).toBe('opbouwen');
  });

  it('geeft onbekend zonder enige data', () => {
    expect(belastingStatus({}).key).toBe('onbekend');
  });
});

describe('sessieBelasting (sRPE)', () => {
  it('load = duur(min) × RPE, datum uit startTimeLocal', () => {
    expect(sessieBelasting([{ id: 'x', startTimeLocal: '2026-06-20T18:00:00', duration: 3600 }], { x: 6 }))
      .toEqual([{ datum: '2026-06-20', load: 360 }]);
  });
  it('zonder RPE een neutrale 5; negeert lege sessies', () => {
    expect(sessieBelasting([
      { id: 'a', datum: '2026-06-20', duurMin: 60 },
      { id: 'b', datum: '', duurMin: 30 },
    ], {})).toEqual([{ datum: '2026-06-20', load: 300 }]);
  });
});

describe('acwrBerekenen (opbouw-ratio)', () => {
  it('valt veilig terug bij te weinig data (ratio null, zone onbekend)', () => {
    const r = acwrBerekenen([{ datum: dagGeleden(2), load: 100 }], REF);
    expect(r.ratio).toBe(null);
    expect(r.zone).toBe('onbekend');
  });
  it('gelijkmatige opbouw -> ratio ~1.0 (optimaal), hoge zekerheid', () => {
    const r = acwrBerekenen([3, 10, 17, 24].map((n) => ({ datum: dagGeleden(n), load: 100 })), REF);
    expect(r.ratio).toBeCloseTo(1.0, 1);
    expect(r.zone).toBe('optimaal');
    expect(r.zekerheid).toBe('hoog');
  });
  it('piek deze week -> hoge ratio (risico) met uitleg', () => {
    const r = acwrBerekenen([
      ...[3, 10, 17, 24].map((n) => ({ datum: dagGeleden(n), load: 100 })),
      { datum: dagGeleden(1), load: 200 },
    ], REF);
    expect(r.ratio).toBeGreaterThan(1.5);
    expect(r.zone).toBe('risico');
    expect(r.waarom).toMatch(/belastingspunten/);
  });
});

```

## `test/blessures.test.js`

```js
import { describe, it, expect } from 'vitest';
import {
  isBlessureActief, isVerlopenNietGemeld, vermijdSportenVanBlessures,
  kiesOefeningenVanDag, blessureBlokDuur,
} from '../src/services/blessures.js';

describe('isBlessureActief', () => {
  it('actief zonder einddatum (onbepaald)', () => {
    expect(isBlessureActief({ actief: true }, '2026-06-28')).toBe(true);
  });
  it('niet actief als expliciet uitgezet', () => {
    expect(isBlessureActief({ actief: false }, '2026-06-28')).toBe(false);
  });
  it('niet actief na verstreken einddatum', () => {
    expect(isBlessureActief({ actief: true, eindDatum: '2026-06-01' }, '2026-06-28')).toBe(false);
  });
  it('actief vóór einddatum', () => {
    expect(isBlessureActief({ actief: true, eindDatum: '2026-07-01' }, '2026-06-28')).toBe(true);
  });
});

describe('isVerlopenNietGemeld', () => {
  it('true als einddatum verstreken en nog niet gemeld', () => {
    expect(isVerlopenNietGemeld({ actief: true, eindDatum: '2026-06-01', eindeGemeld: false }, '2026-06-28')).toBe(true);
  });
  it('false als al gemeld', () => {
    expect(isVerlopenNietGemeld({ actief: true, eindDatum: '2026-06-01', eindeGemeld: true }, '2026-06-28')).toBe(false);
  });
  it('false als nog niet verstreken', () => {
    expect(isVerlopenNietGemeld({ actief: true, eindDatum: '2026-07-01' }, '2026-06-28')).toBe(false);
  });
});

describe('vermijdSportenVanBlessures', () => {
  it('combineert vermijdSport van alle actieve blessures', () => {
    const blessures = [
      { actief: true, regio: 'knie' },
      { actief: true, regio: 'schouder' },
    ];
    const v = vermijdSportenVanBlessures(blessures, '2026-06-28');
    expect(v).toContain('fietsen');
    expect(v).toContain('wandelen');
    expect(v).toContain('judo');
  });
  it('algemeen geeft geen sportveto', () => {
    const v = vermijdSportenVanBlessures([{ actief: true, regio: 'algemeen' }], '2026-06-28');
    expect(v).toEqual([]);
  });
  it('negeert verlopen/inactieve blessures', () => {
    const v = vermijdSportenVanBlessures([{ actief: true, regio: 'knie', eindDatum: '2026-06-01' }], '2026-06-28');
    expect(v).toEqual([]);
  });
});

describe('kiesOefeningenVanDag', () => {
  const oefeningen = [
    { id: 'a', actief: true }, { id: 'b', actief: true }, { id: 'c', actief: true },
    { id: 'd', actief: false }, { id: 'e', actief: true },
  ];
  it('filtert inactieve oefeningen', () => {
    const k = kiesOefeningenVanDag({ oefeningen, aantalPerDag: 10, datum: '2026-06-28' });
    expect(k.every((o) => o.actief)).toBe(true);
    expect(k.length).toBe(4);
  });
  it('respecteert aantalPerDag', () => {
    const k = kiesOefeningenVanDag({ oefeningen, aantalPerDag: 2, datum: '2026-06-28' });
    expect(k.length).toBe(2);
  });
  it('roteert eerlijk over opeenvolgende dagen (round-robin)', () => {
    const k1 = kiesOefeningenVanDag({ oefeningen, aantalPerDag: 2, datum: '2026-06-28' });
    const k2 = kiesOefeningenVanDag({ oefeningen, aantalPerDag: 2, datum: '2026-06-29' });
    expect(k1.map((o) => o.id)).not.toEqual(k2.map((o) => o.id));
  });
  it('dezelfde dag geeft altijd dezelfde selectie (deterministisch)', () => {
    const k1 = kiesOefeningenVanDag({ oefeningen, aantalPerDag: 2, datum: '2026-06-28' });
    const k2 = kiesOefeningenVanDag({ oefeningen, aantalPerDag: 2, datum: '2026-06-28' });
    expect(k1.map((o) => o.id)).toEqual(k2.map((o) => o.id));
  });
  it('leeg zonder actieve oefeningen', () => {
    expect(kiesOefeningenVanDag({ oefeningen: [{ id: 'a', actief: false }], aantalPerDag: 2, datum: '2026-06-28' })).toEqual([]);
  });
});

describe('blessureBlokDuur', () => {
  it('minstens 10 minuten', () => {
    expect(blessureBlokDuur(0)).toBe(10);
  });
  it('schaalt met aantal oefeningen', () => {
    expect(blessureBlokDuur(5)).toBe(20);
  });
});

```

## `test/coach.test.js`

```js
import { describe, it, expect } from 'vitest';
import { coachAdvies, DOELEN } from '../src/services/coach.js';

describe('coachAdvies', () => {
  it('kiest herstel bij actieve blessure, ongeacht readiness', () => {
    const a = coachAdvies({ readiness: 90, bodyBattery: 90, goal: 'kracht', blessureActief: true });
    expect(a.niveau).toBe('herstel');
    expect(/Reva|stretch|rust/i.test(a.sport)).toBe(true);
  });

  it('adviseert een harde sessie bij hoge readiness + body battery', () => {
    const a = coachAdvies({ readiness: 80, bodyBattery: 80, slaapUren: 8, goal: 'uithouding' });
    expect(a.niveau).toBe('hard');
    expect(a.duurMin).toBeGreaterThanOrEqual(50);
  });

  it('schaalt terug bij lage readiness', () => {
    const a = coachAdvies({ readiness: 20, bodyBattery: 25, goal: 'afvallen' });
    expect(['rustig', 'herstel']).toContain(a.niveau);
  });

  it('weinig slaap drukt het niveau', () => {
    const veel = coachAdvies({ readiness: 64, bodyBattery: 64, slaapUren: 8 });
    const weinig = coachAdvies({ readiness: 64, bodyBattery: 64, slaapUren: 4 });
    const rang = { herstel: 0, rustig: 1, matig: 2, hard: 3 };
    expect(rang[weinig.niveau]).toBeLessThanOrEqual(rang[veel.niveau]);
  });

  it('dwingt herstel af bij overbelasting, ook bij hoge readiness', () => {
    const a = coachAdvies({ readiness: 85, bodyBattery: 85, goal: 'kracht', overbelast: true });
    expect(a.niveau).toBe('herstel');
    expect(/overbelast/i.test(a.reden)).toBe(true);
  });

  it('valt terug op algemeen doel bij onbekend doel', () => {
    const a = coachAdvies({ readiness: 55, goal: 'onbekend' });
    expect(a.doelLabel).toBe(DOELEN.algemeen);
  });

  it('werkt zonder enige data (veilige defaults)', () => {
    const a = coachAdvies();
    expect(a.sport).toBeTruthy();
    expect(a.titel).toBeTruthy();
  });

  it('dwingt herstel af bij hoge zelf-gerapporteerde pijn, ook zonder blessure', () => {
    const a = coachAdvies({ readiness: 90, bodyBattery: 90, goal: 'kracht', pijn: 4 });
    expect(a.niveau).toBe('herstel');
    expect(a.zekerheid).toBe('hoog');
    expect(a.waarom.some((w) => /pijn/i.test(w))).toBe(true);
  });

  it('temperen, niet forceren, bij lichte pijn (1-2)', () => {
    const zonder = coachAdvies({ readiness: 64, bodyBattery: 64 });
    const metPijn = coachAdvies({ readiness: 64, bodyBattery: 64, pijn: 2 });
    const rang = { herstel: 0, rustig: 1, matig: 2, hard: 3 };
    expect(rang[metPijn.niveau]).toBeLessThanOrEqual(rang[zonder.niveau]);
  });
});

```

## `test/doelen.test.js`

```js
import { describe, it, expect } from 'vitest';
import { doelProgress, huidigeWaarde } from '../src/services/doelen.js';

describe('doelProgress', () => {
  it('berekent % voor een stijgend doel (VO2max) uit Garmin', () => {
    const p = doelProgress({ metric: 'vo2max', start: 45, naar: 55 }, { vo2max: 50 });
    expect(p.huidige).toBe(50);
    expect(p.pct).toBe(50);
    expect(p.klaar).toBe(false);
  });

  it('werkt ook voor een dalend doel (gewicht)', () => {
    const p = doelProgress({ metric: 'gewicht', start: 85, naar: 75 }, { gewichtKg: 80 });
    expect(p.pct).toBe(50);
  });

  it('markeert klaar bij of voorbij het doel', () => {
    const p = doelProgress({ metric: 'gewicht', start: 85, naar: 75 }, { gewichtKg: 74 });
    expect(p.klaar).toBe(true);
    expect(p.pct).toBe(100);
  });

  it('valt terug op handmatige huidige waarde zonder Garmin', () => {
    expect(huidigeWaarde({ metric: 'eigen', huidige: 12 }, null)).toBe(12);
    const p = doelProgress({ metric: 'afstand', start: 0, naar: 10, huidige: 4 }, null);
    expect(p.pct).toBe(40);
  });
});

```

## `test/ics.test.js`

```js
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parseIcs, icsDiagnose } = require('../functions/lib/ics.js');

const cal = (...vevents) => ['BEGIN:VCALENDAR', ...vevents, 'END:VCALENDAR'].join('\r\n');
const ev = (lines) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n');

describe('ICS-parser', () => {
  it('parseert een losse afspraak met UTC-tijd naar Brussel', () => {
    const out = parseIcs(cal(ev(['UID:a', 'SUMMARY:Tandarts', 'DTSTART:20260701T080000Z', 'DTEND:20260701T083000Z'])));
    expect(out).toHaveLength(1);
    expect(out[0].titel).toBe('Tandarts');
    expect(out[0].start).toBe('10:00'); // 08:00Z = 10:00 zomertijd Brussel
    expect(out[0].eind).toBe('10:30');
  });

  it('toont een TZID-lokale tijd als wandklok (18u blijft 18u, niet 20u)', () => {
    const out = parseIcs(cal(ev([
      'UID:tz', 'SUMMARY:Afspraak',
      'DTSTART;TZID=Europe/Brussels:20260628T180000',
      'DTEND;TZID=Europe/Brussels:20260628T190000',
    ])));
    expect(out).toHaveLength(1);
    expect(out[0].start).toBe('18:00');
    expect(out[0].eind).toBe('19:00');
  });

  it('toont een zwevende tijd (geen Z, geen TZID) als wandklok', () => {
    const out = parseIcs(cal(ev([
      'UID:fl', 'SUMMARY:Zwevend', 'DTSTART:20260628T180000', 'DTEND:20260628T193000',
    ])));
    expect(out[0].start).toBe('18:00');
    expect(out[0].eind).toBe('19:30');
  });

  it('herkent een hele-dag-afspraak', () => {
    const out = parseIcs(cal(ev(['UID:b', 'SUMMARY:Verlof', 'DTSTART;VALUE=DATE:20260705'])));
    expect(out[0].allDay).toBe(true);
    expect(out[0].start).toBe('00:00');
  });

  it('klapt een wekelijkse RRULE uit binnen het venster', () => {
    const out = parseIcs(cal(ev([
      'UID:c', 'SUMMARY:Wekelijkse training',
      'DTSTART:20260101T190000Z', 'DTEND:20260101T203000Z',
      'RRULE:FREQ=WEEKLY;BYDAY=WE',
    ])));
    expect(out.length).toBeGreaterThan(3);
    // alle occurrences op woensdag, en in de toekomst t.o.v. venster
    expect(out.every((e) => e.start === '21:00' && e.eind === '22:30')).toBe(true);
    // unieke datums
    const datums = new Set(out.map((e) => e.datum));
    expect(datums.size).toBe(out.length);
  });

  it('icsDiagnose toont ruwe regel + omgezette tijd per type', () => {
    const tz = parseIcs && icsDiagnose(cal(
      ev(['UID:1', 'SUMMARY:TZID', 'DTSTART;TZID=Europe/Brussels:20260628T180000']),
      ev(['UID:2', 'SUMMARY:UTC', 'DTSTART:20260628T160000Z']),
      ev(['UID:3', 'SUMMARY:Dag', 'DTSTART;VALUE=DATE:20260628']),
    ));
    expect(tz).toHaveLength(3);
    expect(tz[0]).toMatchObject({ start: '18:00', wandklok: true, heeftZ: false });
    expect(tz[0].ruw).toContain('TZID=Europe/Brussels');
    expect(tz[1]).toMatchObject({ start: '18:00', heeftZ: true });
    expect(tz[2].heleDag).toBe(true);
  });

  it('respecteert COUNT zodat afgelopen reeksen leeg zijn', () => {
    const out = parseIcs(cal(ev([
      'UID:d', 'SUMMARY:Afgelopen reeks',
      'DTSTART:20200101T100000Z', 'DTEND:20200101T110000Z',
      'RRULE:FREQ=DAILY;COUNT=5',
    ])));
    expect(out).toHaveLength(0); // 2020, ver buiten het 60-dagen-venster
  });
});

```

## `test/maaltijden.test.js`

```js
import { describe, it, expect } from 'vitest';
import {
  MOMENTEN, receptType, kiesSuggesties, gekozenMaaltijd, schaalIngredienten,
  ingredientenTekst, genereerBoodschappenlijst,
} from '../src/services/maaltijden.js';

const recepten = [
  { id: 'kip', naam: 'Kip met rijst', type: 'lunch', aantalEters: 2, houdbaar: false,
    doelen: ['spiermassa', 'prestatie'], ingredienten: [{ naam: 'kip', hoeveelheid: 300, eenheid: 'g' }, { naam: 'rijst', hoeveelheid: 200, eenheid: 'g' }] },
  { id: 'salade', naam: 'Salade', type: 'lunch', aantalEters: 1, houdbaar: false, doelen: ['afvallen'],
    ingredienten: [{ naam: 'sla', hoeveelheid: 100, eenheid: 'g' }] },
  { id: 'pasta', naam: 'Pasta', type: 'lunch', aantalEters: 2, houdbaar: false, doelen: [],
    ingredienten: [{ naam: 'pasta', hoeveelheid: 150, eenheid: 'g' }] },
  { id: 'noten', naam: 'Noten', type: 'snack', aantalEters: 1, houdbaar: true,
    ingredienten: [{ naam: 'noten', hoeveelheid: 30, eenheid: 'g' }] },
];

describe('receptType', () => {
  it('herleidt elk snackmoment naar het brede type snack', () => {
    expect(receptType('snack1')).toBe('snack');
    expect(receptType('snack2')).toBe('snack');
    expect(receptType('snack3')).toBe('snack');
    expect(receptType('ontbijt')).toBe('ontbijt');
  });
});

describe('kiesSuggesties', () => {
  it('filtert op moment + doel, lege doelen-array past bij elk doel', () => {
    const s = kiesSuggesties({ recepten, moment: 'lunch', doelen: ['afvallen'], datum: '2026-06-29' });
    const ids = s.map((r) => r.id);
    expect(ids).toContain('salade'); // matcht doel
    expect(ids).toContain('pasta');  // geen doelen -> past overal
    expect(ids).not.toContain('kip'); // ander doel, geen match
  });

  it('valt veilig terug op lege lijst zonder passende recepten', () => {
    expect(kiesSuggesties({ recepten: [], moment: 'lunch', datum: '2026-06-29' })).toEqual([]);
    expect(kiesSuggesties({ recepten, moment: 'diner', datum: '2026-06-29' })).toEqual([]);
  });

  it('roteert dag-deterministisch (zelfde datum -> zelfde resultaat, geen willekeur)', () => {
    const a = kiesSuggesties({ recepten, moment: 'lunch', datum: '2026-06-29', aantal: 2 });
    const b = kiesSuggesties({ recepten, moment: 'lunch', datum: '2026-06-29', aantal: 2 });
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
  });

  it('snack-momenten gebruiken een verschillende rotatie-offset binnen dezelfde dag', () => {
    const snacks = [
      { id: 's1', naam: 'Snack 1', type: 'snack', ingredienten: [] },
      { id: 's2', naam: 'Snack 2', type: 'snack', ingredienten: [] },
      { id: 's3', naam: 'Snack 3', type: 'snack', ingredienten: [] },
    ];
    const m1 = kiesSuggesties({ recepten: snacks, moment: 'snack1', datum: '2026-06-29', aantal: 1 })[0].id;
    const m2 = kiesSuggesties({ recepten: snacks, moment: 'snack2', datum: '2026-06-29', aantal: 1 })[0].id;
    const m3 = kiesSuggesties({ recepten: snacks, moment: 'snack3', datum: '2026-06-29', aantal: 1 })[0].id;
    expect(new Set([m1, m2, m3]).size).toBe(3);
  });
});

describe('gekozenMaaltijd', () => {
  it('override wint altijd over de deterministische suggestie', () => {
    const g = gekozenMaaltijd({ recepten, moment: 'lunch', datum: '2026-06-29', override: { recipeId: 'kip', aantalEters: 3 } });
    expect(g.recept.id).toBe('kip');
    expect(g.aantalEters).toBe(3);
  });

  it('zonder override valt het terug op de eerste suggestie', () => {
    const g = gekozenMaaltijd({ recepten, moment: 'lunch', doelen: ['afvallen'], datum: '2026-06-29' });
    expect(['salade', 'pasta']).toContain(g.recept.id);
  });

  it('geeft null bij geen passend recept (veilige terugval)', () => {
    expect(gekozenMaaltijd({ recepten: [], moment: 'diner', datum: '2026-06-29' })).toBeNull();
  });
});

describe('schaalIngredienten', () => {
  it('schaalt proportioneel op het aantal eters', () => {
    const result = schaalIngredienten([{ naam: 'kip', hoeveelheid: 300, eenheid: 'g' }], 2, 4);
    expect(result[0].hoeveelheid).toBe(600);
  });
  it('rondt gewicht/volume af op 5 (g/ml), behoudt 1 decimaal voor stuks', () => {
    const result = schaalIngredienten([{ naam: 'kip', hoeveelheid: 301, eenheid: 'g' }, { naam: 'ei', hoeveelheid: 1, eenheid: 'stuk' }], 1, 1);
    expect(result[0].hoeveelheid % 5).toBe(0);
    expect(result[1].hoeveelheid).toBe(1);
  });
});

describe('ingredientenTekst', () => {
  it('formatteert als leesbare, komma-gescheiden tekst', () => {
    expect(ingredientenTekst([{ naam: 'kip', hoeveelheid: 300, eenheid: 'g' }, { naam: 'rijst', hoeveelheid: 200, eenheid: 'g' }]))
      .toBe('300g kip, 200g rijst');
  });
});

describe('genereerBoodschappenlijst', () => {
  it('telt ingrediënten op over de periode en splitst vers/houdbaar', () => {
    const lijst = genereerBoodschappenlijst({
      periode: ['2026-06-29', '2026-06-30'], recepten, doelen: [], aantalEtersStandaard: 1,
    });
    expect(lijst.vers.length).toBeGreaterThan(0);
    expect(lijst.vers.every((i) => i.naam)).toBe(true);
    expect(lijst.houdbaar.every((i) => i.naam)).toBe(true);
  });

  it('een override uit dagDocs wint over de deterministische suggestie', () => {
    const dagDocs = { '2026-06-29': { maaltijdPlan: { lunch: { recipeId: 'kip', aantalEters: 2 } } } };
    const lijst = genereerBoodschappenlijst({
      periode: ['2026-06-29'], recepten, doelen: [], aantalEtersStandaard: 1, dagDocs,
    });
    const kipIngr = lijst.vers.find((i) => i.naam === 'kip');
    expect(kipIngr?.hoeveelheid).toBe(300); // 2 eters = basisportie van het recept, geen schaling nodig
  });

  it('valt veilig terug op een leeg overzicht zonder recepten', () => {
    const lijst = genereerBoodschappenlijst({ periode: ['2026-06-29'], recepten: [] });
    expect(lijst).toEqual({ vers: [], houdbaar: [] });
  });
});

describe('MOMENTEN', () => {
  it('bevat de 3 hoofdmaaltijden + 3 snackmomenten', () => {
    expect(MOMENTEN).toEqual(['ontbijt', 'lunch', 'diner', 'snack1', 'snack2', 'snack3']);
  });
});

```

## `test/noordster.test.js`

```js
import { describe, it, expect } from 'vitest';
import { dagTherapietrouw, noordster, dagRevaTherapietrouw, revaTherapietrouw } from '../src/services/noordster.js';

const dag = (blokken, gedaan = {}, checkin = null) => ({ plan: blokken, gedaan, checkin });

describe('noordster — therapietrouw per dag', () => {
  it('telt enkel checkbare blokken (checkbaar-vlag)', () => {
    const d = dag([
      { id: 'a', checkbaar: true }, { id: 'b', checkbaar: true },
      { id: 'm', checkbaar: false }, // maaltijd/slaap tellen niet mee
    ], { a: true });
    const t = dagTherapietrouw(d);
    expect(t).toEqual({ ratio: 0.5, gedaan: 1, totaal: 2 });
  });

  it('valt terug op kerntypes voor oude docs zonder checkbaar-vlag', () => {
    const d = dag([{ id: 'j', type: 'judo' }, { id: 's', type: 'slaap' }], { j: true });
    expect(dagTherapietrouw(d)).toEqual({ ratio: 1, gedaan: 1, totaal: 1 });
  });

  it('geeft null als er niets te doen viel', () => {
    expect(dagTherapietrouw(dag([{ id: 'm', checkbaar: false }]))).toBe(null);
    expect(dagTherapietrouw(dag([]))).toBe(null);
    expect(dagTherapietrouw(null)).toBe(null);
  });
});

describe('noordster — samengestelde score', () => {
  it('middelt de dag-ratios naar een score 0-100', () => {
    const dagen = [
      dag([{ id: 'a', checkbaar: true }, { id: 'b', checkbaar: true }], { a: true, b: true }), // 100%
      dag([{ id: 'a', checkbaar: true }, { id: 'b', checkbaar: true }], { a: true }),            // 50%
    ];
    const ns = noordster(dagen);
    expect(ns.score).toBe(75);
    expect(ns.dagenMetPlan).toBe(2);
    expect(ns.label).toBe('Op koers');
    expect(ns.waarom).toContain('afgevinkte sleutelblokken');
  });

  it('valt veilig terug bij geen data (score null, geen misleidend getal)', () => {
    const ns = noordster([dag([]), null]);
    expect(ns.score).toBe(null);
    expect(ns.dagenMetPlan).toBe(0);
    expect(ns.label).toMatch(/te weinig data/i);
  });

  it('telt check-in-dagen mee in de uitleg', () => {
    const ns = noordster([
      dag([{ id: 'a', checkbaar: true }], { a: true }, { ochtend: { stemming: 4 } }),
    ]);
    expect(ns.score).toBe(100);
    expect(ns.checkinDagen).toBe(1);
  });
});

describe('noordster — reva-blok met oefeningen-checklist', () => {
  it('telt pas als gedaan als alle oefeningen zijn afgevinkt', () => {
    const d = dag([{ id: 'reva-1', type: 'reva', checkbaar: true, oefeningen: ['o1', 'o2'] }], {
      'reva-1::o1': true, // maar o2 niet
    });
    expect(dagTherapietrouw(d)).toEqual({ ratio: 0, gedaan: 0, totaal: 1 });
  });

  it('telt als gedaan zodra alle oefeningen zijn afgevinkt', () => {
    const d = dag([{ id: 'reva-1', type: 'reva', checkbaar: true, oefeningen: ['o1', 'o2'] }], {
      'reva-1::o1': true, 'reva-1::o2': true,
    });
    expect(dagTherapietrouw(d)).toEqual({ ratio: 1, gedaan: 1, totaal: 1 });
  });

  it('dagRevaTherapietrouw negeert niet-reva-blokken en geeft null zonder reva', () => {
    expect(dagRevaTherapietrouw(dag([{ id: 'j', type: 'judo' }], { j: true }))).toBe(null);
  });

  it('revaTherapietrouw valt veilig terug zonder reva-data', () => {
    const r = revaTherapietrouw([dag([{ id: 'j', type: 'judo' }])]);
    expect(r.score).toBe(null);
    expect(r.dagenMetReva).toBe(0);
  });

  it('revaTherapietrouw berekent een score over meerdere dagen', () => {
    const dagen = [
      dag([{ id: 'reva-1', type: 'reva', oefeningen: ['o1'] }], { 'reva-1::o1': true }), // 100%
      dag([{ id: 'reva-1', type: 'reva', oefeningen: ['o1'] }], {}), // 0%
    ];
    const r = revaTherapietrouw(dagen);
    expect(r.score).toBe(50);
    expect(r.dagenMetReva).toBe(2);
  });
});

```

## `test/periodisering.test.js`

```js
import { describe, it, expect } from 'vitest';
import { periodiseringBepalen } from '../src/services/periodisering.js';

// Maandag 2026-06-01 als ankerpunt.
const maandag = (offsetWeken) => {
  const d = new Date('2026-06-01T12:00:00'); // maandag
  d.setDate(d.getDate() + offsetWeken * 7);
  return d;
};

describe('periodiseringBepalen', () => {
  it('precies 1 op elke cyclusLengte weken is deload, de rest opbouw', () => {
    const fases = Array.from({ length: 12 }, (_, w) => periodiseringBepalen(maandag(w)).fase);
    const deloads = fases.filter((f) => f === 'deload').length;
    expect(deloads).toBe(3); // 12 weken / cyclus van 4
    expect(fases.every((f) => f === 'opbouw' || f === 'deload')).toBe(true);
  });

  it('herhaalt zich exact elke cyclusLengte weken', () => {
    const eerste = periodiseringBepalen(maandag(0));
    const zelfdeFaseLater = periodiseringBepalen(maandag(eerste.cyclusLengte));
    expect(zelfdeFaseLater.fase).toBe(eerste.fase);
    expect(zelfdeFaseLater.weekInCyclus).toBe(eerste.weekInCyclus);
  });

  it('weekInCyclus telt op van 1 t.e.m. cyclusLengte en dan opnieuw 1', () => {
    const eerste = periodiseringBepalen(maandag(0));
    const volgende = periodiseringBepalen(maandag(1));
    const verwacht = (eerste.weekInCyclus % eerste.cyclusLengte) + 1;
    expect(volgende.weekInCyclus).toBe(verwacht);
    expect(volgende.fase).toBe(verwacht >= eerste.cyclusLengte ? 'deload' : 'opbouw');
  });

  it('is identiek voor elke dag binnen dezelfde week', () => {
    const ref = periodiseringBepalen(maandag(2));
    const zondag = new Date(maandag(2));
    zondag.setDate(zondag.getDate() + 6);
    expect(periodiseringBepalen(zondag).fase).toBe(ref.fase);
    expect(periodiseringBepalen(zondag).weekInCyclus).toBe(ref.weekInCyclus);
  });

  it('blijft consistent over een jaargrens (geen reset zoals bij ISO-weeknummers)', () => {
    const voorJaarwisseling = periodiseringBepalen(new Date('2026-12-28T12:00:00')); // maandag
    const naJaarwisseling = periodiseringBepalen(new Date('2027-01-04T12:00:00')); // maandag erna
    const verwacht = (voorJaarwisseling.weekInCyclus % voorJaarwisseling.cyclusLengte) + 1;
    expect(naJaarwisseling.weekInCyclus).toBe(verwacht);
  });

  it('respecteert een andere cycluslengte', () => {
    const fases = Array.from({ length: 6 }, (_, w) => periodiseringBepalen(maandag(w), 3).fase);
    expect(fases.filter((f) => f === 'deload').length).toBe(2); // 6 weken / cyclus van 3
  });

  it('is altijd hoog zeker (kalenderregel, geen meetdata nodig) en uitlegbaar', () => {
    const r = periodiseringBepalen(maandag(0));
    expect(r.zekerheid).toBe('hoog');
    expect(r.waarom).toBeTruthy();
    expect(r.meetlat).toBeTruthy();
  });
});

```

## `test/planner.test.js`

```js
import { describe, it, expect } from 'vitest';
import { genereerDagPlan, berekenFietsAdvies } from '../src/services/planner.js';
import { DEFAULT_INSTELLINGEN } from '../src/config/appConfig.js';
import { toMin } from '../src/services/tijd.js';

const I = DEFAULT_INSTELLINGEN;
const titels = (plan) => plan.blokken.map((b) => b.titel);

describe('genereerDagPlan', () => {
  it('thuiswerkdag (maandag) bevat werk, middagpauze en slaap', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis' });
    expect(titels(plan).some((t) => /Thuiswerk/.test(t))).toBe(true);
    expect(titels(plan).some((t) => /Middagpauze/.test(t))).toBe(true);
    expect(plan.blokken.some((b) => b.type === 'slaap')).toBe(true);
    // blokken chronologisch gesorteerd
    const starts = plan.blokken.map((b) => b.start);
    expect([...starts].sort()).toEqual(starts);
  });

  it('woensdag plant judoles geven met vertrek + eten ervoor', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'thuis' });
    const t = titels(plan);
    expect(t.some((x) => /Judoles geven/.test(x))).toBe(true);
    expect(t.some((x) => /Vertrek naar judoclub/.test(x))).toBe(true);
    expect(t.some((x) => /Snel eten voor judo/.test(x))).toBe(true);
  });

  it('geenJudo (clubs dicht) schrapt training én les en meldt judovrij', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'thuis', geenJudo: true });
    const t = titels(plan);
    expect(t.some((x) => /Judotraining/.test(x))).toBe(false);
    expect(t.some((x) => /Judoles geven/.test(x))).toBe(false);
    expect(plan.advies.tekst.some((x) => /Judovrij/.test(x))).toBe(true);
  });

  it('slaapblok loopt tot het opstaan-uur (geen 1-minuut-blok)', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis' });
    const slaap = plan.blokken.find((b) => b.type === 'slaap');
    expect(slaap).toBeTruthy();
    expect(slaap.eind).toBe(I.algemeen.opstaan); // eindigt op het opstaan-uur
    expect(slaap.eind).not.toBe(slaap.start);     // niet 1 minuut
  });

  it('judoles geven vervalt tijdens vakantie', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'verlof', isVakantie: true });
    expect(titels(plan).some((x) => /Judoles geven/.test(x))).toBe(false);
  });

  it('geenJudo schrapt de gegenereerde judotraining maar laat agenda-items (BBQ judo) staan', () => {
    const agendaEvents = [{ titel: 'BBQ judo', datum: '2026-06-27', start: '16:00', eind: '21:00' }];
    const plan = genereerDagPlan({ datum: '2026-06-27', dagKort: 'za', instellingen: I, werkModus: 'vrij', geenJudo: true, agendaEvents });
    expect(titels(plan).some((x) => /Judotraining/.test(x))).toBe(false); // gegenereerd: weg
    expect(titels(plan).some((x) => /BBQ judo/.test(x))).toBe(true);       // agenda: blijft
  });

  it('kantoor-fiets voegt fietsblokken als sport toe', () => {
    const plan = genereerDagPlan({ datum: '2026-06-23', dagKort: 'di', instellingen: I, werkModus: 'kantoor_fiets' });
    const fiets = plan.blokken.filter((b) => /Fietsen/.test(b.titel));
    expect(fiets.length).toBe(2);
    expect(fiets.every((b) => b.type === 'sport')).toBe(true);
  });

  it('plant geen werk op een verlofdag (ziekte/vakantie)', () => {
    const plan = genereerDagPlan({ datum: '2026-06-25', dagKort: 'do', instellingen: I, werkModus: 'verlof', isVakantie: true });
    expect(plan.blokken.some((b) => /werk|thuiswerk/i.test(b.titel))).toBe(false);
  });

  it('gebruikt het vrije-dag-ritme (later opstaan) op een vrije dag', () => {
    const werk = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis' });
    const vrij = genereerDagPlan({ datum: '2026-06-27', dagKort: 'za', instellingen: I, werkModus: 'vrij' });
    expect(werk.blokken[0].start).toBe('06:45');     // werkdag
    expect(vrij.blokken[0].start).toBe('08:00');     // vrije dag, later
  });

  it('detecteert overlappende vaste blokken als conflict', () => {
    const agenda = [{ titel: 'RSCA match', start: '20:30', eind: '22:30' }];
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'thuis', agendaEvents: agenda });
    // eigen judotraining wo 20:00-21:30 overlapt met de match 20:30-22:30
    expect(plan.conflicten.length).toBeGreaterThan(0);
    expect(plan.blokken.some((b) => b.conflict)).toBe(true);
  });

  it('detecteert ook conflicten tussen een reva-blok en een vast agenda-item', () => {
    const blessures = [{
      id: 'b1', titel: 'Knie', regio: 'knie', actief: true, tijd: '20:15', aantalPerDag: 1,
      oefeningen: [{ id: 'o1', naam: 'Quad sets', actief: true }],
    }];
    const agenda = [{ titel: 'RSCA match', start: '20:00', eind: '22:00' }];
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures, agendaEvents: agenda });
    const revaBlok = plan.blokken.find((b) => b.bron === 'reva');
    expect(revaBlok.conflict).toBe(true);
  });

  it('taken zonder tijd komen in todos, met tijd worden blokken', () => {
    const taken = [
      { id: 'a', titel: 'Water drinken', actief: true, dagen: ['ma'] },
      { id: 'b', titel: 'Reva', actief: true, dagen: ['ma'], tijd: '07:10', blokType: 'reva' },
    ];
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', taken });
    expect(plan.todos.some((t) => t.titel === 'Water drinken')).toBe(true);
    expect(plan.blokken.some((b) => b.titel === 'Reva')).toBe(true);
  });
});

describe('genereerDagPlan — maaltijdplanning', () => {
  const recepten = [
    { id: 'havermout', naam: 'Havermout', type: 'ontbijt', aantalEters: 1, doelen: [],
      ingredienten: [{ naam: 'havermout', hoeveelheid: 60, eenheid: 'g' }, { naam: 'melk', hoeveelheid: 200, eenheid: 'ml' }] },
    { id: 'kip', naam: 'Kip met rijst', type: 'lunch', aantalEters: 2, doelen: [],
      ingredienten: [{ naam: 'kip', hoeveelheid: 300, eenheid: 'g' }] },
    { id: 'pasta', naam: 'Pasta bolognese', type: 'diner', aantalEters: 2, doelen: [],
      ingredienten: [{ naam: 'pasta', hoeveelheid: 200, eenheid: 'g' }] },
    { id: 'noten', naam: 'Noten', type: 'snack', aantalEters: 1, doelen: [],
      ingredienten: [{ naam: 'noten', hoeveelheid: 30, eenheid: 'g' }] },
  ];

  it('overschrijft het generieke ontbijtblok met een gekozen recept + geschaalde ingrediënten', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', maaltijden: recepten });
    const ontbijt = plan.blokken.find((b) => /Ontbijt/.test(b.titel));
    expect(ontbijt.titel).toBe('Ontbijt — Havermout');
    expect(ontbijt.bron).toBe('maaltijdplan');
    expect(ontbijt.detail).toBe('60g havermout, 200ml melk');
  });

  it('zonder passend recept blijft het blok generiek en niet-afvinkbaar (regressie)', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', maaltijden: [] });
    const ontbijt = plan.blokken.find((b) => b.type === 'ontbijt' || /Ontbijt/.test(b.titel));
    expect(ontbijt.titel).toBe('Ontbijt');
    expect(ontbijt.bron).toBe('maaltijd');
  });

  it('een expliciete override (maaltijdPlan) wint over de deterministische suggestie', () => {
    const plan = genereerDagPlan({
      datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', maaltijden: recepten,
      maaltijdPlan: { lunch: { recipeId: 'kip', aantalEters: 4 } },
    });
    const lunch = plan.blokken.find((b) => /Kip met rijst/.test(b.titel));
    expect(lunch).toBeTruthy();
    expect(lunch.detail).toBe('600g kip'); // 4 eters = dubbele basisportie (2)
  });

  it('plant 3 snackmomenten in die nooit overlappen met een vast blok', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'thuis', maaltijden: recepten });
    const snacks = plan.blokken.filter((b) => b.bron === 'maaltijdplan' && /Snack/.test(b.titel));
    expect(snacks.length).toBeGreaterThan(0);
    const vast = plan.blokken.filter((b) => b.vast || ['werk', 'judo', 'lesgeven', 'woonwerk', 'agenda'].includes(b.bron));
    snacks.forEach((s) => {
      vast.forEach((v) => {
        const overlap = toMin(s.start) < toMin(v.eind) && toMin(s.eind) > toMin(v.start);
        expect(overlap).toBe(false);
      });
    });
  });

  it('slaat snacks stil over als snacksAan uitstaat', () => {
    const Iuit = { ...I, voeding: { ...I.voeding, snacksAan: false } };
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: Iuit, werkModus: 'thuis', maaltijden: recepten });
    expect(plan.blokken.some((b) => /Snack/.test(b.titel))).toBe(false);
  });
});

describe('genereerDagPlan — sportcoach-integratie', () => {
  it('voegt een sportblok toe als de coach een niveau meegeeft', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', coachNiveau: 'matig' });
    const sportBlok = plan.blokken.find((b) => b.bron === 'sportcoach');
    expect(sportBlok).toBeTruthy();
    expect(sportBlok.type).toBe('sport');
    expect(sportBlok.titel).toBe('Home fitness');
    expect(sportBlok.detail).toBeTruthy();
  });

  it('voegt geen sportblok toe zonder coachNiveau (backwards-compatibel)', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis' });
    expect(plan.blokken.some((b) => b.bron === 'sportcoach')).toBe(false);
  });

  it('voegt geen los sportblok toe op een rustdag uit het weekschema', () => {
    const plan = genereerDagPlan({ datum: '2026-06-26', dagKort: 'vr', instellingen: I, werkModus: 'thuis', coachNiveau: 'hard' });
    expect(plan.blokken.some((b) => b.bron === 'sportcoach')).toBe(false);
  });

  it('judo wint nog steeds van het sportcoach-blok op een judodag', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'thuis', coachNiveau: 'hard' });
    expect(plan.blokken.some((b) => b.bron === 'sportcoach')).toBe(false);
    expect(plan.blokken.some((b) => /Judoles geven/.test(b.titel))).toBe(true);
  });

  it('geenJudo (vakantie) laat het sportcoach-blok wél door in plaats van judo', () => {
    const metWoSport = { ...I, sport: { ...I.sport, weekSchema: { ...I.sport.weekSchema, wo: 'homefitness' } } };
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: metWoSport, werkModus: 'thuis', geenJudo: true, coachNiveau: 'matig' });
    expect(plan.blokken.some((b) => b.bron === 'sportcoach')).toBe(true);
  });
});

describe('genereerDagPlan — blessures', () => {
  const blessures = [{
    id: 'b1', titel: 'Knie', regio: 'knie', actief: true, eindDatum: null, aantalPerDag: 2,
    oefeningen: [{ id: 'o1', naam: 'Quad sets', sets: '3×12', actief: true }, { id: 'o2', naam: 'Stepdowns', sets: '3×10', actief: true }],
  }];

  it('voegt een reva-blok toe per actieve blessure, met geselecteerde oefeningen', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures });
    const revaBlok = plan.blokken.find((b) => b.bron === 'reva');
    expect(revaBlok).toBeTruthy();
    expect(revaBlok.type).toBe('reva');
    expect(revaBlok.blessureId).toBe('b1');
    expect(revaBlok.oefeningen.length).toBe(2);
  });

  it('plant het reva-blok zelf rond het werk i.p.v. enkel een conflict te melden', () => {
    // Laat opstaan laat genoeg liggen zodat de oude vaste "opstaan + 60 min"
    // precies in de werkuren terechtkomt — dit reproduceert het gemelde
    // probleem (reva om 9u, werk begint om 8:25).
    const laatOp = { ...I, algemeen: { ...I.algemeen, opstaan: '08:00' } };
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: laatOp, werkModus: 'thuis', blessures });
    const revaBlok = plan.blokken.find((b) => b.bron === 'reva');
    const werkBlok = plan.blokken.find((b) => b.bron === 'werk');
    expect(revaBlok).toBeTruthy();
    expect(plan.conflicten.length).toBe(0);
    expect(revaBlok.conflict).toBeFalsy();
    // Geen overlap met het werkblok.
    const overlapt = revaBlokTijd => toMin(revaBlokTijd.start) < toMin(werkBlok.eind) && toMin(revaBlokTijd.eind) > toMin(werkBlok.start);
    expect(overlapt(revaBlok)).toBe(false);
  });

  it('plant het reva-blok vóór het werk als daar ruimte voor is na het ontbijt', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures });
    const revaBlok = plan.blokken.find((b) => b.bron === 'reva');
    const werkBlok = plan.blokken.find((b) => b.bron === 'werk');
    expect(toMin(revaBlok.eind)).toBeLessThanOrEqual(toMin(werkBlok.start));
  });

  it('respecteert een expliciet gekozen tijd en schuift die niet automatisch weg', () => {
    const metTijd = [{ ...blessures[0], tijd: '09:00' }];
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures: metTijd });
    const revaBlok = plan.blokken.find((b) => b.bron === 'reva');
    expect(revaBlok.start).toBe('09:00');
    expect(revaBlok.conflict).toBe(true); // valt midden in het werkblok — gemeld, niet verschoven
  });

  it('negeert verlopen blessures voor het reva-blok', () => {
    const verlopen = [{ ...blessures[0], eindDatum: '2026-06-01' }];
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures: verlopen });
    expect(plan.blokken.some((b) => b.bron === 'reva')).toBe(false);
  });

  it('knie-blessure verbant fietsen uit de sportcoach-keuze', () => {
    const metDiFiets = { ...I, sport: { ...I.sport, weekSchema: { ...I.sport.weekSchema, di: 'fietsen' } } };
    const plan = genereerDagPlan({ datum: '2026-06-23', dagKort: 'di', instellingen: metDiFiets, werkModus: 'thuis', coachNiveau: 'hard', blessures });
    const sportBlok = plan.blokken.find((b) => b.bron === 'sportcoach');
    expect(sportBlok).toBeTruthy();
    expect(sportBlok.titel).not.toBe('Fietsen');
    expect(plan.advies.tekst.some((t) => /afgeraden door een actieve blessure/.test(t))).toBe(true);
  });

  it('meldt een judo-veto als blessure judo afraadt, maar schrapt het judoblok niet', () => {
    const plan = genereerDagPlan({ datum: '2026-06-24', dagKort: 'wo', instellingen: I, werkModus: 'thuis', blessures });
    expect(plan.blokken.some((b) => /Judoles geven/.test(b.titel))).toBe(true);
    expect(plan.advies.tekst.some((t) => /Judo staat gepland.*blessure/.test(t))).toBe(true);
  });

  it('meldt een verlopen-niet-gemelde blessure in het advies', () => {
    const verlopenNietGemeld = [{ ...blessures[0], eindDatum: '2026-06-01', eindeGemeld: false }];
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures: verlopenNietGemeld });
    expect(plan.advies.tekst.some((t) => /liep af op/.test(t))).toBe(true);
  });

  it('signaleert structureel gemiste reva (adaptieve feedback-loop) zonder te straffen', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures, revaTrouw: 30 });
    expect(plan.advies.tekst.some((t) => /30%/.test(t))).toBe(true);
  });

  it('zegt niets over reva-trouw als die hoog genoeg is', () => {
    const plan = genereerDagPlan({ datum: '2026-06-22', dagKort: 'ma', instellingen: I, werkModus: 'thuis', blessures, revaTrouw: 80 });
    expect(plan.advies.tekst.some((t) => /reva-oefeningen lukten/.test(t))).toBe(false);
  });
});

describe('berekenFietsAdvies', () => {
  it('raadt fietsen af bij actieve blessure', () => {
    const a = berekenFietsAdvies({ sport: I.sport, blessureActief: true });
    expect(a.fiets).toBe(false);
  });
  it('raadt fietsen af als de blessure-regio fietsen vermijdt (zonder globale vlag)', () => {
    const a = berekenFietsAdvies({ sport: I.sport, vermijdSporten: ['fietsen'] });
    expect(a.fiets).toBe(false);
  });
  it('raadt fietsen af bij lage readiness', () => {
    const a = berekenFietsAdvies({ sport: I.sport, garmin: { trainingReadiness: { score: 20 } } });
    expect(a.fiets).toBe(false);
  });
  it('raadt fietsen af bij veel regen', () => {
    const a = berekenFietsAdvies({ sport: I.sport, weer: { neerslagKans: 80 } });
    expect(a.fiets).toBe(false);
  });
  it('staat fietsen toe bij goede omstandigheden', () => {
    const a = berekenFietsAdvies({ sport: I.sport, garmin: { trainingReadiness: { score: 70 } }, weer: { neerslagKans: 10, windKmh: 12 } });
    expect(a.fiets).toBe(true);
  });
});

```

## `test/reflectie.test.js`

```js
import { describe, it, expect } from 'vitest';
import {
  gemiddelde, reflectieReeks, reflectieSamenvatting, energieNudge,
  stemmingInfo, energieInfo,
} from '../src/services/reflectie.js';
import { coachAdvies } from '../src/services/coach.js';

describe('reflectie-helpers', () => {
  it('gemiddelde negeert ontbrekende waarden', () => {
    expect(gemiddelde([4, 2, null, undefined, 3])).toBe(3);
    expect(gemiddelde([])).toBe(null);
    expect(gemiddelde([null])).toBe(null);
  });

  it('reflectieReeks haalt stemming/energie/tevreden per dag eruit', () => {
    const dagen = [
      { datum: '2026-06-24', checkin: { ochtend: { stemming: 4, energie: 3 } } },
      { datum: '2026-06-25', checkin: { avond: { tevreden: 5 } } },
      { datum: '2026-06-26' },
    ];
    const r = reflectieReeks(dagen);
    expect(r[0]).toMatchObject({ stemming: 4, energie: 3, tevreden: null });
    expect(r[1]).toMatchObject({ stemming: null, tevreden: 5 });
    expect(r[2]).toMatchObject({ stemming: null, energie: null, tevreden: null });
  });

  it('reflectieSamenvatting telt alleen dagen met een check-in', () => {
    const s = reflectieSamenvatting([
      { checkin: { ochtend: { stemming: 4, energie: 4 } } },
      { checkin: { ochtend: { stemming: 2, energie: 2 } } },
      {},
    ]);
    expect(s.stemming).toBe(3);
    expect(s.energie).toBe(3);
    expect(s.aantal).toBe(2);
  });

  it('energieNudge: laag remt af, hoog geeft ruimte, 3 neutraal', () => {
    expect(energieNudge(1)).toBeLessThan(0);
    expect(energieNudge(3)).toBe(0);
    expect(energieNudge(5)).toBeGreaterThan(0);
    expect(energieNudge(null)).toBe(0);
  });

  it('schaal-info lookups werken', () => {
    expect(stemmingInfo(5).label).toBe('Top');
    expect(energieInfo(1).label).toBe('Uitgeput');
    expect(stemmingInfo(99)).toBe(null);
  });
});

describe('coach houdt rekening met zelf-gerapporteerde energie', () => {
  const basis = { readiness: 60, bodyBattery: 60, slaapUren: 7.5, goal: 'algemeen' };

  it('lage energie verlaagt het niveau t.o.v. hoge energie', () => {
    const laag = coachAdvies({ ...basis, energie: 1 });
    const hoog = coachAdvies({ ...basis, energie: 5 });
    const rang = { herstel: 0, rustig: 1, matig: 2, hard: 3 };
    expect(rang[laag.niveau]).toBeLessThan(rang[hoog.niveau]);
  });

  it('vermeldt energie in de reden', () => {
    const a = coachAdvies({ ...basis, energie: 2 });
    expect(a.reden).toContain('energie 2/5');
  });
});

describe('coach — uitlegbaarheid & veilige terugval (Fase 4.5)', () => {
  it('geeft waarom, databronnen, zekerheid en meetlat terug', () => {
    const a = coachAdvies({ readiness: 70, bodyBattery: 65, slaapUren: 8, goal: 'kracht' });
    expect(Array.isArray(a.waarom)).toBe(true);
    expect(a.waarom.length).toBeGreaterThan(0);
    expect(a.databronnen).toContain('Garmin readiness');
    expect(a.zekerheid).toBe('hoog'); // 3 signalen
    expect(typeof a.meetlat).toBe('string');
  });

  it('bij geen meetdata: lage zekerheid + veilig algemeen advies', () => {
    const a = coachAdvies({ goal: 'algemeen' });
    expect(a.zekerheid).toBe('laag');
    expect(a.databronnen).toContain('Geen meetdata');
    expect(a.waarom.join(' ')).toMatch(/veilig algemeen advies/i);
  });

  it('cap: lage zekerheid pusht nooit "hard"', () => {
    // Zeer hoge readiness zou 'hard' geven, maar zonder andere signalen is de
    // zekerheid laag -> conservatief naar 'matig'.
    const a = coachAdvies({ readiness: 95 });
    expect(a.zekerheid).not.toBe('hoog');
    expect(a.niveau).not.toBe('hard');
  });

  it('ACWR-risico tempert het advies en legt uit waarom', () => {
    const vol = coachAdvies({ readiness: 80, bodyBattery: 80, slaapUren: 8, goal: 'kracht' });
    const risico = coachAdvies({ readiness: 80, bodyBattery: 80, slaapUren: 8, goal: 'kracht', acwrZone: 'risico' });
    const rang = { herstel: 0, rustig: 1, matig: 2, hard: 3 };
    expect(rang[risico.niveau]).toBeLessThan(rang[vol.niveau]);
    expect(risico.waarom.join(' ')).toMatch(/blessurerisico/i);
  });

  it('deload-week (Fase 5 — periodisering) tempert "hard" naar "matig", los van ACWR', () => {
    const vol = coachAdvies({ readiness: 80, bodyBattery: 80, slaapUren: 8, goal: 'kracht' });
    const deload = coachAdvies({ readiness: 80, bodyBattery: 80, slaapUren: 8, goal: 'kracht', periodiseringFase: 'deload' });
    expect(vol.niveau).toBe('hard');
    expect(deload.niveau).toBe('matig');
    expect(deload.waarom.join(' ')).toMatch(/hersteller/i);
  });

  it('deload-week verlaagt "rustig" of "matig" niet verder (enkel een rem op vol gas)', () => {
    const matig = coachAdvies({ readiness: 55, bodyBattery: 55, slaapUren: 7, energie: 3, goal: 'kracht' });
    const matigMetDeload = coachAdvies({ readiness: 55, bodyBattery: 55, slaapUren: 7, energie: 3, goal: 'kracht', periodiseringFase: 'deload' });
    expect(matigMetDeload.niveau).toBe(matig.niveau);
  });
});

describe('coach — groot verlof (thuis vs. buitenland)', () => {
  const basis = { readiness: 80, bodyBattery: 80, slaapUren: 8, goal: 'kracht' };

  it('verlof thuis verlengt de sessieduur t.o.v. een gewone dag', () => {
    const normaal = coachAdvies(basis);
    const thuis = coachAdvies({ ...basis, vakantieType: 'thuis' });
    expect(thuis.duurMin).toBeGreaterThan(normaal.duurMin);
    expect(thuis.waarom.join(' ')).toMatch(/meer tijd/i);
  });

  it('verlof in het buitenland laat de duur standaard (geen aanname over faciliteiten)', () => {
    const normaal = coachAdvies(basis);
    const buitenland = coachAdvies({ ...basis, vakantieType: 'buitenland' });
    expect(buitenland.duurMin).toBe(normaal.duurMin);
    expect(buitenland.waarom.join(' ')).toMatch(/buitenland/i);
  });

  it('bij niveau "herstel" telt de verlof-bonus niet — herstel blijft kort', () => {
    const herstel = coachAdvies({ goal: 'kracht', blessureActief: true });
    const herstelThuis = coachAdvies({ goal: 'kracht', blessureActief: true, vakantieType: 'thuis' });
    expect(herstelThuis.niveau).toBe('herstel');
    expect(herstelThuis.duurMin).toBe(herstel.duurMin);
  });

  it('herhaalde aanroepen muteren de gedeelde MATRIX niet (geen lekkende state)', () => {
    coachAdvies({ ...basis, vakantieType: 'thuis' });
    const normaalNa = coachAdvies(basis);
    expect(normaalNa.duurMin).toBe(60); // ongewijzigde 'kracht'/'hard'-waarde uit MATRIX
  });
});

```

## `test/sportcoach.test.js`

```js
import { describe, it, expect } from 'vitest';
import { kiesSportVanDag, genereerHomeFitness, genereerFietsAdvies, genereerWandelAdvies, genereerSportInhoud } from '../src/services/sportcoach.js';

const SCHEMA = { ma: 'homefitness', di: 'fietsen', do: 'wandelen', vr: 'rust', zo: 'rust' };

describe('kiesSportVanDag', () => {
  it('judo wint altijd, ongeacht weekschema', () => {
    const k = kiesSportVanDag({ dagKort: 'ma', weekSchema: SCHEMA, niveau: 'hard', judoVandaag: true });
    expect(k.sport).toBe('judo');
    expect(k.overschreven).toBe(false);
  });

  it('volgt het geplande schema bij voldoende herstel', () => {
    const k = kiesSportVanDag({ dagKort: 'di', weekSchema: SCHEMA, niveau: 'hard', judoVandaag: false });
    expect(k.sport).toBe('fietsen');
    expect(k.overschreven).toBe(false);
  });

  it('vervangt een intensieve sport door wandelen bij herstel-niveau, met uitleg', () => {
    const k = kiesSportVanDag({ dagKort: 'di', weekSchema: SCHEMA, niveau: 'herstel', judoVandaag: false });
    expect(k.sport).toBe('wandelen');
    expect(k.overschreven).toBe(true);
    expect(k.waarom.length).toBeGreaterThan(0);
  });

  it('rustdag blijft rust, geen override nodig', () => {
    const k = kiesSportVanDag({ dagKort: 'vr', weekSchema: SCHEMA, niveau: 'herstel', judoVandaag: false });
    expect(k.sport).toBe('rust');
    expect(k.overschreven).toBe(false);
  });
});

describe('genereerHomeFitness', () => {
  const oefeningen = [
    { id: 'a', naam: 'Squats', waarom: 'benen', sets: 3, reps: 12, categorie: 'kracht' },
    { id: 'b', naam: 'Plank', waarom: 'core', sets: 3, reps: 1, categorie: 'core' },
  ];

  it('geeft elke oefening een waarom mee', () => {
    const r = genereerHomeFitness({ oefeningen, niveau: 'matig', datum: '2026-06-29' });
    expect(r.oefeningen.length).toBeGreaterThan(0);
    r.oefeningen.forEach((o) => expect(o.waarom).toBeTruthy());
  });

  it('valt veilig terug zonder ingestelde oefeningen', () => {
    const r = genereerHomeFitness({ oefeningen: [], niveau: 'matig', datum: '2026-06-29' });
    expect(r.oefeningen).toEqual([]);
    expect(r.waarom[0]).toMatch(/Beheer/);
  });

  it('zelfde datum geeft een stabiele selectie (geen willekeurige flikkering)', () => {
    const a = genereerHomeFitness({ oefeningen, niveau: 'matig', datum: '2026-06-29' });
    const b = genereerHomeFitness({ oefeningen, niveau: 'matig', datum: '2026-06-29' });
    expect(a.oefeningen.map((o) => o.id)).toEqual(b.oefeningen.map((o) => o.id));
  });
});

describe('genereerFietsAdvies', () => {
  it('geeft minder km en lagere zone bij herstel dan bij hard', () => {
    const hard = genereerFietsAdvies({ niveau: 'hard' });
    const herstel = genereerFietsAdvies({ niveau: 'herstel' });
    expect(herstel.km).toBeLessThan(hard.km);
  });
});

describe('genereerWandelAdvies', () => {
  it('adviseert resterende stappen tot het doel als dat nog niet gehaald is', () => {
    const r = genereerWandelAdvies({ niveau: 'matig', garmin: { stappen: 3000 }, stappenDoel: 8000 });
    expect(r.stappenAdvies).toBe(5000);
  });

  it('valt terug op een km-advies zonder stappendoel-data', () => {
    const r = genereerWandelAdvies({ niveau: 'matig', garmin: null, stappenDoel: null });
    expect(r.stappenAdvies).toBeNull();
    expect(r.km).toBeGreaterThan(0);
  });
});

describe('genereerSportInhoud', () => {
  it('geeft judo geen extra inhoud', () => {
    const r = genereerSportInhoud({ sport: 'judo', niveau: 'matig' });
    expect(r.type).toBe('judo');
    expect(r.waarom[0]).toMatch(/Vaste/);
  });
});

```

## `test/tijd.test.js`

```js
import { describe, it, expect } from 'vitest';
import { toMin, toHHMM, addMin, duurMin, datumKey, weekKey, dagKortVanDatum } from '../src/services/tijd.js';

describe('tijd-helpers', () => {
  it('toMin / toHHMM zijn elkaars inverse', () => {
    expect(toMin('08:25')).toBe(505);
    expect(toHHMM(505)).toBe('08:25');
    expect(toMin('00:00')).toBe(0);
    expect(toHHMM(0)).toBe('00:00');
  });
  it('addMin telt op en wrapt rond middernacht', () => {
    expect(addMin('23:45', 30)).toBe('00:15');
    expect(addMin('08:00', 90)).toBe('09:30');
  });
  it('duurMin berekent het verschil', () => {
    expect(duurMin('13:00', '13:30')).toBe(30);
  });
  it('datumKey formatteert YYYY-MM-DD', () => {
    expect(datumKey(new Date(2026, 5, 25))).toBe('2026-06-25');
  });
  it('dagKortVanDatum geeft NL-dagcode', () => {
    expect(dagKortVanDatum(new Date(2026, 5, 25))).toBe('do'); // donderdag
  });
  it('weekKey geeft ISO-weekformaat', () => {
    expect(weekKey(new Date(2026, 5, 25))).toMatch(/^2026-W\d{2}$/);
  });
});

```

## `test/vakanties.test.js`

```js
import { describe, it, expect } from 'vitest';
import { vakantieVoorDatum, vakantieFlags, vakantieLabel } from '../src/services/vakanties.js';

// Twee overlappende periodes zoals in de praktijk: een ziekteverlof én een
// langere judovrije periode die elkaar op één dag overlappen.
const periodes = [
  { naam: 'Ziekte', van: '2026-05-25', tot: '2026-06-28', verlof: true, geenJudo: false },
  { naam: 'Geen judo', van: '2026-06-26', tot: '2026-08-18', verlof: false, geenJudo: true },
];

describe('vakantieFlags — combineert overlappende periodes', () => {
  it('27 jun valt in beide: zowel verlof als geenJudo gelden', () => {
    const f = vakantieFlags(periodes, '2026-06-27');
    expect(f.verlof).toBe(true);
    expect(f.geenJudo).toBe(true);
  });

  it('vakantieVoorDatum (één periode) miste geenJudo bij overlap — flags lost dit op', () => {
    // De eerste match is "Ziekte" (geen judovrij); daarom is enkel die ontoereikend.
    expect(vakantieVoorDatum(periodes, '2026-06-27').geenJudo).toBe(false);
    expect(vakantieFlags(periodes, '2026-06-27').geenJudo).toBe(true);
  });

  it('20 jun: enkel ziekteverlof, geen judovrij', () => {
    const f = vakantieFlags(periodes, '2026-06-20');
    expect(f.verlof).toBe(true);
    expect(f.geenJudo).toBe(false);
  });

  it('1 sept: buiten alle periodes', () => {
    const f = vakantieFlags(periodes, '2026-09-01');
    expect(f).toEqual({ verlof: false, geenJudo: false, buitenland: false, periode: null });
  });
});

describe('vakantieFlags — buitenland', () => {
  const buitenPeriodes = [
    { naam: 'Spanje', van: '2026-07-01', tot: '2026-07-14', verlof: true, geenJudo: true, buitenland: true },
  ];

  it('buitenland-vlag wordt overgenomen tijdens de periode', () => {
    const f = vakantieFlags(buitenPeriodes, '2026-07-05');
    expect(f.buitenland).toBe(true);
  });

  it('buitenland-vlag staat uit buiten de periode', () => {
    const f = vakantieFlags(buitenPeriodes, '2026-08-01');
    expect(f.buitenland).toBe(false);
  });
});

describe('vakantieLabel — buitenland-suffix', () => {
  it('voegt "(buitenland)" toe als de periode buitenland is', () => {
    expect(vakantieLabel({ verlof: true, geenJudo: false, buitenland: true })).toBe('Persoonlijk verlof (buitenland)');
    expect(vakantieLabel({ verlof: true, geenJudo: false, buitenland: false })).toBe('Persoonlijk verlof');
  });
});

```

