# Produkte, Bestand und Versand

In `products.js` stehen die Produktdaten und Versandpreise (in Rappen).

- `stock: 1`: Einzelstück. Für mehrere Exemplare beispielsweise `stock: 5`.
- `shippingClass: "small"`: CHF 2 Versand für ein Stück.
- `shippingClass: "large"`: CHF 9 Versand für ein Stück.
- Ab insgesamt zwei Stück kostet der Versand immer CHF 9, auch beim gleichen Produkt.
- `shippingRates` enthält die beiden zentralen Preise: 200 und 900 Rappen.

`stock` ist der Gesamtbestand inklusive bereits verkaufter Exemplare. Die Datenbank zieht Verkäufe und aktive Reservierungen davon ab. Bei einer Nachlieferung von drei Stück den Gesamtbestand um drei erhöhen. Die verfügbare Menge prüft der Server beim Reservieren; der Warenkorb allein reserviert nichts.

Nach Änderungen an `products.js` den Node-Server neu starten. Neue Produkte müssen in `products` aufgenommen werden; Produktseiten und Bilder werden separat angelegt. Bestehende Bestellungen behalten ihre gespeicherten Preise und Versandkosten.

Der Checkout liefert nur in die Schweiz. TWINT ist noch nicht angeschlossen; die Zahlungsbestätigung ist weiterhin eine lokale Simulation.
