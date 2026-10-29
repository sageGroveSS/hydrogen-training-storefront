import type {Storefront} from '@shopify/hydrogen';
import type {ConfiguratorProductsQuery} from 'storefrontapi.generated';
import type {HomepageContent} from './homepage-content';
import {CONFIGURATOR_PRODUCTS_QUERY} from './homepage-query.ts';

export function loadConfiguratorProducts(
  storefront: Storefront,
  page: HomepageContent,
): Promise<ConfiguratorProductsQuery | null> {
  const ids = [
    ...new Set(
      page.sections.flatMap((section) =>
        section.kind === 'configurator' && section.product
          ? [section.product.id]
          : [],
      ),
    ),
  ];
  if (!ids.length) return Promise.resolve(null);
  return storefront
    .query(CONFIGURATOR_PRODUCTS_QUERY, {
      variables: {ids},
      cache: storefront.CacheShort(),
    })
    .catch((error: unknown): null => {
      console.error('Content configurator products unavailable:', error);
      return null;
    });
}
