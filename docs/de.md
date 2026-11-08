# Powerball & Mega Millions

Die Gewinnzahlen der beiden großen amerikanischen Lotterien mehrerer Bundesstaaten, Powerball und Mega
Millions, in Gladys: die letzte Ziehung jedes Spiels, die nächste in deiner Ortszeit und, wenn du spielst, das
Ergebnis deiner Tippreihen. Szenen-Auslöser reagieren auf die Veröffentlichung neuer Zahlen, und ein
Dashboard-Widget fasst alles zusammen.

Die Zahlen stammen aus den offenen Daten des Bundesstaats New York (data.ny.gov), veröffentlicht von der New
York State Gaming Commission. **Die Angaben sind nur informativ: keine amtliche Quelle zur Prüfung von
Gewinnen.** Prüfe deine Lose immer bei der offiziellen Lotterie oder einer Verkaufsstelle.

## Was du brauchst

- Gladys Assistant 5.3.0 oder neuer.
- Internetzugang für Gladys. Kein Konto, kein Schlüssel.

## Konfiguration

### Sprache

Die Sprache der Funktionsnamen und der Sätze für Szenen (standardmäßig Französisch). Die Namen werden beim
Hinzufügen eines Geräts festgelegt: ändere zuerst die Sprache, dann füge die Geräte hinzu.

### Deine Tippreihen

Optional. Gib die Tippreihen ein, die du spielst, ein Feld pro Spiel, getrennt durch ein Semikolon:

- Powerball: 5 Zahlen von 1 bis 69, dann `+` und der Powerball von 1 bis 26, z. B.
  `5 12 23 34 45 + 6; 1 7 19 28 60 + 13`;
- Mega Millions: 5 Zahlen von 1 bis 70, dann `+` und der Mega Ball von 1 bis 24.

Ein Schrägstrich geht statt `+` auch, und sechs Zahlen hintereinander gelten als fünf Zahlen und die
Zusatzkugel. Höchstens 10 Tippreihen pro Spiel. Eine unlesbare Tippreihe erscheint im Verbindungsstatus: die
Schaltfläche **Prüfen** nennt sie.

Mit Tippreihen bekommt jedes Gerät vier weitere Funktionen: Richtige der besten Tippreihe, ihre Gewinnklasse,
die Zahl der gewinnenden Tippreihen und eine Zusammenfassung als Text. Klicke im Tab „Entdecken“ auf
**Aktualisieren**, um sie einem schon hinzugefügten Gerät zu geben.

## Die Geräte

Im Tab „Entdecken“ erscheinen zwei Geräte, **Powerball** und **Mega Millions**:

| Funktion                       | Wert                                                      |
| ------------------------------ | --------------------------------------------------------- |
| Datum der letzten Ziehung      | z. B. `Mi., 4. Nov.`                                      |
| Letzte Gewinnzahlen            | z. B. `15 34 41 53 56 + 21`                               |
| Power Play (Powerball)         | der Multiplikator der letzten Ziehung, z. B. `×2`         |
| Double-Play-Zahlen             | die Double-Play-Ziehung des Powerball                     |
| Nächste Ziehung                | in der Zeitzone von Gladys, z. B. `Di., 10. Nov. · 04:59` |
| Ziehung heute / morgen         | 1 oder 0, in der Zeitzone von Gladys                      |
| Richtige (beste Tippreihe)     | 0 bis 6, Powerball oder Mega Ball inklusive               |
| Gewinnklasse (beste Tippreihe) | 1 (Jackpot) bis 9, 0 ohne Gewinn                          |
| Gewinnende Tippreihen          | wie viele deiner Tippreihen gewinnen                      |
| Ergebnis deiner Tippreihen     | z. B. `3 + Powerball (Klasse 5) · 1/2 Tippreihe gewinnt`  |

Die neun Gewinnklassen sind in beiden Spielen gleich:

| Klasse | Richtige                  |
| ------ | ------------------------- |
| 1      | 5 + Zusatzkugel (Jackpot) |
| 2      | 5                         |
| 3      | 4 + Zusatzkugel           |
| 4      | 4                         |
| 5      | 3 + Zusatzkugel           |
| 6      | 3                         |
| 7      | 2 + Zusatzkugel           |
| 8      | 1 + Zusatzkugel           |
| 9      | nur Zusatzkugel           |

Es wird kein Betrag angezeigt: der Jackpot steht nicht in den offenen Daten, Power Play und der
Mega-Millions-Multiplikator ändern die anderen Gewinne, und Kalifornien zahlt Quoten nach dem Totalisatorprinzip.

## Dashboard-Widget

Das Widget **US-Lotterien** zeigt die letzten Zahlen jedes Spiels, ein Abzeichen mit dem besten Ergebnis deiner
Tippreihen (tippe auf ein Spiel für das Detail je Tippreihe), die nächsten Ziehungen und einen kurzen Hinweis.
Seine Einstellungen wählen die Spiele und blenden das Ergebnis der Tippreihen, die nächsten Ziehungen oder den
Hinweis aus.

## Szenen-Auslöser

Jeder Auslöser lässt sich auf ein Spiel beschränken und löst einmal pro Ziehung aus, bei der Veröffentlichung
der Zahlen, für eine Ziehung der letzten vier Tage.

### Neue Ziehung veröffentlicht

Bei jeder neuen Ziehung. Variablen: das Spiel, der Zusammenfassungssatz (fertig zum Senden), das Datum, die
Zahlen, die Zusatzkugel, Power Play und das Ergebnis deiner Tippreihen.

### Richtige Zahlen

Bei jeder neuen Ziehung, wenn du Tippreihen eingegeben hast, mit der Zahl der Richtigen deiner besten Tippreihe
(0 bis 6). Wähle 3, 4, 5 und 6 für „mindestens 3“.

### Gewinnende Tippreihe

Wenn eine deiner Tippreihen eine Gewinnklasse erreicht. Der Filter kann nur einige Klassen behalten (1 und 2
für die großen Gewinne).

## Szenen-Aktion

**Letzte Ziehung lesen** liefert einen fertigen Satz („Die Powerball-Zahlen vom Mittwoch, 4. November: …“) mit
dem Ergebnis deiner Tippreihen und der nächsten Ziehung, dazu die Zahlen, das Datum, die nächste Ziehung, die
Richtigen und die Gewinnklasse für die folgenden Aktionen.

## Beispiele für Szenen

- Auslöser **Neue Ziehung veröffentlicht**, dann die Variable `summary` in einer Nachricht senden.
- Auslöser **Gewinnende Tippreihe**, Klassen 1 bis 4: Benachrichtigung „Prüfe dein Los!“.
- Jeden Tag um 18 Uhr, Bedingung **Ziehung morgen** = 1 bei Powerball (in Europa fällt die Ziehung in die
  Nacht), oder **Ziehung heute** = 1 in Amerika: eine Erinnerung zum Spielen.

## Fehlerbehebung

- **Keine Zahlen**: die Integration liest data.ny.gov einmal pro Stunde (alle 10 Minuten nach einem Fehler).
  **Prüfen** liest sofort neu; der Bericht sagt, ob data.ny.gov geantwortet hat.
- **Eine Tippreihe wird nicht verstanden**: prüfe das Format (5 Zahlen, `+`, die Zusatzkugel) und die Bereiche.
- **Neue Funktionen fehlen**: Tippreihen, die nach dem Gerät hinzugekommen sind, brauchen **Aktualisieren** im
  Tab „Entdecken“.
- **Protokolle**: `LOG_LEVEL=debug` zeigt jede Abfrage.

## Grenzen

- data.ny.gov veröffentlicht die Zahlen am Morgen nach der Ziehung (Ortszeit New York): sie erreichen Gladys
  einige Stunden nach der Ziehung, innerhalb einer Stunde nach ihrer Veröffentlichung.
- Die Ziehungszeiten folgen dem offiziellen Kalender (Powerball: Montag, Mittwoch, Samstag um 22:59 Uhr
  Eastern Time; Mega Millions: Dienstag und Freitag um 23:00 Uhr). Eine außergewöhnliche Änderung ist nicht
  bekannt.
- Deine Tippreihen werden mit der Hauptziehung des Powerball verglichen, nicht mit Double Play.
- Keine Beträge, kein Jackpot: siehe oben.
- Rückmeldungen sind im Forum oder in den GitHub-Issues willkommen.

## Daten und Danksagungen

Daten: [Lottery Powerball Winning Numbers](https://data.ny.gov/d/d6yy-54nr) und
[Lottery Mega Millions Winning Numbers](https://data.ny.gov/d/5xaw-6ayf), New York State Gaming Commission,
auf data.ny.gov. Einmal pro Stunde und Spiel gelesen, ohne Anwendungstoken. Diese Integration ist weder mit
Powerball, Mega Millions, der Multi-State Lottery Association noch mit der New York Lottery verbunden.

## Verantwortungsvolles Spielen

Lotterien sind für Minderjährige verboten (18 Jahre oder älter, je nach Bundesstaat). Spiele nur, was du dir
leisten kannst zu verlieren. Wenn Glücksspiel zum Problem wird, ruf in den USA 1-800-GAMBLER an, in
Deutschland die BZgA-Hotline 0800 1 37 27 00.
