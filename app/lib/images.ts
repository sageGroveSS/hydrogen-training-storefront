export function optimizedImageUrl(src: string): string {
  if (!src.startsWith('https://cdn.shopify.com/')) return src;
  const url = new URL(src);
  if (!url.searchParams.has('quality')) url.searchParams.set('quality', '75');
  return url.href;
}
