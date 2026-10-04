import {lazy, Suspense, type ComponentType} from 'react';
import {Await, Link} from 'react-router';
import type {
  ConfiguratorProductFragment,
  ConfiguratorProductsQuery,
} from 'storefrontapi.generated';
import type {HomepageContent, HomepageSection} from '~/lib/homepage-content';
import {ProductItem} from './ProductItem';
import {SectionImage} from './SectionImage';
import {MotionSection} from './MotionSection';
import {
  BuyingTimeline,
  ParallaxSection,
  ScrollComposition,
  InteractiveLookbook,
} from './CreativeSections';

const ProductConfigurator = lazy<
  ComponentType<{
    product: ConfiguratorProductFragment;
    content: HomepageSection;
    headingId: string;
  }>
>(() =>
  import('./ProductConfigurator').then((module) => ({
    default: module.ProductConfigurator,
  })),
);

export function HomepageSections({
  page,
  configuratorProducts,
  source,
}: {
  page: HomepageContent;
  configuratorProducts: Promise<ConfiguratorProductsQuery | null>;
  source: 'metaobject' | 'demo';
}) {
  return (
    <div className="home storefront-home" data-content-source={source}>
      {page.sections.map((section, index) => {
        const headingId = `home-section-${index}-${section.id.split('/').pop()}`;
        return (
          <HomeSection
            key={`${section.id}-${index}`}
            content={section}
            headingId={headingId}
            first={index === 0}
            configuratorProducts={configuratorProducts}
          />
        );
      })}
    </div>
  );
}

function HomeSection({
  content,
  headingId,
  first,
  configuratorProducts,
}: {
  content: HomepageSection;
  headingId: string;
  first: boolean;
  configuratorProducts: Promise<ConfiguratorProductsQuery | null>;
}) {
  const props = {content, headingId};
  switch (content.kind) {
    case 'hero': {
      if (!content.image) return null;
      const Heading = first ? 'h1' : 'h2';
      return (
        <section className="home-hero" aria-labelledby={headingId}>
          <div className="home-hero-media">
            <SectionImage image={content.image} eager={first} />
          </div>
          <div className="home-hero-copy">
            <p className="section-kicker">{content.kicker}</p>
            <Heading id={headingId}>{content.title}</Heading>
            <p>{content.body}</p>
            <div className="home-hero-actions">
              {content.links.map((link) => (
                <Link key={link.id} to={link.url}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      );
    }
    case 'categories':
      return (
        <nav className="home-category-nav" aria-label={content.title}>
          {content.links.map((link) => (
            <Link key={link.id} to={link.url}>
              <span>{link.label}</span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
      );
    case 'products':
      return (
        <section
          className="home-product-rail recommended-products"
          aria-labelledby={headingId}
        >
          <div className="section-heading">
            <p className="section-kicker">{content.kicker}</p>
            <h2 id={headingId}>{content.title}</h2>
          </div>
          <div className="recommended-products-grid">
            {content.products.map((product) => (
              <ProductItem key={product.id} product={product} loading="lazy" />
            ))}
          </div>
        </section>
      );
    case 'editorial':
      return (
        <MotionSection className="systems-editorial" labelledBy={headingId}>
          <div className="systems-editorial-inner">
            <div className="editorial-copy" data-motion-item>
              <p className="section-kicker">{content.kicker}</p>
              <h2 id={headingId}>{content.title}</h2>
            </div>
            <div className="editorial-copy" data-motion-item>
              <p>{content.body}</p>
              <div className="systems-editorial-actions">
                {content.links.map((link) => (
                  <Link className="systems-link" key={link.id} to={link.url}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </MotionSection>
      );
    case 'parallax':
      return <ParallaxSection {...props} />;
    case 'composition':
      return <ScrollComposition {...props} />;
    case 'timeline':
      return <BuyingTimeline {...props} />;
    case 'lookbook':
      return <InteractiveLookbook {...props} />;
    case 'configurator':
      return (
        <Suspense
          fallback={
            <div className="creative-loading">
              {content.title || content.product?.title}
            </div>
          }
        >
          <Await resolve={configuratorProducts}>
            {(result: ConfiguratorProductsQuery | null) => {
              const product = result?.nodes.find(
                (node) =>
                  node?.__typename === 'Product' &&
                  node.id === content.product?.id,
              );
              if (
                product?.__typename !== 'Product' ||
                product.variants.pageInfo.hasNextPage
              )
                return content.product ? (
                  <section className="creative-loading">
                    <Link to={`/products/${content.product.handle}`}>
                      {content.title || content.product.title} →
                    </Link>
                  </section>
                ) : null;
              return <ProductConfigurator {...props} product={product} />;
            }}
          </Await>
        </Suspense>
      );
  }
}
