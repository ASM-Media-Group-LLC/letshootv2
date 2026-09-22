#!/bin/bash
# Instala el auto-cocinero de /kitchen como servicio de macOS (launchd LaunchAgent).
# Queda SIEMPRE encendido: arranca al iniciar sesión y se reinicia solo si se cae.
# Uso:  bash scripts/install-cocina.sh <WORKER_SECRET>
#   (el secreto lo ponés vos; se guarda en scripts/.worker.env, que está gitignored)
set -e
SECRET="$1"
DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ -n "$SECRET" ]; then echo "WORKER_SECRET=$SECRET" > "$DIR/scripts/.worker.env"; fi
if [ ! -f "$DIR/scripts/.worker.env" ]; then
  echo "✗ Falta el secreto. Corré:  bash scripts/install-cocina.sh <WORKER_SECRET>"; exit 1
fi

NODE="$(command -v node)"
if [ -z "$NODE" ]; then echo "✗ No encuentro node en el PATH."; exit 1; fi
NODE_DIR="$(dirname "$NODE")"
PLIST="$HOME/Library/LaunchAgents/ai.letshoot.cocina.plist"
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>ai.letshoot.cocina</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$DIR/scripts/kitchen-worker.mjs</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/letshoot-cocina.log</string>
  <key>StandardErrorPath</key><string>/tmp/letshoot-cocina.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$NODE_DIR:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "✓ Cocina instalada y encendida (arranca sola al prender la Mac)."
echo "  Log en vivo:  tail -f /tmp/letshoot-cocina.log"
echo "  Apagar:       launchctl unload $PLIST"
