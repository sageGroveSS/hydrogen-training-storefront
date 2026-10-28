import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {NavLink} from 'react-router';
import type {WishlistProductsQuery} from 'storefrontapi.generated';
import {
  updateWishlist,
  wishlistIds,
  WISHLIST_STORAGE_KEY,
} from '~/lib/wishlist';

type WishlistProduct = Extract<
  WishlistProductsQuery['nodes'][number],
  {__typename: 'Product'}
>;
type WishlistState = {
  authenticated: boolean;
  ids: string[];
  products: WishlistProduct[];
};
type WishlistContext = WishlistState & {
  ready: boolean;
  pending: boolean;
  error: string;
  toggle: (id: string) => void;
};
const Context = createContext<WishlistContext | null>(null);

function readGuestWishlist() {
  return wishlistIds(
    JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) ?? '[]'),
  );
}

export function WishlistProvider({
  children,
  isLoggedIn,
}: {
  children: React.ReactNode;
  isLoggedIn: Promise<boolean>;
}) {
  const [state, setState] = useState<WishlistState>({
    authenticated: false,
    ids: [],
    products: [],
  });
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState<boolean>();
  const busy = useRef(false);
  const refreshQueued = useRef(false);
  const generation = useRef(0);

  const send = useCallback(async function sendWishlist(
    intent: 'merge' | 'add' | 'remove',
    ids: string[],
  ) {
    if (busy.current) return;
    const startedAt = generation.current;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        body: new URLSearchParams({intent, ids: JSON.stringify(ids)}),
        headers: {Accept: 'application/json'},
      });
      const result = (await response.json()) as WishlistState & {
        error?: string;
      };
      if (startedAt !== generation.current) return;
      if (!response.ok || result.error)
        throw new Error(
          result.error || 'Saved items are temporarily unavailable.',
        );
      setState(result);
      setReady(true);
      if (result.authenticated && intent === 'merge') {
        // Only discard guest IDs once the account confirms that it saved them.
        const remaining = readGuestWishlist().filter((id) => !ids.includes(id));
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(remaining));
      }
    } catch (error) {
      if (startedAt === generation.current)
        setError(
          error instanceof Error
            ? error.message
            : 'Saved items are temporarily unavailable.',
        );
    } finally {
      busy.current = false;
      setPending(false);
      if (refreshQueued.current) {
        refreshQueued.current = false;
        try {
          void sendWishlist('merge', readGuestWishlist());
        } catch {
          setError('Your browser cannot read saved items. Please retry.');
        }
      }
    }
  }, []);

  const initialize = useCallback(() => {
    if (busy.current) {
      refreshQueued.current = true;
      return;
    }
    try {
      void send('merge', readGuestWishlist());
    } catch {
      setError(
        'Your browser cannot read saved items. Check browser storage permissions and retry.',
      );
    }
  }, [send]);

  useEffect(() => {
    let active = true;
    void isLoggedIn
      .then((value) => {
        if (active) setLoggedIn(value);
      })
      .catch(() => {
        if (active) setLoggedIn(false);
      });
    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (loggedIn !== undefined) {
      generation.current++;
      setReady(false);
      initialize();
    }
  }, [loggedIn, initialize]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!state.authenticated && event.key === WISHLIST_STORAGE_KEY)
        initialize();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [state.authenticated, initialize]);

  function toggle(id: string) {
    if (!ready || busy.current) return;
    const intent = state.ids.includes(id) ? 'remove' : 'add';
    if (state.authenticated) {
      void send(intent, [id]);
      return;
    }
    try {
      const ids = updateWishlist(readGuestWishlist(), intent, [id]);
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
      setState((current) => ({...current, ids}));
      void send('merge', ids);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Your browser could not save this item.',
      );
    }
  }

  return (
    <Context.Provider value={{...state, ready, pending, error, toggle}}>
      {error && (
        <div role="alert" className="wishlist-notice">
          {error}{' '}
          <button type="button" disabled={pending} onClick={initialize}>
            Retry
          </button>
        </div>
      )}
      {children}
    </Context.Provider>
  );
}

export function useWishlist() {
  const context = useContext(Context);
  if (!context) throw new Error('WishlistProvider is required.');
  return context;
}

export function WishlistButton({
  id,
  title,
  compact = false,
}: {
  id: string;
  title: string;
  compact?: boolean;
}) {
  const {ids, ready, pending, toggle} = useWishlist();
  const saved = ids.includes(id);
  return (
    <button
      type="button"
      className={`wishlist-button${compact ? ' wishlist-button-compact' : ''}`}
      aria-label={`${saved ? 'Remove' : 'Save'} ${title}${saved ? ' from' : ' to'} wishlist`}
      aria-pressed={saved}
      disabled={!ready || pending}
      onClick={() => toggle(id)}
    >
      <WishlistIcon filled={saved} />
      {!compact && (
        <span>{saved ? 'Saved to wishlist' : 'Save to wishlist'}</span>
      )}
    </button>
  );
}

export function WishlistLink() {
  const {ids, ready} = useWishlist();
  return (
    <NavLink
      className="wishlist-link"
      to="/wishlist"
      aria-label={`Wishlist${ready ? `, ${ids.length} saved items` : ''}`}
    >
      <WishlistIcon />
      <span className="wishlist-link-label">Wishlist</span>
      {ready && ids.length > 0 && (
        <span className="wishlist-count">{ids.length}</span>
      )}
    </NavLink>
  );
}

function WishlistIcon({filled = false}: {filled?: boolean}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}
