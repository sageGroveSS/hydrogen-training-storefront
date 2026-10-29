import assert from 'node:assert/strict';
import {optimizedImageUrl} from '../app/lib/images.ts';
const source = 'https://cdn.shopify.com/s/files/photo.jpg?v=123&width=800';
const image = new URL(optimizedImageUrl(source));
assert.equal(image.searchParams.get('quality'), '75');
assert.equal(image.searchParams.get('v'), '123');
assert.equal(image.searchParams.get('width'), '800');
assert.equal(optimizedImageUrl(image.href), image.href);
assert.equal(
  new URL(optimizedImageUrl(`${source}&quality=60`)).searchParams.get(
    'quality',
  ),
  '60',
);
for (const url of [
  'https://example.com/photo.jpg',
  'https://cdn.shopify.com.example.com/photo.jpg',
  '/image.jpg',
  '',
]) {
  assert.equal(optimizedImageUrl(url), url);
}
console.warn(
  'Images: CDN compression, preserved transforms/quality and external URLs passed.',
);
