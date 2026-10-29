import {useLoaderData} from 'react-router';
import type {Route} from './+types/pages.$handle';
import {HomepageSections} from '~/components/HomepageSections';
import {parseHomepage} from '~/lib/homepage-content';
import {CONTENT_FRAGMENTS} from '~/lib/homepage-query';
import {loadConfiguratorProducts} from '~/lib/content.server';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import creativeStyles from '~/styles/creative.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: creativeStyles},
];

export const meta: Route.MetaFunction = ({data}) => [
  {
    title:
      data?.page.seo?.title ||
      data?.content?.title ||
      data?.page.title ||
      'Hydrogen',
  },
  {
    name: 'description',
    content: data?.page.seo?.description || data?.content?.description || '',
  },
  {tagName: 'link', rel: 'canonical', href: data?.canonicalUrl},
];

export async function loader({context, request, params}: Route.LoaderArgs) {
  if (!params.handle) throw new Response('Not Found', {status: 404});
  const {storefront} = context;
  const {page, content: entry} = await storefront.query(CONTENT_PAGE_QUERY, {
    variables: {handle: params.handle},
    cache: storefront.CacheShort({maxAge: 60, staleWhileRevalidate: 300}),
  });
  if (!page) throw new Response('Not Found', {status: 404});
  redirectIfHandleIsLocalized(request, {handle: params.handle, data: page});
  const parsed = parseHomepage(entry);
  const content = parsed?.sections.length ? parsed : null;
  return {
    page,
    content,
    canonicalUrl: `${new URL(request.url).origin}/pages/${page.handle}`,
    configuratorProducts: content
      ? loadConfiguratorProducts(storefront, content)
      : Promise.resolve(null),
  };
}

export default function Page() {
  const {page, content, configuratorProducts} = useLoaderData<typeof loader>();
  return (
    <>
      <div className="page">
        <header>
          <h1>{page.title}</h1>
        </header>
        {!content && <div dangerouslySetInnerHTML={{__html: page.body}} />}
      </div>
      {content && (
        <HomepageSections
          page={content}
          configuratorProducts={configuratorProducts}
          source="metaobject"
          hasPageHeading
        />
      )}
    </>
  );
}

const CONTENT_PAGE_QUERY = `#graphql
  query ContentPage($language: LanguageCode, $country: CountryCode, $handle: String!)
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle id title body seo { description title }
    }
    content: metaobject(handle: {type: "storefront_home", handle: $handle}) {
      ...SectionContent
    }
  }
  ${CONTENT_FRAGMENTS}
` as const;
