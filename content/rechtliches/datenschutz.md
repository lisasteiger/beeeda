# Datenschutzerklärung Beeeda

**Arbeitsentwurf vom 5. November 2026 – noch nicht zur Veröffentlichung freigegeben.**

Die mit **[OFFEN]** markierten Angaben müssen vor der Veröffentlichung ergänzt werden. Grundlage ist der aktuell geprüfte Shop-Code. Einstellungen der Dienstanbieter und die Abläufe ausserhalb der Website sind noch zu bestätigen.

## 1. Verantwortliche Person

Verantwortlich für die Bearbeitung von Personendaten durch Beeeda ist:

Lisa Steiger – Beeeda  
Bedastrasse 24  
9200 Gossau, Schweiz  
E-Mail: hi@beeeda.ch

Diese Erklärung beschreibt die Bearbeitung von Personendaten beim Besuch unseres Onlineshops, bei Bestellungen und bei der Kontaktaufnahme. Wir beachten das schweizerische Datenschutzgesetz (DSG).

## 2. Besuch der Website

Die Website wird über Vercel bereitgestellt. Beim Abruf werden technische Daten wie IP-Adresse, Zeitpunkt, angeforderte Adresse sowie Browser- und Geräteinformationen verarbeitet. Sie dienen der Auslieferung der Website, der Sicherheit und der Fehlerbehebung.

Für serverseitige Funktionen ist im Vercel-Projekt die Standardregion Washington, D.C., USA (`iad1`) eingestellt. Statische Inhalte werden über das weltweite Auslieferungsnetz von Vercel bereitgestellt. Die eingestellte Function Region bedeutet deshalb nicht, dass sämtliche Daten ausschliesslich an diesem Standort verarbeitet werden.

Vercel wird aktuell im Pro-Tarif mit Observability Plus verwendet. Das Projekt Beeeda ist in diese Zusatzoption einbezogen. Vercel nennt dafür eine Aufbewahrung von Runtime-Logs von 30 Tagen. Diese Frist betrifft die Runtime-Logs und ist keine Zusicherung, dass sämtliche bei Vercel verarbeiteten Daten danach gelöscht werden.

Informationen zur standardmässigen Aufbewahrung: https://vercel.com/docs/logs/runtime

Vercel Web Analytics ist aktuell nicht aktiviert. Vercel Speed Insights ist im Shop derzeit nicht eingebunden und wird nicht zur Erfassung von Leistungsdaten genutzt.

Im Vercel-Projekt sind keine Drains eingerichtet. Über diese Funktion werden daher keine Protokolle an zusätzliche Empfänger weitergeleitet.

Der Anwendungscode protokolliert bei Fehlern unter anderem Bestellkennungen, technische Fehlerarten und Fehlermeldungen von Diensten. Vercel erfasst zusätzlich technische Anfrage- und Betriebsereignisse zur Bereitstellung und Absicherung der Website. Die zuletzt gezeigte Runtime-Ansicht enthielt für die ausgewählten 30 Minuten keine Einträge; daraus folgt keine Abschaltung der Protokollierung.

**[OFFEN: Allfällige weitere Protokollspeicher bleiben zu prüfen. Die bestätigte Runtime-Frist gilt nicht pauschal für alle Sicherheits-, Anfrage- und Betriebsdaten des Anbieters. Für weitere nicht veröffentlichte Fristen ist eine Auskunft von Vercel erforderlich.]**

Weitere Informationen: https://vercel.com/legal/privacy-notice

## 3. Warenkorb und technische Speicherung

Der Shop speichert Produktkennungen und Mengen im lokalen Browserspeicher, damit dein Warenkorb bei einem späteren Besuch erhalten bleibt. Dort werden auch Kennungen bereits abgeschlossener Bestellungen gespeichert, um den Warenkorb nach einem Kauf nicht mehrfach zu verändern. Diese Daten haben im aktuellen Shop keine festgelegte automatische Ablauffrist. Du kannst sie über die Website-Daten deines Browsers löschen.

Im Sitzungsspeicher werden das zuletzt angesehene Produkt und eine Einstellung zur Bestätigungsanimation gespeichert. Diese Daten bestehen normalerweise bis zum Ende der jeweiligen Browser-Sitzung.

Beim Start des Bestellvorgangs verwendet der Shop das Cookie `beeeda-owner`, um Bestellungen deinem Browser zuzuordnen. Seine maximale Laufzeit beträgt 30 Tage. Das Cookie `beeeda-active-order` verweist auf eine laufende Bestellung und hat eine maximale Laufzeit von einem Tag. Die Cookies enthalten keine vollständigen Zahlungsdaten.

Du kannst Cookies und lokale Website-Daten über deinen Browser löschen oder ihre Speicherung einschränken. Dadurch können Warenkorb und Bestellfunktionen eingeschränkt werden.

## 4. Bestellungen und Zahlungen

Für die Abwicklung deiner Bestellung bearbeiten wir insbesondere Name, E-Mail-Adresse, Rechnungs- und Lieferadresse, bestellte Artikel, Mengen, Preise sowie Bestell- und Zahlungsstatus. Wir verwenden diese Angaben für Vertragserfüllung, Lieferung, Rückerstattungen, Kundenservice und die Erfüllung gesetzlicher Pflichten.

Vor dem Wechsel zur Zahlung ist eine ausdrückliche Zustimmung zu den AGB erforderlich. Die zugehörige AGB-Fassung und der serverseitig erfasste Zeitpunkt werden im Bestelldatensatz und in den Metadaten der Zahlungssitzung festgehalten. Die Datenschutzerklärung wird vor der Zahlung verlinkt; ihre Kenntnisnahme wird nicht mit einer Einwilligung in zusätzliche Datenbearbeitungen gleichgesetzt.

Die Zahlung erfolgt über Stripe. Deine Zahlungsangaben gibst du auf der Zahlungsseite von Stripe ein. Der Beeeda-Shop speichert keine vollständigen Kreditkartennummern oder Kartenprüfcodes. Wir erhalten die für die Bestellabwicklung erforderlichen Kontakt-, Adress- und Zahlungsstatusdaten. Stripe verarbeitet auch Daten zur Zahlungssicherheit und Betrugsprävention und handelt für bestimmte Zwecke in eigener Verantwortung.

Weitere Informationen: https://stripe.com/privacy

Bestell-, Reservierungs- und Bestandsdaten werden in einer Datenbank bei Supabase verarbeitet. Bei bestätigten Zahlungen werden dort auch die vom Zahlungsdienst übermittelten Kontakt- und Lieferangaben gespeichert.

Die Datenbank des Live-Shops befindet sich im Supabase-Projekt «Beeeda Live» in der Region West EU (Irland, `eu-west-1`). Das Projekt verwendet aktuell den Free-Tarif. In diesem Tarif sind gemäss der Backup-Übersicht des Live-Projekts keine geplanten Projekt-Backups enthalten.

Aktuell werden von Beeeda keine eigenen Datenbankexporte oder Sicherungskopien angelegt. Im geprüften Shop-Code ist ebenfalls keine automatische Erstellung solcher Sicherungskopien eingerichtet.

Die festgelegten Aufbewahrungsfristen und der noch offene Stand ihrer Umsetzung sind in Abschnitt 8 beschrieben. Die belegten Angaben zu internationalen Bearbeitungen und die verbleibende Kontoprüfung stehen in Abschnitt 7.

Weitere Informationen: https://supabase.com/privacy

Der Versand erfolgt mit der Schweizerischen Post. Sie erhält die für die Zustellung erforderlichen Empfänger- und Adressdaten.

Die Buchhaltung wird von Lisa Steiger selbst geführt. Eine externe Treuhand oder Buchhaltungssoftware wird dafür nach aktuellem Stand nicht eingesetzt.

## 5. Kontakt und Rücksendungen

Wenn du uns per E-Mail kontaktierst, bearbeiten wir deine E-Mail-Adresse, den Nachrichteninhalt und die von dir mitgeteilten Angaben, um deine Anfrage zu beantworten. Beim Rücksendeformular wird eine E-Mail in deinem E-Mail-Programm vorbereitet. Die Nachricht wird erst versendet, wenn du sie dort abschickst.

Für allgemeine Produktanfragen ist eine Löschung sechs Monate nach Abschluss der Anfrage vorgesehen. Korrespondenz zu Reklamationen und Rücksendungen wird mit der zugehörigen Bestellung aufbewahrt, soweit sie als Nachweis erforderlich ist.

Für das E-Mail-Postfach hi@beeeda.ch nutzen wir Hostpoint AG, Schweiz. Hostpoint verarbeitet dabei die für den E-Mail-Betrieb erforderlichen Nachrichten- und technischen Verbindungsdaten. Die E-Mail-Daten werden nach Angaben von Hostpoint auf Servern in der Schweiz gespeichert. Das Postfach wird nicht an eine andere E-Mail-Adresse weitergeleitet.

Informationen zum Speicherort: https://www.hostpoint.ch/email/

Weitere Informationen: https://www.hostpoint.ch/hostpoint/kontakt-agb.html#datenschutz

**[OFFEN: Die regelmässige Löschung im E-Mail-Postfach organisatorisch umsetzen. Der Stand der Prüfung internationaler Bearbeitungen ist in Abschnitt 7 beschrieben.]**

## 6. Google Fonts und externe Links

Die Schriftart wird über Google Fonts geladen. Dein Browser stellt dafür eine Verbindung zu Google her; dabei werden insbesondere deine IP-Adresse und technische Anfragedaten übermittelt. Dies dient der Darstellung der Schrift.

Weitere Informationen: https://policies.google.com/privacy

Die Website enthält Links zu Instagram und zu anderen Websites. Beim Anklicken verlässt du unseren Shop. Für die Bearbeitung auf der jeweiligen Zielseite gilt deren Datenschutzerklärung.

Beeeda nutzt Instagram für Werbung. Im Shop ist kein Meta-Pixel eingerichtet. Über ein solches Pixel werden daher keine Besuche oder Käufe aus dem Shop an Meta übermittelt. Bei der Nutzung von Instagram gelten die Datenschutzinformationen von Meta.

Weitere Informationen: https://privacycenter.instagram.com/policy/

Beeeda versendet keinen Newsletter.

Vercel Web Analytics ist nicht aktiviert. Vercel Speed Insights ist nicht in den Shop eingebunden; die Projektansicht zeigt die noch auszuführenden Einrichtungsschritte. Im geprüften Anwendungscode wurden keine weiteren Analyse- oder Werbeskripte gefunden.

**[OFFEN: Allfällige ausserhalb des geprüften Anwendungscodes eingerichtete Verfahren zur Messung von Shop-Besuchen und Käufen bleiben zu bestätigen.]**

## 7. Bearbeitung im Ausland

Beim Einsatz unserer Dienstanbieter können Personendaten ausserhalb der Schweiz verarbeitet werden. Nach den veröffentlichten Anbieterinformationen gilt insbesondere:

- **Vercel (Hosting):** Vercel Inc. hat ihren Sitz in den USA. Die serverseitigen Funktionen dieses Shops sind für Washington, D.C., USA, eingerichtet; die Auslieferung statischer Inhalte erfolgt über ein weltweites Netz. Vercel nennt Standardvertragsklauseln als vertraglichen Schutz für internationale Übermittlungen und erklärt die Teilnahme am Swiss-U.S. Data Privacy Framework. Die Datenschutzvereinbarung gilt laut Vercel auch für Pro-Kunden. Weitere Bearbeitungsorte hängen von Infrastruktur und Unterauftragnehmern ab.
- **Supabase (Datenbank):** Die Datenbank des Shops liegt in Irland. Vertraglicher Anbieter ist Supabase Pte. Ltd. in Singapur; Supabase Inc. in den USA unterstützt Betrieb und Support. Nach Supabase-Angaben sind insbesondere bei Support, Sicherheit und Betriebsdaten Bearbeitungen ausserhalb der gewählten Region möglich. Für Übermittlungen nach Singapur und in die USA nennt Supabase Standardvertragsklauseln; die Datenschutzvereinbarung enthält Ergänzungen für die Schweiz.
- **Stripe (Zahlungen):** Stripe verarbeitet Daten international und nennt unter anderem die USA und Indien als mögliche Bearbeitungsländer. Stripe sieht hierfür unter anderem Standardvertragsklauseln mit Schweizer Anpassungen vor. Stripe, LLC erklärt zudem die Teilnahme am Swiss-U.S. Data Privacy Framework. Die jeweils anwendbare Absicherung hängt vom Empfänger und der Übermittlung ab.
- **Google (Schriftarten):** Beim Laden von Google Fonts werden technische Anfragedaten an Google übermittelt. Google betreibt weltweit Server; eine Bearbeitung in den USA ist möglich. Google LLC erklärt die Teilnahme am Swiss-U.S. Data Privacy Framework. Google nennt ausserdem Standardvertragsklauseln und anerkannte Angemessenheitsmechanismen als Grundlagen internationaler Übermittlungen.
- **Hostpoint (E-Mail):** Die E-Mail-Daten werden laut Hostpoint in der Schweiz gespeichert. Die allgemeine Datenschutzerklärung nennt daneben Bearbeitungen in der Schweiz und im Europäischen Wirtschaftsraum sowie mögliche weitere Länder durch Dienstleister. Für Empfänger ohne angemessenen Datenschutz nennt Hostpoint insbesondere Standardvertragsklauseln mit Schweizer Ergänzungen. Die Schweizer Speicherung des Postfachs ist deshalb keine pauschale Zusicherung, dass sämtliche zugehörigen Bearbeitungen ausschliesslich in der Schweiz erfolgen.

Die Angaben zu Schutzmechanismen beruhen auf den veröffentlichten Unterlagen der Anbieter. Eine Zertifizierung erfasst nur die jeweils teilnehmenden Empfänger und die davon gedeckten Übermittlungen.

Weitere Informationen zu Ländern und Schutzmechanismen:

- Vercel: https://vercel.com/legal/dpa und https://vercel.com/legal/privacy-notice
- Supabase: https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq und https://supabase.com/legal/dpa
- Stripe: https://stripe.com/privacy und https://stripe.com/legal/dta sowie https://stripe.com/legal/data-privacy-framework
- Google: https://policies.google.com/privacy/frameworks?hl=de
- Hostpoint: https://www.hostpoint.ch/email/ und https://www.hostpoint.ch/hostpoint/kontakt-agb.html#datenschutz

Die veröffentlichte Vercel-Datenschutzvereinbarung erfasst Pro-Kunden und wird nach ihrem Wortlaut mit dem zugrunde liegenden Vertrag beziehungsweise ihrer Unterzeichnung verbindlich. Die aktuelle Supabase-Datenschutzvereinbarung ist nach ihrem Wortlaut Bestandteil der Nutzungsbedingungen. Auch Stripe bezieht seine Datenschutzvereinbarung in den Dienstleistungsvertrag ein. Diese Vertragsmechanismen sind damit öffentlich belegt; abweichende individuelle Vereinbarungen oder ältere, für das jeweilige Konto massgebliche Fassungen wurden nicht eingesehen.

**[OFFEN – ANBIETERPRÜFUNG: Die für die tatsächlich eingesetzten Leistungen relevanten weiteren Unterauftragnehmer und Empfängerstaaten sind noch abschliessend zu dokumentieren. Die DPF-Teilnahme wurde anhand der Anbietererklärungen belegt; eine unabhängige Prüfung aktueller Zertifizierungseinträge im DPF-Register konnte über die zugängliche Webansicht nicht abgeschlossen werden. Individuell abweichende Verträge wurden nicht eingesehen. Diese verbleibende Anbieterprüfung erfordert keine Weitergabe geheimer Zugangsdaten durch Beeeda.]**

## 8. Aufbewahrung und Datensicherheit

Wir bewahren Personendaten so lange auf, wie sie für den jeweiligen Zweck erforderlich sind oder gesetzliche Aufbewahrungspflichten bestehen. Anschliessend werden sie gelöscht oder anonymisiert, soweit keine berechtigten Gründe für eine weitere Aufbewahrung bestehen.

Für Beeeda sind folgende Fristen festgelegt:

- Bezahlte Bestellungen und die erforderlichen Rechnungs- und Buchungsbelege: zehn Jahre ab Ende des betreffenden Geschäftsjahres. Die Aufbewahrung wird auf die dafür notwendigen Angaben beschränkt.
- Abgebrochene oder abgelaufene Bestellungen ohne Zahlung: Löschung 30 Tage nach bestätigtem Abbruch oder Ablauf der Zahlungssitzung. Ungeklärte Zahlungszustände werden zuerst abgeklärt.
- Allgemeine Produktanfragen: Löschung sechs Monate nach Abschluss der Anfrage.
- Reklamationen und Rücksendungen: Aufbewahrung mit der zugehörigen Bestellung, soweit die Korrespondenz als Nachweis erforderlich ist.

Bei laufenden Streitfällen oder weiteren gesetzlichen Aufbewahrungspflichten können erforderliche Daten länger aufbewahrt werden.

Für diese Löschung ist im Live-Projekt ein täglicher Datenbankauftrag eingerichtet und aktiviert. Ungeklärte Zahlungen und Bestellungen mit gesetzter Löschsperre werden von der vorbereiteten Löschfunktion ausgenommen. Verkaufte Mengen bleiben ohne Bestell- oder Kundenzuordnung für die Bestandsführung erhalten.

**[OFFEN – KONTROLLE: Die Aktivierung des täglichen Auftrags ist im Live-Dashboard bestätigt; die erfolgreiche erste Ausführung und damit die Installation der aufgerufenen Funktion im Live-Projekt sind noch anhand der Ausführungshistorie zu überprüfen. Die geeignete Archivierung erforderlicher Geschäftsbelege und die regelmässige Löschung von Kontaktanfragen müssen organisatorisch eingerichtet werden. Aufbewahrungsfristen technischer Protokolle bleiben zu klären. Weitere direkt in Supabase eingerichtete Aufträge wurden nicht geprüft.]**

Die Website verwendet HTTPS zur verschlüsselten Übertragung. Der Zugriff auf Bestelldaten im Shop wird technisch beschränkt. Ein vollständiger Schutz vor sämtlichen Risiken lässt sich nicht garantieren.

## 9. Deine Rechte

Du kannst im Rahmen des anwendbaren Rechts Auskunft über die Bearbeitung deiner Personendaten und die Berichtigung unrichtiger Daten verlangen. Je nach Voraussetzung stehen dir weitere Rechte zu, beispielsweise auf Löschung, auf Herausgabe oder Übertragung von Daten oder auf Widerspruch gegen eine Bearbeitung. Gesetzliche Aufbewahrungspflichten können einer Löschung entgegenstehen.

Wende dich dazu an hi@beeeda.ch. Soweit erforderlich, prüfen wir deine Identität, bevor wir Daten herausgeben oder ändern. Du kannst dich auch an den Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten wenden: https://www.edoeb.admin.ch

## 10. Änderungen

Wir passen diese Datenschutzerklärung an, wenn sich unsere Datenbearbeitung oder die rechtlichen Anforderungen ändern. Die aktuelle Fassung wird auf der Website mit ihrem Stand veröffentlicht.
