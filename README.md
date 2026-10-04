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

## Setup for using Customer Account API (`/account` section)

Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
