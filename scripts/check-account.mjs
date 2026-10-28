import assert from 'node:assert/strict';
import {ACCOUNT_COUNTRIES} from '../app/lib/countries.ts';
import {
  parseOrderFilters,
  buildOrderSearchQuery,
} from '../app/lib/orderFilters.ts';
import {
  AccountError,
  isAccountPath,
  accountHeaders,
  profileInput,
  addressInput,
  formCheckbox,
} from '../app/lib/account.ts';
import {
  accountForm,
  accountFailure,
  loadPreferences,
  savePreferences,
  saveProfile,
  saveAddress,
} from '../app/lib/account.server.ts';
const form = (value) => new URLSearchParams(value);
const customerId = 'gid://shopify/Customer/42';
let customer = {id: customerId, saleAlerts: null, backInStock: null};
let writes = [];
const account = {
  i18n: {language: 'EN'},
  async isLoggedIn() {
    return true;
  },
  async query() {
    return {data: {customer}};
  },
  async mutate(query, options) {
    writes.push({query, ...options});
    return {data: {metafieldsSet: {userErrors: [], metafields: []}}};
  },
};
assert.deepEqual((await loadPreferences(account)).values, {
  saleAlerts: false,
  backInStock: false,
});
await savePreferences(
  account,
  form({saleAlertsVersion: '', backInStockVersion: ''}),
);
assert.equal(writes.length, 0);
customer = {
  id: customerId,
  saleAlerts: {value: 'true', compareDigest: 'sales-v1'},
  backInStock: {value: 'false', compareDigest: 'stock-v1'},
};
assert.deepEqual((await loadPreferences(account)).values, {
  saleAlerts: true,
  backInStock: false,
});
await savePreferences(
  account,
  form({
    customerId: 'attacker',
    backInStock: 'true',
    saleAlertsVersion: 'sales-v1',
    backInStockVersion: 'stock-v1',
  }),
);
const inputs = writes[0].variables.metafields;
assert.equal(inputs.length, 2);
assert.ok(
  inputs.every(
    (input) =>
      input.ownerId === customerId &&
      input.namespace === 'custom' &&
      input.type === 'boolean',
  ),
);
assert.deepEqual(
  inputs.map((input) => [input.key, input.value, input.compareDigest]),
  [
    ['email_sale_alerts', 'false', 'sales-v1'],
    ['email_back_in_stock', 'true', 'stock-v1'],
  ],
);
await assert.rejects(
  savePreferences(
    account,
    form({saleAlertsVersion: 'old', backInStockVersion: 'stock-v1'}),
  ),
  (error) => error.status === 409,
);
assert.equal(writes.length, 1);
const versions = {
  saleAlertsVersion: 'sales-v1',
  backInStockVersion: 'stock-v1',
};
await assert.rejects(
  savePreferences(
    {
      ...account,
      async mutate() {
        return {data: {metafieldsSet: {userErrors: [{code: 'STALE_OBJECT'}]}}};
      },
    },
    form(versions),
  ),
  (error) => error.status === 409,
);
await assert.rejects(
  savePreferences(
    {
      ...account,
      async mutate() {
        return {
          data: {metafieldsSet: {userErrors: [{code: 'APP_NOT_AUTHORIZED'}]}},
        };
      },
    },
    form(versions),
  ),
  (error) => error.status === 503,
);
await assert.rejects(
  savePreferences(account, form({...versions, saleAlerts: 'false'})),
  AccountError,
  isAccountPath,
);
await assert.rejects(
  loadPreferences({
    ...account,
    async query() {
      return {errors: [{message: 'private internal detail'}]};
    },
  }),
  (error) => error.status === 503 && !error.message.includes('private'),
);
assert.deepEqual(
  profileInput(
    form({firstName: '  李 ', lastName: '', customerId: 'attacker'}),
  ),
  {firstName: '李', lastName: ''},
);
assert.throws(
  () => profileInput(new URLSearchParams('firstName=A&firstName=B')),
  AccountError,
  isAccountPath,
);
assert.throws(
  () => profileInput(form({firstName: 'A'.repeat(81)})),
  AccountError,
  isAccountPath,
);
assert.throws(
  () => profileInput(form({lastName: 'bad\u0000name'})),
  AccountError,
  isAccountPath,
);
const fields = {
  firstName: 'Test',
  lastName: 'Reader',
  address1: 'Example street 1',
  city: 'Kyiv',
  territoryCode: 'ua',
  phoneNumber: '+380501234567',
};
assert.equal(addressInput(form(fields)).territoryCode, 'UA');
assert.equal(addressInput(form(fields)).zoneCode, '');
assert.equal(addressInput(form(fields)).zip, '');
for (const invalid of [
  {...fields, city: ''},
  {...fields, territoryCode: 'ZZZ'},
  {...fields, phoneNumber: 'bad'},
])
  assert.throws(() => addressInput(form(invalid)), AccountError);
assert.equal(formCheckbox(form({}), 'defaultAddress'), false);
const addressId = 'gid://shopify/CustomerAddress/123';
const addressAccount = {
  ...account,
  async query() {
    return {
      data: {customer: {id: customerId, addresses: {nodes: [{id: addressId}]}}},
    };
  },
  async mutate(query, {variables}) {
    writes.push({query, variables});
    return {
      data: {
        customerAddressCreate: {
          customerAddress: {id: addressId},
          userErrors: [],
        },
        customerAddressUpdate: {
          customerAddress: {id: addressId},
          userErrors: [],
        },
        customerAddressDelete: {deletedAddressId: addressId, userErrors: []},
      },
    };
  },
};
let count = writes.length;
await assert.rejects(
  saveAddress(
    addressAccount,
    form({intent: 'delete', addressId: 'gid://shopify/CustomerAddress/999'}),
  ),
  (error) => error.status === 404,
);
assert.equal(writes.length, count);
await saveAddress(
  addressAccount,
  form({...fields, intent: 'create', addressId: 'new', customerId: 'attacker'}),
);
assert.equal(writes.at(-1).variables.address.territoryCode, 'UA');
assert.equal(writes.at(-1).variables.ownerId, undefined);
await saveAddress(
  addressAccount,
  form({...fields, intent: 'update', addressId, defaultAddress: 'true'}),
);
assert.equal(writes.at(-1).variables.addressId, addressId);
assert.equal(writes.at(-1).variables.defaultAddress, true);
await saveAddress(addressAccount, form({intent: 'delete', addressId}));
assert.equal(writes.at(-1).variables.addressId, addressId);
assert.equal(writes.at(-1).variables.address, undefined);
let profile;
await saveProfile(
  {
    ...account,
    async mutate(_query, {variables}) {
      profile = variables;
      return {
        data: {customerUpdate: {customer: {firstName: 'Test'}, userErrors: []}},
      };
    },
  },
  form({firstName: 'Test', lastName: 'Reader', customerId: 'attacker'}),
);
assert.deepEqual(profile.customer, {firstName: 'Test', lastName: 'Reader'});
await assert.rejects(
  saveProfile(
    {
      ...account,
      async mutate() {
        return {
          data: {
            customerUpdate: {customer: null, userErrors: [{message: 'failed'}]},
          },
        };
      },
    },
    form({}),
  ),
  AccountError,
  isAccountPath,
);
const request = (init = {}) =>
  new Request('https://store.test/account/preferences', {
    method: 'POST',
    headers: {
      Origin: 'https://store.test',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'saleAlerts=true',
    ...init,
  });
assert.equal((await accountForm(request(), account)).get('saleAlerts'), 'true');
await assert.rejects(
  accountForm(new Request('https://store.test/account/preferences'), account),
  (error) => error.status === 405,
);
await assert.rejects(
  accountForm(request(), {
    async isLoggedIn() {
      return false;
    },
  }),
  (error) => error.status === 401,
);
await assert.rejects(
  accountForm(request({headers: {Origin: 'https://other.test'}}), account),
  (error) => error.status === 403,
);
await assert.rejects(
  accountForm(
    request({
      headers: {
        Origin: 'https://store.test',
        'Content-Type': 'application/json',
      },
    }),
    account,
  ),
  (error) => error.status === 415,
);
await assert.rejects(
  accountForm(request({body: 'x'.repeat(16385)}), account),
  (error) => error.status === 413,
);
assert.equal(
  accountFailure(new Error('private detail')).error.includes('private'),
  false,
);
const headers = accountHeaders({
  actionHeaders: new Headers({'Retry-After': '600'}),
});
assert.equal(headers.get('Cache-Control'), 'private, no-store');
assert.equal(headers.get('Retry-After'), '600');
assert.match(headers.get('X-Robots-Tag'), /noindex/);
console.warn(
  'Account: opt-out defaults, saved preferences, atomic owner-bound writes, stale forms, profile/address validation, address ownership, auth/CSRF/body limits and private headers passed.',
);

assert.throws(
  () => parseOrderFilters(form({name: 'x'.repeat(65)})),
  RangeError,
);
assert.throws(
  () => parseOrderFilters(new URLSearchParams('name=a&name=b')),
  RangeError,
);
assert.equal(
  buildOrderSearchQuery(
    parseOrderFilters(form({name: '#1001', confirmation_number: 'AB-2'})),
  ),
  'name:1001 AND confirmation_number:AB-2',
);

for (const path of [
  '/account',
  '/account.data',
  '/account/preferences',
  '/account/authorize',
])
  assert.equal(isAccountPath(path), true);
for (const path of ['/accounting', '/products/account', '/admin/reviews'])
  assert.equal(isAccountPath(path), false);

await assert.rejects(
  saveAddress(
    {
      ...addressAccount,
      async mutate() {
        return {
          data: {
            customerAddressCreate: {
              customerAddress: null,
              userErrors: [{message: 'Postal code is required.'}],
            },
          },
        };
      },
    },
    form({...fields, intent: 'create', addressId: 'new'}),
  ),
  /Postal code is required/,
);

assert.equal(
  new Set(ACCOUNT_COUNTRIES.map((country) => country.code)).size,
  ACCOUNT_COUNTRIES.length,
);
assert.ok(
  ACCOUNT_COUNTRIES.some(
    (country) => country.code === 'UA' && country.name === 'Ukraine',
  ),
);
assert.ok(
  ACCOUNT_COUNTRIES.every(
    (country) => /^[A-Z]{2}$/.test(country.code) && country.name,
  ),
);
