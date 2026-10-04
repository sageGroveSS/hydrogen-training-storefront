import {Form, useActionData, useNavigation} from 'react-router';
import type {loader, action} from '~/routes/products.$handle';
import type {ProductReviews as ProductReviewsData} from '~/lib/reviews.server';

type ProductReviewsProps = {
  product: Awaited<ReturnType<typeof loader>>['product'];
  reviews: ProductReviewsData;
};

export function ProductReviews({product, reviews}: ProductReviewsProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const showSuccess = actionData?.ok === true;
  const errors = actionData?.ok === false ? actionData.errors : [];
  const reviewsUnavailable = !reviews.enabled;

  return (
    <section className="product-reviews" aria-labelledby="product-reviews">
      <div className="product-reviews-header">
        <div>
          <h2 id="product-reviews">Reviews</h2>
          {reviewsUnavailable ? (
            <p>Reviews are temporarily unavailable.</p>
          ) : reviews.aggregate.reviewCount > 0 ? (
            <p>
              {reviews.aggregate.averageRating.toFixed(1)} average from{' '}
              {reviews.aggregate.reviewCount} approved reviews
            </p>
          ) : (
            <p>No approved reviews yet.</p>
          )}
        </div>
      </div>

      {reviews.reviews.length > 0 ? (
        <ol className="product-review-list">
          {reviews.reviews.map((review) => (
            <li key={review.id} className="product-review">
              <div className="product-review-rating" aria-label={`${review.rating} out of 5 stars`}>
                {'★'.repeat(review.rating)}
                {'☆'.repeat(5 - review.rating)}
              </div>
              <h3>{review.title}</h3>
              <p>{review.body}</p>
              <small>
                {review.reviewerName} ·{' '}
                {formatReviewDate(review.createdAt)}
              </small>
            </li>
          ))}
        </ol>
      ) : null}

      <Form method="post" className="review-form">
        <h3>Write a review</h3>
        <input type="hidden" name="intent" value="submit-review" />
        <input type="hidden" name="productHandle" value={product.handle} />
        <input type="hidden" name="productId" value={product.id} />
        <label className="review-form-honeypot">
          Leave this field empty
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
        <label>
          Rating
          <select name="rating" required defaultValue="5">
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
        </label>
        <label>
          Name
          <input name="reviewerName" required minLength={2} maxLength={80} />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" />
        </label>
        <label>
          Title
          <input name="title" required minLength={4} maxLength={120} />
        </label>
        <label>
          Review
          <textarea name="body" required minLength={20} maxLength={2000} rows={5} />
        </label>
        {errors.length > 0 ? (
          <div className="review-form-errors" role="alert">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}
        {showSuccess ? (
          <p className="review-form-success" role="status">
            Review submitted for moderation.
          </p>
        ) : null}
        <button type="submit" disabled={isSubmitting || reviewsUnavailable}>
          {isSubmitting ? 'Submitting...' : 'Submit review'}
        </button>
      </Form>
    </section>
  );
}

function formatReviewDate(date: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(date));
}
