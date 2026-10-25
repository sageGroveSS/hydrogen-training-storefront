import assert from 'node:assert/strict';
import {
  parseCollectionFilters,
  filterInputParam,
  CATALOG_SORT_OPTIONS,
} from '../app/lib/collectionFilters.ts';

const parse = (query, sorts) =>
  parseCollectionFilters(new URLSearchParams(query), sorts);
assert.deepEqual(parse('').filters, []);
assert.equal(parse('').sort.sortKey, 'COLLECTION_DEFAULT');
assert.deepEqual(
  parse(
    'filter.v.availability=0&filter.v.price.gte=0&filter.v.price.lte=99.5&sort_by=price-descending',
  ).filters,
  [{available: false}, {price: {min: 0, max: 99.5}}],
);
assert.equal(parse('sort_by=price-descending').sort.reverse, true);
assert.deepEqual(
  parse(
    'filter.v.option.Color=Ivory&filter.v.option.Color=Charcoal&filter.p.product_type=Storage&filter.p.m.custom.material=Linen&cursor=old',
  ).filters,
  [
    {variantOption: {name: 'Color', value: 'Ivory'}},
    {variantOption: {name: 'Color', value: 'Charcoal'}},
    {productType: 'Storage'},
    {productMetafield: {namespace: 'custom', key: 'material', value: 'Linen'}},
  ],
);
assert.deepEqual(
  parse('filter.v.price.gte=&filter.v.price.lte=&utm_source=test').filters,
  [],
);
for (const filter of [
  {available: true},
  {available: false},
  {productType: 'Tables'},
  {productVendor: 'Studio'},
  {tag: 'New'},
  {variantOption: {name: 'Color', value: 'Ivory / cream'}},
  {variantMetafield: {namespace: 'custom', key: 'size', value: 'Large'}},
]) {
  const param = filterInputParam(JSON.stringify(filter));
  assert.ok(param);
  assert.deepEqual(
    parseCollectionFilters(new URLSearchParams([param])).filters,
    [filter],
  );
  assert.deepEqual(filterInputParam(filter), param);
}
for (const query of [
  'sort_by=invalid',
  'filter.v.availability=true',
  'filter.v.option.=Blue',
  'filter.v.price.gte=-1',
  'filter.v.price.lte=NaN',
  'filter.v.price.gte=Infinity',
  'filter.v.price.gte=10&filter.v.price.lte=5',
  'filter.unknown=x',
  Array.from({length: 26}, () => 'filter.p.tag=a').join('&'),
])
  assert.throws(
    () => parse(query),
    (error) => error instanceof Response && error.status === 400,
  );
assert.throws(
  () => parse('sort_by=newest', CATALOG_SORT_OPTIONS),
  (error) => error.status === 400,
);
console.warn(
  'Collection filters: URL parsing, facet round trips, sort mapping and invalid inputs passed.',
);
