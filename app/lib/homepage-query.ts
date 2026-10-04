export const HOME_PRODUCT_FRAGMENT = `#graphql
  fragment HomeProduct on Product {
    id title handle
    featuredImage { id url altText width height }
    priceRange { minVariantPrice { amount currencyCode } }
  }
` as const;

export const HOMEPAGE_QUERY = `#graphql
  fragment HomeImageField on MetaobjectField {
    reference {
      __typename
      ... on MediaImage { image { id url altText width height } }
    }
  }
  fragment HomeLink on Metaobject {
    id type fields { key value }
  }
  fragment HomeHotspot on Metaobject {
    id type fields { key value }
    product: field(key: "product") {
      reference { __typename ... on Product { ...HomeProduct } }
    }
  }
  fragment HomeScene on Metaobject {
    id type fields { key value }
    image: field(key: "image") { ...HomeImageField }
    hotspots: field(key: "hotspots") {
      references(first: 8) { nodes { __typename ... on Metaobject { ...HomeHotspot } } }
    }
  }
  fragment HomeSection on Metaobject {
    id type fields { key value }
    image: field(key: "image") { ...HomeImageField }
    secondaryImage: field(key: "secondary_image") { ...HomeImageField }
    product: field(key: "product") {
      reference { __typename ... on Product { ...HomeProduct } }
    }
    products: field(key: "products") {
      references(first: 12) { nodes { __typename ... on Product { ...HomeProduct } } }
    }
    links: field(key: "links") {
      references(first: 8) { nodes { __typename ... on Metaobject { ...HomeLink } } }
    }
    steps: field(key: "steps") {
      references(first: 8) { nodes { __typename ... on Metaobject { ...HomeLink } } }
    }
    optionStyles: field(key: "option_styles") {
      references(first: 30) { nodes { __typename ... on Metaobject { ...HomeLink } } }
    }
    scenes: field(key: "scenes") {
      references(first: 6) { nodes { __typename ... on Metaobject { ...HomeScene } } }
    }
  }
  query HomepageContent($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    homepage: metaobject(handle: {type: "storefront_home", handle: "home"}) {
      id fields { key value }
      sections: field(key: "sections") {
        references(first: 30) {
          nodes { __typename ... on Metaobject { ...HomeSection } }
        }
      }
    }
  }
  ${HOME_PRODUCT_FRAGMENT}
` as const;

export const CONFIGURATOR_PRODUCT_FRAGMENT = `#graphql
  fragment ConfiguratorProduct on Product {
    ...HomeProduct
    options { name optionValues { name } }
    variants(first: 100) {
      nodes {
        id availableForSale
        selectedOptions { name value }
        price { amount currencyCode }
        image { id url altText width height }
      }
      pageInfo { hasNextPage }
    }
  }
` as const;

export const CONFIGURATOR_PRODUCTS_QUERY = `#graphql
  query ConfiguratorProducts($ids: [ID!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    nodes(ids: $ids) { __typename ... on Product { ...ConfiguratorProduct } }
  }
  ${CONFIGURATOR_PRODUCT_FRAGMENT}
  ${HOME_PRODUCT_FRAGMENT}
` as const;
