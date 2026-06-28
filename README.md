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
blessures te helpen voorkomen, en volgt actieve **blessures met
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
