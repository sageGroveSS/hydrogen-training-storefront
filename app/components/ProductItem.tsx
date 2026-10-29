import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {
  ProductItemFragment,
  CollectionItemFragment,
  HomeProductFragment,
} from 'storefrontapi.generated';
import {optimizedImageUrl} from '~/lib/images';
import {useVariantUrl} from '~/lib/variants';
import {WishlistButton} from '~/components/Wishlist';

export function ProductItem({
  product,
  loading,
  sizes = '(min-width: 80em) 280px, (min-width: 60em) 30vw, (min-width: 36em) 45vw, 90vw',
  headingAs: Heading = 'h2',
}: {
  product: CollectionItemFragment | ProductItemFragment | HomeProductFragment;
  loading?: 'eager' | 'lazy';
  sizes?: string;
  headingAs?: 'h2' | 'h3';
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  return (
    <div className="product-card">
      <Link
        className="product-item"
        key={product.id}
        prefetch="intent"
        to={variantUrl}
      >
        {image && (
          <Image
            alt={image.altText || product.title}
            aspectRatio="1/1"
            data={{...image, url: optimizedImageUrl(image.url)}}
            loading={loading ?? 'lazy'}
            fetchPriority={loading === 'eager' ? 'high' : 'auto'}
            sizes={sizes}
            srcSetOptions={{
              intervals: 16,
              startingWidth: 100,
              incrementSize: 100,
              placeholderWidth: 100,
            }}
          />
        )}
        <Heading>{product.title}</Heading>
        <small>
          <Money data={product.priceRange.minVariantPrice} />
        </small>
      </Link>
      <WishlistButton id={product.id} title={product.title} compact />
    </div>
  );
}
