# Hydrogen template: Skeleton

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [React Router](https://reactrouter.com/), the modern multi-strategy router for React. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with React Router](https://reactrouter.com/start/framework/routing)

## What's included

- React Router
- Hydrogen
- Oxygen
- Vite
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

## Getting started

**Requirements:**

- Node.js version 22.x or 24.x

```bash
npm create @shopify/hydrogen@latest
```

## Building for production

```bash
npm run build
```

## Local development

```bash
npm run dev
```

## Environment

Copy `.env.example` to `.env` and fill the Shopify values from the Hydrogen
sales channel. Reviews are server-side only and require:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Keep `SUPABASE_SECRET_KEY` out of browser code and configure the same variables
in Oxygen before deploying.

## Reviews datastore

Apply the files in `supabase/migrations` in timestamp order to the Reviews project.
Public reads use a server-only RPC: only approved reviews and replies are returned,
and email addresses are never included. Ratings cover all approved reviews; lists
use eight reviews per page and support newest, highest and lowest sorting.

Review and reply submissions go through product actions and start as pending.
The product identity comes from Shopify, and reply threads allow two levels.
Submissions share an atomic limit of five per buyer IP in ten minutes; only an
HMAC hash is stored. Oxygen supplies the trusted `oxygen-buyer-ip` header. Other
hosts need a trusted equivalent or all visitors share the fallback bucket.

Moderation is at `/admin/reviews`. Configure `REVIEWS_MODERATION_TOKEN` with at
least 32 random characters in local `.env` and Oxygen. Missing configuration
disables access. The moderator cookie expires after eight hours; rotating the
token invalidates existing sessions. This separate moderator access is not a
Shopify customer login. Approval, rejection and internal notes create audit events.
Keep the token and Supabase secret key server-side. Anonymous and customer roles
have no direct table or RPC access.

Run `npm run check:reviews` for validation, request limits, adapter and moderator
session checks. Run `supabase/tests/reviews.sql` in the project's SQL Editor for
database regression checks, including more than 1,000 reviews, reply depth,
moderation, privileges and quotas. Its fixtures are rolled back. Demo data is
never generated automatically during builds or deployment.

## Wishlist

The heart buttons and `/wishlist` use product IDs. Guests keep up to 100 IDs in
browser localStorage (`storefront:wishlist`). Signing in merges those IDs into
the customer's Shopify `custom.wishlist` metafield; local IDs are cleared only
after the account confirms the merge. Signed-in lists are never stored locally.
Writes use the authenticated customer's ID and compare-and-set retries to avoid
overwriting changes from another window. Failed sync preserves the guest list.
Unavailable products can still be removed from the list.

The customer metafield definition must exist before use: namespace `custom`, key
`wishlist`, type `list.product_reference`, Customer Account access `READ_WRITE`,
Storefront access `NONE`. The existing Shopify seed defines this field; do not
rerun the seed to enable wishlist. The project's store already has this definition.
The Customer Account client needs customer read/write scopes. No Admin token is
used by the running storefront. `/api/wishlist` responses are private and no-store.
`/account/wishlist` redirects to the shared guest/account wishlist page.

Wishlist requires JavaScript and browser storage; shopping and checkout retain
their existing no-JavaScript paths. Run `npm run check:wishlist` for validation,
limits, merges, customer ownership, conflict retries and failure checks. A real
customer login and cross-device sync still need the deferred login acceptance test.

## Collection filters

Collection and catalog pages use Storefront API filters with GET forms, including
without JavaScript. Filter choices come from the store's configured facets.
Desktop filters use a sticky sidebar and apply changes after a 350 ms pause.
On smaller screens, the filter link opens
a native modal drawer; without JavaScript it reveals the inline GET form instead.
In Shopify Search & Discovery, enable Product type, Vendor and the product options
used by the catalog (Color, Material and Size), alongside Availability and Price.
Shopify ignores filters that have not been enabled; the storefront warns when a
selected filter is unavailable. See [Shopify's filter setup guide](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/filter-products).

Collection pages support featured, best-selling, price, title and newest sorting.
The all-products catalog uses Shopify search and supports featured and price sorting.
Run `npm run check:collection-filters` for the
filter URL and validation checks.

## GitHub release settings

Pull requests run CI and deploy an Oxygen preview. Production deploys run from
`main`, including manual runs, and pass lint, typecheck, and build before deploying.
Keep the `production` environment's deployment branch policy restricted to `main`.

Configure these repository settings with a GitHub administrator account:

- Protect `main`: require a pull request and the `Lint, typecheck, and build`
  status check, with the branch up to date before merging.
- Apply protection to administrators, and block force pushes and branch deletion.
- Use squash merges and enable automatic deletion of merged topic branches.

When stacking pull requests, retarget the child to `main` after the parent merges.
Do not merge into an already merged topic
branch: those commits will not reach `main`.

## Setup for using Customer Account API (`/account` section)

Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
