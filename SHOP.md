# Lokaler Shop

Der Shop läuft mit **Node.js 24 oder neuer** und einer lokalen SQLite-Datenbank.
Keine Installation von Bibliotheken nötig.

```sh
npm start
```

Öffnen: http://localhost:8001. Der bisherige statische Server auf Port 8000
hat keine Datenbank und kann die neue Kasse nicht bedienen.
In dieser Codex-Umgebung steht Node auch hier bereit:

```sh
/Users/lisasteiger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node server.mjs
```

## Ausprobieren

1. „Pinks Chaos“ für CHF 49.50 in den Warenkorb legen. Wiederholtes Klicken
   erhöht die Menge nicht: jedes Stück gibt es genau einmal.
2. „Zur Kasse“ öffnen und erfundene Namen, E-Mail und Lieferadresse eingeben.
3. „Für Testzahlung reservieren“ hält den Bestand 10 Minuten zentral fest.
   Andere Käufer können das Stück währenddessen nicht reservieren.
4. „Testzahlung bestätigen“ simuliert den Erfolg und setzt den lokalen
   Bestand auf verkauft. „Reservierung abbrechen“ gibt ihn wieder frei.

Es fliesst **kein Geld**. „test-paid“ bezeichnet ausschliesslich einen
simulierten Kauf. Das ist keine echte TWINT-Zahlungsbestätigung.
Die Kasse stellt nur die Artikelsumme dar; Versandkosten sind noch offen.

## Produkte und Bestand

`products.js` enthält den gemeinsamen Produktkatalog. Preise stehen in
Rappen (`4950` = CHF 49.50). Nur das vorhandene Produkt mit bekanntem Preis
ist derzeit bestellbar; weitere Produktseiten und Preise müssen ergänzt werden.

Je Artikel entscheidet `afterSale` über die Anzeige nach dem Verkauf:

- `"sold"`: SOLD, kein weiterer Kauf.
- `"inquiry"`: Auf Anfrage, kein weiterer direkter Kauf. Ein Kontaktformular
  oder eine Kontaktadresse für Anfragen ist noch einzurichten.

Der Browser speichert nur den Warenkorb. Der Server prüft selbst Preise,
Artikel und Menge. Bestand, Testbestellungen und Käuferdaten stehen zentral
in `.local/shop.sqlite` und bleiben bei einem Neustart erhalten.
Reservierungen werden in SQLite-Transaktionen angelegt, sodass gleichzeitige
Käufe kein Stück doppelt reservieren können. Abbruch oder Ablauf geben den
Bestand frei. Ein verspätetes Bestätigen einer alten Reservierung wird abgelehnt.

Bestellungen samt Käuferdaten lokal im Terminal ansehen:

```sh
npm run orders
```

Die Datenbank ist vom Webserver nicht abrufbar und wird nicht in Git gespeichert.
Die Bestell-API zeigt jeweils nur Bestellungen der eigenen Browser-Sitzung.
Ohne Sitzungscookie kann eine frühere Bestellung nicht über die Kasse geöffnet
werden; als Betreiber kannst du sie weiterhin mit dem lokalen Befehl ansehen.

Für einen weiteren, unabhängigen Testbestand einen anderen Datenbankpfad und
Port verwenden, ohne vorhandene Bestellungen zu löschen:

```sh
SHOP_DB=.local/zweiter-test.sqlite PORT=8002 npm start
```

Prüfen: `npm test`. Tests verwenden eigene temporäre Datenbanken.

## Vor dem Livebetrieb

Der Server bindet absichtlich nur an 127.0.0.1. Die lokale Testzahlung darf
nicht öffentlich bereitgestellt werden. Noch nötig: Hosting mit HTTPS,
gesicherte Bestellverwaltung, Versandkosten und Liefergebiet, TWINT-Händlerzugang
bzw. unterstützter Zahlungsanbieter sowie echte serverseitig verifizierte
Zahlungsbestätigungen. Für echte Zahlungen müssen Reservierungen und Freigaben
mit dem Zahlungsstatus des Anbieters abgestimmt werden; ein lokaler Zeitablauf
allein reicht dafür nicht. Die Testbestätigungs-Endpunkte werden dabei ersetzt.

Aktuell werden weder Bestell-E-Mails versendet noch echte Zahlungsdaten verarbeitet.
