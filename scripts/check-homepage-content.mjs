import assert from 'node:assert/strict';
import {parseHomepage, contentUrl} from '../app/lib/homepage-content.ts';
import {definitions} from './seed-shopify-homepage.mjs';

const fields = (values) =>
  Object.entries(values).map(([key, value]) => ({key, value}));
const object = (type, id, values = {}, references = {}) => ({
  __typename: 'Metaobject',
  type,
  id,
  fields: fields(values),
  ...references,
});
const refs = (...nodes) => ({references: {nodes}});
const image = {
  reference: {
    __typename: 'MediaImage',
    image: {
      id: null,
      url: 'https://cdn.shopify.com/test.jpg',
      width: 100,
      height: 100,
    },
  },
};
const product = {
  __typename: 'Product',
  id: 'product',
  title: 'Sofa',
  handle: 'sofa',
};
const hero = object(
  'storefront_hero',
  'hero',
  {title: 'Editable title'},
  {image},
);
const timeline = object(
  'storefront_timeline',
  'timeline',
  {},
  {steps: refs(object('storefront_step', 'step', {title: 'Step'}))},
);
const disabled = object(
  'storefront_hero',
  'disabled',
  {enabled: 'false'},
  {image},
);
const hotspot = (x) =>
  object(
    'storefront_hotspot',
    `spot-${x}`,
    {position_x: x, position_y: '50'},
    {product: {reference: product}},
  );
const lookbook = object(
  'storefront_lookbook',
  'lookbook',
  {},
  {
    scenes: refs(
      object(
        'storefront_scene',
        'scene',
        {title: 'Scene'},
        {
          image,
          hotspots: refs(
            hotspot('40'),
            hotspot('101'),
            hotspot('NaN'),
            hotspot(''),
          ),
        },
      ),
    ),
  },
);
const home = {
  fields: fields({seo_title: 'CMS SEO', seo_description: null}),
  sections: refs(
    timeline,
    disabled,
    hero,
    hero,
    object('unknown', 'unknown'),
    object('constructor', 'prototype'),
    lookbook,
    object('storefront_configurator', 'missing-product'),
  ),
};
const page = parseHomepage(home);
assert.equal(page.title, 'CMS SEO');
assert.equal(page.description, '');
assert.deepEqual(
  page.sections.map((section) => section.id),
  ['timeline', 'hero', 'hero', 'lookbook'],
);
assert.equal(page.sections[1].title, 'Editable title');
assert.equal(page.sections[3].scenes[0].items.length, 1);
assert.equal(page.sections[3].scenes[0].items[0].x, 40);
assert.deepEqual(parseHomepage({fields: [], sections: refs()}).sections, []);
assert.equal(parseHomepage(null), null);
for (const url of [
  'javascript:alert(1)',
  '//evil.example',
  '/\\evil',
  'invalid',
])
  assert.equal(contentUrl(url), undefined);
assert.equal(
  contentUrl('/collections/all?sort=price'),
  '/collections/all?sort=price',
);
assert.equal(
  contentUrl('https://example.com/page'),
  'https://example.com/page',
);
const ids = {};
for (const [type] of definitions(ids)) {
  const schema = definitions(ids).find(([name]) => name === type)[1];
  for (const field of schema)
    assert.ok(
      field.key.length >= 2,
      `${type}.${field.key}: Shopify keys need at least two characters`,
    );
  for (const field of schema)
    for (const validation of field.validations ?? [])
      assert.ok(
        validation.value && !validation.value.includes('null'),
        `${type}.${field.key}: unresolved reference`,
      );
  ids[type] =
    `gid://shopify/MetaobjectDefinition/${Object.keys(ids).length + 1}`;
}
assert.equal(Object.keys(ids).length, 15);
assert.equal(
  JSON.parse(
    definitions(ids)
      .at(-1)[1]
      .find((field) => field.key === 'sections').validations[0].value,
  ).length,
  9,
);
console.warn(
  'Homepage checks passed: CMS ordering, repeated sections, guards, URLs, references.',
);
