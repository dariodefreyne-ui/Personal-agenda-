# Personal Agenda — Claude Code-gids

Persoonlijke planning/gezondheid-PWA op **Firebase** (Firestore, Auth e-mail,
FCM push, Cloud Functions) + **Garmin→Firestore** Python-pijplijn. Eén gebruiker.
Alles na opzet **in-app beheerbaar** (geen code meer nodig). Zie `README.md` voor
de babyproof setup.

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
    coach.js              Garmin + zelfrapportage -> sportadvies (niveau/duur)
    reflectie.js          stemming/energie/tevredenheid-schalen + trend-helpers
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
instellingen/{algemeen|werk|sport|push|gezondheid}
weken/{YYYY-Www}          { dagen: {ma..zo: werkmodus}, vakantie }
blokTemplates/{id}
taken/{id}                gewoonte/eenmalig + streak
takenLog/{datum_taakId}
reva/{id}                 oefening + blessureActief
maaltijden/{id}
dagen/{YYYY-MM-DD}        { gedaan{blokId}, plan[], pushLog{},
                           checkin: { ochtend{stemming,energie}, avond{tevreden,dankbaar,reflectie} } }
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
- **Fase 5 — Periodisering & slimme coach:** acute:chronic load-ratio,
  RPE-gewogen belasting, trainingsblokken/periodisering, blessure-preventie-advies,
  slimme aanbevelingen op basis van Garmin + zelfgerapporteerd.
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
