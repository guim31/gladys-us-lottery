// -----------------------------------------------------------------------------
// The two games: their matrix, their draw calendar and their prize tiers, and
// the user's grids checked against a draw. Pure functions, no clock read here.
//
// Powerball: 5 white balls out of 69 and a Powerball out of 26, drawn on
// Monday, Wednesday and Saturday at 10:59 pm Eastern Time.
// Mega Millions: 5 white balls out of 70 and a Mega Ball out of 24 (matrix
// of April 2025), drawn on Tuesday and Friday at 11:00 pm Eastern Time.
// Both have the same nine prize tiers, from 5 + bonus ball (the jackpot) down
// to the bonus ball alone. Amounts are left out on purpose: the jackpot is not
// in the open data, Power Play and the built-in Mega Millions multiplier change
// the other prizes, and California pays pari-mutuel amounts.
// -----------------------------------------------------------------------------

import { localDate, zonedInstant } from './time.js';

export const EASTERN = 'America/New_York';

// Game keys are forever: they make the external ids and the scene filters.
export const GAMES = {
  powerball: {
    key: 'powerball',
    name: 'Powerball',
    bonusName: 'Powerball',
    whiteMax: 69,
    bonusMax: 26,
    days: [1, 3, 6],
    time: [22, 59],
    configKey: 'powerball_grids',
  },
  mega_millions: {
    key: 'mega_millions',
    name: 'Mega Millions',
    bonusName: 'Mega Ball',
    whiteMax: 70,
    bonusMax: 24,
    days: [2, 5],
    time: [23, 0],
    configKey: 'mega_millions_grids',
  },
};

export const GAME_KEYS = Object.keys(GAMES);

export const WHITE_BALLS = 5;
export const MAX_GRIDS = 10;
export const TIERS = 9;

const DAY = 24 * 60 * 60 * 1000;

/** The weekday (0 = Sunday) of a calendar date 'YYYY-MM-DD'. */
function weekday(date) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function addDays(date, days) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

/** The instant of the draw of a game on a date (Eastern Time). */
export function drawInstant(game, date) {
  return zonedInstant(date, game.time[0], game.time[1], EASTERN);
}

/**
 * The next draw of a game after an instant.
 * @returns {{ date: string, at: number }} the date in Eastern Time, the instant
 */
export function nextDraw(game, now) {
  const today = localDate(now, EASTERN);
  for (let offset = 0; offset <= 7; offset += 1) {
    const date = addDays(today, offset);
    if (game.days.includes(weekday(date))) {
      const at = drawInstant(game, date);
      if (at > now) {
        return { date, at };
      }
    }
  }
  return null; // unreachable: every game draws at least once a week
}

/**
 * The prize tier of a grid: 1 (5 + bonus ball, the jackpot) to 9 (the bonus
 * ball alone), 0 when the grid wins nothing. The same for both games.
 */
export function tierOf(whites, bonus) {
  if (bonus) {
    return [9, 8, 7, 5, 3, 1][whites];
  }
  return { 5: 2, 4: 4, 3: 6 }[whites] ?? 0;
}

/** The white balls and the bonus ball of a tier: tier 5 → { whites: 3, bonus: true }. */
export function tierBalls(tier) {
  return [
    null,
    { whites: 5, bonus: true },
    { whites: 5, bonus: false },
    { whites: 4, bonus: true },
    { whites: 4, bonus: false },
    { whites: 3, bonus: true },
    { whites: 3, bonus: false },
    { whites: 2, bonus: true },
    { whites: 1, bonus: true },
    { whites: 0, bonus: true },
  ][tier];
}

/**
 * The grids of the configuration: "5 12 23 34 45 + 6; 1 7 19 28 60 + 13".
 * Grids are separated by ";", "|" or a line break; the bonus ball follows a
 * "+" or a "/", or is the sixth number.
 * @returns {{ grids: object[], invalid: string[] }} the valid grids (white
 *   balls sorted), the texts of the others
 */
export function parseGrids(text, game) {
  const grids = [];
  const invalid = [];
  const chunks = String(text ?? '')
    .split(/[;|\n]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  for (const chunk of chunks) {
    const grid = parseGrid(chunk, game);
    if (grid && grids.length < MAX_GRIDS) {
      grids.push(grid);
    } else {
      invalid.push(chunk.slice(0, 40));
    }
  }
  return { grids, invalid };
}

function parseGrid(chunk, game) {
  if (!/^[\d\s,.+/-]+$/.test(chunk)) {
    return null;
  }
  const [main, extra, more] = chunk.split(/[+/]/);
  if (more !== undefined) {
    return null;
  }
  let whites = (main.match(/\d+/g) ?? []).map(Number);
  let bonus;
  if (extra === undefined) {
    if (whites.length !== WHITE_BALLS + 1) {
      return null;
    }
    bonus = whites.pop();
  } else {
    const bonusBalls = (extra.match(/\d+/g) ?? []).map(Number);
    if (bonusBalls.length !== 1) {
      return null;
    }
    bonus = bonusBalls[0];
  }
  whites = whites.sort((a, b) => a - b);
  const valid =
    whites.length === WHITE_BALLS &&
    new Set(whites).size === WHITE_BALLS &&
    whites.every((ball) => ball >= 1 && ball <= game.whiteMax) &&
    bonus >= 1 &&
    bonus <= game.bonusMax;
  return valid ? { whites, bonus } : null;
}

/** "05 12 23 34 45 + 06" */
export function formatBalls({ whites, bonus }) {
  const two = (ball) => String(ball).padStart(2, '0');
  return `${whites.map(two).join(' ')} + ${two(bonus)}`;
}

/**
 * The grids checked against a draw.
 * @returns {{ results: object[], bestMatches: number, bestTier: number,
 *   winning: number, best: object|null }} per grid: whites, bonus (matched),
 *   matches (white balls + bonus ball), tier; best: the grid of the best tier
 *   (or of the most matches when none wins)
 */
export function checkGrids(draw, grids) {
  const drawn = new Set(draw.whites);
  const results = grids.map((grid, index) => {
    const whites = grid.whites.filter((ball) => drawn.has(ball)).length;
    const bonus = grid.bonus === draw.bonus;
    return {
      index,
      grid,
      whites,
      bonus,
      matches: whites + Number(bonus),
      tier: tierOf(whites, bonus),
    };
  });
  let best = null;
  for (const result of results) {
    if (!best || better(result, best)) {
      best = result;
    }
  }
  return {
    results,
    bestMatches: Math.max(0, ...results.map((result) => result.matches)),
    bestTier: best?.tier ?? 0,
    winning: results.filter((result) => result.tier > 0).length,
    best,
  };
}

function better(a, b) {
  if (a.tier !== b.tier) {
    return a.tier > 0 && (b.tier === 0 || a.tier < b.tier);
  }
  return a.matches > b.matches;
}
