export const CUSTOMER_WISHLIST_QUERY = `#graphql
  query CustomerWishlist {
    customer {
      id
      wishlist: metafield(namespace: "custom", key: "wishlist") {
        value
        compareDigest
      }
    }
  }
` as const;

export const CUSTOMER_WISHLIST_MUTATION = `#graphql
  mutation CustomerWishlistSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { value }
      userErrors { code message }
    }
  }
` as const;
