import assert from 'node:assert/strict';
import {
  wishlistIds,
  updateWishlist,
  WISHLIST_LIMIT,
} from '../app/lib/wishlist.ts';
import {saveCustomerWishlist} from '../app/lib/wishlist.server.ts';
const a = 'gid://shopify/Product/1',
  b = 'gid://shopify/Product/2',
  c = 'gid://shopify/Product/3';
assert.deepEqual(wishlistIds([a, a]), [a]);
for (const invalid of [
  null,
  {},
  [1],
  ['gid://shopify/Customer/1'],
  ['https://other.test'],
  ['gid://shopify/Product/0'],
  Array(101).fill(a),
])
  assert.throws(() => wishlistIds(invalid));
assert.deepEqual(updateWishlist([a, b], 'merge', [b, c]), [a, b, c]);
assert.deepEqual(updateWishlist([a, b], 'remove', [a]), [b]);
assert.deepEqual(updateWishlist([a, b], 'add', [a]), [a, b]);
assert.throws(() =>
  updateWishlist(
    Array.from(
      {length: WISHLIST_LIMIT},
      (_, n) => `gid://shopify/Product/${n + 1}`,
    ),
    'add',
    ['gid://shopify/Product/101'],
  ),
);
let stored = [a],
  digest = 'v1',
  mutations = 0,
  conflict = true;
const account = {
  async query() {
    return {
      data: {
        customer: {
          id: 'gid://shopify/Customer/42',
          wishlist: {value: JSON.stringify(stored), compareDigest: digest},
        },
      },
    };
  },
  async mutate(
    _query,
    {
      variables: {
        metafields: [input],
      },
    },
  ) {
    mutations++;
    assert.equal(input.ownerId, 'gid://shopify/Customer/42');
    assert.equal(input.namespace, 'custom');
    assert.equal(input.key, 'wishlist');
    assert.equal(input.type, 'list.product_reference');
    assert.equal(input.compareDigest, digest);
    if (conflict) {
      conflict = false;
      stored = [a, c];
      digest = 'v2';
      return {data: {metafieldsSet: {userErrors: [{code: 'STALE_OBJECT'}]}}};
    }
    stored = JSON.parse(input.value);
    digest = 'v3';
    return {
      data: {
        metafieldsSet: {metafields: [{value: input.value}], userErrors: []},
      },
    };
  },
};
assert.deepEqual(await saveCustomerWishlist(account, 'merge', [b]), [a, c, b]);
assert.equal(mutations, 2);
assert.deepEqual(await saveCustomerWishlist(account, 'add', [b]), [a, c, b]);
assert.equal(mutations, 2);
assert.deepEqual(await saveCustomerWishlist(account, 'remove', [a]), [c, b]);
let retries = 0;
await assert.rejects(
  saveCustomerWishlist(
    {
      ...account,
      async mutate() {
        retries++;
        return {
          data: {
            metafieldsSet: {userErrors: [{code: 'INVALID_COMPARE_DIGEST'}]},
          },
        };
      },
    },
    'add',
    [a],
  ),
  /another window/,
);
assert.equal(retries, 3);
await assert.rejects(
  saveCustomerWishlist(
    {
      ...account,
      async query() {
        return {errors: [{message: 'private error'}]};
      },
    },
    'merge',
    [],
  ),
  /could not be loaded/,
);
await assert.rejects(
  saveCustomerWishlist(
    {
      ...account,
      async mutate() {
        return {
          data: {metafieldsSet: {userErrors: [{code: 'APP_NOT_AUTHORIZED'}]}},
        };
      },
    },
    'add',
    [a],
  ),
  /could not be updated/,
);
let created = false;
await saveCustomerWishlist(
  {
    async query() {
      return {
        data: {customer: {id: 'gid://shopify/Customer/42', wishlist: null}},
      };
    },
    async mutate(
      _q,
      {
        variables: {
          metafields: [input],
        },
      },
    ) {
      assert.equal(input.compareDigest, null);
      created = true;
      return {data: {metafieldsSet: {userErrors: []}}};
    },
  },
  'add',
  [b],
);
assert.equal(created, true);
console.warn(
  'Wishlist: ID validation, limits, duplicate-safe merge, removal, server-bound owner, conflict retries, first write and API failures passed.',
);
