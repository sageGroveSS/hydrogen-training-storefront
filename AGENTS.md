# Shopify Hydrogen development

This storefront is scaffolded from Shopify's Hydrogen skeleton template. See the README for framework-specific details.

Use the [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) for all Shopify API and platform work. If missing, install it in the agent host per that page (or `npx skills add Shopify/shopify-ai-toolkit --list` for skill-compatible hosts).

## Project workflow

- Keep `main` deployable. Feature work should land through pull requests after CI passes.
- Use short-lived branches with these prefixes:
  - `feature/` for user-facing storefront work
  - `fix/` for bug fixes
  - `chore/` for tooling, scripts, dependency, and workflow changes
  - `docs/` for documentation-only changes
- Keep each PR scoped to one reviewable slice, for example reviews foundation, homepage design, customer wishlist, or Oxygen workflow cleanup.
- Prefer squash merges into `main` so the public history reads like a release log.
- Commit messages must be in English and start with `feature:`, `fix:`, `refactor:`, `chore:`, or `docs:`. Do not add co-author trailers.

## Quality gates

- Before opening or updating a PR, run the smallest relevant check locally.
- For general code changes, run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- Do not commit generated build output from `dist`, `.react-router`, `.cache`, or `.shopify`.
- Keep secrets out of the repository. Use `.env.example` for names only and configure real values in local `.env`, GitHub Actions secrets, and Oxygen environment variables.

## Deployment

- CI runs on pull requests and pushes to `main`.
- Oxygen preview deploys run from pull requests and manual dispatch.
- Oxygen production deploys run from `main` and manual dispatch.
- Production deploys should use the protected GitHub `production` environment.
- Use separate deployment secrets:
  - `OXYGEN_PREVIEW_DEPLOYMENT_TOKEN`
  - `OXYGEN_PRODUCTION_DEPLOYMENT_TOKEN`
- Configure the same runtime environment variables in Oxygen that are listed in `.env.example`.

## Hydrogen conventions

- Keep Shopify Storefront API, Customer Account API, cart, and session logic server-side unless Hydrogen explicitly exposes a safe browser API.
- Do not send private tokens, Supabase secret keys, or customer data to browser bundles.
- Cart, account, checkout, review submission, and moderation routes must work through Remix/React Router loaders and actions with progressive enhancement where possible.
- Public product, collection, and content data may be cached. Customer, cart, checkout, review mutation, and moderation data must not be shared-cacheable.
- Use Shopify CDN image data when available and keep product/category pages useful without custom client-side JavaScript.

## Reviews backend

- Reviews are backed by Supabase through server-side Hydrogen code only.
- Public reads may expose approved reviews and aggregate ratings.
- Writes must go through Hydrogen actions and default to moderation-safe status.
- Keep review JSON-LD limited to approved reviews.
