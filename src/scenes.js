// -----------------------------------------------------------------------------
// Scene texts and values: the summary sentence of a game ("the Powerball
// numbers of Wednesday: …"), the data of the scene triggers, and the scene
// action that reads it ({{<column>.<row>.sentence}}). In the language of the
// configuration: a scene action does not get the user's language.
// -----------------------------------------------------------------------------

import { bestLabel, linesOf } from './device.js';
import { GAMES, GAME_KEYS, checkGrids, formatBalls, nextDraw } from './games.js';
import { AT, SENTENCES, TIER_TEXT, ballsLabel } from './i18n.js';
import { formatDate, formatDay, formatTime } from './time.js';

export const DEFAULT_GAME = 'powerball';

/** "lundi 9 novembre à 04:59" */
function nextDrawText(service, gameKey, language) {
  const { at } = nextDraw(GAMES[gameKey], service.now());
  const day = formatDay(at, language, service.timeZone, 'long');
  return `${day} ${AT[language]} ${formatTime(at, language, service.timeZone)}`;
}

/**
 * The last draw of a game as words, and the check of the user's lines.
 * @returns {{ sentence: string, draw: object|null, check: object|null, next: string }}
 */
export function drawSummary(service, gameKey, language = service.config.language) {
  const game = GAMES[gameKey];
  const sentences = SENTENCES[language];
  const next = nextDrawText(service, gameKey, language);
  const draw = service.draws[gameKey];
  if (!draw) {
    return {
      sentence: sentences.noData(game.name) + sentences.next(next),
      draw,
      check: null,
      next,
    };
  }
  let sentence = sentences.draw({
    game: game.name,
    day: formatDate(draw.date, language, 'long'),
    whites: draw.whites,
    bonusName: game.bonusName,
    bonus: draw.bonus,
    multiplier: draw.multiplier,
  });
  const { grids } = linesOf(service.config, gameKey);
  let check = null;
  if (grids.length > 0) {
    check = checkGrids(draw, grids);
    sentence +=
      check.bestTier > 0
        ? sentences.won(
            check.winning,
            grids.length,
            ballsLabel(language, game.bonusName, {
              whites: check.best.whites,
              bonus: check.best.bonus,
            }),
            TIER_TEXT[language].tier(check.bestTier),
          )
        : sentences.lost(grids.length, check.bestMatches);
  }
  return { sentence: sentence + sentences.next(next), draw, check, next };
}

/** The data of the scene triggers of a new draw (flat, see the manifest). */
export function eventData(service, gameKey) {
  const language = service.config.language;
  const summary = drawSummary(service, gameKey, language);
  const { draw, check } = summary;
  return {
    game: gameKey,
    game_name: GAMES[gameKey].name,
    draw_date: formatDate(draw.date, language, 'long'),
    numbers: formatBalls(draw),
    bonus_ball: draw.bonus,
    power_play: draw.multiplier ?? 0,
    summary: summary.sentence,
    lines: check?.results.length ?? 0,
    best_matches: check?.bestMatches ?? 0,
    best_tier: check?.bestTier ?? 0,
    winning_lines: check?.winning ?? 0,
    best_result: check ? bestLabel(language, gameKey, check) : '',
    // The filters compare strings: the select options of the manifest.
    matches: String(check?.bestMatches ?? 0),
    tier: String(check?.bestTier ?? 0),
  };
}

export const SCENE_ACTIONS = {
  read_last_draw: async (service, { fields = {} }) => {
    const gameKey = GAME_KEYS.includes(fields.game) ? fields.game : DEFAULT_GAME;
    const summary = drawSummary(service, gameKey);
    return {
      sentence: summary.sentence,
      numbers: summary.draw ? formatBalls(summary.draw) : '',
      draw_date: summary.draw ? formatDate(summary.draw.date, service.config.language, 'long') : '',
      next_draw: summary.next,
      best_matches: summary.check?.bestMatches ?? 0,
      best_tier: summary.check?.bestTier ?? 0,
    };
  },
};
