// -----------------------------------------------------------------------------
// Configuration: DEFAULT_CONFIG mirrors the manifest defaults (tied by
// test/manifest.test.js), and normalizeConfig() turns whatever Gladys sends
// (a field never saved is absent) into a complete, valid object. Nothing here
// throws: invalid grids are kept as text and reported by the service.
// -----------------------------------------------------------------------------

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

export const DEFAULT_CONFIG = {
  language: 'fr',
  powerball_grids: '',
  mega_millions_grids: '',
};

/**
 * @param {object} [raw] the configuration sent by Gladys
 * @returns {object} DEFAULT_CONFIG's keys with valid values
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
    powerball_grids: text(source.powerball_grids).slice(0, 500),
    mega_millions_grids: text(source.mega_millions_grids).slice(0, 500),
  };
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}
