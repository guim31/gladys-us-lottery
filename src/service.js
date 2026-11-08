// -----------------------------------------------------------------------------
// The heart of the integration: the last draw of each game read from
// data.ny.gov and kept in a cache in /data, and the clock that turns it into
// device states and scene events.
//
// The clock ticks every minute (Gladys never polls the devices, should_poll is
// false):
// - it reads the last draws once an hour (every 10 minutes after a failure);
// - it publishes the states that changed (the next draw, "draw today" follow
//   the clock), and every state twice a day (Gladys flags a value older than
//   48 hours as "no recent value");
// - it fires "new draw", "numbers matched" and "winning line" once per draw
//   when a new draw appears, for a draw of the last days only.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { buildDevice, buildStates, linesOf } from './device.js';
import { createFailureLog } from './failures.js';
import { GAMES, GAME_KEYS, drawInstant, nextDraw } from './games.js';
import { PROBLEM_TEXT, inEveryLanguage } from './i18n.js';
import { drawSummary, eventData } from './scenes.js';
import { processTimeZone } from './time.js';

const logger = createLogger({ name: 'us-lottery' });

export const WIDGET_KEY = 'us_lottery';

// Trigger keys are forever: scenes store them.
export const TRIGGERS = {
  NEW_DRAW: 'new_draw',
  NUMBERS_MATCHED: 'numbers_matched',
  WINNING_LINE: 'winning_line',
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const MAX_AGE = HOUR;
const RETRY_AFTER = 10 * MINUTE;
const HEARTBEAT = 12 * HOUR;
// A draw older than this when it is first seen is not announced (a fresh
// install, a long outage): the triggers are about tonight's numbers.
const ANNOUNCE_WITHIN = 4 * 24 * HOUR;

const CACHE_FILE = 'cache.json';
const TRIGGERS_FILE = 'triggers.json';

export class LotteryService {
  /**
   * @param {object} options
   * @param {object} options.gladys the SDK client
   * @param {object} options.store JSON files in /data (src/store.js)
   * @param {object} options.api the data.ny.gov client (src/opendata.js)
   * @param {Function} [options.now] the clock (tests)
   * @param {string} [options.timeZone] Gladys' time zone (default: TZ)
   * @param {boolean} [options.timers] false in the tests: they call tick()
   */
  constructor({ gladys, store, api, now = Date.now, timeZone, timers = true }) {
    this.gladys = gladys;
    this.store = store;
    this.api = api;
    this.now = now;
    this.timeZone = timeZone ?? processTimeZone();
    this.timers = timers;
    this.config = null;
    this.draws = Object.fromEntries(GAME_KEYS.map((key) => [key, null]));
    this.fetchedAt = 0;
    this.apiError = null;
    this.lastAttempt = 0;
    this.announced = {};
    this.installedAt = 0;
    this.lastForce = 0;
    this.statusKey = null;
    this.widgetKey = null;
    this.timer = null;
    this.queue = Promise.resolve();
    // A failure repeated every minute is logged once (src/failures.js).
    this.failures = createFailureLog(logger);
  }

  // One operation at a time: a tick never interleaves with a reconfiguration.
  serial(fn) {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => {});
    return run;
  }

  start(config) {
    return this.serial(async () => {
      this.config = config;
      this.loadCache();
      // A fresh install announces no draw held before it.
      const saved = this.store.load(TRIGGERS_FILE);
      this.announced = saved?.announced ?? {};
      this.installedAt = saved ? (saved.installedAt ?? 0) : this.now();
      if (!saved) {
        this.saveTriggers();
      }
      // The clock runs whatever happens below: a failure at start-up must not
      // stop the readings and the triggers until the next restart.
      this.schedule();
      await this.refresh();
      await this.publishDevices();
      await this.publishStates({ force: true });
      await this.updateStatus();
      this.refreshWidget();
    });
  }

  /** The configuration changed (language, lines): maybe new features. */
  reconfigure(config) {
    return this.serial(async () => {
      this.config = config;
      await this.publishDevices();
      await this.publishStates({ force: true });
      await this.updateStatus({ force: true });
      this.refreshWidget();
    });
  }

  /** Gladys came back (restart): it may have lost what was sent meanwhile. */
  resync(config) {
    return this.reconfigure(config);
  }

  /** The user added a device: its states were dropped until now. */
  deviceCreated() {
    return this.serial(async () => {
      await this.publishStates({ force: true });
      this.refreshWidget();
    });
  }

  /** A device renamed or removed: the widget shows the names of Gladys. */
  devicesChanged() {
    this.refreshWidget();
  }

  /** "Check" on the Configuration screen: everything read again now. */
  check() {
    return this.serial(async () => {
      await this.refresh({ force: true });
      await this.publishStates();
      await this.updateStatus();
      this.refreshWidget();
    });
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
    return this.queue;
  }

  schedule() {
    if (!this.timers) {
      return;
    }
    clearTimeout(this.timer);
    const delay = MINUTE - (this.now() % MINUTE) + 500;
    this.timer = setTimeout(() => {
      this.tick()
        .then(() => this.failures.succeeded('tick', 'The clock works again'))
        .catch((err) => this.failures.failed('tick', 'Clock tick failed', err))
        .finally(() => this.schedule());
    }, delay);
    this.timer.unref?.();
  }

  /** One step of the clock. */
  tick() {
    return this.serial(async () => {
      if (await this.refresh()) {
        await this.updateStatus();
      }
      await this.publishStates({ force: this.now() - this.lastForce >= HEARTBEAT });
      if (this.widgetSignature() !== this.widgetKey) {
        this.refreshWidget();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // data.ny.gov and its cache
  // ---------------------------------------------------------------------------

  loadCache() {
    const cache = this.store.load(CACHE_FILE);
    if (cache?.version !== 1) {
      return;
    }
    for (const key of GAME_KEYS) {
      this.draws[key] = cache.draws?.[key] ?? null;
    }
    this.fetchedAt = cache.fetched_at ?? 0;
  }

  saveCache() {
    this.store.save(CACHE_FILE, { version: 1, fetched_at: this.fetchedAt, draws: this.draws });
  }

  /**
   * Reads the last draws when they are due (always with `force`).
   * @returns {Promise<boolean>} true when something was read or failed: the
   *   connection status may have changed
   */
  async refresh({ force = false } = {}) {
    const now = this.now();
    if (!force) {
      if (this.apiError ? now - this.lastAttempt < RETRY_AFTER : now - this.fetchedAt < MAX_AGE) {
        return false;
      }
    }
    this.lastAttempt = now;
    const fresh = {};
    try {
      for (const key of GAME_KEYS) {
        fresh[key] = await this.api.lastDraw(key);
      }
      this.apiError = null;
      this.fetchedAt = now;
      this.failures.succeeded('api', 'data.ny.gov read again');
    } catch (err) {
      this.apiError = err.message;
      this.failures.failed('api', `Could not read data.ny.gov: ${err.message}`);
    }
    const changed = [];
    for (const [key, draw] of Object.entries(fresh)) {
      // A stale answer (a cache around a publication) never goes back in time.
      if (!this.draws[key] || draw.date >= this.draws[key].date) {
        if (JSON.stringify(draw) !== JSON.stringify(this.draws[key])) {
          changed.push(key);
        }
        this.draws[key] = draw;
      }
    }
    if (Object.keys(fresh).length > 0) {
      this.saveCache();
      logger.debug(`Read the last draws from data.ny.gov (${changed.length} changed)`);
    }
    await this.announceDraws(now);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Gladys side
  // ---------------------------------------------------------------------------

  async publishDevices() {
    try {
      await this.gladys.publishDiscoveredDevices(
        GAME_KEYS.map((key) => buildDevice(this.gladys, this.config, key)),
      );
      this.failures.succeeded('device', 'Devices published again');
    } catch (err) {
      this.failures.failed('device', `Could not publish the devices: ${err.message}`);
    }
  }

  /**
   * Publishes the states that changed, or all of them (`force`). A failure is
   * logged: the next publication sends again what Gladys did not accept.
   */
  async publishStates({ force = false } = {}) {
    if (force) {
      this.gladys.forgetPublishedStates();
      this.lastForce = this.now();
    }
    const states = buildStates(this.gladys, this.config, this.draws, {
      now: this.now(),
      timeZone: this.timeZone,
    });
    try {
      await this.gladys.publishChangedStates(states);
      this.failures.succeeded('states', 'States published again');
    } catch (err) {
      this.failures.failed('states', `Could not publish the states: ${err.message}`);
    }
  }

  /** Problems shown in the connection status: { key, value }. */
  problems() {
    const found = [];
    if (this.apiError) {
      found.push({ key: 'unreachable' });
    }
    for (const key of GAME_KEYS) {
      if (linesOf(this.config, key).invalid.length > 0) {
        found.push({ key: 'invalid', value: GAMES[key].name });
      }
    }
    return found;
  }

  /** Reports the status when it changed (or always, with `force`). */
  async updateStatus({ force = false } = {}) {
    const problems = this.problems();
    const key = JSON.stringify(problems);
    if (!force && key === this.statusKey) {
      return;
    }
    const message =
      problems.length === 0
        ? undefined
        : inEveryLanguage(PROBLEM_TEXT, (text) =>
            problems.map(({ key: problem, value }) => text[problem](value)).join(' '),
          );
    try {
      await this.gladys.setConnectionStatus(problems.length === 0, message);
      this.statusKey = key;
      this.failures.succeeded('status', 'Status reported again');
    } catch (err) {
      this.failures.failed('status', `Could not report the status: ${err.message}`);
    }
  }

  /** What the widget shows: the last draws, the next draw of each game. */
  widgetSignature() {
    const now = this.now();
    return GAME_KEYS.map((key) => `${this.draws[key]?.date}:${nextDraw(GAMES[key], now).at}`).join(
      '|',
    );
  }

  refreshWidget() {
    this.widgetKey = this.widgetSignature();
    try {
      // Fire-and-forget, rate-limited by the core: never awaited.
      Promise.resolve(this.gladys.requestWidgetRefresh(WIDGET_KEY)).catch(() => {});
    } catch {
      // Disconnected: the widget refetches on its own TTL.
    }
  }

  /** @returns {Promise<boolean>} false when Gladys refused the event */
  async fireEvent(key, data) {
    try {
      await this.gladys.publishSceneEvent(key, data);
      this.failures.succeeded('scene-event', 'Scene triggers fired again');
      return true;
    } catch (err) {
      this.failures.failed('scene-event', `Could not fire ${key}: ${err.message}`);
      return false;
    }
  }

  saveTriggers() {
    this.store.save(TRIGGERS_FILE, { announced: this.announced, installedAt: this.installedAt });
  }

  /**
   * A new draw of a game: its triggers, once per draw, for a recent draw. A
   * game seen for the first time is only announced for a draw held after the
   * install (a read that failed at install time is no news). A draw Gladys
   * refused is tried again at the next reading.
   */
  async announceDraws(now) {
    let save = false;
    for (const key of GAME_KEYS) {
      const draw = this.draws[key];
      const known = this.announced[key];
      if (!draw || (known && known >= draw.date)) {
        continue;
      }
      const at = drawInstant(GAMES[key], draw.date);
      const news = (known || at >= this.installedAt) && now - at <= ANNOUNCE_WITHIN;
      if (news) {
        const data = eventData(this, key);
        if (!(await this.fireEvent(TRIGGERS.NEW_DRAW, data))) {
          continue;
        }
        if (data.lines > 0) {
          await this.fireEvent(TRIGGERS.NUMBERS_MATCHED, data);
        }
        if (data.best_tier > 0) {
          await this.fireEvent(TRIGGERS.WINNING_LINE, data);
        }
        logger.debug(`New ${GAMES[key].name} draw: ${drawSummary(this, key).sentence}`);
      }
      this.announced[key] = draw.date;
      save = true;
    }
    if (save) {
      this.saveTriggers();
    }
  }
}
