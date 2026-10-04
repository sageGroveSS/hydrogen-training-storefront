import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import type {
  FeaturedCollectionFragment,
  LookbookProductQuery,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {MockShopNotice} from '~/components/MockShopNotice';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Hydrogen | Systems for living'},
    {
      name: 'description',
      content:
        'A product-first furniture storefront built with Hydrogen, Remix, and Shopify commerce data.',
    },
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
async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    featuredCollection: collections.nodes[0],
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });
  const lookbookProduct = context.storefront
    .query(LOOKBOOK_PRODUCT_QUERY)
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  return {
    recommendedProducts,
    lookbookProduct,
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="home storefront-home">
      {data.isShopLinked ? null : <MockShopNotice />}
      <HomeHero collection={data.featuredCollection} />
      <CategoryNavigation />
      <RecommendedProducts products={data.recommendedProducts} />
      <SystemsEditorial />
      <HomeTimeline />
      <LookbookPreview product={data.lookbookProduct} />
    </div>
  );
}

function HomeHero({
  collection,
}: {
  collection: FeaturedCollectionFragment;
}) {
  if (!collection) return null;
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero-media">
        <img
          src="/images/furniture-hero.jpg"
          alt="Modular sofa, coffee table, shelving, and rug in a sunlit living room"
        />
      </div>
      <div className="home-hero-copy">
        <p className="section-kicker">Furniture systems</p>
        <h1 id="home-hero-title">Rooms that adapt around real life.</h1>
        <p>
          Start with modular living room essentials, then tune the details with
          durable materials, compact storage, and calm silhouettes.
        </p>
        <div className="home-hero-actions">
          <Link to={`/collections/${collection.handle}`}>Shop featured</Link>
          <Link to="/collections/all">Browse all</Link>
        </div>
      </div>
    </section>
  );
}

function CategoryNavigation() {
  const categories = [
    {title: 'Living room', to: '/collections/living-room-featured'},
    {title: 'Storage', to: '/collections/all?filter.p.product_type=Storage'},
    {title: 'Tables', to: '/collections/all?filter.p.product_type=Tables'},
    {title: 'Textiles', to: '/collections/all?filter.p.product_type=Textiles'},
  ];

  return (
    <nav className="home-category-nav" aria-label="Featured categories">
      {categories.map((category) => (
        <Link key={category.title} to={category.to}>
          <span>{category.title}</span>
          <span aria-hidden="true">-&gt;</span>
        </Link>
      ))}
    </nav>
  );
}

function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <section
      className="home-product-rail recommended-products"
      aria-labelledby="recommended-products"
    >
      <div className="section-heading">
        <p className="section-kicker">New in store</p>
        <h2 id="recommended-products">Pieces with a job to do.</h2>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={products}>
          {(response) => (
            <div className="recommended-products-grid">
              {response
                ? response.products.nodes.map((product) => (
                    <ProductItem key={product.id} product={product} />
                  ))
                : null}
            </div>
          )}
        </Await>
      </Suspense>
      <br />
    </section>
  );
}

function SystemsEditorial() {
  return (
    <section className="systems-editorial" aria-labelledby="systems-title">
      <div>
        <p className="section-kicker">Systems for living</p>
        <h2 id="systems-title">Designed as a set, useful one piece at a time.</h2>
      </div>
      <p>
        The storefront structure now supports reusable commerce sections: product
        rails, editorial panels, review modules, and interaction-ready content
        blocks that can move toward Shopify metafields or CMS data later.
      </p>
      <Link to="/collections/all">Shop the catalog</Link>
    </section>
  );
}

function HomeTimeline() {
  const steps = [
    ['Choose a system', 'Start from a room, collection, or single product.'],
    ['Tune the details', 'Compare sizes, finishes, availability, and price.'],
    ['Checkout in Shopify', 'Cart stays native and leads to Shopify checkout.'],
  ];

  return (
    <section className="home-timeline" aria-labelledby="timeline-title">
      <div className="section-heading">
        <p className="section-kicker">Buying flow</p>
        <h2 id="timeline-title">A short path from browse to checkout.</h2>
      </div>
      <ol>
        {steps.map(([title, body]) => (
          <li key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function LookbookPreview({
  product,
}: {
  product: Promise<LookbookProductQuery | null>;
}) {
  return (
    <section className="lookbook-preview" aria-labelledby="lookbook-title">
      <Suspense fallback={null}>
        <Await resolve={product}>
          {(response) => {
            const featured = response?.products.nodes[0];
            if (!featured) return null;

            return (
              <>
                <div className="lookbook-media">
                  <img
                    src="/images/furniture-lookbook.jpg"
                    alt="Wood side table with black metal legs beside a sofa"
                  />
                  <Link
                    className="lookbook-hotspot"
                    to={`/products/${featured.handle}`}
                    aria-label={`View ${featured.title}`}
                  >
                    <span aria-hidden="true" />
                  </Link>
                </div>
                <div className="lookbook-copy">
                  <p className="section-kicker">Lookbook</p>
                  <h2 id="lookbook-title">Inspect the room, then jump to the piece.</h2>
                  <p>
                    Hotspots are built as accessible links first, so the section
                    keeps working with keyboard navigation and without custom
                    client state.
                  </p>
                </div>
              </>
            );
          }}
        </Await>
      </Suspense>
    </section>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;

const LOOKBOOK_PRODUCT_QUERY = `#graphql
  fragment LookbookProduct on Product {
    id
    title
    handle
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query LookbookProduct ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...LookbookProduct
      }
    }
  }
` as const;
