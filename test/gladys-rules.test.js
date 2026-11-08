// -----------------------------------------------------------------------------
// Conformity with the Gladys core, on the device published for realistic
// configurations: without favorites, with a favorite driver and team, in
// every feature-name language, with and without lines, before any data.
//
// The table (test/fixtures/gladys-feature-table.json) is extracted from the
// core code: a category/type couple missing there shows as "undefined" or
// without icon in Gladys, a poll frequency outside its list is a 400 on
// discovery, a feature without min/max is a 422 on "Add to Gladys".
// Do not loosen this test to make it pass: fix the integration.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createWorld, fakeOpenData } from './helpers/world.js';

const table = JSON.parse(
  await readFile(new URL('./fixtures/gladys-feature-table.json', import.meta.url), 'utf8'),
);

const scenarios = [
  { label: 'no lines, French names', config: {} },
  {
    label: 'lines for both games, English names',
    config: {
      language: 'en',
      powerball_grids: '15 34 41 1 2 + 21; 1 2 3 4 5 + 6',
      mega_millions_grids: '27 34 1 2 3 + 1',
    },
  },
  {
    label: 'Powerball lines only, German names',
    config: { language: 'de', powerball_grids: '1 2 3 4 5 + 6' },
  },
  {
    label: 'Mega Millions lines only, Spanish names',
    config: { language: 'es', mega_millions_grids: '1 2 3 4 5 + 6' },
  },
  {
    label: 'lines partly wrong, before any data',
    config: { powerball_grids: '1 2 3 4 5 + 6; 1 2 3', mega_millions_grids: 'x' },
    api: () => fakeOpenData({ fail: true }),
  },
];

for (const scenario of scenarios) {
  test(`the published device follows the Gladys rules (${scenario.label})`, async () => {
    const { gladys, app } = await createWorld({
      config: scenario.config,
      at: scenario.at,
      api: scenario.api?.(),
    });
    try {
      const devices = gladys.fake.discoveredDevices;
      assert.equal(devices.length, 2, 'one device per game');

      for (const device of devices) {
        const where = device.name;

        // should_poll: true if and only if poll_frequency is provided, in ms.
        if (device.poll_frequency === undefined) {
          assert.notEqual(device.should_poll, true, `${where}: should_poll without poll_frequency`);
        } else {
          assert.equal(device.should_poll, true, `${where}: poll_frequency without should_poll`);
          assert.ok(
            table.poll_frequencies_ms.includes(device.poll_frequency),
            `${where}: poll_frequency ${device.poll_frequency} is not one of ${table.poll_frequencies_ms}`,
          );
        }

        assert.ok(device.features.length > 0, `${where}: no feature`);
        const externalIds = new Set();
        const names = new Set();
        for (const feature of device.features) {
          const at = `${where} / ${feature.name}`;
          const pair = table.pairs[`${feature.category}/${feature.type}`];
          assert.ok(
            pair,
            `${at}: ${feature.category}/${feature.type} is not a couple Gladys knows`,
          );
          assert.ok(
            pair.label_en && pair.label_fr && pair.icon,
            `${at}: couple without label or icon`,
          );

          assert.equal(typeof feature.min, 'number', `${at}: min must be a number`);
          assert.equal(typeof feature.max, 'number', `${at}: max must be a number`);
          assert.ok(
            Number.isFinite(feature.min) && Number.isFinite(feature.max),
            `${at}: finite min/max`,
          );
          assert.ok(feature.min <= feature.max, `${at}: min > max`);
          assert.equal(typeof feature.read_only, 'boolean', `${at}: read_only must be a boolean`);
          assert.equal(
            typeof feature.has_feedback,
            'boolean',
            `${at}: has_feedback must be a boolean`,
          );
          if (feature.unit !== undefined) {
            assert.ok(table.units.includes(feature.unit), `${at}: unknown unit ${feature.unit}`);
          }

          assert.ok(!externalIds.has(feature.external_id), `${at}: duplicate external_id`);
          externalIds.add(feature.external_id);
          assert.ok(!names.has(feature.name), `${at}: duplicate feature name on the device`);
          names.add(feature.name);
        }

        // Gladys shows the generic label of the type when a feature is alone
        // of its type on the device (front/src/utils/device.js): every
        // feature must share its type with another one.
        for (const feature of device.features) {
          const sameType = device.features.filter((other) => other.type === feature.type);
          assert.ok(sameType.length > 1, `${where} / ${feature.name}: alone of its type`);
        }
      }
    } finally {
      await app.stop();
    }
  });
}
