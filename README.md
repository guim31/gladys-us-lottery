# Powerball & Mega Millions for Gladys Assistant

An external integration for [Gladys Assistant](https://gladysassistant.com) that follows the two big
American multi-state lotteries: the last Powerball and Mega Millions draws, the next ones in the local
time of Gladys, and, if you play, your lines checked against every draw. Data from the open data of the
State of New York ([data.ny.gov](https://data.ny.gov)): no account, no key.

**For information only: this is not an official source for validating a prize.** Always check your
tickets with the official lottery. Lotteries are forbidden to minors; play responsibly.

Feedback welcome on the [Gladys forum](https://community.gladysassistant.com).

## Features

- **Two devices, "Powerball" and "Mega Millions"**, for the dashboard and scene conditions: last draw
  date, winning numbers, Power Play and Double Play (Powerball), next draw, "draw today" and "draw
  tomorrow"; with your lines, numbers matched by the best line, its prize tier (1 to 9), the winning
  lines and a summary.
- **Dashboard widget "US lotteries"**: last numbers of each game, the result of your lines (detail line by
  line), the next draws.
- **Scene triggers**: "New draw published", "Numbers matched" (tick 3 to 6 for "at least 3") and
  "Winning line" (filter by prize tier), fired once per draw, even across restarts.
- **Scene action**: "Read the last draw", a sentence ready to send.
- Texts in English, French, German and Spanish.

## Requirements

- Gladys Assistant 5.3.0 or later.
- Internet access from Gladys (`data.ny.gov`, HTTPS).

## Installation

1. In Gladys, open **Integrations → Install from GitHub** and enter
   `https://github.com/guim31/gladys-us-lottery`.
2. In the **Configuration** tab, choose the language of the texts and, if you play, type your lines
   (`5 12 23 34 45 + 6; 1 7 19 28 60 + 13`). Save.
3. In the **Discover** tab, add the Powerball and Mega Millions devices; add the **US lotteries** widget
   to a dashboard.

The full user documentation is in [English](docs/en.md), [French](docs/fr.md), [German](docs/de.md)
and [Spanish](docs/es.md).

## How it works

- The integration reads the last draws of both games on data.ny.gov once an hour (every 10 minutes after
  a failure), keeps them in `/data`, and pushes the states itself: Gladys never polls the devices.
- The New York State Gaming Commission publishes the numbers the morning after each draw (New York
  time). A new draw fires the scene triggers once, for a draw of the last four days.
- The next draws come from the official calendar: Powerball on Monday, Wednesday and Saturday at
  10:59 pm ET, Mega Millions on Tuesday and Friday at 11:00 pm ET, shown in the time zone of Gladys.
- Your lines are checked against the nine prize tiers shared by both games (5 + bonus ball down to the
  bonus ball alone).

## Limitations

- No amounts and no jackpot: the jackpot is not in the open data, Power Play and the Mega Millions
  multiplier change the other prizes, and California pays pari-mutuel amounts. Scraping a lottery website
  for them is deliberately not done.
- Lines are checked against the main Powerball draw, not against Double Play.
- An exceptional change of the draw calendar is not known to the integration.
- Developed and tested against the real data.ny.gov answers, without a Gladys instance in production yet:
  feedback welcome.

## Development

Node.js 22+, ESM, no build step. One runtime dependency:
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js).

```bash
npm install
npm test              # node --test, against the SDK's fake Gladys; no network
npm run lint
npm run format:check
npx -y github:GladysAssistant/integration-store --skip-image-check .   # store validator
```

```
index.js              SDK wiring (src/app.js registers the handlers)
src/app.js            every SDK handler -> the service, the "Check" action
src/service.js        the clock: readings, cache, states, scene triggers, status
src/opendata.js       data.ny.gov client and parser
src/games.js          the two games: calendar, prize tiers, lines checked
src/device.js         the two devices and their states
src/widgets.js        "US lotteries" dashboard widget
src/scenes.js         summary sentence, trigger data, "Read the last draw"
src/i18n.js           every text of the code, in four languages
src/time.js           instants in the time zone of Gladys and of New York
src/config.js         DEFAULT_CONFIG (mirrors the manifest) + normalization
src/store.js          JSON files in /data
test/fixtures/        Gladys feature table, recorded answers of data.ny.gov (2026-11-08)
```

To run it outside Gladys:

```bash
GLADYS_HOST_API_URL="http://localhost:1443" \
GLADYS_INTEGRATION_TOKEN="<token>" \
GLADYS_INTEGRATION_SELECTOR="us-lottery" \
LOTTERY_DATA_DIR=./data \
TZ=Europe/Paris \
npm start
```

Releases are made by the **Release** workflow (Actions → Release); never edit the versions by hand. See
[`CLAUDE.md`](CLAUDE.md) for the project rules.

## Credits

- Winning numbers: [Lottery Powerball Winning Numbers](https://data.ny.gov/d/d6yy-54nr) and
  [Lottery Mega Millions Winning Numbers](https://data.ny.gov/d/5xaw-6ayf), New York State Gaming
  Commission, on data.ny.gov (open data).
- Built from the official
  [integration template](https://github.com/GladysAssistant/integration-template-js).

## Disclaimer

This integration is not affiliated with Powerball, Mega Millions, the Multi-State Lottery Association,
the New York Lottery or the New York State Gaming Commission. Powerball and Mega Millions are trademarks
of their owners. The numbers shown are for information only.

## License

[Apache-2.0](LICENSE)
