export const REVIEW_SORTS = ['newest', 'highest', 'lowest'] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export function reviewPageOptions(url: URL) {
  const page = Number(url.searchParams.get('reviewPage') || 1);
  const sort = url.searchParams.get('reviewSort') || 'newest';
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    !REVIEW_SORTS.includes(sort as ReviewSort)
  ) {
    throw new Response('Invalid review pagination or sort order.', {
      status: 400,
    });
  }
  return {page, sort: sort as ReviewSort};
}

export function validateReviewInput(
  input: {
    reviewerName: string;
    body: string;
    honeypot?: string;
    rating?: number;
    title?: string;
    email?: string;
  },
  reply = false,
) {
  const errors: string[] = [];
  if (input.honeypot) errors.push('Submission could not be accepted.');
  if (
    input.reviewerName.trim().length < 2 ||
    input.reviewerName.trim().length > 80
  )
    errors.push('Name must be between 2 and 80 characters.');
  if (
    input.body.trim().length < (reply ? 2 : 20) ||
    input.body.trim().length > 2000
  )
    errors.push(
      `Message must be between ${reply ? 2 : 20} and 2000 characters.`,
    );
  if (!reply) {
    if (
      !Number.isInteger(input.rating) ||
      input.rating! < 1 ||
      input.rating! > 5
    )
      errors.push('Choose a rating from 1 to 5.');
    if (
      (input.title?.trim().length ?? 0) < 4 ||
      (input.title?.trim().length ?? 0) > 120
    )
      errors.push('Review title must be between 4 and 120 characters.');
    if (
      input.email &&
      (input.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    )
      errors.push('Enter a valid email address.');
  }
  if (/\b(spam|scam)\b/i.test(`${input.title ?? ''} ${input.body}`))
    errors.push('Message contains blocked language.');
  return errors;
}
