// -----------------------------------------------------------------------------
// Instants shown in the time zone of Gladys (TZ, injected by the supervisor):
// a draw at 10:59 pm in New York is "Tue 10 Nov · 04:59" in Paris. Draw dates
// (the calendar date of the draw in New York) are shown as they are.
// -----------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The time zone of Gladys: TZ, set by the supervisor. Checked here rather
 * than trusted to the system (the Alpine image has no tzdata; Node's ICU
 * carries its own zones): an unusable value falls back to the process one.
 */
export function processTimeZone(env = process.env.TZ) {
  if (env) {
    try {
      return new Intl.DateTimeFormat('en', { timeZone: env }).resolvedOptions().timeZone;
    } catch {
      // Not an IANA name (':/etc/localtime'…): fall through.
    }
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

const cache = new Map();

function formatter(key, make) {
  let value = cache.get(key);
  if (!value) {
    value = make();
    cache.set(key, value);
  }
  return value;
}

/** The calendar date ('YYYY-MM-DD') of an instant in a time zone. */
export function localDate(ms, timeZone) {
  return formatter(
    `date:${timeZone}`,
    () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
  ).format(new Date(ms));
}

/** Whole calendar days from one date to another ('YYYY-MM-DD'). */
export function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** The offset of a time zone at an instant, in ms (UTC+1 → 3 600 000). */
function offsetAt(ms, timeZone) {
  const parts = Object.fromEntries(
    formatter(
      `parts:${timeZone}`,
      () =>
        new Intl.DateTimeFormat('en-US', {
          timeZone,
          hourCycle: 'h23',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        }),
    )
      .formatToParts(new Date(ms))
      .map((part) => [part.type, Number(part.value)]),
  );
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** The instant of a wall-clock time on a date in a time zone (DST included). */
export function zonedInstant(date, hour, minute, timeZone) {
  const [year, month, day] = date.split('-').map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetAt(guess, timeZone);
  return guess - offsetAt(first, timeZone);
}

/** A calendar date 'YYYY-MM-DD' as words: "mercredi 4 novembre" ('long'). */
export function formatDate(date, language, style = 'short') {
  return formatDay(Date.parse(`${date}T12:00:00Z`), language, 'UTC', style);
}

/** "22:00" */
export function formatTime(ms, language, timeZone) {
  return formatter(
    `time:${language}:${timeZone}`,
    () =>
      new Intl.DateTimeFormat(language, {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
  ).format(new Date(ms));
}

/** "dim. 25 oct." ('short') or "dimanche 25 octobre" ('long'). */
export function formatDay(ms, language, timeZone, style = 'short') {
  return formatter(
    `day:${style}:${language}:${timeZone}`,
    () =>
      new Intl.DateTimeFormat(language, {
        timeZone,
        weekday: style,
        day: 'numeric',
        month: style,
      }),
  ).format(new Date(ms));
}

/** A draw for a feature or a widget row: "mar. 10 nov. · 04:59". */
export function formatInstant(ms, language, timeZone) {
  return `${formatDay(ms, language, timeZone, 'short')} · ${formatTime(ms, language, timeZone)}`;
}
