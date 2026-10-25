import {createCookieSessionStorage} from 'react-router';

async function credentialDigest(token: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function moderationSession(request: Request, env: Env) {
  const token = env.REVIEWS_MODERATION_TOKEN;
  if (!token || token.length < 32)
    throw new Response('Review moderation is not configured.', {
      status: 503,
      headers: {'Cache-Control': 'private, no-store'},
    });
  const storage = createCookieSessionStorage({
    cookie: {
      name: 'review_moderator_session',
      httpOnly: true,
      sameSite: 'strict',
      secure: new URL(request.url).protocol === 'https:',
      // React Router submits enhanced forms to /admin/reviews.data.
      path: '/admin',
      maxAge: 60 * 60 * 8,
      secrets: [env.SESSION_SECRET],
    },
  });
  const session = await storage.getSession(request.headers.get('Cookie'));
  const credential = await credentialDigest(token);
  const authenticated =
    session.get('credential') === credential &&
    Number(session.get('expires')) > Date.now();
  return {authenticated, session, storage, credential};
}

export async function verifyModeratorToken(
  candidate: string,
  expected: string,
) {
  if (candidate.length > 256) return false;
  const actual = await credentialDigest(candidate);
  const target = await credentialDigest(expected);
  let difference = 0;
  for (let index = 0; index < actual.length; index++)
    difference |= actual.charCodeAt(index) ^ target.charCodeAt(index);
  return difference === 0;
}
