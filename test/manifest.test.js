// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code.
// The manifest is validated by the store indexer, but nothing there can know
// which handlers the code actually registers — these tests keep both in sync.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHECK_ACTION } from '../src/app.js';
import { DEFAULT_CONFIG, LANGUAGES } from '../src/config.js';
import { GAME_KEYS, TIERS } from '../src/games.js';
import { DEFAULT_GAME, SCENE_ACTIONS } from '../src/scenes.js';
import { TRIGGERS, WIDGET_KEY } from '../src/service.js';
import { WIDGETS } from '../src/widgets.js';
import { createWorld, fakeOpenData } from './helpers/world.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

// Every list of form fields the manifest can declare (same field grammar).
const allFields = [
  ...(manifest.config_schema ?? []),
  ...[
    ...(manifest.actions ?? []),
    ...(manifest.scene_triggers ?? []),
    ...(manifest.scene_actions ?? []),
  ].flatMap((item) => item.fields ?? []),
  ...(manifest.widgets ?? []).flatMap((widget) => widget.settings ?? []),
];

// The handlers the integration actually registers on the SDK.
const registered = await createWorld({ connect: false });
const handlerKeys = (prefix) =>
  Object.keys(registered.gladys.handlers)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));

const keysOf = (list) => (list ?? []).map((entry) => entry.key);
const values = (field) => field.options.map((option) => option.value);
const trigger = (key) => manifest.scene_triggers.find((entry) => entry.key === key);

test('identity: name, image, cover, transports, category, country', () => {
  assert.equal(manifest.name, 'Powerball & Mega Millions');
  assert.equal(manifest.type, 'device');
  assert.match(manifest.docker_image, /^ghcr\.io\/guim31\/gladys-us-lottery:/);
  assert.equal(
    manifest.cover_image,
    'https://raw.githubusercontent.com/guim31/gladys-us-lottery/main/cover.png',
  );
  // Everything comes from a public API on the Internet.
  assert.deepEqual(manifest.transports, ['cloud']);
  assert.deepEqual(manifest.categories, ['leisure']);
  assert.deepEqual(manifest.countries, ['US']);
});

test('`countries` requires Gladys >= 5.3.0', () => {
  assert.equal(manifest.gladys_version, '>=5.3.0');
});

test('every manifest action has a registered handler, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.actions), [CHECK_ACTION]);
  assert.deepEqual(handlerKeys('action:'), [CHECK_ACTION]);
});

test('"Check" reports the draws in every language', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const ack = await world.gladys.fake.action(CHECK_ACTION, {});
  assert.equal(ack.success, true, ack.error);
  assert.deepEqual(Object.keys(ack.data.message).sort(), [...LANGUAGES].sort());
  assert.match(ack.data.message.fr, /^Les numéros du Powerball du mercredi 4 novembre/);
  assert.match(ack.data.message.de, /Die Mega Millions-Zahlen vom Freitag, 6\. November/);

  const down = await createWorld({ api: fakeOpenData({ fail: true }) });
  t.after(() => down.app.stop());
  const failed = await down.gladys.fake.action(CHECK_ACTION, {});
  assert.match(failed.data.message.en, /The Powerball numbers are not known yet/);
  assert.match(failed.data.message.en, /data\.ny\.gov could not be read/);
});

test('every scene action has a handler, and returns the declared outputs', async (t) => {
  assert.deepEqual(keysOf(manifest.scene_actions), Object.keys(SCENE_ACTIONS));
  assert.deepEqual(handlerKeys('sceneAction:'), Object.keys(SCENE_ACTIONS));
  const world = await createWorld({ config: { mega_millions_grids: '27 34 1 2 3 + 1' } });
  t.after(() => world.app.stop());
  for (const action of manifest.scene_actions) {
    for (const fields of [{}, { game: 'mega_millions' }]) {
      const ack = await world.gladys.fake.sceneAction(action.key, fields);
      assert.equal(ack.success, true);
      assert.deepEqual(Object.keys(ack.data.outputs).sort(), keysOf(action.outputs).sort());
      for (const output of action.outputs) {
        assert.equal(typeof ack.data.outputs[output.key], output.type, output.key);
      }
    }
  }
  const [game] = manifest.scene_actions[0].fields;
  assert.deepEqual(values(game), GAME_KEYS);
  assert.equal(game.default, DEFAULT_GAME);
  const ack = await world.gladys.fake.sceneAction('read_last_draw', { game: 'mega_millions' });
  assert.equal(ack.data.outputs.best_tier, 7);
  assert.equal(ack.data.outputs.numbers, '27 34 44 53 64 + 01');
});

test('the scene triggers fired are the declared ones, with their filters and variables', async (t) => {
  assert.deepEqual(keysOf(manifest.scene_triggers).sort(), Object.values(TRIGGERS).sort());
  for (const declared of manifest.scene_triggers) {
    assert.deepEqual(values(declared.fields[0]), GAME_KEYS, `${declared.key}: games`);
  }
  const matches = trigger(TRIGGERS.NUMBERS_MATCHED).fields[1];
  assert.deepEqual(values(matches), ['0', '1', '2', '3', '4', '5', '6']);
  assert.equal(matches.required, true, 'an empty filter would match every draw');
  const tiers = trigger(TRIGGERS.WINNING_LINE).fields[1];
  assert.deepEqual(
    values(tiers),
    Array.from({ length: TIERS }, (_, i) => String(i + 1)),
  );

  const api = fakeOpenData({ skip: 1 });
  const world = await createWorld({
    config: { powerball_grids: '15 34 41 1 2 + 21' },
    at: '2026-11-07T10:00:00Z',
    api,
  });
  t.after(() => world.app.stop());
  api.skip = 0;
  await world.runUntil('2026-11-07T11:01:00Z');
  const fired = new Map(world.gladys.fake.sceneEvents.map((event) => [event.key, event.data]));
  assert.deepEqual([...fired.keys()].sort(), Object.values(TRIGGERS).sort());
  for (const declared of manifest.scene_triggers) {
    const data = fired.get(declared.key);
    // Filters match keys of `data` (strings, like the options), variables read keys of `data`.
    for (const field of declared.fields) {
      assert.ok(field.key in data, `${declared.key}: filter "${field.key}" is in the event data`);
      assert.ok(values(field).includes(data[field.key]), `${declared.key}.${field.key}`);
    }
    for (const variable of declared.variables) {
      assert.equal(typeof data[variable.key], variable.type, `${declared.key}.${variable.key}`);
    }
  }
});

test('every widget has a handler, and its settings match the code', () => {
  assert.deepEqual(keysOf(manifest.widgets), [WIDGET_KEY]);
  assert.deepEqual(Object.keys(WIDGETS), [WIDGET_KEY]);
  assert.deepEqual(handlerKeys('widget:'), [WIDGET_KEY]);
  const [games, ...toggles] = manifest.widgets[0].settings;
  assert.deepEqual(values(games), GAME_KEYS);
  assert.deepEqual(keysOf(toggles), ['show_lines', 'show_next_draws', 'show_notice']);
  for (const toggle of toggles) {
    assert.equal(toggle.type, 'boolean');
    assert.equal(toggle.default, true);
  }
});

test('config_schema defaults and options stay consistent with the code', () => {
  for (const entry of manifest.config_schema) {
    if (entry.default !== undefined) {
      assert.deepEqual(DEFAULT_CONFIG[entry.key], entry.default, `DEFAULT_CONFIG.${entry.key}`);
    }
  }
  assert.deepEqual(
    Object.keys(DEFAULT_CONFIG).sort(),
    manifest.config_schema
      .filter((entry) => entry.type !== 'section')
      .map((entry) => entry.key)
      .sort(),
  );
  const language = manifest.config_schema.find((entry) => entry.key === 'language');
  assert.deepEqual(values(language), LANGUAGES);
});

test('section fields are purely presentational', () => {
  const sections = manifest.config_schema.filter((entry) => entry.type === 'section');
  assert.ok(sections.length > 0);
  for (const section of sections) {
    assert.equal(section.required, undefined);
    assert.equal(section.default, undefined);
    for (const link of section.links ?? []) {
      assert.match(link.url, /^https:\/\//);
    }
  }
});

test('number fields have integer bounds and defaults (the form has no step)', () => {
  for (const entry of allFields.filter((f) => f.type === 'number')) {
    for (const key of ['min', 'max', 'default']) {
      if (entry[key] !== undefined) {
        assert.ok(Number.isInteger(entry[key]), `field "${entry.key}".${key}`);
      }
    }
  }
});

test('no secret field anywhere: nothing here is secret', () => {
  assert.ok(allFields.every((entry) => entry.type !== 'secret'));
});

test('the manifest version is the package version, and the image is tagged with it', () => {
  assert.equal(manifest.version, pkg.version);
  assert.ok(manifest.docker_image.endsWith(`:${manifest.version}`));
});

test('the catalog description holds 10 to 100 characters per language', () => {
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(text.length >= 10 && text.length <= 100, `description.${lang}: ${text.length}`);
  }
});
