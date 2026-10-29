# Storefront hardening

This records fixes made after the Oxygen baseline in `oxygen-2026-10-29.md`.
Changes remain local until the branch is reviewed, merged and deployed.

## Changes

- Reproduced React #421 with a delayed configurator chunk in three isolated sessions.
  The server-rendered section's lazy module is now loaded before hydration starts,
  only when the rendered page contains a configurator. It remains a separate chunk.
  A marker on the section container also covers streamed/deferred configurator HTML.
  Five subsequent production sessions with a delayed chunk and throttled CPU had no
  hydration exceptions. Wishlist synchronization behavior is unchanged.
- Product/card image `sizes` account for columns, gaps and card padding. Card srcsets
  use 100 px steps so a small mobile card can choose 300 px instead of 400 px. The
  first collection image is eager/high priority; remaining cards default to lazy.
  The primary PDP image is eager/high priority instead of lazy.
- Product option groups use fieldsets and legends. Cards use H2 after a page H1 and
  H3 inside homepage sections. Muted text and crossed-out prices meet contrast checks.
  Wishlist accessible names contain their visible labels. Header navigation landmarks
  have distinct labels. The configurator thumbnail is decorative beside its link text.
- Home/PDP/content pages emit canonical links with absolute URLs. Search is noindex.
  Sitemaps no longer advertise unconfigured EN-US/EN-CA/FR-CA routes. Sitemap index
  and product/page/collection child links return HTTP 200 in the application.
- Cart loaders/actions, wishlist API errors and server error responses for these
  private paths explicitly use `private, no-store`. Set-Cookie and action headers
  are retained. Existing account guards are preserved.
- Predictive search submits on Enter and encodes `&` as part of the search term.

## Verification

- Lint, typecheck, production build and existing check scripts pass (six existing
  lint warnings). Shopify AI Toolkit validates the GraphQL queries and Image props.
- `npm run check:storefront -- http://localhost:3003` checks actual HTTP responses:
  canonical links, private cart/API error headers, sitemap index and real resource URLs.
- Isolated Chrome checks cover selected variants, add/quantity/remove and native
  checkout transition with JavaScript and without JavaScript; no order is placed.
- Full axe scan covers home, collection, PDP, the section-based content page and cart.
  It includes best-practice rules in addition to WCAG tags. This does not establish
  full accessibility conformance or replace keyboard and screen-reader testing.
- An automated layout sweep previously covered 320, 390, 768 and 1440 CSS px.
  Product/collection rendering was also inspected after the heading/fieldset changes.

## Deployment and measurement limits

Lighthouse runs here use simulated mobile throttling against a local production
build. They diagnose delivery/markup but cannot be directly compared with the remote
Oxygen baseline: server/network timing differs. Retest several runs on the deployed
branch before calling mobile LCP green. Field INP requires real interaction data.

The technical Oxygen URL still serves `Disallow: /` and a 404 for `/sitemap.xml`;
its production-domain behavior is outside this local deployment. The application
itself serves the index and resource sitemaps successfully. Shopify documents that
Oxygen serves the application's robots file only in public production with a custom
domain and overrides preview robots rules. Do not bypass that indexing protection:
verify sitemap/indexing on the final public domain after deployment.

Reference: https://shopify.dev/docs/storefronts/headless/legacy/hydrogen/seo

Real customer login/writes, payment, physical Safari/iOS devices, and screen readers
were not exercised in this follow-up. No live customer/review records were changed.

## Remaining acceptance observations

One early local-preview quantity request returned HTTP 500. A fresh JS/no-JS
commerce run passed, and an additional add/increase/decrease/increase/remove sequence
returned HTTP 200 for every mutation. The isolated failure was not reproduced and
its cause was not established; inspect runtime logs during the deployed retest.

During one JS preview handoff Shopify redirected to the store's `/password` page;
the no-JS handoff reached `/checkouts/...`. The storefront generates a native
checkout URL, but passing the shop's access/password gate and completing checkout
remain store-side acceptance checks. The audit does not count the password page
as a completed checkout, and no shop password settings were changed.

## Local production Lighthouse diagnostics

| Page | Runs | Median performance | Accessibility | SEO | Median LCP |
| --- | ---: | ---: | ---: | ---: | ---: |
| home | 3 | 96 | 100 | 100 | 2.51 s |
| collection | 3 | 96 | 100 | 100 | 2.50 s |
| product | 1 | 96 | 100 | 100 | 2.46 s |

Home LCP samples: 3.52, 2.51 and 2.49 s. Collection: 2.79, 2.50 and 2.50 s.
All final runs have zero CLS and TBT; those are lab values, not field INP.
The final responsive-image audit reports zero oversizing savings on these three
pages. LCP remains at or slightly above the 2.5 s target in several samples;
mobile CWV acceptance is therefore pending deployed/field verification.

The final full axe scan reports zero violations for home, collection, PDP,
Spaces for living and cart. The header Search link also reaches a native GET
search without JavaScript; with JavaScript it opens the existing drawer.
