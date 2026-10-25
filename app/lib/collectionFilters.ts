import type {
  ProductCollectionSortKeys,
  ProductFilter,
} from '@shopify/hydrogen/storefront-api-types';

export const COLLECTION_SORT_OPTIONS = [
  {
    value: 'featured',
    label: 'Featured',
    sortKey: 'COLLECTION_DEFAULT',
    reverse: false,
  },
  {
    value: 'price-ascending',
    label: 'Price: low to high',
    sortKey: 'PRICE',
    reverse: false,
  },
  {
    value: 'price-descending',
    label: 'Price: high to low',
    sortKey: 'PRICE',
    reverse: true,
  },
  {
    value: 'best-selling',
    label: 'Best selling',
    sortKey: 'BEST_SELLING',
    reverse: false,
  },
  {
    value: 'title-ascending',
    label: 'Name: A–Z',
    sortKey: 'TITLE',
    reverse: false,
  },
  {
    value: 'title-descending',
    label: 'Name: Z–A',
    sortKey: 'TITLE',
    reverse: true,
  },
  {value: 'newest', label: 'Newest', sortKey: 'CREATED', reverse: true},
] satisfies Array<{
  value: string;
  label: string;
  sortKey: ProductCollectionSortKeys;
  reverse: boolean;
}>;

export const CATALOG_SORT_OPTIONS = COLLECTION_SORT_OPTIONS.slice(0, 3);

export function parseCollectionFilters(
  params: URLSearchParams,
  sortOptions = COLLECTION_SORT_OPTIONS,
) {
  const invalid = () =>
    new Response('Invalid collection filters or sort order.', {status: 400});
  const sort = sortOptions.find(
    ({value}) => value === (params.get('sort_by') || 'featured'),
  );
  if (!sort) throw invalid();
  const filters: ProductFilter[] = [];
  const price: {min?: number; max?: number} = {};
  if (
    [...params.keys()].filter((name) => name.startsWith('filter.')).length > 25
  )
    throw invalid();

  for (const [name, value] of params) {
    if (!name.startsWith('filter.') || !value.trim()) continue;
    if (filters.length >= 25 || name.length > 255 || value.length > 512)
      throw invalid();
    if (name === 'filter.v.price.gte' || name === 'filter.v.price.lte') {
      const amount = Number(value);
      if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        amount > Number.MAX_SAFE_INTEGER
      )
        throw invalid();
      price[name.endsWith('.gte') ? 'min' : 'max'] = amount;
    } else if (
      name === 'filter.v.availability' &&
      (value === '1' || value === '0')
    ) {
      filters.push({available: value === '1'});
    } else if (name === 'filter.p.product_type') {
      filters.push({productType: value});
    } else if (name === 'filter.p.vendor') {
      filters.push({productVendor: value});
    } else if (name === 'filter.p.tag') {
      filters.push({tag: value});
    } else if (name.startsWith('filter.v.option.') && name.slice(16)) {
      filters.push({variantOption: {name: name.slice(16), value}});
    } else {
      const match = /^filter\.([pv])\.m\.([\w-]+)\.([\w-]+)$/.exec(name);
      if (!match) throw invalid();
      filters.push({
        [match[1] === 'p' ? 'productMetafield' : 'variantMetafield']: {
          namespace: match[2],
          key: match[3],
          value,
        },
      });
    }
  }
  if (
    price.min !== undefined &&
    price.max !== undefined &&
    price.min > price.max
  )
    throw invalid();
  if (Object.keys(price).length) filters.push({price});
  return {filters, sort, price};
}

export function filterInputParam(input: unknown): [string, string] | undefined {
  const filter = (
    typeof input === 'string' ? JSON.parse(input) : input
  ) as ProductFilter;
  if (typeof filter.available === 'boolean')
    return ['filter.v.availability', filter.available ? '1' : '0'];
  if (filter.productType) return ['filter.p.product_type', filter.productType];
  if (filter.productVendor) return ['filter.p.vendor', filter.productVendor];
  if (filter.tag) return ['filter.p.tag', filter.tag];
  if (filter.variantOption)
    return [
      `filter.v.option.${filter.variantOption.name}`,
      filter.variantOption.value,
    ];
  for (const [key, prefix] of [
    ['productMetafield', 'p'],
    ['variantMetafield', 'v'],
  ] as const) {
    const field = filter[key];
    if (field)
      return [
        `filter.${prefix}.m.${field.namespace}.${field.key}`,
        field.value,
      ];
  }
}
