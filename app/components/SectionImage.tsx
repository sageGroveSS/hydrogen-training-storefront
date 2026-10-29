import {Image} from '@shopify/hydrogen';
import {optimizedImageUrl} from '~/lib/images';
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
      data={{...image, url: optimizedImageUrl(image.url)}}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
    />
  ) : (
    <img
      src={optimizedImageUrl(image.url)}
      alt={image.altText ?? ''}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
    />
  );
}
