import {Link} from 'react-router';
import {ProductItem} from '~/components/ProductItem';
import {useWishlist} from '~/components/Wishlist';

export const meta = () => [
  {title: 'Wishlist | Hydrogen store'},
  {name: 'robots', content: 'noindex,nofollow'},
];
export const headers = () => ({'Cache-Control': 'private, no-store'});

export default function WishlistPage() {
  const {ids, products, ready, pending, error, toggle} = useWishlist();
  const missing = ids.filter(
    (id) => !products.some((product) => product.id === id),
  );
  return (
    <section
      className="wishlist-page"
      aria-labelledby="wishlist-title"
      aria-busy={pending}
    >
      <header className="wishlist-page-header">
        <div className="wishlist-heading">
          <h1 id="wishlist-title">Wishlist</h1>
          {ready && (
            <span role="status">
              {ids.length} {ids.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
        <Link to="/collections/all">
          Continue shopping <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <noscript>
        <p>Enable JavaScript to use your wishlist.</p>
      </noscript>
      {!ready && !error && <p role="status">Loading saved items…</p>}
      {ready && ids.length === 0 && (
        <div className="wishlist-empty">
          <span className="wishlist-empty-icon" aria-hidden="true">
            ♡
          </span>
          <h2>Your wishlist is empty</h2>
          <p>Save the pieces you love.</p>
          <Link className="button" to="/collections/all">
            Explore products
          </Link>
        </div>
      )}
      {ready && ids.length > 0 && (
        <div className="wishlist-grid">
          {products.map((product) => (
            <ProductItem key={product.id} product={product} />
          ))}
          {missing.map((id) => (
            <div key={id} className="wishlist-unavailable">
              <div className="wishlist-unavailable-media" aria-hidden="true">
                No longer available
              </div>
              <h2>Product unavailable</h2>
              <button
                type="button"
                disabled={pending}
                onClick={() => toggle(id)}
                aria-label="Remove unavailable product from wishlist"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
