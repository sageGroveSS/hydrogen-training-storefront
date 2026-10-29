import {useEffect, useId, useRef, type ReactNode} from 'react';
import {Form, Link, useLocation, useNavigation} from 'react-router';
import type {Filter} from '@shopify/hydrogen/storefront-api-types';
import {
  COLLECTION_SORT_OPTIONS,
  filterInputParam,
} from '~/lib/collectionFilters';

type FilterProps = {
  filters: Pick<Filter, 'id' | 'label' | 'type' | 'values'>[];
  sortOptions?: typeof COLLECTION_SORT_OPTIONS;
};

export function CollectionFilters({
  children,
  filters,
  sortOptions = COLLECTION_SORT_OPTIONS,
}: FilterProps & {children: ReactNode}) {
  const {pathname, search} = useLocation();
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const params = new URLSearchParams(search);
  const active = [...params].filter(
    ([name, value]) => name.startsWith('filter.') && value.trim(),
  );
  const sortLabel =
    sortOptions.find(({value}) => value === params.get('sort_by'))?.label ??
    'Featured';

  useEffect(() => {
    dialog.current?.close();
  }, [pathname, search]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 64em)');
    const closeOnDesktop = () => {
      if (desktop.matches) dialog.current?.close();
    };
    const panel = dialog.current;
    const closeOnBackdrop = (event: MouseEvent) => {
      if (event.target === panel) panel?.close();
    };
    desktop.addEventListener('change', closeOnDesktop);
    panel?.addEventListener('click', closeOnBackdrop);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      panel?.removeEventListener('click', closeOnBackdrop);
    };
  }, []);

  return (
    <>
      <div className="collection-filter-toolbar">
        <a
          className="collection-filter-trigger"
          href="#collection-filters"
          aria-haspopup="dialog"
          aria-controls={`${headingId}-dialog`}
          onClick={(event) => {
            event.preventDefault();
            dialog.current?.showModal();
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 17h16" />
            <circle cx="9" cy="7" r="3" fill="var(--color-surface)" />
            <circle cx="15" cy="17" r="3" fill="var(--color-surface)" />
          </svg>
          Filter & sort{' '}
          {active.length > 0 && (
            <span className="collection-filter-count">{active.length}</span>
          )}
        </a>
        <span className="collection-current-sort">{sortLabel}</span>
      </div>
      <div className="collection-browse">
        <aside
          className="collection-filter-sidebar"
          id="collection-filters"
          aria-label="Product filters"
        >
          <div className="collection-sidebar-heading">
            <h2>Filters</h2>
            {active.length > 0 && <Link to={pathname}>Reset all</Link>}
          </div>
          <CollectionFilterForm filters={filters} sortOptions={sortOptions} />
        </aside>
        <div className="collection-results">
          {active.length > 0 && (
            <nav
              className="collection-active-filters"
              aria-label="Active filters"
            >
              {active.map(([name, value]) => {
                const next = new URLSearchParams(params);
                next.delete(name, value);
                next.delete('cursor');
                next.delete('direction');
                const group = filters.find((filter) =>
                  filter.values.some((item) => {
                    const input = filterInputParam(item.input);
                    return input?.[0] === name && input[1] === value;
                  }),
                );
                const label = name.endsWith('.gte')
                  ? `From ${value}`
                  : name.endsWith('.lte')
                    ? `Up to ${value}`
                    : group?.id === 'filter.v.availability'
                      ? value === '1'
                        ? 'In stock'
                        : 'Out of stock'
                      : value;
                return (
                  <Link
                    key={`${name}:${value}`}
                    to={`${pathname}?${next}`}
                    aria-label={`Remove filter: ${label}`}
                    className="collection-filter-chip"
                  >
                    {label}
                    <span aria-hidden="true">×</span>
                  </Link>
                );
              })}
              <Link className="collection-clear-all" to={pathname}>
                Clear all
              </Link>
            </nav>
          )}
          {children}
        </div>
      </div>
      <dialog
        ref={dialog}
        className="collection-filter-dialog"
        aria-labelledby={headingId}
        id={`${headingId}-dialog`}
      >
        <header className="collection-drawer-heading">
          <div>
            <span className="collection-filter-eyebrow">MAKE IT YOURS</span>
            <h2 id={headingId}>Filter & sort</h2>
          </div>
          <button
            type="button"
            className="collection-drawer-close"
            aria-label="Close filters"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </header>
        <CollectionFilterForm filters={filters} sortOptions={sortOptions} />
      </dialog>
    </>
  );
}

function CollectionFilterForm({
  filters,
  sortOptions = COLLECTION_SORT_OPTIONS,
}: FilterProps) {
  const {pathname, search} = useLocation();
  const params = new URLSearchParams(search);
  const navigation = useNavigation();
  const submitTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(submitTimer.current), [pathname, search]);
  const visibleInputs = filters.flatMap((filter) =>
    filter.values.flatMap((value) => {
      const param = filterInputParam(value.input);
      return param ? [JSON.stringify(param)] : [];
    }),
  );
  const hasPrice = filters.some((filter) => filter.type === 'PRICE_RANGE');
  const unlistedFilters = [...params].filter(
    ([name, value]) =>
      name.startsWith('filter.') &&
      value.trim() &&
      !(hasPrice && name.startsWith('filter.v.price.')) &&
      !visibleInputs.includes(JSON.stringify([name, value])),
  );
  return (
    <Form
      method="get"
      action={pathname}
      className="collection-filters"
      key={search}
      onChange={(event) => {
        clearTimeout(submitTimer.current);
        if (!window.matchMedia('(min-width: 64em)').matches) return;
        const form = event.currentTarget;
        submitTimer.current = setTimeout(() => {
          if (
            form.isConnected &&
            window.matchMedia('(min-width: 64em)').matches
          ) {
            form.requestSubmit();
          }
        }, 350);
      }}
      onSubmit={() => clearTimeout(submitTimer.current)}
    >
      {unlistedFilters.length > 0 && (
        <p role="status">
          These filters are unavailable for this collection. Clear them or
          choose another filter:{' '}
          {unlistedFilters.map(([, value]) => value).join(', ')}
        </p>
      )}
      {unlistedFilters.map(([name, value]) => (
        <input
          key={`${name}:${value}`}
          type="hidden"
          name={name}
          value={value}
        />
      ))}
      <div className="collection-filters-fields">
        {filters.map((filter) => {
          const selected =
            filter.type === 'PRICE_RANGE'
              ? Number(
                  Boolean(
                    params.get('filter.v.price.gte') ||
                    params.get('filter.v.price.lte'),
                  ),
                )
              : filter.values.filter((value) => {
                  const input = filterInputParam(value.input);
                  return input && params.getAll(input[0]).includes(input[1]);
                }).length;
          return (
            <details
              className="collection-filter-group"
              key={filter.id}
              open={
                selected > 0 ||
                filter.type === 'PRICE_RANGE' ||
                filter.id === 'filter.v.availability'
              }
            >
              <summary>
                {filter.label}
                {selected > 0 && (
                  <span className="collection-filter-count">{selected}</span>
                )}
                <span
                  className="collection-filter-chevron"
                  aria-hidden="true"
                />
              </summary>
              {filter.type === 'PRICE_RANGE' ? (
                <fieldset key={filter.id}>
                  <legend className="collection-filter-legend">
                    {filter.label}
                  </legend>
                  <div className="collection-price-range">
                    <label>
                      Min price
                      <input
                        name="filter.v.price.gte"
                        type="number"
                        min="0"
                        step="any"
                        defaultValue={params.get('filter.v.price.gte') ?? ''}
                      />
                    </label>
                    <label>
                      Max price
                      <input
                        name="filter.v.price.lte"
                        type="number"
                        min="0"
                        step="any"
                        defaultValue={params.get('filter.v.price.lte') ?? ''}
                      />
                    </label>
                  </div>
                </fieldset>
              ) : (
                <fieldset key={filter.id}>
                  <legend className="collection-filter-legend">
                    {filter.label}
                  </legend>
                  {filter.values.map((value) => {
                    const param = filterInputParam(value.input);
                    if (!param) return null;
                    const [name, inputValue] = param;
                    const checked = params.getAll(name).includes(inputValue);
                    return (
                      <label className="collection-filter-value" key={value.id}>
                        <input
                          type="checkbox"
                          name={name}
                          value={inputValue}
                          defaultChecked={checked}
                          disabled={!value.count && !checked}
                        />
                        <span className="collection-filter-label">
                          {value.label}
                        </span>
                        <span className="collection-filter-value-count">
                          {value.count}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              )}
            </details>
          );
        })}
        <label className="collection-sort">
          Sort by
          <select
            name="sort_by"
            defaultValue={params.get('sort_by') || 'featured'}
          >
            {sortOptions.map(({value, label}) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="collection-filter-actions">
        <button
          className="button"
          type="submit"
          disabled={navigation.state !== 'idle'}
        >
          Show results
        </button>
        <Link to={pathname}>Reset filters</Link>
        <span role="status">
          {navigation.state !== 'idle' ? 'Updating products…' : ''}
        </span>
      </div>
    </Form>
  );
}
