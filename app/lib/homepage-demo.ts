import type {DemoHomepageQuery} from 'storefrontapi.generated';
import type {HomepageContent, HomepageSection} from './homepage-content';
import {
  CONFIGURATOR_PRODUCT_FRAGMENT,
  HOME_PRODUCT_FRAGMENT,
} from './homepage-query';

// Temporary preview content until storefront_home/home is published in Shopify.
export function demoHomepage(data: DemoHomepageQuery): HomepageContent {
  function section(
    kind: HomepageSection['kind'],
    fields: Partial<HomepageSection>,
  ): HomepageSection {
    return {
      id: `demo-${kind}`,
      kind,
      title: '',
      kicker: '',
      body: '',
      imageCaption: '',
      secondaryCaption: '',
      links: [],
      products: [],
      steps: [],
      scenes: [],
      previewMode: 'image',
      previewTitle: '',
      optionStyles: [],
      ...fields,
    };
  }
  const heroImage = {
    url: '/images/furniture-hero.jpg',
    altText: 'A modular living room',
  };
  const detailImage = {
    url: '/images/furniture-lookbook.jpg',
    altText: 'A side table beside a sofa',
  };
  const catalog = {
    id: 'catalog',
    label: 'Shop the catalog',
    url: '/collections/all',
  };
  const collection = data.collections.nodes[0]?.handle ?? 'all';
  return {
    title: 'Hydrogen | Systems for living',
    description: 'Furniture systems for everyday living.',
    sections: [
      section('hero', {
        title: 'Rooms that adapt around real life.',
        kicker: 'Furniture systems',
        image: heroImage,
        body: 'Start with modular living room essentials, then tune the details with durable materials, compact storage, and calm silhouettes.',
        links: [
          {
            id: 'featured',
            label: 'Shop featured',
            url: `/collections/${collection}`,
          },
          {...catalog, label: 'Browse all'},
        ],
      }),
      section('categories', {
        title: 'Featured categories',
        links: [
          {
            id: 'living',
            label: 'Living room',
            url: '/collections/living-room-featured',
          },
          {
            id: 'storage',
            label: 'Storage',
            url: '/collections/all?filter.p.product_type=Storage',
          },
          {
            id: 'tables',
            label: 'Tables',
            url: '/collections/all?filter.p.product_type=Tables',
          },
          {
            id: 'textiles',
            label: 'Textiles',
            url: '/collections/all?filter.p.product_type=Textiles',
          },
        ],
      }),
      section('products', {
        title: 'Pieces with a job to do.',
        kicker: 'New in store',
        products: data.products.nodes,
      }),
      section('editorial', {
        title: 'Designed as a set, useful one piece at a time.',
        kicker: 'Systems for living',
        body: 'Make space for everyday living. Pair a comfortable sofa with practical storage and a table that keeps the things you love close at hand.',
        links: [catalog],
      }),
      section('parallax', {
        title: 'Less clutter.\nMore living.',
        kicker: 'Room to breathe',
        image: heroImage,
        links: [
          {
            id: 'living',
            label: 'Explore the living room →',
            url: '/collections/living-room-featured',
          },
        ],
      }),
      section('configurator', {
        product: data.sofa ?? undefined,
        kicker: 'Made for your room',
        previewTitle: 'Your configuration',
        previewMode: 'sofa',
        optionStyles: [
          {name: 'Color', value: 'Ivory', color: '#e4e2d8'},
          {name: 'Color', value: 'Charcoal', color: '#424749'},
          {name: 'Size', value: '2-seat', seats: 2},
          {name: 'Size', value: '3-seat', seats: 3},
          {name: 'Material', value: 'Linen', texture: 'Linen'},
          {name: 'Material', value: 'Boucle', texture: 'Boucle'},
        ],
      }),
      section('composition', {
        title: 'Bring it\nall together.',
        kicker: 'Every piece belongs',
        image: heroImage,
        secondaryImage: detailImage,
        imageCaption: 'The whole room',
        secondaryCaption: 'The little details',
        links: [{...catalog, label: 'Find your next piece →'}],
      }),
      section('timeline', {
        title: 'From a first idea\nto feeling at home.',
        kicker: 'Buying flow',
        steps: [
          {
            id: 'foundation',
            title: 'Find your foundation',
            body: 'A sofa to sink into. A table to gather around. Start with the piece your room needs most.',
          },
          {
            id: 'details',
            title: 'Make it yours',
            body: 'Choose the size, fabric, and finish that fit your space and the way you live.',
          },
          {
            id: 'everyday',
            title: 'Settle into everyday',
            body: 'Bring your pieces together, make yourself comfortable, and let life fill the room.',
          },
        ],
      }),
      section('lookbook', {
        title: 'A room worth a closer look.',
        kicker: 'Lookbook',
        scenes: [
          {
            id: 'corner',
            title: 'The reading corner',
            image: detailImage,
            items: [
              ...(data.table
                ? [{id: 'table', product: data.table, x: 56, y: 52}]
                : []),
              ...(data.sofa
                ? [{id: 'sofa', product: data.sofa, x: 17, y: 40}]
                : []),
            ],
          },
          {
            id: 'room',
            title: 'The living room',
            image: heroImage,
            items: [
              ...(data.sofa
                ? [{id: 'sofa', product: data.sofa, x: 72, y: 65}]
                : []),
              ...(data.coffeeTable
                ? [{id: 'coffee', product: data.coffeeTable, x: 44, y: 78}]
                : []),
            ],
          },
        ],
      }),
    ].filter((item) => item.kind !== 'configurator' || item.product),
  };
}

export const DEMO_HOMEPAGE_QUERY = `#graphql
  query DemoHomepage($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) { nodes { handle } }
    products(first: 4, sortKey: UPDATED_AT, reverse: true) { nodes { ...HomeProduct } }
    sofa: product(handle: "luna-modular-sofa") { ...ConfiguratorProduct }
    table: product(handle: "arc-side-table") { ...HomeProduct }
    coffeeTable: product(handle: "plinth-coffee-table") { ...HomeProduct }
  }
  ${CONFIGURATOR_PRODUCT_FRAGMENT}
  ${HOME_PRODUCT_FRAGMENT}
` as const;
