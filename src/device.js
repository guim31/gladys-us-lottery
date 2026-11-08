// -----------------------------------------------------------------------------
// One device per game ("Powerball", "Mega Millions"): the last draw, the next
// one, and, when the user entered lines in the configuration, how the best of
// them did. Read in the dashboard and in scene conditions ("only continue if
// there is a draw today", "prize tier is 1"). Every feature shares its type
// with another one: Gladys shows the generic label of the type instead of the
// feature name when a feature is alone of its type.
// -----------------------------------------------------------------------------

import {
  GAMES,
  MAX_GRIDS,
  TIERS,
  checkGrids,
  formatBalls,
  nextDraw,
  parseGrids,
  tierBalls,
} from './games.js';
import { NAMES, STATE_TEXT, TIER_TEXT, ballsLabel } from './i18n.js';
import { formatDate, formatInstant, localDate } from './time.js';

const TEXT = { category: 'text', type: 'text', min: 0, max: 0 };
const BINARY = { category: 'input', type: 'binary', min: 0, max: 1 };
const COUNT = (max) => ({ category: 'counter-sensor', type: 'integer', min: 0, max });

// Feature keys are forever (Gladys keys history and scenes on them).
export const FEATURES = [
  { key: 'last_draw_date', ...TEXT },
  { key: 'last_numbers', ...TEXT },
  { key: 'power_play', ...TEXT, only: 'powerball' },
  { key: 'double_play_numbers', ...TEXT, only: 'powerball' },
  { key: 'next_draw', ...TEXT },
  { key: 'draw_today', ...BINARY },
  { key: 'draw_tomorrow', ...BINARY },
  { key: 'best_matches', ...COUNT(6), lines: true },
  { key: 'best_tier', ...COUNT(TIERS), lines: true },
  { key: 'winning_lines', ...COUNT(MAX_GRIDS), lines: true },
  { key: 'lines_result', ...TEXT, lines: true },
];

/** The ids of a game's device: the same for everyone, one per Gladys. */
export function deviceIds(gladys, gameKey) {
  return gladys.externalIds('game', gameKey);
}

/** The lines of the configuration for a game: { grids, invalid }. */
export function linesOf(config, gameKey) {
  const game = GAMES[gameKey];
  return parseGrids(config[game.configKey], game);
}

export function buildDevice(gladys, config, gameKey) {
  const ids = deviceIds(gladys, gameKey);
  const names = NAMES[config.language];
  const hasLines = linesOf(config, gameKey).grids.length > 0;
  return {
    name: GAMES[gameKey].name,
    external_id: ids.device,
    should_poll: false,
    params: [{ name: 'source', value: 'data.ny.gov' }],
    features: FEATURES.filter(
      (feature) => (!feature.only || feature.only === gameKey) && (!feature.lines || hasLines),
    ).map(({ key, category, type, min, max }) => ({
      name: names[key],
      external_id: ids.feature(key),
      category,
      type,
      min,
      max,
      read_only: true,
      has_feedback: false,
    })),
  };
}

/** The best result of the lines, as text: "4 + Powerball (rang 3)" / "Aucun gain". */
export function bestLabel(language, gameKey, check) {
  if (!check.best || check.bestTier === 0) {
    return TIER_TEXT[language].noPrize;
  }
  return `${ballsLabel(language, GAMES[gameKey].bonusName, tierBalls(check.bestTier))} (${TIER_TEXT[language].tier(check.bestTier)})`;
}

/** What a line won: "3 + Powerball (rang 5)" or "2 bons numéros". */
export function lineLabel(language, gameKey, result, matchedText) {
  if (result.tier === 0) {
    return matchedText(result.matches);
  }
  return `${ballsLabel(language, GAMES[gameKey].bonusName, tierBalls(result.tier))} (${TIER_TEXT[language].tier(result.tier)})`;
}

/**
 * The states of the devices at an instant. A value the integration does not
 * know (no draw read yet) is left out, never guessed.
 * @param {object} gladys the SDK client
 * @param {object} config a normalized configuration
 * @param {object} draws { powerball, mega_millions } (parsed draws or null)
 * @param {{ now: number, timeZone: string }} at
 */
export function buildStates(gladys, config, draws, { now, timeZone }) {
  const language = config.language;
  const text = STATE_TEXT[language];
  const states = [];
  const today = localDate(now, timeZone);
  const tomorrow = localDate(now + 24 * 60 * 60 * 1000, timeZone);
  for (const gameKey of Object.keys(GAMES)) {
    const game = GAMES[gameKey];
    const ids = deviceIds(gladys, gameKey);
    const number = (key, value) => {
      states.push({ device_feature_external_id: ids.feature(key), state: value });
    };
    const string = (key, value) => {
      states.push({ device_feature_external_id: ids.feature(key), text: String(value) });
    };

    // The next draws follow the clock, whatever the data.
    const next = nextDraw(game, now);
    const after = nextDraw(game, next.at);
    string('next_draw', formatInstant(next.at, language, timeZone));
    const drawDays = [next, after].map((draw) => localDate(draw.at, timeZone));
    number('draw_today', Number(drawDays.includes(today)));
    number('draw_tomorrow', Number(drawDays.includes(tomorrow)));

    const draw = draws[gameKey];
    if (!draw) {
      continue;
    }
    string('last_draw_date', formatDate(draw.date, language, 'short'));
    string('last_numbers', formatBalls(draw));
    if (gameKey === 'powerball') {
      // "-" when the row has no Power Play: a text state is never empty.
      string('power_play', draw.multiplier ? `×${draw.multiplier}` : '-');
      if (draw.doublePlay) {
        string('double_play_numbers', formatBalls(draw.doublePlay));
      }
    }
    const { grids } = linesOf(config, gameKey);
    if (grids.length > 0) {
      const check = checkGrids(draw, grids);
      number('best_matches', check.bestMatches);
      number('best_tier', check.bestTier);
      number('winning_lines', check.winning);
      string(
        'lines_result',
        check.bestTier > 0
          ? text.won(
              ballsLabel(language, game.bonusName, tierBalls(check.bestTier)),
              TIER_TEXT[language].tier(check.bestTier),
              check.winning,
              grids.length,
            )
          : text.lost(check.bestMatches, grids.length),
      );
    }
  }
  return states;
}
