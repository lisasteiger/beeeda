# Beeeda: Nuxt, Studio, Supabase und Stripe

Die neue Anwendung liegt auf dem lokalen Branch `branch1`. Sie wurde noch nicht auf GitHub gepusht oder live veröffentlicht. Die bisherigen HTML/JS-Dateien bleiben als Referenz erhalten. Vercel startet ausschliesslich Nuxt; die alte Testzahlung gehört nicht zur neuen Anwendung.

## Lokal starten

Node.js 24 und pnpm 11 verwenden:

```sh
pnpm install
pnpm dev --port 8001
```

Produktseite: `/produkte/pinks-chaos`, Warenkorb: `/warenkorb`, Kasse: `/kasse`. Alte .html-Adressen werden weitergeleitet. Ohne Zugangsschlüssel kannst du Seiten und Warenkorb ansehen; der Kauf ist gesperrt. Es wird kein echter Bestand vorgetäuscht.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm test:integration
```

## Was du künftig bearbeitest

- Texte, Preise, Versandklasse, Bilder und neue Produkte: Nuxt Studio, `/_studio`.
- Bestand und Bestellungen: `/verwaltung`, mit derselben GitHub-Anmeldung.
- Layout, Funktionen und technische Änderungen: weiterhin im Code unter `app/`, `server/` und `nuxt.config.ts`.

Produktinhalte sind JSON-Dateien unter `content/products/`. Bilder liegen unter `public/assets/`. Beides wird von Studio nach GitHub gespeichert. Studio-Veröffentlichungen lösen über GitHub einen neuen Vercel-Build aus. Bestände und Bestellungen sind in Supabase und werden durch einen Build nicht überschrieben.

Neue Produkte erhalten eine eindeutige `productId`, beispielsweise `blaue-muetze`. Die ID nach dem ersten Verkauf nicht ändern. Die Datei kann denselben Namen tragen. Die Produktseite `/produkte/blaue-muetze` entsteht automatisch. Zunächst `status: draft` verwenden. Erst nach Texten, Bildern, gültigem Preis und einem freigegebenen Bestand auf `active` stellen. Preise sind Rappen: 4960 = CHF 49.60. Entwürfe sind nicht im Shop, aber die Content-Dateien sind keine Ablage für vertrauliche Daten.

Einzelstück: Bestand 1. Mehrere Stück: entsprechende Menge. Bestand bezeichnet **noch nicht verkaufte** Stück, einschliesslich Reservierungen; Zahlungen reduzieren ihn automatisch. Nachlieferung zum verbleibenden Bestand hinzufügen. Für einen Artikel ohne angelegten Bestand ist der Kauf gesperrt.

Wenn der Bestand nach Zahlung 0 wird, bleibt das Produkt im Carousel und wird mit `verkauft.svg` gekennzeichnet. Eine Reservierung allein kennzeichnet es nicht als verkauft. Mit `status: archived` lässt sich ein Produkt auch manuell als verkauft darstellen. Es gibt keine separate Archivseite mehr. Die letzten zwei der sechs ursprünglichen Carousel-Bilder zeigen vorerst die Verkaufskennzeichnung als visuelle Vorschau; sie sind keine Bestandsdaten. Unfertige Produkte bleiben ohne Kaufmöglichkeit. Neue veröffentlichte Produkte kommen automatisch ins Carousel; die ursprünglichen Platzhalter werden ersetzt, sobald ein Produkt mit demselben Startseitenbild veröffentlicht wird.

## Supabase einrichten

Im Projekt `ozmirswnhpiuiuhgikvk` im SQL Editor die Datei `supabase/migrations/202610070001_shop.sql` ausführen. Sie erstellt die Tabellen und privaten Transaktionsfunktionen. Beispielbestand für Pinks Chaos ist 1; ein erneutes Ausführen füllt verkaufte Stücke nicht wieder auf.

Die Secret-/service_role-API-Key aus Supabase ausschliesslich als `NUXT_SUPABASE_SECRET_KEY` in Vercel bzw. der ignorierten lokalen `.env` speichern. Keine anon/publishable-Key nötig. Keine Secret-Key im Browser, in Content oder GitHub speichern.

Alle drei Tabellen haben RLS. Anonyme und angemeldete Browsernutzer haben keine Tabellen- oder Funktionsrechte. Der Server greift mit seinem privaten Schlüssel zu. Der Verwaltungsbereich prüft zusätzlich die signierte Studio-Sitzung und Lisas erlaubte GitHub-E-Mail.

## Stripe einrichten

Zuerst mit Testschlüsseln arbeiten. In Vercel bzw. `.env`:

- `NUXT_STRIPE_SECRET_KEY`: Stripe Secret-Key
- `NUXT_STRIPE_WEBHOOK_SECRET`: Signing Secret des Webhook-Endpunkts
- `NUXT_PUBLIC_SITE_URL`: `https://beeeda.ch`; lokal entsprechend `http://localhost:8001`

Stripe Webhook-URL: `https://beeeda.ch/api/stripe/webhook`.
Diese Ereignisse auswählen:
`checkout.session.completed`,
`checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`,
`checkout.session.expired`.

Die Checkout-Session übernimmt die im Stripe Dashboard aktivierten und für die Bestellung geeigneten Zahlungsarten. TWINT muss dort separat aktiviert und für das Konto verfügbar sein. Stripe sammelt E-Mail und Lieferadresse; erlaubtes Lieferland ist CH. Zahlungsdaten werden nicht in Beeeda gespeichert.

Die Rückkehr auf die Bestätigungsseite allein bedeutet keine Zahlung. Erst ein signiertes Stripe-Ereignis oder der serverseitige Abgleich mit Stripe bestätigt den Verkauf. Preis und Versand stammen vom Server, nicht vom Browser. Bestellungen speichern ihre eigenen Preisschnappschüsse.

Lokal: Nach Hinterlegen des `sk_test_`-Schlüssels `pnpm stripe:listen` in einem separaten Terminal laufen lassen. Das offizielle Stripe-CLI-Werkzeug leitet die vier Ereignisse an Port 8001 weiter. Das Startskript speichert den Webhook-Schlüssel geschützt in `.env` und setzt die Rückkehradresse auf `http://localhost:8001`, ohne Schlüssel auszugeben. Den Nuxt-Entwicklungsserver danach neu starten. Die Weiterleitung muss während des Tests laufen. In Vercel werden später ein eigener Webhook-Schlüssel und `https://beeeda.ch` verwendet.

Reservierungen bleiben ungefähr 35 Minuten zahlbar. Sie werden erst nach bestätigtem Ablauf bzw. Scheitern freigegeben. Bei einem unklaren Netzwerkfehler bleiben Stücke aus Sicherheitsgründen reserviert. Erneutes Starten mit derselben Anfrage-ID gewinnt die ursprüngliche Session zurück. Ein älterer, nicht zuordenbarer Fall muss geprüft werden; niemals blind den Bestand erhöhen.

## Abgleich einrichten

`/api/maintenance/reconcile` gleicht offene Reservierungen mit Stripe ab. Zugriff nur mit Header `Authorization: Bearer <NUXT_CRON_SECRET>`. Einen langen zufälligen Wert als private Umgebungsvariable setzen.

Für den Livebetrieb regelmässig aufrufen, etwa alle 10 Minuten über einen Scheduler. Vercel Cron benötigt je nach Tarif eine geeignete Frequenz. Es ist bewusst noch kein kostenpflichtiger Scheduler gebucht. Stripe-Webhooks geben normale abgelaufene Sessions unmittelbar frei; der Abgleich hilft bei unterbrochenen Rückmeldungen. Alte unklare Fälle werden als notwendige manuelle Prüfung im Serverlog gemeldet.

## Nuxt Studio: nur dein GitHub-Konto

Die installierte Nuxt-Studio-Version ist 1.7.x und verwendet die `STUDIO_GITHUB_…`-Variablen (die neuere Online-Dokumentation kann andere Namen zeigen). GitHub OAuth App erstellen:

- Homepage URL: `https://beeeda.ch`
- Callback: `https://beeeda.ch/__nuxt_studio/auth/github`

Für den lokalen Anmeldetest zusätzlich `http://localhost:8001/__nuxt_studio/auth/github` als Callback hinzufügen. GitHub unterstützt mehrere Callback-URLs pro OAuth-App. Für eine Vercel-Vorschau wird deren exakte Callback-Adresse ebenfalls ergänzt. Client ID und Client Secret in der lokalen `.env` speichern; private Schlüssel nicht ins Repository kopieren.

Variablen in Vercel **vor dem Build** setzen:
`STUDIO_GITHUB_CLIENT_ID`,
`STUDIO_GITHUB_CLIENT_SECRET`,
`STUDIO_GITHUB_MODERATORS` = exakt deine primäre GitHub-E-Mail.

Studio wird in Produktion nur eingebunden, wenn alle drei Werte gesetzt sind. Die erlaubte E-Mail ist noch einzutragen; niemand anderes bekommt darüber Zugang. GitHub-Rechte für das Beeeda-Repository sind zusätzlich erforderlich. Bei OAuth-App-Anlage musst du die GitHub-Berechtigung selbst bestätigen.

Vercel erkennt Repository und Branch aus seinen CI-Variablen und bevorzugt diese vor der manuellen Konfiguration. Der Projekt-Produktionsbranch muss deshalb mit dem gewünschten Studio-Branch übereinstimmen. Aktuell ist `branch1` für die Umstellung vorgesehen; nach Zusammenführen in `main` die Konfiguration entsprechend ändern.

## Vercel

Framework Nuxt, Node.js 24, Build `pnpm build`, Installation `pnpm install --frozen-lockfile`. Kein manuelles Output-Verzeichnis setzen. Domain bleibt `beeeda.ch`; ihre öffentlichen Nameserver liegen inzwischen bei Vercel. Erst als Preview testen, bevor die neue Anwendung veröffentlicht wird. Der alte Branch `main` enthält kein Nuxt-Buildskript; ein erneuter Build dieses Branches mit den neuen Einstellungen schlägt deshalb fehl.

Für einen kommerziellen Shop ist Vercel Hobby laut den [Tarifbedingungen](https://vercel.com/docs/plans/hobby) nicht geeignet. Vor dem Livebetrieb Pro oder eine passende Hosting-Alternative wählen. Hobby erlaubt den automatischen Abgleich nur einmal täglich; die vorgesehene Frequenz von zehn Minuten benötigt einen geeigneten Tarif/Scheduler. Eine kostenpflichtige Buchung ist noch nicht erfolgt.

Umgebungsvariablen stehen vollständig in `.env.example`. Lokale `.env` bleibt ignoriert. Produktions- und Testschlüssel getrennt halten.

## Noch für den Livebetrieb zu erledigen

Stand 13. Oktober 2026: Studio-Anmeldung und Bearbeitung funktionieren in der Vercel-Vorschau. Eine Beschreibung im Entwurf Produkt 02 wurde über Studio auf `branch1` veröffentlicht und nach dem automatischen Deployment wieder angezeigt. Numerische Produktfelder verwenden `multipleOf(1)` statt JSON-Schema-Typ `integer`, da Nuxt Content diesen sonst als Text behandelt und Studio falsche Konflikte erkennt. Alte Studio-Entwürfe im Browser können den Konflikt nach einem Deployment weiter anzeigen; ein frischer Bearbeitungsstand wurde erfolgreich geprüft.

Ein separates Supabase-Projekt **Beeeda Live** ist angelegt und das Schema eingerichtet. Serverzugriff ist geprüft; die Datenbank enthält keine Bestellungen. Der initiale Bestand von Pinks Chaos ist durch die Migration 1 und muss vor dem Start mit dem tatsächlichen Bestand abgeglichen werden. Die Live-Datenbankwerte wurden laut Lisa für Vercel Production gespeichert. Preview und lokale Tests bleiben beim bisherigen Testprojekt. `.env.vercel-live` ist eine private, ignorierte Hilfsdatei für die Live-Einstellungen; keine Test-Zahlungsschlüssel übernehmen.

Stripe Live ist noch nicht aktiviert: Lisa benötigt ihr Handy zum Abschluss der Verifizierung. Live-Schlüssel, Live-Webhook, TWINT-Freischaltung und ein echter abschliessender Zahlungstest bleiben offen. Die automatische Abgleichroute existiert, aber ein Scheduler ist noch nicht aktiv. Am 13. Oktober wurden öffentlich keine MX-Einträge für `beeeda.ch` gefunden; die Kontaktadresse muss vor dem Start empfangsbereit eingerichtet und getestet werden.

OAuth verbinden, Zugangsschlüssel und einen eigenen Stripe-Webhook in der Vercel-Vorschau hinterlegen, dort den vollständigen Kaufprozess erneut testen und vor der Veröffentlichung die tatsächlichen Anfangsbestände sowie Live-Zahlungen bestätigen. Der lokale CLI-Webhook-Schlüssel wird nicht für Vercel wiederverwendet.

Stand 12. Oktober 2026: Supabase-Schema ist eingerichtet, und eine lokale TWINT-Testzahlung über CHF 51.60 wurde in Stripe und Supabase bestätigt. Der Bestand von Pinks Chaos sank von 1 auf 0, das Produkt ist als verkauft markiert und der Warenkorb wurde geleert. Der erste abgebrochene Checkout steht auf `expired`. GitHub-Zugriff ist auf die von Lisa bestätigte E-Mail vorbereitet; OAuth-Schlüssel und Vercel-Anbindung fehlen noch. Vor echten Verkäufen die tatsächlichen Bestände bestätigen: Der aktuelle Bestand 0 stammt aus dem Test. Noch keine Live-Zahlung durchgeführt.

Die Geschäftsadresse ist Lisa Steiger, Birkenstrasse 6a, 9200 Gossau. `hi@beeeda.ch` muss noch empfangsbereit sein. Eigene Bestell-/Versand-E-Mails sind noch nicht angeschlossen; Stripe-Zahlungsbelege lassen sich im Dashboard aktivieren. Versandbearbeitung und Erstattungen erfolgen zunächst über Supabase-Verwaltung/Stripe Dashboard; eine Erstattung füllt den Bestand nicht automatisch auf.
