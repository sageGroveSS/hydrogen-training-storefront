import {Form, Link, useLoaderData, useNavigation} from 'react-router';
import type {Route} from './+types/account.orders._index';
import {Money, getPaginationVariables} from '@shopify/hydrogen';
import {
  buildOrderSearchQuery,
  parseOrderFilters,
  ORDER_FILTER_FIELDS,
  ORDER_FILTER_MAX_LENGTH,
  type OrderFilterParams,
} from '~/lib/orderFilters';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
import type {
  CustomerOrdersFragment,
  OrderItemFragment,
} from 'customer-accountapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';

type OrdersLoaderData = {
  customer: CustomerOrdersFragment;
  filters: OrderFilterParams;
};

export {accountHeaders as headers} from '~/lib/account';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Orders'}];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const url = new URL(request.url);
  let filters: OrderFilterParams;
  try {
    filters = parseOrderFilters(url.searchParams);
  } catch {
    throw new Response('Invalid order filters.', {status: 400});
  }
  const query = buildOrderSearchQuery(filters);

  const {data, errors} = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
    variables: {
      ...paginationVariables,
      query,
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw Error('Customer orders not found');
  }

  return {customer: data.customer, filters};
}

export default function Orders() {
  const {customer, filters} = useLoaderData<OrdersLoaderData>();
  const {orders} = customer;

  return (
    <section className="account-orders">
      <h2>Orders</h2>
      <OrderSearchForm currentFilters={filters} />
      <OrdersTable orders={orders} filters={filters} />
    </section>
  );
}

function OrdersTable({
  orders,
  filters,
}: {
  orders: CustomerOrdersFragment['orders'];
  filters: OrderFilterParams;
}) {
  const hasFilters = !!(filters.name || filters.confirmationNumber);

  return (
    <div className="account-order-results" aria-live="polite">
      {orders?.nodes.length ? (
        <PaginatedResourceSection
          connection={orders}
          resourcesClassName="account-order-list"
        >
          {({node: order}) => <OrderItem key={order.id} order={order} />}
        </PaginatedResourceSection>
      ) : (
        <EmptyOrders hasFilters={hasFilters} />
      )}
    </div>
  );
}

function EmptyOrders({hasFilters = false}: {hasFilters?: boolean}) {
  return (
    <div className="account-empty">
      {hasFilters ? (
        <>
          <p>No orders found matching your search.</p>

          <p>
            <Link to="/account/orders">Clear filters →</Link>
          </p>
        </>
      ) : (
        <>
          <p>You haven&apos;t placed any orders yet.</p>

          <p>
            <Link to="/collections/all">Explore products →</Link>
          </p>
        </>
      )}
    </div>
  );
}

function OrderSearchForm({
  currentFilters,
}: {
  currentFilters: OrderFilterParams;
}) {
  const navigation = useNavigation();
  const isSearching = navigation.state !== 'idle';

  const hasFilters = currentFilters.name || currentFilters.confirmationNumber;

  return (
    <Form
      method="get"
      key={`${currentFilters.name}:${currentFilters.confirmationNumber}`}
      className="order-search-form"
      aria-label="Search orders"
    >
      <fieldset className="order-search-fieldset">
        <legend className="order-search-legend">Filter Orders</legend>

        <div className="order-search-inputs">
          <input
            type="search"
            maxLength={ORDER_FILTER_MAX_LENGTH}
            name={ORDER_FILTER_FIELDS.NAME}
            placeholder="Order #"
            aria-label="Order number"
            defaultValue={currentFilters.name || ''}
            className="order-search-input"
          />
          <input
            type="search"
            maxLength={ORDER_FILTER_MAX_LENGTH}
            name={ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER}
            placeholder="Confirmation #"
            aria-label="Confirmation number"
            defaultValue={currentFilters.confirmationNumber || ''}
            className="order-search-input"
          />
        </div>

        <div className="order-search-buttons">
          <button type="submit" disabled={isSearching}>
            {isSearching ? 'Searching' : 'Search'}
          </button>
          {hasFilters && <Link to="/account/orders">Clear</Link>}
        </div>
      </fieldset>
    </Form>
  );
}

function OrderItem({order}: {order: OrderItemFragment}) {
  const orderUrl = `/account/orders/${encodeURIComponent(btoa(order.id))}`;
  return (
    <article className="account-order-card">
      <div className="account-section-heading">
        <h3>
          <Link to={orderUrl}>#{order.number}</Link>
        </h3>
        <Money data={order.totalPrice} />
      </div>
      <p>
        {new Date(order.processedAt).toLocaleDateString('en', {
          timeZone: 'UTC',
        })}
      </p>
      <div className="account-order-status">
        <span
          className="account-badge"
          data-status={order.financialStatus?.toLowerCase()}
        >
          {(order.financialStatus ?? 'Unavailable')
            .replaceAll('_', ' ')
            .toLowerCase()}
        </span>
        <span
          className="account-badge"
          data-status={order.fulfillmentStatus.toLowerCase()}
        >
          {order.fulfillmentStatus.replaceAll('_', ' ').toLowerCase()}
        </span>
      </div>
      {order.confirmationNumber && (
        <p className="account-description">
          Confirmation: {order.confirmationNumber}
        </p>
      )}
      <Link to={orderUrl}>View order →</Link>
    </article>
  );
}
