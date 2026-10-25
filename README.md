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

The first Supabase migration is in
`supabase/migrations/202608300001_create_reviews.sql`. Apply it to the Supabase
project selected for reviews/comments before enabling review submission.

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
