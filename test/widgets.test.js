// -----------------------------------------------------------------------------
// The "US lotteries" widget: valid for the core whatever the settings, in the
// language of the viewer, with the names given in Gladys.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { WIDGET_KEY } from '../src/service.js';
import { createWorld, fakeOpenData } from './helpers/world.js';

const LINES = {
  powerball_grids: '15 34 41 1 2 + 21; 1 2 3 4 5 + 6',
  mega_millions_grids: '1 2 3 4 5 + 9',
};

/** The content a dashboard receives. */
async function widget(world, request) {
  const ack = await world.gladys.fake.widgetGet(WIDGET_KEY, request);
  assert.equal(ack.success, true, ack.error);
  return ack.data.content;
}

const SETTINGS = [
  {},
  { games: ['powerball'] },
  { games: ['mega_millions'], show_lines: false },
  { show_next_draws: false, show_notice: false },
  { games: ['unknown'] },
];

test('the content is valid for every setting and language', async (t) => {
  const world = await createWorld({ config: LINES });
  t.after(() => world.app.stop());
  for (const settings of SETTINGS) {
    for (const language of ['en', 'fr', 'de', 'es', 'it']) {
      const content = await widget(world, { settings, language });
      assert.deepEqual(validateWidgetContent(content), [], JSON.stringify(settings));
    }
  }
});

test('the last numbers, the lines line by line, the next draws', async (t) => {
  const world = await createWorld({ config: LINES });
  t.after(() => world.app.stop());
  const content = await widget(world, { settings: {}, language: 'en' });
  const [list, status, caption] = content.components;
  assert.equal(list.type, 'card-list');
  assert.deepEqual(list.items[0], {
    title: 'Powerball · Wed, Nov 4',
    subtitle: '15 34 41 53 56 + 21 · Power Play ×2',
    badge: { text: '3 + Powerball', color: 'success' },
    description:
      'Line 1: 01 02 15 34 41 + 21 → 3 + Powerball (tier 5)\n' +
      'Line 2: 01 02 03 04 05 + 06 → 0 matched',
  });
  assert.deepEqual(list.items[1].badge, { text: 'No prize', color: 'neutral' });
  assert.equal(status.type, 'status');
  assert.deepEqual(
    status.items.map((item) => [item.label, item.value]),
    [
      ['Next draw · Powerball', 'Tue, Nov 10 · 04:59'],
      ['Next draw · Mega Millions', 'Wed, Nov 11 · 05:00'],
    ],
  );
  assert.equal(caption.variant, 'caption');

  const hidden = await widget(world, {
    settings: {
      games: ['mega_millions'],
      show_lines: false,
      show_next_draws: false,
      show_notice: false,
    },
    language: 'fr',
  });
  assert.equal(hidden.components.length, 1);
  assert.deepEqual(hidden.components[0].items, [
    { title: 'Mega Millions · ven. 6 nov.', subtitle: '27 34 44 53 64 + 01' },
  ]);
});

test('a device renamed in Gladys keeps its name; no data yet says so', async (t) => {
  const named = await createWorld();
  t.after(() => named.app.stop());
  const [powerball] = named.gladys.fake.discoveredDevices;
  await named.gladys.fake.deviceCreated({ ...powerball, name: 'Loto US' });
  const content = await widget(named, { settings: {}, language: 'fr' });
  assert.match(content.components[0].items[0].title, /^Loto US · /);

  const empty = await createWorld({ api: fakeOpenData({ fail: true }) });
  t.after(() => empty.app.stop());
  const nothing = await widget(empty, { settings: {}, language: 'de' });
  assert.equal(nothing.components[0].type, 'text');
  assert.match(nothing.components[0].text, /noch nicht bekannt/);
  assert.deepEqual(validateWidgetContent(nothing), []);
});
