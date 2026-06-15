#!/usr/bin/env bash
set -euo pipefail

CHANGELOG="CHANGELOG.md"
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
cd "$PROJECT_ROOT"

# ── Collect all commits: date | subject ──
RAW_LOG=$(git log --reverse --format="%ad | %s" --date=format:"%Y-%m-%d" 2>/dev/null)

if [ -z "$RAW_LOG" ]; then
  echo "❌ No commits found."
  exit 1
fi

# ── If CHANGELOG doesn't exist, create it from full history ──
if [ ! -f "$CHANGELOG" ]; then
  echo "📄 No CHANGELOG.md found. Creating from full git history..."
  {
    echo "# Changelog"
    echo ""
    echo "$RAW_LOG" | awk -F' \\| ' '
      BEGIN { current_date = "" }
      {
        date = $1; msg = $2
        if (date != current_date) {
          current_date = date
          print ""
          print "## " date
        }
        print "- " msg
      }
    '
    echo ""
  } > "$CHANGELOG"
  echo "✅ Created $CHANGELOG with $(echo "$RAW_LOG" | wc -l) commits"
  exit 0
fi

# ── CHANGELOG exists: find new commits only ──
# Get the last date already recorded in CHANGELOG
LAST_DATE=$(grep -E '^## [0-9]{4}-[0-9]{2}-[0-9]{2}$' "$CHANGELOG" | tail -1 | sed 's/^## //')

# Collect already-documented commit messages (lines starting with "- ")
grep -E '^\- ' "$CHANGELOG" | sed 's/^- //' > /tmp/_changelog_known.txt

# Find new commits not yet in CHANGELOG
NEW_COMMITS=""
while IFS=' | ' read -r date msg; do
  # Skip commits before the last documented date
  if [ -n "$LAST_DATE" ] && [[ "$date" < "$LAST_DATE" ]]; then
    continue
  fi
  # Skip if message already in changelog
  if grep -Fxq "$msg" /tmp/_changelog_known.txt 2>/dev/null; then
    continue
  fi
  NEW_COMMITS="$NEW_COMMITS$date|$msg"$'\n'
done <<< "$RAW_LOG"

rm -f /tmp/_changelog_known.txt

if [ -z "$NEW_COMMITS" ]; then
  echo "✅ No new commits to add. Changelog is up to date."
  exit 0
fi

# ── Append new commits to CHANGELOG ──
echo "📝 Adding $(echo "$NEW_COMMITS" | grep -c .) new commit(s) to $CHANGELOG"

# Ensure the file ends with a blank line
sed -i -e '$a\' "$CHANGELOG"

printf "%s" "$NEW_COMMITS" | awk -F'|' '
  BEGIN { current_date = "" }
  {
    date = $1; msg = substr($0, length($1)+2)
    if (date != current_date) {
      current_date = date
      print "" >> "'"$CHANGELOG"'"
      print "## " date >> "'"$CHANGELOG"'"
    }
    print "- " msg >> "'"$CHANGELOG"'"
  }
'

echo "✅ $CHANGELOG updated."
