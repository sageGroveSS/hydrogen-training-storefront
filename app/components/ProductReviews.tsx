import {
  Form,
  Link,
  useActionData,
  useLocation,
  useNavigation,
} from 'react-router';
import type {loader, action} from '~/routes/products.$handle';
import type {
  ProductReviews as ProductReviewsData,
  ReviewReply,
} from '~/lib/reviews.server';

type ProductReviewsProps = {
  product: Awaited<ReturnType<typeof loader>>['product'];
  reviews: ProductReviewsData;
};

export function ProductReviews({product, reviews}: ProductReviewsProps) {
  const {pathname, search} = useLocation();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const errors =
    actionData?.ok === false && actionData.formId === 'review'
      ? actionData.errors
      : [];
  const success = actionData?.ok === true && actionData.formId === 'review';
  const reviewUrl = (page: number) => {
    const params = new URLSearchParams(search);
    params.set('reviewPage', String(page));
    params.set('reviewSort', reviews.sort);
    return `${pathname}?${params}#product-reviews`;
  };
  return (
    <section className="product-reviews" aria-labelledby="product-reviews">
      <div className="product-reviews-header">
        <div>
          <p className="collection-filter-eyebrow">FROM THE COMMUNITY</p>
          <h2 id="product-reviews">Reviews & conversations</h2>
          {!reviews.enabled ? (
            <p>Reviews are temporarily unavailable.</p>
          ) : reviews.aggregate.reviewCount === 0 ? (
            <p>Be the first to share your experience.</p>
          ) : (
            <p>Based on {reviews.aggregate.reviewCount} approved reviews</p>
          )}
        </div>
      </div>
      {reviews.enabled && reviews.aggregate.reviewCount > 0 && (
        <div className="review-overview">
          <div className="review-score">
            <strong>{reviews.aggregate.averageRating.toFixed(1)}</strong>
            <span>out of 5</span>
          </div>
          <div className="review-distribution" aria-label="Rating distribution">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars}>
                <span>{stars} ★</span>
                <meter
                  min="0"
                  max={reviews.aggregate.reviewCount}
                  value={
                    reviews.aggregate.distribution[stars as 1 | 2 | 3 | 4 | 5]
                  }
                  aria-label={`${stars} star reviews`}
                />
                <span>
                  {reviews.aggregate.distribution[stars as 1 | 2 | 3 | 4 | 5]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {reviews.enabled && reviews.aggregate.reviewCount > 0 && (
        <Form
          method="get"
          action={`${pathname}#product-reviews`}
          className="review-sort"
          key={reviews.sort}
        >
          {[...new URLSearchParams(search)]
            .filter(([name]) => name !== 'reviewPage' && name !== 'reviewSort')
            .map(([name, value]) => (
              <input
                type="hidden"
                key={`${name}:${value}`}
                name={name}
                value={value}
              />
            ))}
          <label>
            Sort reviews
            <select name="reviewSort" defaultValue={reviews.sort}>
              <option value="newest">Newest first</option>
              <option value="highest">Highest rating</option>
              <option value="lowest">Lowest rating</option>
            </select>
          </label>
          <button type="submit">Apply</button>
        </Form>
      )}
      {reviews.reviews.length > 0 && (
        <ol className="product-review-list">
          {reviews.reviews.map((review) => (
            <li key={review.id} className="product-review">
              <div
                className="product-review-rating"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {'★'.repeat(review.rating)}
                {'☆'.repeat(5 - review.rating)}
              </div>
              <h3>{review.title}</h3>
              <p className="review-content">{review.body}</p>
              <small>
                {review.reviewerName} · {formatReviewDate(review.createdAt)}
              </small>
              <ReplyForm reviewId={review.id} />
              <ReplyList
                reviewId={review.id}
                replies={review.replies}
                parentId={null}
              />
            </li>
          ))}
        </ol>
      )}
      {reviews.enabled && reviews.totalPages > 1 && (
        <nav className="review-pagination" aria-label="Review pages">
          {reviews.page > 1 && (
            <Link to={reviewUrl(reviews.page - 1)}>← Previous</Link>
          )}
          <span>
            Page {reviews.page} of {reviews.totalPages}
          </span>
          {reviews.page < reviews.totalPages && (
            <Link to={reviewUrl(reviews.page + 1)}>Next →</Link>
          )}
        </nav>
      )}
      <Form method="post" className="review-form">
        <h3>Write a review</h3>
        <p>
          Reviews are checked before publication. Your email is never displayed.
        </p>
        <input type="hidden" name="intent" value="submit-review" />
        <Honeypot />
        <label>
          Rating
          <select name="rating" required defaultValue="5">
            {[5, 4, 3, 2, 1].map((stars) => (
              <option key={stars} value={stars}>
                {stars} stars
              </option>
            ))}
          </select>
        </label>
        <label>
          Name
          <input
            name="reviewerName"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
          />
        </label>
        <label>
          Email (optional)
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
          />
        </label>
        <label>
          Title
          <input name="title" required minLength={4} maxLength={120} />
        </label>
        <label>
          Review
          <textarea
            name="body"
            required
            minLength={20}
            maxLength={2000}
            rows={5}
          />
        </label>
        {errors.length > 0 && (
          <div className="review-form-errors" role="alert">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}
        {success && (
          <p className="review-form-success" role="status">
            Review submitted for moderation.
          </p>
        )}
        <button
          type="submit"
          disabled={navigation.state !== 'idle' || !reviews.enabled}
        >
          {navigation.state === 'submitting' ? 'Submitting…' : 'Submit review'}
        </button>
      </Form>
    </section>
  );
}

function ReplyList({
  reviewId,
  replies,
  parentId,
}: {
  reviewId: string;
  replies: ReviewReply[];
  parentId: string | null;
}) {
  const children = replies.filter((reply) => reply.parentReplyId === parentId);
  if (!children.length) return null;
  return (
    <ol className="review-replies">
      {children.map((reply) => (
        <li key={reply.id}>
          <small>
            <strong>{reply.authorName}</strong> ·{' '}
            {formatReviewDate(reply.createdAt)}
          </small>
          <p className="review-content">{reply.body}</p>
          {reply.depth < 2 && (
            <>
              <ReplyForm reviewId={reviewId} parentReplyId={reply.id} />
              <ReplyList
                reviewId={reviewId}
                replies={replies}
                parentId={reply.id}
              />
            </>
          )}
        </li>
      ))}
    </ol>
  );
}

function ReplyForm({
  reviewId,
  parentReplyId,
}: {
  reviewId: string;
  parentReplyId?: string;
}) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const formId = `${reviewId}:${parentReplyId ?? ''}`;
  const active = actionData?.formId === formId;
  return (
    <details className="review-reply-form" open={active}>
      <summary>
        {parentReplyId ? 'Reply to this comment' : 'Join the conversation'}
      </summary>
      <Form method="post" className="review-form">
        <input type="hidden" name="intent" value="submit-reply" />
        <input type="hidden" name="reviewId" value={reviewId} />
        {parentReplyId && (
          <input type="hidden" name="parentReplyId" value={parentReplyId} />
        )}
        <Honeypot />
        <label>
          Name
          <input
            name="reviewerName"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
          />
        </label>
        <label>
          Reply
          <textarea
            name="body"
            required
            minLength={2}
            maxLength={2000}
            rows={3}
          />
        </label>
        <p>Replies are published after moderation.</p>
        {active && actionData?.ok === false && (
          <div role="alert" className="review-form-errors">
            {actionData.errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}
        {active && actionData?.ok === true && (
          <p role="status" className="review-form-success">
            Reply submitted for moderation.
          </p>
        )}
        <button type="submit" disabled={navigation.state !== 'idle'}>
          Submit reply
        </button>
      </Form>
    </details>
  );
}

function Honeypot() {
  return (
    <label className="review-form-honeypot" aria-hidden="true">
      Leave this field empty
      <input name="company" tabIndex={-1} autoComplete="off" />
    </label>
  );
}

function formatReviewDate(date: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(date));
}
