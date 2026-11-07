// -----------------------------------------------------------------------------
// The integration end to end against the SDK's fake Gladys: devices, states,
// the clock, the triggers of a new draw, the cache in /data, the status.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore, createWorld, fakeOpenData } from './helpers/world.js';

// Lines checked against the recorded draws: Powerball 4 November 2026
// (15 34 41 53 56 + 21), Mega Millions 6 November 2026 (27 34 44 53 64 + 1).
const LINES = {
  powerball_grids: '15 34 41 1 2 + 21; 1 2 3 4 5 + 6',
  mega_millions_grids: '27 34 1 2 3 + 1',
};

test('two devices, never polled, with the features of the configuration', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const devices = world.gladys.fake.discoveredDevices;
  assert.deepEqual(
    devices.map((device) => [device.name, device.should_poll]),
    [
      ['Powerball', false],
      ['Mega Millions', false],
    ],
  );
  const keys = (device) => device.features.map((f) => f.external_id.split(':').at(-1));
  assert.deepEqual(keys(devices[0]), [
    'last_draw_date',
    'last_numbers',
    'power_play',
    'double_play_numbers',
    'next_draw',
    'draw_today',
    'draw_tomorrow',
  ]);
  assert.deepEqual(keys(devices[1]), [
    'last_draw_date',
    'last_numbers',
    'next_draw',
    'draw_today',
    'draw_tomorrow',
  ]);

  // Lines entered: the line features appear.
  await world.gladys.fake.configUpdated(LINES);
  const [powerball, megaMillions] = world.gladys.fake.discoveredDevices.slice(-2);
  assert.ok(keys(powerball).includes('best_tier'));
  assert.ok(keys(megaMillions).includes('lines_result'));
});

test('the states: last numbers, next draw in the time of Gladys, lines checked', async (t) => {
  const world = await createWorld({ config: LINES, at: '2026-11-08T10:00:00Z' });
  t.after(() => world.app.stop());
  const pb = (key) => world.state('powerball', key);
  const mm = (key) => world.state('mega_millions', key);
  assert.equal(pb('last_draw_date'), 'mer. 4 nov.');
  assert.equal(pb('last_numbers'), '15 34 41 53 56 + 21');
  assert.equal(pb('power_play'), '×2');
  assert.equal(pb('double_play_numbers'), '03 06 23 58 65 + 15');
  // Monday 22:59 in New York is Tuesday 04:59 in Paris.
  assert.equal(pb('next_draw'), 'mar. 10 nov. · 04:59');
  assert.equal(mm('next_draw'), 'mer. 11 nov. · 05:00');
  assert.equal(pb('draw_today'), 0);
  assert.equal(pb('best_matches'), 4);
  assert.equal(pb('best_tier'), 5);
  assert.equal(pb('winning_lines'), 1);
  assert.equal(pb('lines_result'), '3 + Powerball (rang 5) · 1/2 grille gagnante');
  assert.equal(mm('last_numbers'), '27 34 44 53 64 + 01');
  assert.equal(mm('best_tier'), 7);
  assert.equal(mm('lines_result'), '2 + Mega Ball (rang 7) · 1/1 grille gagnante');

  // In New York, the draw is tonight.
  const ny = await createWorld({
    config: { language: 'en' },
    at: '2026-11-09T15:00:00Z',
    timeZone: 'America/New_York',
  });
  t.after(() => ny.app.stop());
  assert.equal(ny.state('powerball', 'next_draw'), 'Mon, Nov 9 · 22:59');
  assert.equal(ny.state('powerball', 'draw_today'), 1);
  assert.equal(ny.state('mega_millions', 'draw_tomorrow'), 1);
});

test('a new draw fires its triggers once, with the result of the lines', async (t) => {
  const api = fakeOpenData({ skip: 1 });
  const store = createMemoryStore();
  const world = await createWorld({ config: LINES, at: '2026-11-07T10:00:00Z', api, store });
  t.after(() => world.app.stop());
  // A fresh install announces nothing: these draws are already known.
  assert.equal(world.state('powerball', 'last_draw_date'), 'lun. 2 nov.');
  assert.deepEqual(world.gladys.fake.sceneEvents, []);

  // The new numbers come in: read within the hour.
  api.skip = 0;
  await world.runUntil('2026-11-07T11:01:00Z');
  const events = world.gladys.fake.sceneEvents;
  assert.deepEqual(
    events.map((event) => `${event.key}:${event.data.game}`),
    [
      'new_draw:powerball',
      'numbers_matched:powerball',
      'winning_line:powerball',
      'new_draw:mega_millions',
      'numbers_matched:mega_millions',
      'winning_line:mega_millions',
    ],
  );
  const powerball = events[0].data;
  assert.equal(
    powerball.summary,
    'Les numéros du Powerball du mercredi 4 novembre : 15, 34, 41, 53, 56, Powerball 21, Power Play ×2. ' +
      'Vos grilles : 1 gagnante sur 2, au mieux 3 + Powerball (rang 5). ' +
      'Prochain tirage : dimanche 8 novembre à 04:59.',
  );
  assert.equal(powerball.matches, '4');
  assert.equal(powerball.tier, '5');
  assert.equal(powerball.best_result, '3 + Powerball (rang 5)');
  assert.equal(powerball.numbers, '15 34 41 53 56 + 21');
  assert.equal(powerball.power_play, 2);
  assert.equal(world.state('powerball', 'last_draw_date'), 'mer. 4 nov.');

  // Hours later, and after a restart on the same /data: nothing again.
  await world.runUntil('2026-11-07T15:00:00Z');
  assert.equal(world.gladys.fake.sceneEvents.length, 6);
  await world.app.stop();
  const again = await createWorld({ config: LINES, at: '2026-11-07T16:00:00Z', store });
  t.after(() => again.app.stop());
  await again.runUntil('2026-11-07T18:00:00Z');
  assert.deepEqual(again.gladys.fake.sceneEvents, []);
});

test('without lines, only "new draw"; a draw seen days late is not announced', async (t) => {
  const api = fakeOpenData({ skip: 1 });
  const world = await createWorld({ at: '2026-11-07T10:00:00Z', api });
  t.after(() => world.app.stop());
  api.skip = 0;
  await world.runUntil('2026-11-07T11:01:00Z');
  const events = world.gladys.fake.sceneEvents;
  assert.deepEqual(
    events.map((event) => event.key),
    ['new_draw', 'new_draw'],
  );
  assert.equal(events[1].data.lines, 0);
  assert.equal(events[1].data.best_result, '');
  assert.match(events[1].data.summary, /^Les numéros du Mega Millions du vendredi 6 novembre : /);

  // data.ny.gov down for a week: the draw read then is old news.
  const late = fakeOpenData({ skip: 1, fail: false });
  const store = createMemoryStore();
  const first = await createWorld({ at: '2026-11-04T10:00:00Z', api: late, store });
  await first.app.stop();
  late.skip = 0;
  const second = await createWorld({ at: '2026-11-12T10:00:00Z', api: late, store });
  t.after(() => second.app.stop());
  assert.deepEqual(second.gladys.fake.sceneEvents, []);
});

test('only changed states are published, everything again twice a day', async (t) => {
  const world = await createWorld({ at: '2026-11-08T10:00:00Z' });
  t.after(() => world.app.stop());
  const count = () => world.gladys.fake.states.length;
  const before = count();
  await world.runUntil('2026-11-08T12:00:00Z');
  assert.equal(count(), before, 'nothing changed in two hours');
  await world.runUntil('2026-11-08T22:01:00Z');
  assert.ok(count() > before, 'the heartbeat republished');
  assert.equal(world.api.calls.length, 2 * 13, 'both games read once an hour');
});

test('a device added in Gladys gets every state again', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const before = world.gladys.fake.states.length;
  await world.gladys.fake.deviceCreated(world.gladys.fake.discoveredDevices[0]);
  assert.ok(world.gladys.fake.states.length >= before + 12);
});

test('data.ny.gov down: status, retry every 10 minutes, cache kept', async (t) => {
  const api = fakeOpenData();
  const store = createMemoryStore();
  const first = await createWorld({ api, store });
  await first.app.stop();

  api.fail = true;
  api.calls.length = 0;
  const world = await createWorld({ api, store, at: '2026-11-08T10:30:00Z' });
  t.after(() => world.app.stop());
  // The cache is fresh: no reading before the hour.
  assert.equal(api.calls.length, 0);
  assert.equal(world.state('powerball', 'last_numbers'), '15 34 41 53 56 + 21');
  await world.runUntil('2026-11-08T11:01:00Z');
  assert.equal(world.gladys.fake.connectionStatus.connected, false);
  assert.match(world.gladys.fake.connectionStatus.message.fr, /data\.ny\.gov ne peut pas être lu/);
  const calls = api.calls.length;
  await world.runUntil('2026-11-08T11:06:00Z');
  assert.equal(api.calls.length, calls, 'no retry before 10 minutes');
  api.fail = false;
  await world.runUntil('2026-11-08T11:12:00Z');
  assert.equal(world.gladys.fake.connectionStatus.connected, true);
});

test('lines not understood are reported in the status and by "Check"', async (t) => {
  const world = await createWorld({
    config: { powerball_grids: '1 2 3 4 5 + 30; 15 34 41 1 2 + 21', language: 'en' },
  });
  t.after(() => world.app.stop());
  const status = world.gladys.fake.connectionStatus;
  assert.equal(status.connected, false);
  assert.deepEqual(Object.keys(status.message).sort(), ['de', 'en', 'es', 'fr']);
  assert.equal(status.message.en, 'Some Powerball lines are not understood: see "Check".');
  const ack = await world.gladys.fake.action('check', {});
  assert.equal(ack.success, true, ack.error);
  const en = ack.data.message.en;
  assert.match(
    en,
    /^The Powerball numbers of Wednesday, November 4: 15, 34, 41, 53, 56, Powerball 21/,
  );
  assert.match(en, /Powerball: 1 line checked\./);
  assert.match(en, /Powerball: Not understood: "1 2 3 4 5 \+ 30"\./);
  assert.match(en, /Data read just now from data\.ny\.gov\./);
});

test('a game unread at install is not announced later for a draw held before it', async (t) => {
  const api = fakeOpenData();
  const world = await createWorld({ api, at: '2026-11-07T10:00:00Z', connect: false });
  t.after(() => world.app.stop());
  // Mega Millions fails at install, Powerball answers.
  const realFetch = api.fetch;
  api.fetch = async (url) => {
    if (url.includes('5xaw-6ayf')) {
      throw new Error('timeout');
    }
    return realFetch(url);
  };
  world.app.service.api = (await import('../src/opendata.js')).createOpenData({
    fetch: (u) => api.fetch(u),
  });
  await world.gladys.connect();
  assert.equal(world.state('mega_millions', 'last_numbers'), undefined);
  api.fetch = realFetch;
  await world.runUntil('2026-11-07T10:12:00Z');
  assert.equal(world.state('mega_millions', 'last_numbers'), '27 34 44 53 64 + 01');
  assert.deepEqual(world.gladys.fake.sceneEvents, []);
});

test('a draw Gladys refused is announced at the next reading', async (t) => {
  const api = fakeOpenData({ skip: 1 });
  const world = await createWorld({ at: '2026-11-07T10:00:00Z', api });
  t.after(() => world.app.stop());
  api.skip = 0;
  const refused = t.mock.method(world.gladys, 'publishSceneEvent', async () => {
    throw new Error('Gladys is restarting');
  });
  await world.runUntil('2026-11-07T11:01:00Z');
  refused.mock.restore();
  assert.deepEqual(world.gladys.fake.sceneEvents, []);
  await world.runUntil('2026-11-07T12:01:00Z');
  assert.deepEqual(
    world.gladys.fake.sceneEvents.map((event) => `${event.key}:${event.data.game}`),
    ['new_draw:powerball', 'new_draw:mega_millions'],
  );
});
