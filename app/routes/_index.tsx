import {useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import type {ConfiguratorProductsQuery} from 'storefrontapi.generated';
import {HomepageSections} from '~/components/HomepageSections';
import {MockShopNotice} from '~/components/MockShopNotice';
import {parseHomepage} from '~/lib/homepage-content';
import {demoHomepage, DEMO_HOMEPAGE_QUERY} from '~/lib/homepage-demo';
import {HOMEPAGE_QUERY} from '~/lib/homepage-query';
import {loadConfiguratorProducts} from '~/lib/content.server';
import creativeStyles from '~/styles/creative.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: creativeStyles},
];

export const meta: Route.MetaFunction = ({data}) => [
  {title: data?.page.title || 'Hydrogen | Systems for living'},
  {
    name: 'description',
    content: data?.page.description || 'Furniture systems for everyday living.',
  },
  {tagName: 'link', rel: 'canonical', href: data?.canonicalUrl},
];

export async function loader({context, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const canonicalUrl = new URL('/', request.url).href;
  const cache = storefront.CacheShort({maxAge: 60, staleWhileRevalidate: 300});
  const result = await storefront
    .query(HOMEPAGE_QUERY, {cache})
    .catch((error: unknown): null => {
      console.error('Homepage metaobject query failed:', error);
      return null;
    });
  const page = parseHomepage(result?.homepage ?? null);
  if (page) {
    const configuratorProducts = loadConfiguratorProducts(storefront, page);
    return {
      canonicalUrl,
      page,
      configuratorProducts,
      contentSource: 'metaobject' as const,
      isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    };
  }

  const demo = await storefront.query(DEMO_HOMEPAGE_QUERY, {cache});
  console.warn(
    'Homepage uses demo content: publish storefront_home/home to switch to Shopify content.',
  );
  return {
    canonicalUrl,
    page: demoHomepage(demo),
    configuratorProducts: Promise.resolve<ConfiguratorProductsQuery>({
      nodes: demo.sofa ? [{__typename: 'Product', ...demo.sofa}] : [],
    }),
    contentSource: 'demo' as const,
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <>
      {data.isShopLinked ? null : <MockShopNotice />}
      <HomepageSections
        page={data.page}
        configuratorProducts={data.configuratorProducts}
        source={data.contentSource}
      />
    </>
  );
}
