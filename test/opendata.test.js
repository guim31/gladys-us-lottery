// -----------------------------------------------------------------------------
// The data.ny.gov client and parser, on answers recorded on 2026-11-08.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOpenData, drawsUrl, parseDraw } from '../src/opendata.js';
import { fakeOpenData, fixture } from './helpers/world.js';

test('the last draws are asked newest first, from each dataset', () => {
  assert.equal(
    drawsUrl('powerball'),
    'https://data.ny.gov/resource/d6yy-54nr.json?%24order=draw_date+DESC&%24limit=3',
  );
  assert.match(drawsUrl('mega_millions'), /\/5xaw-6ayf\.json\?/);
});

test('a Powerball row: five white balls, the Powerball, Power Play, Double Play', () => {
  assert.deepEqual(parseDraw('powerball', fixture('powerball')[0]), {
    date: '2026-11-04',
    whites: [15, 34, 41, 53, 56],
    bonus: 21,
    multiplier: 2,
    doublePlay: { whites: [3, 6, 23, 58, 65], bonus: 15 },
  });
});

test('a Mega Millions row: five white balls and the Mega Ball, no Megaplier any more', () => {
  assert.deepEqual(parseDraw('mega_millions', fixture('mega-millions')[0]), {
    date: '2026-11-06',
    whites: [27, 34, 44, 53, 64],
    bonus: 1,
    multiplier: null,
    doublePlay: null,
  });
});

test('rows that are not a draw of the current matrix are skipped', () => {
  assert.equal(parseDraw('powerball', {}), null);
  assert.equal(parseDraw('powerball', { draw_date: '2026-11-04T00:00:00.000' }), null);
  assert.equal(
    parseDraw('powerball', {
      draw_date: '2026-11-04T00:00:00.000',
      winning_numbers: '1 2 3 4 5 27',
    }),
    null,
  );
  // Mega Millions of 2017-2025: a Mega Ball up to 25.
  assert.equal(
    parseDraw('mega_millions', {
      draw_date: '2025-01-03T00:00:00.000',
      winning_numbers: '01 02 03 04 05',
      mega_ball: '25',
    }),
    null,
  );
});

test('errors: network, HTTP status, rate limit, empty answer', async () => {
  const down = fakeOpenData({ fail: true });
  await assert.rejects(createOpenData({ fetch: down.fetch }).lastDraw('powerball'), {
    message: 'data.ny.gov unreachable: getaddrinfo ENOTFOUND data.ny.gov',
  });
  const refused = fakeOpenData({ status: 400 });
  await assert.rejects(createOpenData({ fetch: refused.fetch }).lastDraw('powerball'), {
    message: 'data.ny.gov answered HTTP 400',
  });
  const limited = fakeOpenData({ status: 429 });
  await assert.rejects(createOpenData({ fetch: limited.fetch }).lastDraw('mega_millions'), {
    message: 'data.ny.gov answered HTTP 429 (rate limited)',
  });
  const empty = async () => ({ ok: true, status: 200, json: async () => [] });
  await assert.rejects(createOpenData({ fetch: empty }).lastDraw('mega_millions'), {
    message: 'data.ny.gov sent no valid Mega Millions draw',
  });
  const html = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('Unexpected token <');
    },
  });
  await assert.rejects(createOpenData({ fetch: html }).lastDraw('powerball'), {
    message: 'data.ny.gov answered something else than JSON',
  });
});
