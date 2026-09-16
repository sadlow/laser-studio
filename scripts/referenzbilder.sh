#!/bin/bash
# Referenzbilder aus der 3D-Ansicht per Headless-Chrome, z.B. fuer den Leonardo-Skill.
#
#   bash scripts/referenzbilder.sh <name> "<query>" [breite] [hoehe]
#   bash scripts/referenzbilder.sh symbol "foto=symbol"
#   bash scripts/referenzbilder.sh eiche-wand "holzrahmen=eiche&foto=wand" 2000 1125   # 16:9 dazu seiten=16:9
#
# Motive: wand, flach, symbol, titel, wasser, kante. Der Dev-Server muss laufen.
# Metal-GPU statt SwiftShader: 6-8 s je Bild statt mehrerer Minuten. Chrome beendet
# sich nach dem Screenshot nicht von selbst, darum wird auf die Datei gewartet.
set -u
name=$1; query=$2; w=${3:-2000}; h=${4:-1500}
ziel="$(cd "$(dirname "$0")/.." && pwd)/export/produktfoto/nah"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
profil=$(mktemp -d)
out="$ziel/$name.png"
mkdir -p "$ziel" && rm -f "$out"
start=$(date +%s)
"$chrome" --headless=new --user-data-dir="$profil" --enable-gpu --use-angle=metal --ignore-gpu-blocklist --hide-scrollbars \
  --window-size="$w,$h" --force-device-scale-factor=1 --virtual-time-budget=20000 --screenshot="$out" \
  "http://localhost:3010/?ansicht=3d&vollbild=1&$query" >/dev/null 2>&1 &
for _ in $(seq 1 90); do sleep 2; [ -s "$out" ] && break; done
sleep 1; pkill -f "$profil"; sleep 1; rm -rf "$profil"
if [ -s "$out" ]; then echo "$out ($(( $(date +%s) - start )) s)"; else echo "$name: kein Bild" >&2; exit 1; fi
