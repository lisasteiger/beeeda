#!/bin/zsh
cd -- "${0:A:h}" || exit 1

# Node ist auf diesem Mac auch in der Codex-Laufzeit vorhanden.
export PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
studio_url="http://localhost:8001/"

if /usr/bin/curl --silent --fail --max-time 2 "$studio_url" >/dev/null; then
  /usr/bin/open "$studio_url"
  exit 0
fi

if ! command -v node >/dev/null; then
  print 'Node.js fehlt. Bitte Codex öffnen und den lokalen Studio-Start prüfen lassen.'
  read '?Zum Schliessen Enter drücken.'
  exit 1
fi

print 'Beeeda Studio startet. Der Browser öffnet sich, sobald es bereit ist.'
print 'Dieses Terminalfenster beim Bearbeiten offen lassen. Beenden mit Ctrl+C.'
print 'Im Browser unten links auf den Studio-Knopf klicken.'

NODE_ENV=development node node_modules/nuxt/bin/nuxt.mjs dev --host 127.0.0.1 --port 8001 --strictPort --open
studio_exit=$?
if (( studio_exit != 0 )); then
  print 'Studio konnte nicht gestartet werden. Bitte diese Meldung in Codex zeigen.'
  read '?Zum Schliessen Enter drücken.'
fi
exit "$studio_exit"
