import type {Route} from './+types/collections.all';
import {useLoaderData} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductItem} from '~/components/ProductItem';
import {CollectionFilters} from '~/components/CollectionFilters';
import {
  CATALOG_SORT_OPTIONS,
  parseCollectionFilters,
} from '~/lib/collectionFilters';
import type {CollectionItemFragment} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: 'Products | Collections'},
    {tagName: 'link', rel: 'canonical', href: data?.canonicalUrl},
    ...(data?.filtered ? [{name: 'robots', content: 'noindex,follow'}] : []),
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const url = new URL(request.url);
  const {filters, sort} = parseCollectionFilters(
    url.searchParams,
    CATALOG_SORT_OPTIONS,
  );
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  const [{products}] = await Promise.all([
    storefront.query(CATALOG_QUERY, {
      variables: {
        ...paginationVariables,
        filters,
        sortKey: sort.sortKey === 'PRICE' ? 'PRICE' : 'RELEVANCE',
        reverse: sort.reverse,
      },
      cache: storefront.CacheShort(),
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);
  return {
    products,
    canonicalUrl: `${url.origin}${url.pathname}`,
    filtered: filters.length > 0 || sort.value !== 'featured',
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Collection() {
  const {products} = useLoaderData<typeof loader>();

  return (
    <div className="collection">
      <h1>Products</h1>
      <CollectionFilters
        filters={products.productFilters}
        sortOptions={CATALOG_SORT_OPTIONS}
      >
        {!products.nodes.length && (
          <p role="status">
            No products match these filters. Try clearing a filter.
          </p>
        )}
        <PaginatedResourceSection<CollectionItemFragment>
          connection={products}
          resourcesClassName="products-grid"
        >
          {({node: product, index}) => (
            <ProductItem
              key={product.id}
              product={product}
              loading={index === 0 ? 'eager' : 'lazy'}
              sizes="(min-width: 80em) 300px, (min-width: 64em) calc((100vw - 25.5rem) / 2), calc((100vw - 5.25rem) / 2)"
            />
          )}
        </PaginatedResourceSection>
      </CollectionFilters>
    </div>
  );
}

const COLLECTION_ITEM_FRAGMENT = `#graphql
  fragment MoneyCollectionItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment CollectionItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyCollectionItem
      }
      maxVariantPrice {
        ...MoneyCollectionItem
      }
    }
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/product
const CATALOG_QUERY = `#graphql
  query Catalog(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $filters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    products: search(query: "", types: [PRODUCT], first: $first, last: $last, before: $startCursor, after: $endCursor, productFilters: $filters, sortKey: $sortKey, reverse: $reverse) {
      productFilters { id label type values { id label count input } }
      nodes {
        ...on Product { ...CollectionItem }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${COLLECTION_ITEM_FRAGMENT}
` as const;
