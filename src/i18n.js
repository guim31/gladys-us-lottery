// -----------------------------------------------------------------------------
// Every text the code produces, in the four languages of the Gladys interface.
// German says "du", Spanish "usted". The devices have no user language: their
// feature names, their texts and the scene texts follow the `language`
// setting; the widget gets the language of the person looking at it.
// Powerball, Mega Millions, Mega Ball, Power Play and Double Play are names:
// never translated.
// -----------------------------------------------------------------------------

/** Feature names, frozen by Gladys when the device is created. */
export const NAMES = {
  en: {
    last_draw_date: 'Last draw date',
    last_numbers: 'Last winning numbers',
    power_play: 'Power Play',
    double_play_numbers: 'Double Play numbers',
    next_draw: 'Next draw',
    draw_today: 'Draw today',
    draw_tomorrow: 'Draw tomorrow',
    best_matches: 'Numbers matched (best line)',
    best_tier: 'Prize tier (best line)',
    winning_lines: 'Winning lines',
    lines_result: 'Result of your lines',
  },
  fr: {
    last_draw_date: 'Date du dernier tirage',
    last_numbers: 'Numéros du dernier tirage',
    power_play: 'Power Play',
    double_play_numbers: 'Numéros du Double Play',
    next_draw: 'Prochain tirage',
    draw_today: "Tirage aujourd'hui",
    draw_tomorrow: 'Tirage demain',
    best_matches: 'Bons numéros (meilleure grille)',
    best_tier: 'Rang de gain (meilleure grille)',
    winning_lines: 'Grilles gagnantes',
    lines_result: 'Résultat de vos grilles',
  },
  de: {
    last_draw_date: 'Datum der letzten Ziehung',
    last_numbers: 'Letzte Gewinnzahlen',
    power_play: 'Power Play',
    double_play_numbers: 'Double-Play-Zahlen',
    next_draw: 'Nächste Ziehung',
    draw_today: 'Ziehung heute',
    draw_tomorrow: 'Ziehung morgen',
    best_matches: 'Richtige (beste Tippreihe)',
    best_tier: 'Gewinnklasse (beste Tippreihe)',
    winning_lines: 'Gewinnende Tippreihen',
    lines_result: 'Ergebnis deiner Tippreihen',
  },
  es: {
    last_draw_date: 'Fecha del último sorteo',
    last_numbers: 'Últimos números ganadores',
    power_play: 'Power Play',
    double_play_numbers: 'Números del Double Play',
    next_draw: 'Próximo sorteo',
    draw_today: 'Sorteo hoy',
    draw_tomorrow: 'Sorteo mañana',
    best_matches: 'Aciertos (mejor jugada)',
    best_tier: 'Categoría de premio (mejor jugada)',
    winning_lines: 'Jugadas ganadoras',
    lines_result: 'Resultado de sus jugadas',
  },
};

/**
 * The balls of a prize tier: "4 + Powerball", "5 numbers", "Mega Ball only".
 * @param {string} language
 * @param {string} bonusName "Powerball" or "Mega Ball"
 * @param {{ whites: number, bonus: boolean }} balls
 */
export function ballsLabel(language, bonusName, { whites, bonus }) {
  if (bonus) {
    return whites === 0 ? TIER_TEXT[language].bonusOnly(bonusName) : `${whites} + ${bonusName}`;
  }
  return TIER_TEXT[language].whites(whites);
}

export const TIER_TEXT = {
  en: {
    whites: (count) => `${count} ${count === 1 ? 'number' : 'numbers'}`,
    bonusOnly: (bonusName) => `${bonusName} only`,
    tier: (tier) => `tier ${tier}`,
    noPrize: 'No prize',
  },
  fr: {
    whites: (count) => `${count} ${count > 1 ? 'numéros' : 'numéro'}`,
    bonusOnly: (bonusName) => `${bonusName} seul`,
    tier: (tier) => `rang ${tier}`,
    noPrize: 'Aucun gain',
  },
  de: {
    whites: (count) => `${count} Richtige`,
    bonusOnly: (bonusName) => `nur ${bonusName}`,
    tier: (tier) => `Klasse ${tier}`,
    noPrize: 'Kein Gewinn',
  },
  es: {
    whites: (count) => `${count} ${count === 1 ? 'número' : 'números'}`,
    bonusOnly: (bonusName) => `solo ${bonusName}`,
    tier: (tier) => `categoría ${tier}`,
    noPrize: 'Sin premio',
  },
};

/** Texts of the device states. */
export const STATE_TEXT = {
  en: {
    won: (balls, tier, winning, count) =>
      `${balls} (${tier}) · ${winning}/${count} winning ${count === 1 ? 'line' : 'lines'}`,
    lost: (matches, count) =>
      `No prize · best line: ${matches} matched (${count} ${count === 1 ? 'line' : 'lines'})`,
  },
  fr: {
    won: (balls, tier, winning, count) =>
      `${balls} (${tier}) · ${winning}/${count} ${winning > 1 ? 'grilles gagnantes' : 'grille gagnante'}`,
    lost: (matches, count) =>
      `Aucun gain · meilleure grille : ${matches} bon${matches > 1 ? 's' : ''} numéro${matches > 1 ? 's' : ''} (${count} grille${count > 1 ? 's' : ''})`,
  },
  de: {
    won: (balls, tier, winning, count) =>
      `${balls} (${tier}) · ${winning}/${count} ${winning === 1 ? 'Tippreihe gewinnt' : 'Tippreihen gewinnen'}`,
    lost: (matches, count) =>
      `Kein Gewinn · beste Tippreihe: ${matches} Richtige (${count} ${count === 1 ? 'Tippreihe' : 'Tippreihen'})`,
  },
  es: {
    won: (balls, tier, winning, count) =>
      `${balls} (${tier}) · ${winning}/${count} ${winning === 1 ? 'jugada ganadora' : 'jugadas ganadoras'}`,
    lost: (matches, count) =>
      `Sin premio · mejor jugada: ${matches} acierto${matches === 1 ? '' : 's'} (${count} jugada${count === 1 ? '' : 's'})`,
  },
};

/** Sentences of the scene triggers and actions, and of the "Check" report. */
export const SENTENCES = {
  en: {
    draw: ({ game, day, whites, bonusName, bonus, multiplier }) =>
      `The ${game} numbers of ${day}: ${whites.join(', ')}, ${bonusName} ${bonus}` +
      (multiplier ? `, Power Play ×${multiplier}.` : '.'),
    won: (winning, count, balls, tier) =>
      ` Your lines: ${winning} of ${count} win, best ${balls} (${tier}).`,
    lost: (count, matches) =>
      ` Your lines: no prize, best ${matches} ${matches === 1 ? 'number' : 'numbers'} matched out of ${count} ${count === 1 ? 'line' : 'lines'}.`,
    next: (when) => ` Next draw: ${when}.`,
    noData: (game) => `The ${game} numbers are not known yet.`,
  },
  fr: {
    draw: ({ game, day, whites, bonusName, bonus, multiplier }) =>
      `Les numéros du ${game} du ${day} : ${whites.join(', ')}, ${bonusName} ${bonus}` +
      (multiplier ? `, Power Play ×${multiplier}.` : '.'),
    won: (winning, count, balls, tier) =>
      ` Vos grilles : ${winning} gagnante${winning > 1 ? 's' : ''} sur ${count}, au mieux ${balls} (${tier}).`,
    lost: (count, matches) =>
      ` Vos grilles : aucun gain, au mieux ${matches} bon${matches > 1 ? 's' : ''} numéro${matches > 1 ? 's' : ''} sur ${count} grille${count > 1 ? 's' : ''}.`,
    next: (when) => ` Prochain tirage : ${when}.`,
    noData: (game) => `Les numéros du ${game} ne sont pas encore connus.`,
  },
  de: {
    draw: ({ game, day, whites, bonusName, bonus, multiplier }) =>
      `Die ${game}-Zahlen vom ${day}: ${whites.join(', ')}, ${bonusName} ${bonus}` +
      (multiplier ? `, Power Play ×${multiplier}.` : '.'),
    won: (winning, count, balls, tier) =>
      ` Deine Tippreihen: ${winning} von ${count} gewinnen, am besten ${balls} (${tier}).`,
    lost: (count, matches) =>
      ` Deine Tippreihen: kein Gewinn, am besten ${matches} Richtige bei ${count} ${count === 1 ? 'Tippreihe' : 'Tippreihen'}.`,
    next: (when) => ` Nächste Ziehung: ${when}.`,
    noData: (game) => `Die ${game}-Zahlen sind noch nicht bekannt.`,
  },
  es: {
    draw: ({ game, day, whites, bonusName, bonus, multiplier }) =>
      `Los números del ${game} del ${day}: ${whites.join(', ')}, ${bonusName} ${bonus}` +
      (multiplier ? `, Power Play ×${multiplier}.` : '.'),
    won: (winning, count, balls, tier) =>
      ` Sus jugadas: ${winning} de ${count} ganan, como máximo ${balls} (${tier}).`,
    lost: (count, matches) =>
      ` Sus jugadas: sin premio, como máximo ${matches} acierto${matches === 1 ? '' : 's'} en ${count} jugada${count === 1 ? '' : 's'}.`,
    next: (when) => ` Próximo sorteo: ${when}.`,
    noData: (game) => `Los números del ${game} aún no se conocen.`,
  },
};

/** "mar. 10 nov. à 04:59" in sentences. */
export const AT = { en: 'at', fr: 'à', de: 'um', es: 'a las' };

/** Texts of the dashboard widget. */
export const WIDGET_TEXT = {
  en: {
    noData: 'The winning numbers are not known yet: data.ny.gov could not be read.',
    nextDraws: 'Next draw',
    line: (index, balls, result) => `Line ${index}: ${balls} → ${result}`,
    matched: (matches) => `${matches} matched`,
    caption: 'For information only: check your tickets with the official lottery.',
  },
  fr: {
    noData: "Les numéros gagnants ne sont pas encore connus : data.ny.gov n'a pas pu être lu.",
    nextDraws: 'Prochain tirage',
    line: (index, balls, result) => `Grille ${index} : ${balls} → ${result}`,
    matched: (matches) => `${matches} bon${matches > 1 ? 's' : ''} numéro${matches > 1 ? 's' : ''}`,
    caption: 'Indicatif : vérifiez vos tickets auprès de la loterie officielle.',
  },
  de: {
    noData: 'Die Gewinnzahlen sind noch nicht bekannt: data.ny.gov konnte nicht gelesen werden.',
    nextDraws: 'Nächste Ziehung',
    line: (index, balls, result) => `Tippreihe ${index}: ${balls} → ${result}`,
    matched: (matches) => `${matches} Richtige`,
    caption: 'Nur zur Information: prüfe deine Lose bei der offiziellen Lotterie.',
  },
  es: {
    noData: 'Los números ganadores aún no se conocen: no se pudo leer data.ny.gov.',
    nextDraws: 'Próximo sorteo',
    line: (index, balls, result) => `Jugada ${index}: ${balls} → ${result}`,
    matched: (matches) => `${matches} acierto${matches === 1 ? '' : 's'}`,
    caption: 'Solo informativo: compruebe sus boletos con la lotería oficial.',
  },
};

/** The report of "Check". */
export const CHECK_TEXT = {
  en: {
    lines: (count) => `${count} ${count === 1 ? 'line' : 'lines'} checked.`,
    invalid: (list) => `Not understood: ${list}.`,
    fresh: 'Data read just now from data.ny.gov.',
    stale: (error) => `data.ny.gov could not be read (${error}): last known data shown.`,
  },
  fr: {
    lines: (count) => `${count} grille${count > 1 ? 's' : ''} vérifiée${count > 1 ? 's' : ''}.`,
    invalid: (list) => `Non comprises : ${list}.`,
    fresh: "Données lues à l'instant sur data.ny.gov.",
    stale: (error) =>
      `data.ny.gov n'a pas pu être lu (${error}) : dernières données connues affichées.`,
  },
  de: {
    lines: (count) => `${count} ${count === 1 ? 'Tippreihe' : 'Tippreihen'} geprüft.`,
    invalid: (list) => `Nicht verstanden: ${list}.`,
    fresh: 'Daten soeben von data.ny.gov gelesen.',
    stale: (error) =>
      `data.ny.gov konnte nicht gelesen werden (${error}): letzte bekannte Daten angezeigt.`,
  },
  es: {
    lines: (count) =>
      `${count} jugada${count === 1 ? '' : 's'} comprobada${count === 1 ? '' : 's'}.`,
    invalid: (list) => `No entendidas: ${list}.`,
    fresh: 'Datos leídos ahora mismo en data.ny.gov.',
    stale: (error) =>
      `No se pudo leer data.ny.gov (${error}): se muestran los últimos datos conocidos.`,
  },
};

/** Problems shown in the connection status. */
export const PROBLEM_TEXT = {
  en: {
    unreachable: () => 'data.ny.gov cannot be read: the numbers shown may be out of date.',
    invalid: (game) => `Some ${game} lines are not understood: see "Check".`,
  },
  fr: {
    unreachable: () =>
      'data.ny.gov ne peut pas être lu : les numéros affichés peuvent être dépassés.',
    invalid: (game) => `Des grilles ${game} ne sont pas comprises : voir « Vérifier ».`,
  },
  de: {
    unreachable: () =>
      'data.ny.gov kann nicht gelesen werden: die angezeigten Zahlen sind eventuell veraltet.',
    invalid: (game) => `Einige ${game}-Tippreihen sind unverständlich: siehe „Prüfen“.`,
  },
  es: {
    unreachable: () =>
      'No se puede leer data.ny.gov: los números mostrados pueden estar desactualizados.',
    invalid: (game) => `Algunas jugadas de ${game} no se entienden: vea «Comprobar».`,
  },
};

export const INIT_FAILED = {
  en: 'The integration could not start: see its logs.',
  fr: "L'intégration n'a pas pu démarrer : voir ses journaux.",
  de: 'Die Integration konnte nicht starten: siehe ihre Protokolle.',
  es: 'La integración no pudo iniciarse: consulte sus registros.',
};

/** One text per language: { en: fn(table.en), fr: fn(table.fr), ... }. */
export function inEveryLanguage(table, fn) {
  return Object.fromEntries(Object.entries(table).map(([language, text]) => [language, fn(text)]));
}
