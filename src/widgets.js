// -----------------------------------------------------------------------------
// Dashboard widget "US lotteries" (key "us_lottery"): the last numbers of each
// game, how the user's lines did (a tap opens the detail line by line), the
// next draws in the time of Gladys, and a reminder that this is not an
// official result. Produced from the draws, not from the devices: it works
// before they are added. Localized from the language of the person looking at
// it; a device renamed in Gladys keeps its name here.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { LANGUAGES } from './config.js';
import { deviceIds, lineLabel, linesOf } from './device.js';
import { GAMES, GAME_KEYS, checkGrids, formatBalls, nextDraw, tierBalls } from './games.js';
import { TIER_TEXT, WIDGET_TEXT, ballsLabel } from './i18n.js';
import { WIDGET_KEY } from './service.js';
import { formatDate, formatInstant } from './time.js';

/** The games chosen in the widget settings (empty: both). */
export function chosenGames(settings = {}) {
  const chosen = Array.isArray(settings.games)
    ? GAME_KEYS.filter((key) => settings.games.includes(key))
    : [];
  return chosen.length > 0 ? chosen : GAME_KEYS;
}

/** The name of a game's device in Gladys, the game's name before it is added. */
function deviceName(service, gameKey) {
  const id = deviceIds(service.gladys, gameKey).device;
  const device = (service.gladys.devices ?? []).find((entry) => entry.external_id === id);
  return device?.name || GAMES[gameKey].name;
}

function gameItem(service, gameKey, lang, text, showLines) {
  const game = GAMES[gameKey];
  const draw = service.draws[gameKey];
  const name = deviceName(service, gameKey);
  if (!draw) {
    return { title: name.slice(0, 60), subtitle: '–' };
  }
  const item = {
    title: `${name} · ${formatDate(draw.date, lang, 'short')}`.slice(0, 60),
    subtitle: draw.multiplier
      ? `${formatBalls(draw)} · Power Play ×${draw.multiplier}`
      : formatBalls(draw),
  };
  const { grids } = linesOf(service.config, gameKey);
  if (showLines && grids.length > 0) {
    const check = checkGrids(draw, grids);
    item.badge =
      check.bestTier > 0
        ? {
            text: ballsLabel(lang, game.bonusName, tierBalls(check.bestTier)).slice(0, 16),
            color: WIDGET_COLORS.SUCCESS,
          }
        : { text: TIER_TEXT[lang].noPrize.slice(0, 16), color: WIDGET_COLORS.NEUTRAL };
    item.description = check.results
      .map((result) =>
        text.line(
          result.index + 1,
          formatBalls(result.grid),
          lineLabel(lang, gameKey, result, text.matched),
        ),
      )
      .join('\n');
  }
  return item;
}

/**
 * The widget content.
 * @param {object} service the LotteryService
 * @param {{ settings?: object, language?: string }} request
 */
export function buildContent(service, { settings = {}, language } = {}) {
  const lang = LANGUAGES.includes(language) ? language : service.config.language;
  const text = WIDGET_TEXT[lang];
  const games = chosenGames(settings);
  const components = [];

  if (games.every((key) => !service.draws[key])) {
    components.push({ type: 'text', variant: 'body', text: text.noData });
  } else {
    components.push({
      type: 'card-list',
      display: 'list',
      items: games.map((key) => gameItem(service, key, lang, text, settings.show_lines !== false)),
    });
  }

  if (settings.show_next_draws !== false) {
    const now = service.now();
    components.push({
      type: 'status',
      items: games.map((key) => ({
        label: `${text.nextDraws} · ${deviceName(service, key)}`.slice(0, 40),
        value: formatInstant(nextDraw(GAMES[key], now).at, lang, service.timeZone),
        color: WIDGET_COLORS.INFO,
      })),
    });
  }

  if (settings.show_notice !== false) {
    components.push({ type: 'text', variant: 'caption', text: text.caption });
  }
  // The clock asks for a refresh when a draw comes in or a draw night passes.
  return { ttl_seconds: 1800, components };
}

export const WIDGETS = {
  [WIDGET_KEY]: {
    get: (service, request) => buildContent(service, request),
  },
};
