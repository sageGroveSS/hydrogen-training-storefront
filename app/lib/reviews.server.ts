export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type ProductReview = {
  id: string;
  productHandle: string;
  productId: string | null;
  rating: number;
  title: string;
  body: string;
  reviewerName: string;
  status: ReviewStatus;
  createdAt: string;
};

export type ReviewAggregate = {
  averageRating: number;
  reviewCount: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type ProductReviews = {
  enabled: boolean;
  aggregate: ReviewAggregate;
  reviews: ProductReview[];
};

export type ReviewSubmissionInput = {
  productHandle: string;
  productId?: string | null;
  rating: number;
  title: string;
  body: string;
  reviewerName: string;
  email?: string;
  honeypot?: string;
};

export type ReviewSubmissionResult =
  | {ok: true; status: ReviewStatus}
  | {ok: false; errors: string[]};

export type ReviewsClient = {
  getProductReviews(productHandle: string): Promise<ProductReviews>;
  submitReview(input: ReviewSubmissionInput): Promise<ReviewSubmissionResult>;
};

type SupabaseReviewRow = {
  id: string;
  product_handle: string;
  product_id: string | null;
  rating: number;
  title: string;
  body: string;
  reviewer_name: string;
  status: ReviewStatus;
  created_at: string;
};

const EMPTY_DISTRIBUTION: ReviewAggregate['distribution'] = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

export function createReviewsClient(env: Env): ReviewsClient {
  const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '');
  const supabaseSecretKey = env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return createUnavailableReviewsClient();
  }

  const request = async <T>(
    path: string,
    init: RequestInit = {},
  ): Promise<{data: T; count: number | null}> => {
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: supabaseSecretKey,
        Authorization: `Bearer ${supabaseSecretKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase reviews request failed: ${response.status}`);
    }

    const countHeader = response.headers.get('content-range');
    const count = countHeader ? Number(countHeader.split('/')[1]) : null;
    const data = response.status === 204 ? null : await response.json();

    return {data: data as T, count};
  };

  return {
    async getProductReviews(productHandle) {
      try {
        const handle = encodeURIComponent(productHandle);
        const [reviewResponse, ratingResponse] = await Promise.all([
          request<SupabaseReviewRow[]>(
            [
              'reviews',
              '?select=id,product_handle,product_id,rating,title,body,reviewer_name,status,created_at',
              `&product_handle=eq.${handle}`,
              '&status=eq.approved',
              '&order=created_at.desc',
              '&limit=8',
            ].join(''),
          ),
          request<Pick<SupabaseReviewRow, 'rating'>[]>(
            [
              'reviews',
              '?select=rating',
              `&product_handle=eq.${handle}`,
              '&status=eq.approved',
              '&limit=500',
            ].join(''),
            {
              headers: {
                Prefer: 'count=exact',
              },
            },
          ),
        ]);

        const reviews = reviewResponse.data.map(mapReviewRow);
        const aggregate = createAggregate(
          ratingResponse.data,
          ratingResponse.count ?? ratingResponse.data.length,
        );

        return {
          enabled: true,
          aggregate,
          reviews,
        };
      } catch {
        return {
          enabled: false,
          aggregate: {
            averageRating: 0,
            reviewCount: 0,
            distribution: {...EMPTY_DISTRIBUTION},
          },
          reviews: [],
        };
      }
    },

    async submitReview(input) {
      const validation = validateReviewSubmission(input);
      if (!validation.ok) return validation;

      await request('reviews', {
        method: 'POST',
        headers: {
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          product_handle: input.productHandle,
          product_id: input.productId ?? null,
          rating: input.rating,
          title: input.title.trim(),
          body: input.body.trim(),
          reviewer_name: input.reviewerName.trim(),
          reviewer_email: input.email?.trim() || null,
          status: 'pending',
        }),
      });

      return {ok: true, status: 'pending'};
    },
  };
}

function createUnavailableReviewsClient(): ReviewsClient {
  return {
    async getProductReviews() {
      return {
        enabled: false,
        aggregate: {
          averageRating: 0,
          reviewCount: 0,
          distribution: {...EMPTY_DISTRIBUTION},
        },
        reviews: [],
      };
    },
    async submitReview() {
      return {
        ok: false,
        errors: ['Reviews are not configured for this environment.'],
      };
    },
  };
}

function validateReviewSubmission(
  input: ReviewSubmissionInput,
): ReviewSubmissionResult {
  const errors: string[] = [];

  if (input.honeypot) errors.push('Review could not be submitted.');
  if (!input.productHandle) errors.push('Missing product handle.');
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.push('Choose a rating from 1 to 5.');
  }
  if (input.title.trim().length < 4 || input.title.trim().length > 120) {
    errors.push('Review title must be between 4 and 120 characters.');
  }
  if (input.body.trim().length < 20 || input.body.trim().length > 2000) {
    errors.push('Review body must be between 20 and 2000 characters.');
  }
  if (
    input.reviewerName.trim().length < 2 ||
    input.reviewerName.trim().length > 80
  ) {
    errors.push('Name must be between 2 and 80 characters.');
  }

  const bannedTerms = ['spam', 'scam'];
  const searchableText = `${input.title} ${input.body}`.toLowerCase();
  if (bannedTerms.some((term) => searchableText.includes(term))) {
    errors.push('Review contains blocked language.');
  }

  return errors.length ? {ok: false, errors} : {ok: true, status: 'pending'};
}

function mapReviewRow(row: SupabaseReviewRow): ProductReview {
  return {
    id: row.id,
    productHandle: row.product_handle,
    productId: row.product_id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    reviewerName: row.reviewer_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

function createAggregate(
  rows: Pick<SupabaseReviewRow, 'rating'>[],
  reviewCount: number,
): ReviewAggregate {
  const distribution = {...EMPTY_DISTRIBUTION};
  let totalRating = 0;

  for (const row of rows) {
    if (row.rating >= 1 && row.rating <= 5) {
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] += 1;
      totalRating += row.rating;
    }
  }

  return {
    averageRating:
      reviewCount && rows.length ? Number((totalRating / rows.length).toFixed(1)) : 0,
    reviewCount,
    distribution,
  };
}
