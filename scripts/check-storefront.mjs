import assert from 'node:assert/strict';

const target = process.argv[2];
assert.ok(
  target,
  'Usage: npm run check:storefront -- https://your-storefront/',
);
const base = new URL(target);

async function read(path) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return {response, body: await response.text()};
}

for (const path of [
  '/',
  '/products/luna-modular-sofa',
  '/pages/spaces-for-living',
]) {
  const {body} = await read(path);
  const links = body.match(/<link\b[^>]*>/g) ?? [];
  const canonical = links.find((link) => link.includes('rel="canonical"'));
  assert.ok(
    canonical?.includes(`href="${new URL(path, base).href}"`),
    `${path}: canonical missing or incorrect`,
  );
}
const {response: cart} = await read('/cart');
assert.match(cart.headers.get('cache-control') ?? '', /private/);
assert.match(cart.headers.get('cache-control') ?? '', /no-store/);
const invalidWishlist = await fetch(new URL('/api/wishlist', base));
assert.ok(invalidWishlist.status >= 400);
assert.match(
  invalidWishlist.headers.get('cache-control') ?? '',
  /private, no-store/,
);

const {body: index} = await read('/sitemap.xml');
const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (match) => match[1],
);
assert.ok(children.length > 0, 'Sitemap index is empty');
for (const type of ['products', 'pages', 'collections']) {
  const child = children.find((link) =>
    new URL(link).pathname.startsWith(`/sitemap/${type}/`),
  );
  assert.ok(child, `Missing ${type} sitemap`);
  assert.equal(new URL(child).origin, base.origin);
  const {body} = await read(child);
  assert.ok(
    !body.includes('hreflang="EN-US"'),
    'Sitemap contains unconfigured language variants',
  );
  const loc = body.match(/<loc>([^<]+)<\/loc>/)?.[1];
  assert.ok(loc, `Empty ${type} sitemap`);
  assert.equal(new URL(loc).origin, base.origin);
  await read(loc);
}
console.warn(
  'Storefront: canonical URLs, private cart/API headers, sitemap index and resource links passed.',
);
