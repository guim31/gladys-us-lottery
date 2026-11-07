// -----------------------------------------------------------------------------
// The integration runs on its own clock (Gladys never polls the devices), and
// its logs stay quiet: nothing at info on a normal week, new draws included;
// a repeated failure logged once, its end logged once.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, fakeOpenData } from './helpers/world.js';

/** Captures the lines of the SDK logger (console.log / console.error). */
function captureLogs(t) {
  const previous = process.env.LOG_LEVEL;
  delete process.env.LOG_LEVEL; // the default level: info
  t.after(() => {
    if (previous !== undefined) {
      process.env.LOG_LEVEL = previous;
    }
  });
  const lines = [];
  const keep = (prefix, ...args) => lines.push([prefix, ...args].map(String).join(' '));
  t.mock.method(console, 'log', keep);
  t.mock.method(console, 'error', keep);
  return {
    lines,
    at: (level) => lines.filter((line) => line.includes(`[${level}]`)),
    clear: () => lines.splice(0),
  };
}

const flush = async () => {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

test('the devices are never polled: their own timer reads and publishes', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.parse('2026-11-07T09:30:10Z') });
  const api = fakeOpenData({ skip: 1 });
  const world = await createWorld({ api, timers: true });
  t.after(() => world.app.stop());
  for (const device of world.gladys.fake.discoveredDevices) {
    assert.equal(device.should_poll, false, 'Gladys 5.2.0 polls only should_poll devices');
    assert.equal(device.poll_frequency, undefined);
  }
  api.skip = 0;
  for (let minute = 0; minute < 62; minute += 1) {
    t.mock.timers.tick(60_000);
    await flush();
  }
  assert.equal(world.state('powerball', 'last_numbers'), '15 34 41 53 56 + 21');
  assert.deepEqual(
    world.gladys.fake.sceneEvents.map((event) => event.key),
    ['new_draw', 'new_draw'],
  );
});

test('a week of draws writes nothing at info: ticks, readings, triggers', async (t) => {
  const logs = captureLogs(t);
  const api = fakeOpenData({ skip: 2 });
  const world = await createWorld({
    at: '2026-11-03T00:00:00Z',
    api,
    config: { powerball_grids: '15 34 41 1 2 + 21' },
  });
  t.after(() => world.app.stop());
  logs.clear();
  await world.runUntil('2026-11-04T12:00:00Z');
  api.skip = 1;
  await world.runUntil('2026-11-05T12:00:00Z');
  api.skip = 0;
  await world.runUntil('2026-11-07T12:00:00Z');
  assert.ok(world.gladys.fake.sceneEvents.length >= 4);
  assert.deepEqual(logs.lines, []);
});

test('repeated failures are logged once, their end once', async (t) => {
  const logs = captureLogs(t);
  const api = fakeOpenData({ skip: 1 });
  const world = await createWorld({ api, at: '2026-11-07T08:30:00Z' });
  t.after(() => world.app.stop());
  // data.ny.gov rate-limits us, and Gladys refuses states, statuses and scene
  // events, for hours.
  api.status = 429;
  api.skip = 0;
  const down = async () => {
    throw new Error('Gladys is restarting');
  };
  const mocks = ['publishChangedStates', 'setConnectionStatus', 'publishSceneEvent'].map((name) =>
    t.mock.method(world.gladys, name, down),
  );
  await world.runUntil('2026-11-07T12:01:00Z');
  // data.ny.gov comes back, Gladys not yet: the new draws are not announced.
  api.status = 200;
  await world.runUntil('2026-11-07T13:01:00Z');
  const warnings = logs.at('WARN');
  assert.equal(warnings.length, 4, warnings.join('\n'));
  for (const pattern of [
    /Could not read data\.ny\.gov: data\.ny\.gov answered HTTP 429 \(rate limited\)/,
    /Could not report the status/,
    /Could not publish the states/,
    /Could not fire new_draw/,
  ]) {
    assert.equal(warnings.filter((line) => pattern.test(line)).length, 1, String(pattern));
  }
  assert.equal(logs.at('INFO').filter((line) => !/data\.ny\.gov read again/.test(line)).length, 0);

  // Everything is back: one line per recovery, then silence.
  for (const mock of mocks) {
    mock.mock.restore();
  }
  logs.clear();
  await world.runUntil('2026-11-07T14:15:00Z');
  const recoveries = logs.at('INFO');
  assert.equal(
    recoveries.filter((line) => /States published again/.test(line)).length,
    1,
    recoveries.join('\n'),
  );
  assert.equal(world.gladys.fake.connectionStatus.connected, true);
  logs.clear();
  await world.runUntil('2026-11-07T23:00:00Z');
  assert.deepEqual(logs.lines, []);
});
