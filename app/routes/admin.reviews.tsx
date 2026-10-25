import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type {Route} from './+types/admin.reviews';
import {
  moderationSession,
  verifyModeratorToken,
} from '~/lib/review-moderation.server';
import {
  readReviewForm,
  reviewClientHash,
  type ReviewStatus,
} from '~/lib/reviews.server';

export const meta = () => [
  {title: 'Review moderation'},
  {name: 'robots', content: 'noindex,nofollow'},
];
const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'same-origin',
};
export const headers: Route.HeadersFunction = ({actionHeaders}) => {
  const headers = new Headers(actionHeaders);
  for (const [name, value] of Object.entries(privateHeaders)) {
    headers.set(name, value);
  }
  return headers;
};

export async function loader({request, context}: Route.LoaderArgs) {
  const access = await moderationSession(request, context.env);
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind') || 'review';
  const status = url.searchParams.get('status') || 'pending';
  const page = Number(url.searchParams.get('page') || 1);
  if (
    (kind !== 'review' && kind !== 'reply') ||
    !['pending', 'approved', 'rejected'].includes(status) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000
  )
    throw new Response('Invalid moderation filters.', {status: 400});
  const result = access.authenticated
    ? await context.reviews.listModeration(kind, status as ReviewStatus, page)
    : {items: [], hasNext: false};
  return data(
    {authenticated: access.authenticated, kind, status, page, ...result},
    {headers: privateHeaders},
  );
}

export async function action({request, context}: Route.ActionArgs) {
  const form = await readReviewForm(request);
  const access = await moderationSession(request, context.env);
  const intent = form.get('intent');
  if (intent === 'login') {
    const allowed = await context.reviews.takeQuota(
      await reviewClientHash(
        request,
        context.env.SESSION_SECRET,
        'moderation-login',
      ),
      10,
    );
    if (!allowed)
      return data(
        {error: 'Too many attempts. Try again in 10 minutes.'},
        {status: 429, headers: {...privateHeaders, 'Retry-After': '600'}},
      );
    if (
      !(await verifyModeratorToken(
        form.get('token') ?? '',
        context.env.REVIEWS_MODERATION_TOKEN!,
      ))
    )
      return data(
        {error: 'Invalid moderation token.'},
        {status: 401, headers: privateHeaders},
      );
    access.session.set('credential', access.credential);
    access.session.set('expires', Date.now() + 8 * 60 * 60 * 1000);
    return redirect('/admin/reviews', {
      headers: {
        ...privateHeaders,
        'Set-Cookie': await access.storage.commitSession(access.session),
      },
    });
  }
  if (!access.authenticated)
    return data(
      {error: 'Sign in to moderate reviews.'},
      {status: 401, headers: privateHeaders},
    );
  if (intent === 'logout')
    return redirect('/admin/reviews', {
      headers: {
        ...privateHeaders,
        'Set-Cookie': await access.storage.destroySession(access.session),
      },
    });
  const kind = form.get('kind');
  const status = form.get('status');
  const id = form.get('id') ?? '';
  const note = form.get('note') ?? '';
  if (
    intent !== 'moderate' ||
    (kind !== 'review' && kind !== 'reply') ||
    !['pending', 'approved', 'rejected'].includes(status ?? '') ||
    !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id) ||
    note.length > 500
  )
    return data(
      {error: 'Invalid moderation request.'},
      {status: 400, headers: privateHeaders},
    );
  const error = await context.reviews.moderate(
    kind,
    id,
    status as ReviewStatus,
    note,
  );
  return data(
    {error: error ?? null},
    {status: error ? 409 : 200, headers: privateHeaders},
  );
}

export default function ReviewModeration() {
  const result = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const pending = useNavigation().state !== 'idle';
  return (
    <main className="page review-moderation">
      <div className="product-reviews-header">
        <div>
          <p className="collection-filter-eyebrow">STORE MANAGEMENT</p>
          <h1>Review moderation</h1>
        </div>
        {result.authenticated && (
          <Form method="post">
            <button name="intent" value="logout" type="submit">
              Sign out
            </button>
          </Form>
        )}
      </div>
      {actionData?.error && (
        <p role="alert" className="review-form-errors">
          {actionData.error}
        </p>
      )}
      {!result.authenticated ? (
        <Form method="post" className="review-form">
          <h2>Moderator sign in</h2>
          <p>
            Use the private moderation token configured for this storefront.
          </p>
          <input type="hidden" name="intent" value="login" />
          <label>
            Moderation token
            <input
              type="password"
              name="token"
              required
              maxLength={256}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={pending}>
            Sign in
          </button>
        </Form>
      ) : (
        <>
          <Form method="get" className="review-moderation-filters">
            <label>
              Content
              <select name="kind" defaultValue={result.kind}>
                <option value="review">Reviews</option>
                <option value="reply">Replies</option>
              </select>
            </label>
            <label>
              Status
              <select name="status" defaultValue={result.status}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <button type="submit">Show queue</button>
          </Form>
          <p role="status">
            {result.items.length
              ? `${result.items.length} items on this page`
              : 'No items in this queue.'}
          </p>
          <ol className="product-review-list">
            {result.items.map((item) => (
              <li className="product-review" key={item.id}>
                <div className="product-reviews-header">
                  <strong>{item.author}</strong>
                  <span className="review-status">{item.status}</span>
                </div>
                <h2>{item.title}</h2>
                <p className="review-content">{item.body}</p>
                <p>
                  <Link to={`/products/${item.productHandle}#product-reviews`}>
                    View product
                  </Link>{' '}
                  ·{' '}
                  {new Date(item.createdAt).toLocaleDateString('en', {
                    timeZone: 'UTC',
                  })}
                </p>
                {item.parentReplyId && (
                  <p>Nested reply — its parent must be approved first.</p>
                )}
                <Form method="post" className="review-moderation-decision">
                  <input type="hidden" name="intent" value="moderate" />
                  <input type="hidden" name="kind" value={result.kind} />
                  <input type="hidden" name="id" value={item.id} />
                  <label>
                    Internal note
                    <textarea name="note" maxLength={500} rows={2} />
                  </label>
                  <div>
                    <button
                      type="submit"
                      name="status"
                      value="approved"
                      disabled={pending}
                    >
                      Approve
                    </button>
                    <button
                      type="submit"
                      name="status"
                      value="rejected"
                      disabled={pending}
                    >
                      Reject
                    </button>
                    <button
                      type="submit"
                      name="status"
                      value="pending"
                      disabled={pending}
                    >
                      Return to pending
                    </button>
                  </div>
                </Form>
              </li>
            ))}
          </ol>
          <nav aria-label="Moderation pages" className="review-pagination">
            {result.page > 1 && (
              <Link
                to={`?kind=${result.kind}&status=${result.status}&page=${result.page - 1}`}
              >
                ← Previous
              </Link>
            )}
            <span>Page {result.page}</span>
            {result.hasNext && (
              <Link
                to={`?kind=${result.kind}&status=${result.status}&page=${result.page + 1}`}
              >
                Next →
              </Link>
            )}
          </nav>
        </>
      )}
    </main>
  );
}
