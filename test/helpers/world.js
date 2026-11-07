// -----------------------------------------------------------------------------
// A running integration against the SDK's fake Gladys, with a clock the test
// moves, data.ny.gov served from answers recorded on 2026-11-08
// (test/fixtures/ny-open-data) and /data kept in memory. No network.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { DATASETS, createOpenData } from '../../src/opendata.js';

/** A recorded answer of data.ny.gov (the last 3 draws, 2026-11-08). */
export function fixture(name) {
  return JSON.parse(
    readFileSync(new URL(`../fixtures/ny-open-data/${name}.json`, import.meta.url), 'utf8'),
  );
}

const FILES = {
  [DATASETS.powerball]: 'powerball',
  [DATASETS.mega_millions]: 'mega-millions',
};

/**
 * A fetch serving the recorded answers, counting the calls. `skip` hides the
 * newest draws (skip 1: the draws before the last one, as on 2026-11-04
 * morning), `fail` makes every request fail like a network error, `status`
 * answers that HTTP status instead.
 */
export function fakeOpenData({ skip = 0, fail = false, status = 200 } = {}) {
  const api = {
    calls: [],
    skip,
    fail,
    status,
    fetch: async (url) => {
      const { pathname, searchParams } = new URL(url);
      const dataset = pathname.replace(/^\/resource\/|\.json$/g, '');
      api.calls.push({ dataset, order: searchParams.get('$order') });
      if (api.fail) {
        throw new Error('getaddrinfo ENOTFOUND data.ny.gov');
      }
      if (!FILES[dataset]) {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      return {
        ok: api.status === 200,
        status: api.status,
        json: async () =>
          api.status === 200 ? fixture(FILES[dataset]).slice(api.skip) : fixture('error-400'),
      };
    },
  };
  return api;
}

export function createMemoryStore(files = {}) {
  const content = new Map(Object.entries(files));
  return {
    files: content,
    load: (name) => (content.has(name) ? structuredClone(content.get(name)) : null),
    save: (name, value) => content.set(name, structuredClone(value)),
  };
}

/** A clock the test sets and moves. */
export function createClock(iso) {
  const clock = {
    ms: Date.parse(iso),
    now: () => clock.ms,
    set: (value) => {
      clock.ms = Date.parse(value);
    },
    advance: (ms) => {
      clock.ms += ms;
    },
  };
  return clock;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] the configuration saved in Gladys
 * @param {string} [options.at] the instant of the start (ISO)
 * @param {string} [options.timeZone] Gladys' time zone
 * @param {object} [options.api] fakeOpenData()
 * @param {object} [options.store] createMemoryStore()
 * @param {object[]} [options.devices] devices already added in Gladys
 * @param {boolean} [options.connect] false: handlers registered, not started
 * @param {boolean} [options.timers] true: the real clock of the service runs,
 *   on Date.now and setTimeout (to mock with t.mock.timers)
 */
export async function createWorld({
  config = {},
  at = '2026-11-08T10:00:00Z',
  timeZone = 'Europe/Paris',
  api = fakeOpenData(),
  store = createMemoryStore(),
  devices = [],
  connect = true,
  timers = false,
} = {}) {
  const clock = createClock(at);
  const gladys = createFakeGladys({ config, devices });
  const app = registerHandlers(gladys, {
    store,
    api: createOpenData({ fetch: api.fetch }),
    now: timers ? () => Date.now() : clock.now,
    timeZone,
    timers,
  });
  if (connect) {
    await gladys.connect();
  }
  const { service } = app;
  return {
    gladys,
    app,
    service,
    clock,
    api,
    store,
    /** The last value Gladys received for a feature key of a game's device. */
    state(game, key) {
      return gladys.fake.lastState(gladys.externalIds('game', game).feature(key));
    },
    /** Moves the clock minute by minute up to an instant, ticking each minute. */
    async runUntil(iso) {
      const target = Date.parse(iso);
      while (clock.ms < target) {
        clock.advance(Math.min(60_000, target - clock.ms));
        await service.tick();
      }
    },
  };
}
