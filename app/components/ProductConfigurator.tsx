import {useState, type CSSProperties} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {ConfiguratorProductFragment} from 'storefrontapi.generated';
import type {HomepageSection} from '~/lib/homepage-content';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import {findConfiguration} from '~/lib/configurator';

export function ProductConfigurator({
  product,
  content,
  headingId,
}: {
  product: ConfiguratorProductFragment;
  content: HomepageSection;
  headingId: string;
}) {
  const variants = product.variants.nodes;
  const [variantId, setVariantId] = useState(
    variants.find((variant) => variant.availableForSale)?.id ?? variants[0]?.id,
  );
  const variant = variants.find((item) => item.id === variantId) ?? variants[0];
  const {open} = useAside();
  if (!variant) return null;

  const values = Object.fromEntries(
    variant.selectedOptions.map((option) => [option.name, option.value]),
  );
  const query = new URLSearchParams(values).toString();
  const selectedStyles = content.optionStyles.filter(
    (style) => values[style.name] === style.value,
  );
  const seats = selectedStyles.find((style) => style.seats)?.seats ?? 2;
  const texture = selectedStyles.find((style) => style.texture)?.texture;
  const image = variant.image ?? product.featuredImage;
  const color = selectedStyles.find((style) => style.color)?.color ?? '#e4e2d8';

  function chooseOption(name: string, value: string) {
    const next = findConfiguration(variants, values, name, value);
    if (next) setVariantId(next.id);
  }

  return (
    <section className="product-configurator" aria-labelledby={headingId}>
      <div className="configurator-preview">
        <p className="section-kicker">{content.previewTitle}</p>
        {content.previewMode === 'sofa' ? (
          <div
            className="sofa-study"
            data-material={texture}
            style={{'--sofa-color': color} as CSSProperties}
            role="img"
            aria-label={`${variant.selectedOptions.map((option) => option.value).join(', ')}, ${seats} seats`}
          >
            <div className="sofa-back">
              {Array.from({length: seats}, (_, index) => (
                <i key={index} />
              ))}
            </div>
            <div className="sofa-seats">
              {Array.from({length: seats}, (_, index) => (
                <i key={index} />
              ))}
            </div>
            <div className="sofa-base" />
            <div className="sofa-arm sofa-arm-left" />
            <div className="sofa-arm sofa-arm-right" />
            <div className="sofa-leg sofa-leg-left" />
            <div className="sofa-leg sofa-leg-right" />
          </div>
        ) : image ? (
          <Image
            key={image.url}
            className="configurator-main-image"
            data={image}
            sizes="(min-width: 45em) 600px, 100vw"
            loading="lazy"
          />
        ) : null}
        <p className="configurator-caption">
          {variant.selectedOptions.map((option) => option.value).join(' / ')}
        </p>
        {image && (
          <Link
            className="configurator-photo"
            to={`/products/${product.handle}?${query}`}
          >
            <Image data={image} sizes="180px" width={180} loading="lazy" />
            <span>{product.title}</span>
          </Link>
        )}
      </div>
      <div className="configurator-controls">
        <p className="section-kicker">{content.kicker}</p>
        <h2 id={headingId}>{content.title || product.title}</h2>
        {content.body && <p className="configurator-body">{content.body}</p>}
        {product.options
          .filter((option) => option.optionValues.length > 1)
          .map((option) => (
            <fieldset key={option.name}>
              <legend>{option.name}</legend>
              <div className="configurator-options">
                {option.optionValues.map(({name}) => {
                  const exists = Boolean(
                    findConfiguration(variants, values, option.name, name),
                  );
                  return (
                    <label
                      key={name}
                      data-selected={values[option.name] === name}
                    >
                      <input
                        type="radio"
                        name={`${headingId}-configuration-${option.name}`}
                        value={name}
                        checked={values[option.name] === name}
                        disabled={!exists}
                        onChange={() => chooseOption(option.name, name)}
                      />
                      {content.optionStyles.find(
                        (style) =>
                          style.name === option.name && style.value === name,
                      )?.color && (
                        <i
                          className="configuration-swatch"
                          style={{
                            backgroundColor: content.optionStyles.find(
                              (style) =>
                                style.name === option.name &&
                                style.value === name,
                            )?.color,
                          }}
                        />
                      )}
                      {name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        <div
          className="configurator-price"
          aria-live="polite"
          aria-atomic="true"
        >
          <Money data={variant.price} />
          <span>{variant.availableForSale ? 'Available' : 'Sold out'}</span>
        </div>
        <AddToCartButton
          disabled={!variant.availableForSale}
          lines={[{merchandiseId: variant.id, quantity: 1}]}
          onClick={() => open('cart')}
        >
          {variant.availableForSale ? 'Add to cart' : 'Sold out'}
        </AddToCartButton>
        <Link
          className="configurator-details"
          to={`/products/${product.handle}?${query}`}
        >
          View product details →
        </Link>
        <noscript>
          <p>
            Choose your options on{' '}
            <a href={`/products/${product.handle}`}>{product.title}</a>.
          </p>
        </noscript>
      </div>
    </section>
  );
}
