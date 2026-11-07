// -----------------------------------------------------------------------------
// The winning numbers published by the New York State Gaming Commission on
// data.ny.gov (Socrata open data, no account, no key): one dataset per game,
// updated the morning after each draw. The service reads the last draw of
// each game once an hour, a few dozen requests a day, well within what
// Socrata grants without an application token.
//
// The parser turns a row into a small plain object: the rest of the
// integration never reads the Socrata fields.
// -----------------------------------------------------------------------------

import { GAMES, WHITE_BALLS } from './games.js';

export const API_BASE = 'https://data.ny.gov/resource';

// The dataset of each game (game keys of src/games.js).
export const DATASETS = {
  powerball: 'd6yy-54nr',
  mega_millions: '5xaw-6ayf',
};

const REQUEST_TIMEOUT_MS = 15_000;
const USER_AGENT = 'gladys-us-lottery (+https://github.com/guim31/gladys-us-lottery)';
// The last few draws: the newest valid one is kept.
const LIMIT = 3;

export class OpenDataError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'OpenDataError';
    this.status = status;
  }
}

/** The URL of the last draws of a game. */
export function drawsUrl(gameKey) {
  const query = new URLSearchParams({ $order: 'draw_date DESC', $limit: String(LIMIT) });
  return `${API_BASE}/${DATASETS[gameKey]}.json?${query}`;
}

/**
 * @param {object} [options]
 * @param {Function} [options.fetch] the global fetch by default (tests inject one)
 */
export function createOpenData({ fetch = globalThis.fetch } = {}) {
  return {
    /** The last draw of a game, parsed (see parseDraw). */
    async lastDraw(gameKey) {
      let response;
      try {
        response = await fetch(drawsUrl(gameKey), {
          headers: { accept: 'application/json', 'user-agent': USER_AGENT },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (err) {
        throw new OpenDataError(`data.ny.gov unreachable: ${err.message}`);
      }
      if (!response.ok) {
        const reason = response.status === 429 ? ' (rate limited)' : '';
        throw new OpenDataError(
          `data.ny.gov answered HTTP ${response.status}${reason}`,
          response.status,
        );
      }
      let rows;
      try {
        rows = await response.json();
      } catch {
        throw new OpenDataError('data.ny.gov answered something else than JSON');
      }
      const draw = Array.isArray(rows)
        ? rows.map((row) => parseDraw(gameKey, row)).find(Boolean)
        : null;
      if (!draw) {
        throw new OpenDataError(`data.ny.gov sent no valid ${GAMES[gameKey].name} draw`);
      }
      return draw;
    },
  };
}

function balls(text) {
  return String(text ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
}

function inRange(ball, max) {
  return Number.isInteger(ball) && ball >= 1 && ball <= max;
}

function validBalls(whites, bonus, game) {
  return (
    whites.length === WHITE_BALLS &&
    whites.every((ball) => inRange(ball, game.whiteMax)) &&
    inRange(bonus, game.bonusMax)
  );
}

/**
 * A row of a dataset as { date, whites, bonus, multiplier, doublePlay }, or
 * null when it does not hold a draw of the current matrix.
 * - Powerball: `winning_numbers` "15 34 41 53 56 21" (the Powerball last),
 *   `multiplier` (Power Play), `double_play_winning_numbers` (same shape);
 * - Mega Millions: `winning_numbers` "27 34 44 53 64", `mega_ball` "01"
 *   (`multiplier`, the Megaplier, stopped in April 2025).
 */
export function parseDraw(gameKey, row) {
  const game = GAMES[gameKey];
  const date = /^(\d{4}-\d{2}-\d{2})/.exec(row?.draw_date ?? '')?.[1];
  if (!date) {
    return null;
  }
  let whites = balls(row.winning_numbers);
  let bonus;
  if (gameKey === 'powerball') {
    bonus = whites.pop();
  } else {
    bonus = balls(row.mega_ball)[0];
  }
  if (!validBalls(whites, bonus, game)) {
    return null;
  }
  whites = [...whites].sort((a, b) => a - b);
  const multiplier = Number(row.multiplier);
  const draw = {
    date,
    whites,
    bonus,
    multiplier: Number.isInteger(multiplier) && multiplier > 1 ? multiplier : null,
    doublePlay: null,
  };
  if (gameKey === 'powerball' && row.double_play_winning_numbers) {
    const double = balls(row.double_play_winning_numbers);
    const doubleBonus = double.pop();
    if (validBalls(double, doubleBonus, game)) {
      draw.doublePlay = { whites: double.sort((a, b) => a - b), bonus: doubleBonus };
    }
  }
  return draw;
}
