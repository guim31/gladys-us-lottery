// -----------------------------------------------------------------------------
// The games: draw calendar (Eastern Time, daylight saving included), lines
// typed by the user, and the nine prize tiers.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAMES,
  checkGrids,
  formatBalls,
  nextDraw,
  parseGrids,
  tierBalls,
  tierOf,
} from '../src/games.js';

const { powerball, mega_millions: megaMillions } = GAMES;
const iso = (draw) => new Date(draw.at).toISOString();

test('Powerball draws on Monday, Wednesday and Saturday at 10:59 pm in New York', () => {
  // Sunday 8 November 2026, noon UTC: next is Monday 9, 22:59 EST = 03:59 UTC.
  const sunday = Date.parse('2026-11-08T12:00:00Z');
  assert.deepEqual(nextDraw(powerball, sunday).date, '2026-11-09');
  assert.equal(iso(nextDraw(powerball, sunday)), '2026-11-10T03:59:00.000Z');
  // One minute after the Monday draw: Wednesday.
  const after = Date.parse('2026-11-10T04:00:00Z');
  assert.equal(nextDraw(powerball, after).date, '2026-11-11');
  // Summer time: 22:59 EDT = 02:59 UTC.
  assert.equal(
    iso(nextDraw(powerball, Date.parse('2026-07-01T12:00:00Z'))),
    '2026-07-02T02:59:00.000Z',
  );
});

test('Mega Millions draws on Tuesday and Friday at 11:00 pm in New York', () => {
  const sunday = Date.parse('2026-11-08T12:00:00Z');
  assert.equal(nextDraw(megaMillions, sunday).date, '2026-11-10');
  assert.equal(iso(nextDraw(megaMillions, sunday)), '2026-11-11T04:00:00.000Z');
  // Friday evening in New York, before the draw: tonight.
  const friday = Date.parse('2026-11-14T02:00:00Z'); // Friday 13, 21:00 EST
  assert.equal(nextDraw(megaMillions, friday).date, '2026-11-13');
  // The night the clocks go back (Sunday 1 November 2026): Tuesday 3, EST.
  assert.equal(
    iso(nextDraw(megaMillions, Date.parse('2026-10-31T12:00:00Z'))),
    '2026-11-04T04:00:00.000Z',
  );
});

test('the nine prize tiers, from the jackpot to the bonus ball alone', () => {
  const tiers = [
    [5, true, 1],
    [5, false, 2],
    [4, true, 3],
    [4, false, 4],
    [3, true, 5],
    [3, false, 6],
    [2, true, 7],
    [1, true, 8],
    [0, true, 9],
    [2, false, 0],
    [1, false, 0],
    [0, false, 0],
  ];
  for (const [whites, bonus, tier] of tiers) {
    assert.equal(tierOf(whites, bonus), tier, `${whites} + ${bonus}`);
    if (tier > 0) {
      assert.deepEqual(tierBalls(tier), { whites, bonus });
    }
  }
});

test('lines are read with "+", "/" or as six numbers, and wrong ones are kept apart', () => {
  const { grids, invalid } = parseGrids(
    '45 5 23 12 34 + 6; 1,7,19,28,60/13 | 2-4-6-8-10-26\n 1 1 2 3 4 + 5; 1 2 3 4 70 + 5; 1 2 3 4 5 + 27; 1 2 3 4 + 5; deux; 1 2 3 4 5 6 7',
    powerball,
  );
  assert.deepEqual(grids, [
    { whites: [5, 12, 23, 34, 45], bonus: 6 },
    { whites: [1, 7, 19, 28, 60], bonus: 13 },
    { whites: [2, 4, 6, 8, 10], bonus: 26 },
  ]);
  assert.deepEqual(invalid, [
    '1 1 2 3 4 + 5',
    '1 2 3 4 70 + 5',
    '1 2 3 4 5 + 27',
    '1 2 3 4 + 5',
    'deux',
    '1 2 3 4 5 6 7',
  ]);
  assert.deepEqual(parseGrids('1.5 2 3 4 5', powerball).invalid, ['1.5 2 3 4 5']);
  // 70 and 24 are Mega Millions numbers, 25 is not any more.
  assert.equal(parseGrids('1 2 3 4 70 + 24', megaMillions).grids.length, 1);
  assert.equal(parseGrids('1 2 3 4 70 + 25', megaMillions).grids.length, 0);
  assert.deepEqual(parseGrids('', powerball), { grids: [], invalid: [] });
  // Ten lines at most.
  const many = Array.from({ length: 12 }, (_, i) => `${i + 1} 20 30 40 50 + 1`).join(';');
  const parsed = parseGrids(many, powerball);
  assert.equal(parsed.grids.length, 10);
  assert.equal(parsed.invalid.length, 2);
});

test('lines checked against a draw: matches, tiers, best line', () => {
  // Powerball of Wednesday 4 November 2026: 15 34 41 53 56 + 21.
  const draw = { whites: [15, 34, 41, 53, 56], bonus: 21 };
  const check = checkGrids(draw, [
    { whites: [1, 2, 3, 4, 5], bonus: 1 },
    { whites: [1, 2, 15, 34, 41], bonus: 21 },
    { whites: [2, 15, 34, 41, 53], bonus: 3 },
    { whites: [1, 2, 3, 4, 56], bonus: 7 },
  ]);
  assert.deepEqual(
    check.results.map((result) => [result.matches, result.tier]),
    [
      [0, 0],
      [4, 5],
      [4, 4],
      [1, 0],
    ],
  );
  assert.equal(check.bestTier, 4, '4 numbers beat 3 + Powerball');
  assert.equal(check.best.index, 2);
  assert.equal(check.bestMatches, 4);
  assert.equal(check.winning, 2);

  const nothing = checkGrids(draw, [
    { whites: [1, 2, 3, 15, 34], bonus: 1 },
    { whites: [1, 2, 3, 4, 56], bonus: 7 },
  ]);
  assert.equal(nothing.bestTier, 0);
  assert.equal(nothing.best.index, 0, 'the line with the most numbers');
  assert.equal(nothing.bestMatches, 2);
  assert.equal(nothing.winning, 0);
  assert.equal(formatBalls(draw), '15 34 41 53 56 + 21');
});
