import type {CustomerAccount} from '@shopify/hydrogen';
import {
  CUSTOMER_WISHLIST_QUERY,
  CUSTOMER_WISHLIST_MUTATION,
} from '../graphql/customer-account/CustomerWishlist.ts';
import {updateWishlist, wishlistIds, WishlistError} from './wishlist.ts';

export async function saveCustomerWishlist(
  account: Pick<CustomerAccount, 'query' | 'mutate'>,
  intent: 'merge' | 'add' | 'remove',
  incoming: string[],
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const {data, errors} = await account.query(CUSTOMER_WISHLIST_QUERY);
    if (errors?.length || !data?.customer)
      throw new WishlistError(
        'Your saved items could not be loaded. Please retry.',
        503,
      );
    const {customer} = data;
    const current = wishlistIds(JSON.parse(customer.wishlist?.value ?? '[]'));
    const ids = updateWishlist(current, intent, incoming);
    if (JSON.stringify(ids) === JSON.stringify(current)) return ids;
    const result = await account.mutate(CUSTOMER_WISHLIST_MUTATION, {
      variables: {
        metafields: [
          {
            ownerId: customer.id,
            namespace: 'custom',
            key: 'wishlist',
            type: 'list.product_reference',
            value: JSON.stringify(ids),
            compareDigest: customer.wishlist?.compareDigest ?? null,
          },
        ],
      },
    });
    const payload = result.data?.metafieldsSet;
    if (
      payload?.userErrors.some((error) =>
        ['STALE_OBJECT', 'INVALID_COMPARE_DIGEST'].includes(error.code ?? ''),
      )
    )
      continue;
    if (result.errors?.length || !payload || payload.userErrors.length)
      throw new WishlistError(
        'Your saved items could not be updated. Please retry.',
        503,
      );
    return ids;
  }
  throw new WishlistError(
    'Your saved items changed in another window. Please retry.',
    409,
  );
}
