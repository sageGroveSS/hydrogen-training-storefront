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

const {moderationSession, verifyModeratorToken} =
  await import('../app/lib/review-moderation.server.ts');
const moderatorEnv = {
  SESSION_SECRET: 'test-session-secret-not-for-production',
  REVIEWS_MODERATION_TOKEN: 'test-moderator-token-'.repeat(3),
};
assert.equal(
  await verifyModeratorToken(
    moderatorEnv.REVIEWS_MODERATION_TOKEN,
    moderatorEnv.REVIEWS_MODERATION_TOKEN,
  ),
  true,
);
assert.equal(
  await verifyModeratorToken('wrong', moderatorEnv.REVIEWS_MODERATION_TOKEN),
  false,
);
const moderatorUrl = 'https://test/admin/reviews';
const login = await moderationSession(new Request(moderatorUrl), moderatorEnv);
assert.equal(login.authenticated, false);
login.session.set('credential', login.credential);
login.session.set('expires', Date.now() + 10000);
const cookie = await login.storage.commitSession(login.session);
const cookiePath = cookie.match(/(?:^|;\s*)Path=([^;]+)/)?.[1];
for (const pathname of ['/admin/reviews', '/admin/reviews.data']) {
  assert.ok(
    pathname === cookiePath || pathname.startsWith(`${cookiePath}/`),
    `Moderator cookie must reach ${pathname}`,
  );
}
assert.ok(
  cookie.includes('HttpOnly') &&
    cookie.includes('Secure') &&
    cookie.includes('SameSite=Strict'),
);
const signedRequest = new Request(`${moderatorUrl}.data`, {
  headers: {Cookie: cookie.split(';')[0]},
});
assert.equal(
  (await moderationSession(signedRequest, moderatorEnv)).authenticated,
  true,
);
assert.equal(
  (
    await moderationSession(signedRequest, {
      ...moderatorEnv,
      REVIEWS_MODERATION_TOKEN: 'rotated-token-'.repeat(4),
    })
  ).authenticated,
  false,
);
login.session.set('expires', Date.now() - 1);
const expiredCookie = await login.storage.commitSession(login.session);
assert.equal(
  (
    await moderationSession(
      new Request(moderatorUrl, {
        headers: {Cookie: expiredCookie.split(';')[0]},
      }),
      moderatorEnv,
    )
  ).authenticated,
  false,
);
console.warn(
  'Moderation: token verification, signed secure session, expiry and credential rotation passed.',
);

assert.deepEqual(
  validateReviewInput({reviewerName: 'Reader', body: 'A useful reply.'}, true),
  [],
);
assert.ok(validateReviewInput({reviewerName: 'R', body: 'a'}, true).length);
try {
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = JSON.parse(init.body);
    return Response.json('00000000-0000-4000-8000-000000000001');
  };
  const client = createReviewsClient({
    SUPABASE_URL: 'https://project.test',
    SUPABASE_SECRET_KEY: 'sb_secret_test',
  });
  const reply = {
    productHandle: 'sofa',
    productId: 'gid://shopify/Product/1',
    reviewId: '00000000-0000-4000-8000-000000000001',
    reviewerName: 'Reader',
    body: 'A useful reply.',
  };
  assert.equal((await client.submitReply(reply, hash)).ok, true);
  assert.equal(sent.p_review_id, reply.reviewId);
  assert.equal(sent.p_parent_reply_id, null);
  assert.equal(
    (await client.submitReply({...reply, reviewId: 'invalid'}, hash)).ok,
    false,
  );
  globalThis.fetch = async () => new Response('', {status: 400});
  assert.equal((await client.submitReply(reply, hash)).statusCode, 400);
} finally {
  globalThis.fetch = originalFetch;
}
console.warn(
  'Replies: validation, target binding, pending submission and unavailable-parent handling passed.',
);
