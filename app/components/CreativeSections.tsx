import {useState} from 'react';
import {Link} from 'react-router';
import type {HomepageSection} from '~/lib/homepage-content';
import {MotionSection} from './MotionSection';
import {SectionImage} from './SectionImage';

type Props = {content: HomepageSection; headingId: string};

function SectionLinks({links}: {links: HomepageSection['links']}) {
  return (
    <>
      {links.map((link) => (
        <Link key={link.id} to={link.url}>
          {link.label}
        </Link>
      ))}
    </>
  );
}

export function ParallaxSection({content, headingId}: Props) {
  if (!content.image) return null;
  return (
    <MotionSection className="room-parallax" labelledBy={headingId}>
      <div className="parallax-layer" data-motion-item>
        <SectionImage image={content.image} />
      </div>
      <div className="parallax-copy">
        <p className="section-kicker">{content.kicker}</p>
        <h2 id={headingId}>{content.title}</h2>
        {content.body && <p>{content.body}</p>}
        <SectionLinks links={content.links} />
      </div>
    </MotionSection>
  );
}

export function ScrollComposition({content, headingId}: Props) {
  if (!content.image || !content.secondaryImage) return null;
  return (
    <MotionSection className="scroll-composition" labelledBy={headingId}>
      <div className="composition-stage" data-motion-item>
        <div className="composition-copy">
          <p className="section-kicker">{content.kicker}</p>
          <h2 id={headingId}>{content.title}</h2>
          <SectionLinks links={content.links} />
        </div>
        <figure className="composition-photo composition-photo-room">
          <SectionImage
            image={content.image}
            sizes="(min-width: 45em) 52vw, 80vw"
          />
          <figcaption>{content.imageCaption}</figcaption>
        </figure>
        <figure className="composition-photo composition-photo-detail">
          <SectionImage
            image={content.secondaryImage}
            sizes="(min-width: 45em) 27vw, 46vw"
          />
          <figcaption>{content.secondaryCaption}</figcaption>
        </figure>
      </div>
    </MotionSection>
  );
}

export function BuyingTimeline({content, headingId}: Props) {
  return (
    <MotionSection className="buying-timeline" labelledBy={headingId}>
      <div className="timeline-heading">
        <p className="section-kicker">{content.kicker}</p>
        <h2 id={headingId}>{content.title}</h2>
      </div>
      <ol className="timeline-steps">
        {content.steps.map((step, index) => (
          <li key={`${step.id}-${index}`} data-motion-item>
            <span className="timeline-number" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </MotionSection>
  );
}

export function InteractiveLookbook({content, headingId}: Props) {
  const [scene, setScene] = useState(0);
  const active = content.scenes[scene] ?? content.scenes[0];
  if (!active) return null;
  return (
    <section className="interactive-lookbook" aria-labelledby={headingId}>
      <div className="lookbook-heading">
        <div>
          <p className="section-kicker">{content.kicker}</p>
          <h2 id={headingId}>{content.title}</h2>
        </div>
        <div
          className="lookbook-scenes"
          role="group"
          aria-label={content.title}
        >
          {content.scenes.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              type="button"
              aria-pressed={scene === index}
              onClick={() => setScene(index)}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>
      <div className="lookbook-media">
        <SectionImage
          key={active.id}
          image={active.image}
          sizes="(min-width: 72em) 1152px, 100vw"
        />
        {active.items.map(({id, product, x, y}, index) => (
          <Link
            key={`${id}-${index}`}
            className="lookbook-hotspot"
            to={`/products/${product.handle}`}
            style={{left: `${x}%`, top: `${y}%`}}
            aria-label={`View ${product.title}`}
          >
            <span aria-hidden="true" />
            <strong className="hotspot-label">{product.title}</strong>
          </Link>
        ))}
      </div>
      <div className="lookbook-product-links" aria-live="polite">
        {active.items.map(({id, product}, index) => (
          <Link key={`${id}-${index}`} to={`/products/${product.handle}`}>
            {product.title} →
          </Link>
        ))}
      </div>
    </section>
  );
}
