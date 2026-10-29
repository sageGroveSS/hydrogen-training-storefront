import assert from 'node:assert/strict';
import {loadConfiguratorProducts} from '../app/lib/content.server.ts';

const calls = [];
const result = {nodes: []};
const storefront = {
  CacheShort: () => ({mode: 'short'}),
  query: async (_, options) => {
    calls.push(options);
    return result;
  },
};
assert.equal(await loadConfiguratorProducts(storefront, {sections: []}), null);
assert.equal(calls.length, 0);
const section = {kind: 'configurator', product: {id: 'sofa'}};
assert.equal(
  await loadConfiguratorProducts(storefront, {
    sections: [section, section, {kind: 'products', product: {id: 'table'}}],
  }),
  result,
);
assert.deepEqual(calls, [{variables: {ids: ['sofa']}, cache: {mode: 'short'}}]);
const originalError = console.error;
console.error = () => {};
try {
  assert.equal(
    await loadConfiguratorProducts(
      {
        ...storefront,
        query: async () => {
          throw new Error('Unavailable');
        },
      },
      {sections: [section]},
    ),
    null,
  );
} finally {
  console.error = originalError;
}
console.warn(
  'Content: empty sections, deduplicated configurators and query failure fallback passed.',
);
