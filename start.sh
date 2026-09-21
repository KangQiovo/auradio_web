#!/bin/sh
set -eu
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  exec node server.mjs --open
elif command -v python3 >/dev/null 2>&1; then
  exec python3 serve.py --open
else
  printf '%s\n' 'Please install Node.js or Python 3, then run this script again.'
  exit 1
fi
