# Löschfristen aktivieren

Die Dateien sind lokal vorbereitet und getestet. Sie ändern die Live-Datenbank erst, wenn sie im SQL Editor ausgeführt werden. Ein Git-Push installiert diese Datenbankänderungen nicht.

## 1. Funktion installieren

Im Supabase-Projekt **Beeeda Live** (`ymkoljtniduuvstqwnvr`) den SQL Editor öffnen und den gesamten Inhalt von `migrations/202611050001_order_retention.sql` ausführen. Die beiden bisherigen Shop-/Studio-Migrationen müssen installiert sein.

Die Installation löscht keine Bestellungen. Sie erfasst den Zeitpunkt, zu dem eine Bestellung als abgelaufen oder abgebrochen bestätigt wird. Bereits geschlossene Bestellungen bekommen vorsichtshalber den Installationstag als Beginn ihrer 30 Tage; ein alter Erstellungszeitpunkt belegt nicht den Abschlusszeitpunkt.

## 2. Streitfälle sperren

Vor Aktivierung betroffene Bestellungen in der Tabelle `orders` mit `retention_hold = true` markieren. Diese Sperre auch bei späteren Streitfällen oder verlängerten gesetzlichen Aufbewahrungspflichten setzen. Sie gilt unabhängig vom Alter und muss nach Klärung manuell geprüft werden.

## 3. Täglichen Auftrag aktivieren

Anschliessend `activate-order-retention.sql` im gleichen Projekt ausführen. Falls die Erweiterung nicht aktiviert werden kann: unter **Integrations → Cron** `pg_cron` aktivieren und die Datei erneut ausführen.

Der benannte Auftrag läuft täglich um 03:15 UTC. Er löscht pro Lauf höchstens 500 fällige Bestellungen samt Positionen:

- Bestätigt abgelaufen/abgebrochen, ohne Zahlung: nach 30 Tagen ab Abschluss.
- Bezahlt: nach zehn vollständigen Kalenderjahren ab Ende des Jahres des späteren Erstellungs-/Zahlungsdatums (Geschäftsjahr = Kalenderjahr, Zeitzone Zürich).
- Ungeklärte Zahlungszustände (`preparing`, `reserved`), bezahlte Bestellungen ohne Zahlungsdatum und Bestellungen mit Löschsperre: bleiben stehen und müssen nötigenfalls manuell abgeklärt werden.

Das Löschen ist dauerhaft. Es erstellt kein Archiv und kein Backup. Für Geschäftsbelege ist zusätzlich eine geeignete Buchführung/Archivierung nötig; die Shop-Datenbank allein wird dadurch nicht zu einem revisionssicheren Archiv. Stripe-Daten und E-Mails werden nicht mitgelöscht.

Verkaufte Mengen bleiben beim Löschen alter bezahlter Bestellungen ausschliesslich als Summen im Produktbestand erhalten. Kundendaten, Bestellkennung und Positionen werden entfernt. So setzt eine spätere Studio-Bestandsänderung die bereits verkauften Mengen nicht zurück.

## 4. Ausführung kontrollieren

Unter **Integrations → Cron** den Auftrag `beeeda-order-retention` und seine Ausführungshistorie prüfen. Ein pausiertes Projekt führt keine Aufträge aus. Alternativ im SQL Editor:

```sql
select jobname, schedule, command, active from cron.job
where jobname = 'beeeda-order-retention';

select status, return_message, start_time, end_time
from cron.job_run_details
where jobid in (select jobid from cron.job where jobname = 'beeeda-order-retention')
order by start_time desc limit 10;
```

Bei einem Rückstand von mehr als 500 fälligen Bestellungen weitere erfolgreiche Tagesläufe kontrollieren. Der Zahlungsabgleich ist ein separater Vorgang: Dieser Löschauftrag prüft keine Stripe-Zahlungen und gibt keine ungeklärten Reservierungen frei.

Auftrag bei Bedarf anhalten (keine globale Deaktivierung von Cron):

```sql
select cron.unschedule('beeeda-order-retention');
```

## 5. Organisatorische Aufgaben

- Allgemeine Produktanfragen im Mailpostfach sechs Monate nach Abschluss löschen.
- Erforderliche Reklamations-/Rücksendekorrespondenz der Bestellung zuordnen und mit deren Aufbewahrung prüfen.
- Nach bestätigter Aktivierung und Einrichtung der Abläufe den offenen Umsetzungshinweis in beiden Datenschutztexten aktualisieren.

Anleitung für Cron: https://supabase.com/docs/guides/cron
