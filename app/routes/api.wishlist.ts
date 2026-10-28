import type {Route} from './+types/api.wishlist';
import {readReviewForm} from '~/lib/reviews.server';
import {saveCustomerWishlist} from '~/lib/wishlist.server';
import {wishlistIds, WishlistError} from '~/lib/wishlist';

const privateHeaders = {'Cache-Control': 'private, no-store'};

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST')
    return Response.json(
      {error: 'Method not allowed.'},
      {status: 405, headers: privateHeaders},
    );
  try {
    const form = await readReviewForm(request);
    const intent = form.get('intent');
    if (!['merge', 'add', 'remove'].includes(intent ?? ''))
      return Response.json(
        {error: 'Invalid wishlist action.'},
        {status: 400, headers: privateHeaders},
      );
    const incoming = wishlistIds(JSON.parse(form.get('ids') ?? '[]'));
    if (intent !== 'merge' && incoming.length !== 1)
      return Response.json(
        {error: 'Choose one product.'},
        {status: 400, headers: privateHeaders},
      );
    const authenticated = await context.customerAccount.isLoggedIn();
    if (!authenticated && intent !== 'merge')
      return Response.json(
        {error: 'Your session ended. Reload to continue.'},
        {status: 401, headers: privateHeaders},
      );
    const ids = authenticated
      ? await saveCustomerWishlist(
          context.customerAccount,
          intent as 'merge' | 'add' | 'remove',
          incoming,
        )
      : incoming;
    const result = ids.length
      ? await context.storefront.query(WISHLIST_PRODUCTS_QUERY, {
          variables: {ids},
        })
      : {nodes: []};
    const products = result.nodes.filter(
      (node) => node?.__typename === 'Product',
    );
    return Response.json(
      {authenticated, ids, products},
      {headers: privateHeaders},
    );
  } catch (error) {
    if (error instanceof Response) {
      error.headers.set('Cache-Control', privateHeaders['Cache-Control']);
      return error;
    }
    return Response.json(
      {
        error:
          error instanceof SyntaxError
            ? 'Invalid wishlist data.'
            : error instanceof WishlistError
              ? error.message
              : 'Saved items are temporarily unavailable.',
      },
      {
        status:
          error instanceof WishlistError
            ? error.status
            : error instanceof SyntaxError
              ? 400
              : 503,
        headers: privateHeaders,
      },
    );
  }
}

export const WISHLIST_PRODUCTS_QUERY = `#graphql
  query WishlistProducts($ids: [ID!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      __typename
      ... on Product {
        id
        handle
        title
        featuredImage { id altText url width height }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
` as const;
