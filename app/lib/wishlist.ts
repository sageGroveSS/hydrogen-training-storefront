export const WISHLIST_LIMIT = 100;
export const WISHLIST_STORAGE_KEY = 'storefront:wishlist';

export class WishlistError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function wishlistIds(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length > WISHLIST_LIMIT ||
    !value.every(
      (id): id is string =>
        typeof id === 'string' &&
        /^gid:\/\/shopify\/Product\/[1-9]\d*$/.test(id),
    )
  )
    throw new WishlistError('Invalid wishlist. Save up to 100 products.');
  return [...new Set(value)];
}

export function updateWishlist(
  current: string[],
  intent: 'merge' | 'add' | 'remove',
  incoming: string[],
) {
  return wishlistIds(
    intent === 'remove'
      ? current.filter((id) => !incoming.includes(id))
      : [...new Set([...current, ...incoming])],
  );
}
