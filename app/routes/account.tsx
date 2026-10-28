import {
  data,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
  useLocation,
} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
export {accountHeaders as headers} from '~/lib/account';

export function shouldRevalidate() {
  return true;
}

export async function loader({context}: Route.LoaderArgs) {
  const result = await context.customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {language: context.customerAccount.i18n.language},
  });
  if (result.errors?.length || !result.data?.customer)
    throw new Response(
      'Your account is temporarily unavailable. Please try again.',
      {status: 503},
    );
  return data(
    {customer: result.data.customer},
    {headers: {'Cache-Control': 'private, no-store'}},
  );
}

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();
  const {pathname} = useLocation();
  const section =
    accountLinks.find((link) => pathname.startsWith(link.to))?.label ??
    'My account';
  return (
    <section className="account">
      <header className="account-heading">
        <h1>My account</h1>
        {customer.firstName && <p>Hello, {customer.firstName}</p>}
      </header>
      <div className="account-layout">
        <aside className="account-sidebar">
          <AccountMenu />
        </aside>
        <details className="account-mobile-menu" key={pathname}>
          <summary>
            <span>
              <small>Account</small>
              <strong>{section}</strong>
            </span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m5 8 5 5 5-5" />
            </svg>
          </summary>
          <AccountMenu />
        </details>
        <div className="account-content">
          <Outlet context={{customer}} />
        </div>
      </div>
    </section>
  );
}

const accountLinks = [
  {to: '/account/orders', label: 'Orders'},
  {to: '/account/profile', label: 'Profile'},
  {to: '/account/addresses', label: 'Addresses'},
  {to: '/account/preferences', label: 'Email preferences'},
  {to: '/wishlist', label: 'Wishlist'},
];

function AccountMenu() {
  return (
    <nav className="account-nav" aria-label="Account sections">
      {accountLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          onClick={(event) =>
            event.currentTarget.closest('details')?.removeAttribute('open')
          }
        >
          {link.label}
          <span aria-hidden="true">→</span>
        </NavLink>
      ))}
      <Form method="post" action="/account/logout">
        <button type="submit">Sign out</button>
      </Form>
    </nav>
  );
}
