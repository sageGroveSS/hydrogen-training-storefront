import type {
  HomeProductFragment,
  HomeSectionFragment,
  HomepageContentQuery,
} from 'storefrontapi.generated';

export type ContentImage = {
  url: string;
  id?: string | null;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};
export type ContentLink = {id: string; label: string; url: string};
export type OptionStyle = {
  name: string;
  value: string;
  color?: string;
  seats?: number;
  texture?: 'Linen' | 'Boucle';
};
export type LookbookScene = {
  id: string;
  title: string;
  image: ContentImage;
  items: {id: string; product: HomeProductFragment; x: number; y: number}[];
};
export type SectionKind =
  | 'hero'
  | 'categories'
  | 'products'
  | 'editorial'
  | 'parallax'
  | 'configurator'
  | 'composition'
  | 'timeline'
  | 'lookbook';
export type HomepageSection = {
  id: string;
  kind: SectionKind;
  title: string;
  kicker: string;
  body: string;
  image?: ContentImage;
  secondaryImage?: ContentImage;
  imageCaption: string;
  secondaryCaption: string;
  links: ContentLink[];
  product?: HomeProductFragment;
  products: HomeProductFragment[];
  steps: {id: string; title: string; body: string}[];
  scenes: LookbookScene[];
  previewMode: 'image' | 'sofa';
  previewTitle: string;
  optionStyles: OptionStyle[];
};
export type HomepageContent = {
  title: string;
  description: string;
  sections: HomepageSection[];
};

type Fields = {fields: {key: string; value?: string | null}[]};
function field(object: Fields, key: string): string {
  return object.fields.find((item) => item.key === key)?.value?.trim() ?? '';
}

export function contentUrl(value: string): string | undefined {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\'))
    return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
  } catch {
    return undefined;
  }
  return undefined;
}

function image(value: HomeSectionFragment['image']): ContentImage | undefined {
  return value?.reference?.__typename === 'MediaImage'
    ? (value.reference.image ?? undefined)
    : undefined;
}

function coordinate(value: string): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100
    ? number
    : undefined;
}

const kinds: Record<string, SectionKind> = {
  storefront_hero: 'hero',
  storefront_categories: 'categories',
  storefront_products: 'products',
  storefront_editorial: 'editorial',
  storefront_parallax: 'parallax',
  storefront_configurator: 'configurator',
  storefront_composition: 'composition',
  storefront_timeline: 'timeline',
  storefront_lookbook: 'lookbook',
};

export function parseHomepage(
  homepage: HomepageContentQuery['homepage'],
): HomepageContent | null {
  if (!homepage) return null;
  const sections: HomepageSection[] = [];
  for (const node of homepage.sections?.references?.nodes ?? []) {
    if (node.__typename !== 'Metaobject' || field(node, 'enabled') === 'false')
      continue;
    const kind = Object.hasOwn(kinds, node.type) ? kinds[node.type] : undefined;
    if (!kind) continue;
    const links: ContentLink[] = [];
    for (const link of node.links?.references?.nodes ?? []) {
      if (link.__typename !== 'Metaobject' || link.type !== 'storefront_link')
        continue;
      const url = contentUrl(field(link, 'url'));
      const label = field(link, 'label');
      if (url && label) links.push({id: link.id, label, url});
    }
    const steps = (node.steps?.references?.nodes ?? []).flatMap((step) =>
      step.__typename === 'Metaobject' &&
      step.type === 'storefront_step' &&
      field(step, 'title')
        ? [
            {
              id: step.id,
              title: field(step, 'title'),
              body: field(step, 'body'),
            },
          ]
        : [],
    );
    const scenes: LookbookScene[] = [];
    for (const scene of node.scenes?.references?.nodes ?? []) {
      if (
        scene.__typename !== 'Metaobject' ||
        scene.type !== 'storefront_scene'
      )
        continue;
      const sceneImage = image(scene.image);
      if (!sceneImage) continue;
      const items: LookbookScene['items'] = [];
      for (const hotspot of scene.hotspots?.references?.nodes ?? []) {
        if (
          hotspot.__typename !== 'Metaobject' ||
          hotspot.type !== 'storefront_hotspot'
        )
          continue;
        const product = hotspot.product?.reference;
        const x = coordinate(field(hotspot, 'position_x'));
        const y = coordinate(field(hotspot, 'position_y'));
        if (
          product?.__typename === 'Product' &&
          x !== undefined &&
          y !== undefined
        ) {
          items.push({id: hotspot.id, product, x, y});
        }
      }
      scenes.push({
        id: scene.id,
        title: field(scene, 'title'),
        image: sceneImage,
        items,
      });
    }
    const optionStyles: OptionStyle[] = [];
    for (const style of node.optionStyles?.references?.nodes ?? []) {
      if (
        style.__typename !== 'Metaobject' ||
        style.type !== 'storefront_option_style'
      )
        continue;
      const color = field(style, 'color');
      const seats = Number(field(style, 'seats'));
      const texture = field(style, 'texture');
      optionStyles.push({
        name: field(style, 'option_name'),
        value: field(style, 'option_value'),
        color: /^#[\da-f]{6}$/i.test(color) ? color : undefined,
        seats:
          Number.isInteger(seats) && seats >= 1 && seats <= 6
            ? seats
            : undefined,
        texture:
          texture === 'Linen' || texture === 'Boucle' ? texture : undefined,
      });
    }
    const productReference = node.product?.reference;
    const section: HomepageSection = {
      id: node.id,
      kind,
      title: field(node, 'title'),
      kicker: field(node, 'kicker'),
      body: field(node, 'body'),
      image: image(node.image),
      secondaryImage: image(node.secondaryImage),
      imageCaption: field(node, 'image_caption'),
      secondaryCaption: field(node, 'secondary_caption'),
      links,
      product:
        productReference?.__typename === 'Product'
          ? productReference
          : undefined,
      products: (node.products?.references?.nodes ?? []).flatMap((product) =>
        product.__typename === 'Product' ? [product] : [],
      ),
      steps,
      scenes,
      optionStyles,
      previewTitle: field(node, 'preview_title'),
      previewMode: field(node, 'preview_mode') === 'sofa' ? 'sofa' : 'image',
    };
    if ((kind === 'hero' || kind === 'parallax') && !section.image) continue;
    if (kind === 'composition' && (!section.image || !section.secondaryImage))
      continue;
    if (kind === 'configurator' && !section.product) continue;
    if (kind === 'lookbook' && !scenes.length) continue;
    if (kind === 'timeline' && !steps.length) continue;
    sections.push(section);
  }
  return {
    title: field(homepage, 'seo_title'),
    description: field(homepage, 'seo_description'),
    sections,
  };
}
