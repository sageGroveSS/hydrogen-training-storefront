export async function readBoundedForm(request: Request) {
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
