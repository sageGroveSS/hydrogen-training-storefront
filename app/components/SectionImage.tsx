import {Image} from '@shopify/hydrogen';
import type {ContentImage} from '~/lib/homepage-content';

export function SectionImage({
  image,
  sizes = '100vw',
  eager = false,
}: {
  image: ContentImage;
  sizes?: string;
  eager?: boolean;
}) {
  return image.width && image.height ? (
    <Image
      data={image}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
    />
  ) : (
    <img
      src={image.url}
      alt={image.altText ?? ''}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
    />
  );
}
