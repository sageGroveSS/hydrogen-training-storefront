import {validateReviewInput, type ReviewSort} from './review-validation.ts';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type ReviewReply = {
  id: string;
  parentReplyId: string | null;
  authorName: string;
  body: string;
  depth: number;
  createdAt: string;
};
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
  replies: ReviewReply[];
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
  page: number;
  totalPages: number;
  sort: ReviewSort;
};
export type ReviewSubmissionInput = {
  productHandle: string;
  productId: string;
  rating: number;
  title: string;
  body: string;
  reviewerName: string;
  email?: string;
  honeypot?: string;
};
export type ReviewSubmissionResult =
  | {ok: true; status: 'pending'; statusCode: number}
  | {ok: false; errors: string[]; statusCode: number};

export const unavailableReviews = (): ProductReviews => ({
  enabled: false,
  page: 1,
  totalPages: 1,
  sort: 'newest',
  reviews: [],
  aggregate: {
    averageRating: 0,
    reviewCount: 0,
    distribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
  },
});

class ReviewsError extends Error {
  status: number;
  constructor(status: number) {
    super(`Reviews request failed (${status})`);
    this.status = status;
  }
}

export function createReviewsClient(env: Env) {
  const url = env.SUPABASE_URL?.replace(/\/$/, '');
  const key = env.SUPABASE_SECRET_KEY;
  async function request<T>(path: string, init: RequestInit = {}) {
    if (!url || !key) throw new ReviewsError(503);
    const response = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: key,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    if (!response.ok) throw new ReviewsError(response.status);
    return response.status === 204
      ? (null as T)
      : ((await response.json()) as T);
  }
  async function rpc<T>(name: string, input: Record<string, unknown>) {
    return request<T>(`rpc/${name}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  return {
    async getProductReviews(
      productHandle: string,
      options = {page: 1, sort: 'newest' as ReviewSort},
    ): Promise<ProductReviews> {
      try {
        return await rpc<ProductReviews>('review_product_data', {
          p_handle: productHandle,
          p_page: options.page,
          p_sort: options.sort,
        });
      } catch {
        return unavailableReviews();
      }
    },
    async submitReply(
      input: {
        productHandle: string;
        productId: string;
        reviewId: string;
        parentReplyId?: string;
        reviewerName: string;
        body: string;
        honeypot?: string;
      },
      bucket: string,
    ): Promise<ReviewSubmissionResult> {
      const errors = validateReviewInput(input, true);
      const uuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
      if (
        !uuid.test(input.reviewId) ||
        (input.parentReplyId && !uuid.test(input.parentReplyId))
      )
        errors.push('Invalid reply target.');
      if (errors.length) return {ok: false, errors, statusCode: 400};
      try {
        await rpc('review_submit', {
          p_handle: input.productHandle,
          p_product_id: input.productId,
          p_name: input.reviewerName,
          p_body: input.body,
          p_bucket: bucket,
          p_review_id: input.reviewId,
          p_parent_reply_id: input.parentReplyId || null,
        });
        return {ok: true, status: 'pending', statusCode: 200};
      } catch (error) {
        const status = error instanceof ReviewsError ? error.status : 503;
        return {
          ok: false,
          statusCode: status === 429 ? 429 : status === 400 ? 400 : 503,
          errors: [
            status === 429
              ? 'Too many submissions. Try again in 10 minutes.'
              : status === 400
                ? 'This review or reply is no longer available.'
                : 'Reply submission is temporarily unavailable.',
          ],
        };
      }
    },
    async listModeration(
      kind: 'review' | 'reply',
      status: ReviewStatus,
      page: number,
    ) {
      const select =
        kind === 'review'
          ? 'id,reviewer_name,title,body,status,created_at,product_handle'
          : 'id,author_name,body,status,created_at,parent_reply_id,reviews!inner(product_handle,title)';
      const table = kind === 'review' ? 'reviews' : 'review_replies';
      const rows = await request<
        Array<{
          id: string;
          reviewer_name?: string;
          author_name?: string;
          title?: string;
          body: string;
          status: ReviewStatus;
          created_at: string;
          product_handle?: string;
          parent_reply_id?: string;
          reviews?: {product_handle: string; title: string};
        }>
      >(
        `${table}?select=${select}&status=eq.${status}&order=created_at.desc,id.desc&offset=${(page - 1) * 20}&limit=21`,
      );
      return {
        hasNext: rows.length > 20,
        items: rows.slice(0, 20).map((row) => ({
          id: row.id,
          author: row.reviewer_name ?? row.author_name ?? '',
          title: row.title ?? row.reviews?.title ?? '',
          body: row.body,
          status: row.status,
          createdAt: row.created_at,
          productHandle:
            row.product_handle ?? row.reviews?.product_handle ?? '',
          parentReplyId: row.parent_reply_id,
        })),
      };
    },
    async moderate(
      kind: 'review' | 'reply',
      id: string,
      status: ReviewStatus,
      note: string,
    ) {
      try {
        await rpc('review_moderate', {
          p_kind: kind,
          p_id: id,
          p_status: status,
          p_note: note,
        });
      } catch (error) {
        if (error instanceof ReviewsError && error.status === 409)
          return 'Approve the review and parent reply first.';
        return 'The moderation decision could not be saved. Please retry.';
      }
    },
    async takeQuota(bucket: string, limit = 5) {
      return rpc<boolean>('review_take_quota', {
        p_bucket: bucket,
        p_limit: limit,
      });
    },
    async submitReview(
      input: ReviewSubmissionInput,
      bucket: string,
    ): Promise<ReviewSubmissionResult> {
      const errors = validateReviewInput(input);
      if (errors.length) return {ok: false, errors, statusCode: 400};
      try {
        await rpc('review_submit', {
          p_handle: input.productHandle,
          p_product_id: input.productId,
          p_name: input.reviewerName,
          p_body: input.body,
          p_bucket: bucket,
          p_rating: input.rating,
          p_title: input.title,
          p_email: input.email || null,
        });
        return {ok: true, status: 'pending', statusCode: 200};
      } catch (error) {
        const limited = error instanceof ReviewsError && error.status === 429;
        return {
          ok: false,
          statusCode: limited ? 429 : 503,
          errors: [
            limited
              ? 'Too many submissions. Try again in 10 minutes.'
              : 'Review submission is temporarily unavailable.',
          ],
        };
      }
    },
  };
}

export type ReviewsClient = ReturnType<typeof createReviewsClient>;

export async function reviewClientHash(
  request: Request,
  secret: string,
  scope = 'submission',
) {
  // shortcut: non-Oxygen requests share a bucket; add a trusted proxy IP when hosting elsewhere.
  const address = request.headers.get('oxygen-buyer-ip') || 'unknown';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const hash = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${scope}:${address}`),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function readReviewForm(request: Request) {
  if (request.headers.get('Origin') !== new URL(request.url).origin)
    throw new Response('Invalid origin.', {status: 403});
  if (
    !request.headers
      .get('Content-Type')
      ?.startsWith('application/x-www-form-urlencoded')
  )
    throw new Response('Unsupported form encoding.', {status: 415});
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        throw new Response('Form too large.', {status: 413});
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new URLSearchParams(new TextDecoder().decode(bytes));
}
