import assert from 'node:assert/strict';
import {
  validateReviewInput,
  reviewPageOptions,
} from '../app/lib/review-validation.ts';
import {
  createReviewsClient,
  reviewClientHash,
  readReviewForm,
} from '../app/lib/reviews.server.ts';

const valid = {
  reviewerName: 'Test author',
  rating: 5,
  title: 'A good sofa',
  body: 'A useful review with enough detail.',
};
assert.deepEqual(validateReviewInput(valid), []);
for (const input of [
  {...valid, rating: 0},
  {...valid, rating: 2.5},
  {...valid, title: 'a'},
  {...valid, body: 'x'},
  {...valid, reviewerName: 'x'},
  {...valid, email: 'bad'},
  {...valid, honeypot: 'bot'},
])
  assert.ok(validateReviewInput(input).length);
assert.deepEqual(
  reviewPageOptions(
    new URL('https://test/products/sofa?reviewPage=2&reviewSort=highest'),
  ),
  {page: 2, sort: 'highest'},
);
for (const suffix of ['reviewPage=-1', 'reviewPage=1.5', 'reviewSort=bad'])
  assert.throws(
    () => reviewPageOptions(new URL(`https://test/?${suffix}`)),
    (error) => error.status === 400,
  );
const hash = await reviewClientHash(new Request('https://test'), 'test-secret');
assert.match(hash, /^[a-f0-9]{64}$/);
assert.notEqual(
  hash,
  await reviewClientHash(new Request('https://test'), 'other-secret'),
);
const formRequest = (origin = 'https://test', body = 'body=valid') =>
  new Request('https://test/products/sofa', {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
assert.equal((await readReviewForm(formRequest())).get('body'), 'valid');
await assert.rejects(
  readReviewForm(formRequest('https://evil.test')),
  (error) => error.status === 403,
);
await assert.rejects(
  readReviewForm(formRequest('https://test', 'x'.repeat(16385))),
  (error) => error.status === 413,
);

const originalFetch = globalThis.fetch;
try {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({url, init});
    return Response.json({
      enabled: true,
      aggregate: {reviewCount: 501, averageRating: 4.2},
      reviews: [],
    });
  };
  const client = createReviewsClient({
    SUPABASE_URL: 'https://project.test',
    SUPABASE_SECRET_KEY: 'sb_secret_test',
  });
  const result = await client.getProductReviews('sofa');
  assert.equal(result.aggregate.reviewCount, 501);
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.equal(calls[0].init.headers.apikey, 'sb_secret_test');
  assert.ok(calls[0].url.endsWith('/rpc/review_product_data'));
  globalThis.fetch = async () => new Response('', {status: 429});
  assert.equal(
    (
      await client.submitReview(
        {...valid, productHandle: 'sofa', productId: 'gid://shopify/Product/1'},
        hash,
      )
    ).statusCode,
    429,
  );
} finally {
  globalThis.fetch = originalFetch;
}
console.warn(
  'Reviews: validation, pagination, private headers, hashing, form boundaries and rate-limit handling passed.',
);
