export const CUSTOMER_PREFERENCES_QUERY = `#graphql
  query CustomerPreferences {
    customer {
      id
      saleAlerts: metafield(namespace: "custom", key: "email_sale_alerts") { value compareDigest }
      backInStock: metafield(namespace: "custom", key: "email_back_in_stock") { value compareDigest }
    }
  }
` as const;

export const CUSTOMER_PREFERENCES_MUTATION = `#graphql
  mutation CustomerPreferencesSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { key value }
      userErrors { code message }
    }
  }
` as const;
