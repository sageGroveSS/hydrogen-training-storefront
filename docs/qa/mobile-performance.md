# Mobile performance follow-up

Source PageSpeed report: https://pagespeed.web.dev/analysis/https-hydrogen-a1f0addac126acdf2168-o2-myshopify-dev/1qazbx3prd?form_factor=mobile

The published baseline scored Performance 86, Accessibility 100, Best Practices 96
and SEO 69. LCP was 3.4 s and Speed Index 4.5 s, with no field data available.

## Changes

- Combine Tailwind, reset and application CSS into one stylesheet, preserving order.
- Remove first-screen entrance animations so hero content is immediately visible.
  Scroll-driven animations and reduced-motion behavior remain available.
- Request measured quality 75 on Shopify CDN content/card images. An 800 px hero
  probe decreased from 66,960 to 41,090 bytes; existing quality settings and external
  image URLs are preserved. Add image URL regression checks to CI.
- Remove the unused shop.app preconnect.
- Disable analytics event publishing for bots detected by the existing isbot library.
  Normal visitors retain Shopify's default consent behavior. The baseline's console
  errors were rejected synthetic Lighthouse-agent events, not hydration errors.

## Oxygen preview verification

Preview: https://01m64mhv5ayzttv9bnrwr0fz5m-0376676dead37350aa94.myshopify.dev/

Three fresh Chrome sessions used Lighthouse 13.5.0 mobile simulated throttling,
matching the report's Lighthouse version. The approved temporary testing header was
restricted to the preview origin; it was not sent to image/CDN/third-party origins.
Credentials are not included in this report.

| Run | Performance | Accessibility | Best Practices | SEO | LCP | Speed Index | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 94 | 100 | 100 | 69 | 2.7 s | 2.2 s | 0 ms | 0 |
| 2 | 98 | 100 | 100 | 69 | 2.1 s | 1.8 s | 0 ms | 0 |
| 3 | 97 | 100 | 100 | 69 | 2.3 s | 1.8 s | 0 ms | 0 |

No console errors were reported. UI checks passed for mobile layout, axe, stylesheet
count, hero priority/compression, search and no-JavaScript navigation. Lint, typecheck,
build and image/content assertions passed; six pre-existing lint warnings remain.

These are Lighthouse runs against Oxygen preview, not a new pagespeed.web.dev report
for the production URL. Network location and conditions can differ from Google's
PageSpeed infrastructure. Retest the published URL after merge. Performance 90+ does
not alone confirm field CWV; one preview LCP sample remained above 2.5 s.
SEO 69 reflects the technical host's indexing restriction. Storefront password/access
and payment settings were not changed.
