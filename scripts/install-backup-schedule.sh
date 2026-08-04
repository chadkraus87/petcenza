#!/usr/bin/env bash
# Install a daily launchd job that backs up PetCenza's Storage buckets.
#
# Storage objects (pet photos, medical documents) are NOT covered by Supabase's database
# backups, so without something like this a deleted file is unrecoverable even after a full
# DB restore. This runs scripts/backup-storage.mjs every day at 02:00 local time.
#
#   ./scripts/install-backup-schedule.sh            install / update
#   ./scripts/install-backup-schedule.sh --uninstall  remove
#
# The service-role key is read from a file you create (see SECRET_FILE below) rather than baked
# into the plist — launchd plists are world-readable, and that key bypasses RLS entirely.
set -euo pipefail

LABEL="com.petcenza.storage-backup"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRET_FILE="$HOME/.petcenza-backup.env"
LOG_DIR="$HOME/Library/Logs/petcenza"

if [[ "${1:-}" == "--uninstall" ]]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Removed $LABEL"
  exit 0
fi

if [[ ! -f "$SECRET_FILE" ]]; then
  cat <<EOF
Missing $SECRET_FILE

Create it first (it is read only by you, never committed):

  cat > "$SECRET_FILE" <<'ENV'
  export SUPABASE_URL="https://ccvjqnljijlyxxecwryd.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="<service role key from Dashboard > Settings > API>"
  ENV
  chmod 600 "$SECRET_FILE"

That key bypasses RLS by design — it has to read every user's files. Treat it like a root
password: never commit it, never paste it into a chat.
EOF
  exit 1
fi

# Refuse to proceed if the secret file is readable by anyone else.
PERMS=$(stat -f "%OLp" "$SECRET_FILE")
if [[ "$PERMS" != "600" ]]; then
  echo "$SECRET_FILE has permissions $PERMS; tightening to 600." >&2
  chmod 600 "$SECRET_FILE"
fi

mkdir -p "$LOG_DIR" "$(dirname "$PLIST")"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>source "$SECRET_FILE" &amp;&amp; cd "$PROJECT_DIR" &amp;&amp; npm run backup:storage</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>2</integer><key>Minute</key><integer>0</integer></dict>
  <!-- If the Mac was asleep at 02:00, run once it wakes rather than skipping the day. -->
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>$LOG_DIR/backup.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/backup.err.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

cat <<EOF
Installed $LABEL — daily at 02:00.

  Logs:       $LOG_DIR/backup.log
  Run now:    launchctl kickstart -k gui/$(id -u)/$LABEL
  Uninstall:  $0 --uninstall

Backups land in $PROJECT_DIR/backups/storage (gitignored). For off-machine durability, point
--out at a synced folder or an external disk.
EOF
