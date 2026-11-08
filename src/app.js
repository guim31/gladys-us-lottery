// -----------------------------------------------------------------------------
// Registers every SDK handler on a GladysIntegration (or the SDK's fake Gladys
// in the tests) and returns the service, so index.js stays a few lines and the
// tests drive the very same wiring.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './config.js';
import { linesOf } from './device.js';
import { GAMES, GAME_KEYS } from './games.js';
import { CHECK_TEXT, INIT_FAILED } from './i18n.js';
import { createOpenData } from './opendata.js';
import { SCENE_ACTIONS, drawSummary } from './scenes.js';
import { LotteryService } from './service.js';
import { createStore } from './store.js';
import { WIDGETS } from './widgets.js';

const logger = createLogger({ name: 'us-lottery-app' });

export const CHECK_ACTION = 'check';

/**
 * @param {object} gladys GladysIntegration instance
 * @param {object} [options] test seams: store, api, now, timeZone, timers
 */
export function registerHandlers(gladys, options = {}) {
  const service = new LotteryService({
    gladys,
    store: options.store ?? createStore(),
    api: options.api ?? createOpenData({ fetch: options.fetch }),
    now: options.now,
    timeZone: options.timeZone,
    timers: options.timers ?? true,
  });

  // Resolved once the service has started; every handler waits for it.
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  let started = false;
  const whenReady =
    (fn) =>
    async (...args) => {
      await ready;
      return fn(...args);
    };

  gladys.on('connected', async () => {
    try {
      const config = normalizeConfig(await gladys.getConfig());
      if (started) {
        await service.resync(config);
        return;
      }
      started = true;
      await service.start(config);
    } catch (err) {
      logger.error('Initialization failed', err);
      // The handlers keep answering, with the defaults if need be.
      service.config ??= normalizeConfig({});
      await gladys.setConnectionStatus(false, INIT_FAILED).catch(() => {});
      // The next status report replaces this one.
      service.statusKey = null;
    } finally {
      resolveReady();
    }
  });

  gladys.onScanRequest(whenReady(() => service.publishDevices()));

  gladys.onDeviceCreated(whenReady(() => service.deviceCreated()));
  gladys.onDeviceUpdated(whenReady(() => service.devicesChanged()));
  gladys.onDeviceDeleted(whenReady(() => service.devicesChanged()));

  gladys.onConfigUpdated(whenReady((config) => service.reconfigure(normalizeConfig(config))));

  gladys.onAction(
    CHECK_ACTION,
    whenReady(async () => {
      logger.info('Action "check": reading data.ny.gov again');
      await service.check();
      return checkMessage(service);
    }),
  );

  for (const [key, handler] of Object.entries(SCENE_ACTIONS)) {
    gladys.onSceneAction(
      key,
      whenReady((fields) => handler(service, { fields })),
    );
  }

  for (const [key, widget] of Object.entries(WIDGETS)) {
    gladys.onWidgetGet(
      key,
      whenReady((request) => widget.get(service, request)),
    );
  }

  return { service, ready, stop: () => service.stop() };
}

/** The report of "Check", one text per language. */
export function checkMessage(service) {
  return Object.fromEntries(
    Object.entries(CHECK_TEXT).map(([language, text]) => {
      const lines = [];
      for (const key of GAME_KEYS) {
        lines.push(drawSummary(service, key, language).sentence);
        const { grids, invalid } = linesOf(service.config, key);
        if (grids.length > 0) {
          lines.push(`${GAMES[key].name}: ${text.lines(grids.length)}`);
        }
        if (invalid.length > 0) {
          lines.push(
            `${GAMES[key].name}: ${text.invalid(invalid.map((v) => `"${v}"`).join(', '))}`,
          );
        }
        lines.push('');
      }
      lines.push(service.apiError ? text.stale(service.apiError) : text.fresh);
      return [language, lines.join('\n')];
    }),
  );
}
