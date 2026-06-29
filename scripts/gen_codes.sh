#!/bin/bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"
OUT=codes.md
META=scripts/codes_file_meta.tsv
BRANCH=$(git branch --show-current)
CATS=("Config" "Backend" "Garmin-pijplijn" "Frontend" "Services" "Tests")

{
  echo "# Personal Agenda — Volledige broncode (audit-bundel)"
  echo
  echo "Automatisch gegenereerd bestand. Bevat de volledige inhoud van alle"
  echo "relevante bron-, config- en testbestanden uit deze repository, samengevoegd"
  echo "in 1 bestand zodat een AI-assistent (of externe auditor) de hele codebase"
  echo "in 1 keer kan inlezen en zelfstandig kan navigeren/aanpassen. Genereer"
  echo "opnieuw met \`npm run gen:codes\` (= \`scripts/gen_codes.sh\`) zodra dit"
  echo "verouderd is — voeg nieuwe/verwijderde bestanden eerst toe aan/verwijder"
  echo "uit \`scripts/codes_file_meta.tsv\` (pad + categorie + 1-regel-omschrijving,"
  echo "★-prefix voor critical logic)."
  echo
  echo "Branch: \`$BRANCH\`"
  echo
  echo "## STRUCTUUR"
  echo
  echo "Categorieën (in deze volgorde door dit document heen):"
  echo
  echo "- **Config** — buildtools, CI, Firebase/Firestore-config, security-rules, docs."
  echo "- **Backend** — Cloud Functions (\`functions/\`, CommonJS, Node 22): dispatcher,"
  echo "  icsSync, weerSync, weekMail."
  echo "- **Garmin-pijplijn** — losstaande Python-pijplijn (\`garmin/\`, dagelijkse"
  echo "  GitHub Action) die Garmin Connect-data naar Firestore (\`garminDaily/{datum}\`,"
  echo "  server-only) synct."
  echo "- **Frontend** — React/Vite-PWA (\`src/components\`, \`src/contexts\`,"
  echo "  \`src/pages\`, \`src/config\`, \`src/hooks\`, \`src/styles\`): UI, routing, state."
  echo "- **Services** — \`src/services/*.js\`, de kernlogica van de app. Bestanden"
  echo "  gemarkeerd met ★ zijn **critical logic**: planning/scheduling- en"
  echo "  beslissings-engines waar bugs direct zichtbaar/voelbaar advies beïnvloeden."
  echo "  Alle andere services zijn data-/CRUD-/util-laag rond die kernlogica."
  echo "- **Tests** — \`test/*.test.js\` (Vitest), 1 testbestand per service in"
  echo "  \`src/services\`."
  echo
  echo "Belangrijkste call-keten (boven naar onder = wie roept wie aan):"
  echo
  echo '```'
  echo "useDagPlan.js (hook, leest/schrijft dagen/{datum})"
  echo "  └─ planner.js          ★ genereert het dagplan (blokken, tijden, bron)"
  echo "       ├─ sportcoach.js  ★ welke sport + wat die dag concreet inhoudt"
  echo "       ├─ coach.js       ★ Garmin + zelfrapportage -> sportadvies"
  echo "       │    └─ belasting.js   ★ ACWR uit RPE-gewogen sRPE-belasting"
  echo "       │    └─ periodisering.js ★ opbouw-/deload-weekcyclus"
  echo "       ├─ blessures.js   ★ reva-oefeningenrotatie bij actieve blessure"
  echo "       ├─ maaltijden.js  ★ receptsuggesties, schaling, boodschappenlijst"
  echo "       └─ vakanties.js, tijd.js, data.js (helpers/CRUD)"
  echo "  └─ noordster.js        ★ North Star-score, leest dagen/{datum}.plan[].checkbaar"
  echo '```'
  echo
  echo "Firestore-datamodel en productprincipes staan in \`CLAUDE.md\` (zie hieronder"
  echo "in de Config-sectie) — lees dat bestand eerst voor context voordat je code"
  echo "wijzigt."
  echo
  echo "## FILE INDEX"
  echo
  for cat in "${CATS[@]}"; do
    echo "### $cat"
    echo
    awk -F'\t' -v c="$cat" '$2==c {printf "- `%s` — %s\n", $1, $3}' "$META"
    echo
  done

  MISSING=0
  for cat in "${CATS[@]}"; do
    echo "## $cat"
    echo
    while IFS=$'\t' read -r f filecat desc; do
      [ "$filecat" = "$cat" ] || continue
      if [ ! -f "$f" ]; then
        echo "MISSING: $f" >&2
        MISSING=$((MISSING+1))
        continue
      fi
      base=$(basename "$f")
      if [[ "$base" == *.* && "$base" != .* ]] || [[ "$base" == .*.* ]]; then
        ext="${base##*.}"
      elif [[ "$base" == .* ]]; then
        ext="${base#.}"
      else
        ext=""
      fi
      mark=""
      [[ "$desc" == ★* ]] && mark=" ★"
      echo "### \`$f\`$mark"
      echo
      echo "$desc"
      echo
      echo "\`\`\`$ext"
      cat "$f"
      echo
      echo "\`\`\`"
      echo
    done < "$META"
  done
  TOTAL=$(wc -l < "$META")
  echo "Bestanden: $TOTAL, missing: $MISSING" >&2
} > "$OUT"
