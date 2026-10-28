import {Link, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/account.orders.$id';
import {Money, Image} from '@shopify/hydrogen';
import type {OrderLineItemFullFragment} from 'customer-accountapi.generated';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';
export {accountHeaders as headers} from '~/lib/account';
export const meta: Route.MetaFunction = ({data}) => [
  {title: data?.order ? `Order ${data.order.name}` : 'Order'},
];
export async function loader({params, context}: Route.LoaderArgs) {
  if (!params.id) return redirect('/account/orders');
  let orderId: string;
  try {
    orderId = atob(params.id);
  } catch {
    throw new Response('Order not found.', {status: 404});
  }
  if (!/^gid:\/\/shopify\/Order\/[1-9]\d*$/.test(orderId))
    throw new Response('Order not found.', {status: 404});
  const result = await context.customerAccount.query(CUSTOMER_ORDER_QUERY, {
    variables: {orderId, language: context.customerAccount.i18n.language},
  });
  if (result.errors?.length || !result.data?.order)
    throw new Response('Order not found.', {status: 404});
  return {order: result.data.order};
}
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The horizontal order table must be keyboard-scrollable. */
export default function OrderRoute() {
  const {order} = useLoaderData<typeof loader>();
  return (
    <section className="account-order">
      <Link to="/account/orders" className="account-back">
        ← All orders
      </Link>
      <div className="account-section-heading">
        <h2>Order {order.name}</h2>
        <span
          className="account-badge"
          data-status={order.fulfillmentStatus.toLowerCase()}
        >
          {order.fulfillmentStatus.replaceAll('_', ' ').toLowerCase()}
        </span>
      </div>
      <p className="account-description">
        Placed on{' '}
        {new Date(order.processedAt).toLocaleDateString('en', {
          timeZone: 'UTC',
        })}
      </p>
      {order.confirmationNumber && (
        <p className="account-description">
          Confirmation: {order.confirmationNumber}
        </p>
      )}
      <div
        className="account-table-scroll"
        role="region"
        aria-label="Order items"
        tabIndex={0}
      >
        <table className="account-order-table">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Price</th>
              <th scope="col">Quantity</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.lineItems.nodes.map((item) => (
              <OrderLineRow key={item.id} lineItem={item} />
            ))}
          </tbody>
        </table>
      </div>
      <ul className="account-order-mobile" aria-label="Order items">
        {order.lineItems.nodes.map((item) => (
          <li key={item.id}>
            <OrderProduct lineItem={item} />
            <dl className="account-mobile-money">
              <div>
                <dt>Unit price</dt>
                <dd>{item.price ? <Money data={item.price} /> : '—'}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>{item.quantity}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>
                  {item.totalPrice ? <Money data={item.totalPrice} /> : '—'}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <div className="account-order-summary">
        <section className="account-panel">
          <h3>Shipping address</h3>
          {order.shippingAddress ? (
            <address>{order.shippingAddress.formatted.join('\n')}</address>
          ) : (
            <p>No shipping address.</p>
          )}
          <a href={order.statusPageUrl} target="_blank" rel="noreferrer">
            Track order ↗
          </a>
        </section>
        <dl className="account-panel account-totals">
          {order.subtotal && (
            <div>
              <dt>Subtotal</dt>
              <dd>
                <Money data={order.subtotal} />
              </dd>
            </div>
          )}
          <div>
            <dt>Shipping</dt>
            <dd>
              <Money data={order.totalShipping} />
            </dd>
          </div>
          {order.totalTax && (
            <div>
              <dt>Tax</dt>
              <dd>
                <Money data={order.totalTax} />
              </dd>
            </div>
          )}
          <div className="account-grand-total">
            <dt>Total</dt>
            <dd>
              <Money data={order.totalPrice} />
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
/* eslint-enable jsx-a11y/no-noninteractive-tabindex */
function OrderLineRow({lineItem}: {lineItem: OrderLineItemFullFragment}) {
  return (
    <tr>
      <td>
        <OrderProduct lineItem={lineItem} />
      </td>
      <td>{lineItem.price ? <Money data={lineItem.price} /> : '—'}</td>
      <td>{lineItem.quantity}</td>
      <td>
        {lineItem.totalPrice ? <Money data={lineItem.totalPrice} /> : '—'}
      </td>
    </tr>
  );
}

function OrderProduct({lineItem}: {lineItem: OrderLineItemFullFragment}) {
  return (
    <div className="account-order-product">
      {lineItem.image && (
        <Image
          data={lineItem.image}
          width={72}
          height={72}
          alt={lineItem.image.altText || lineItem.title}
        />
      )}
      <div>
        <strong>{lineItem.title}</strong>
        {lineItem.variantTitle && <p>{lineItem.variantTitle}</p>}
      </div>
    </div>
  );
}
