/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {pathToFileURL} from 'node:url';

export const operations = {
  scopes: `query SeedScopes { currentAppInstallation { accessScopes { handle } } }`,
  definition: `query Definition($type: String!) {
    metaobjectDefinitionByType(type: $type) {
      id access { storefront } capabilities { publishable { enabled } }
      fieldDefinitions { key type { name } validations { name value } }
    }
  }`,
  createDefinition: `mutation DefinitionCreate($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id } userErrors { field message }
    }
  }`,
  entry: `query Entry($handle: MetaobjectHandleInput!) {
    metaobjectByHandle(handle: $handle) { id }
  }`,
  upsert: `mutation EntryUpsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id } userErrors { field message }
    }
  }`,
  products: `query SeedProducts {
    products(first: 50, query: "tag:seed") { nodes { id handle } }
  }`,
  files: `query SeedFiles($query: String!) {
    files(first: 10, query: $query) { nodes {
      id fileStatus ... on MediaImage { image { url } }
    } }
  }`,
  staged: `mutation Upload($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }`,
  fileCreate: `mutation CreateFile($files: [FileCreateInput!]!) {
    fileCreate(files: $files) { files { id } userErrors { field message } }
  }`,
  fileStatus: `query FileStatus($id: ID!) {
    node(id: $id) { ... on MediaImage { fileStatus image { url } } }
  }`,
  report: `query HomeReport {
    metaobjectByHandle(handle: {type: "storefront_home", handle: "home"}) {
      id handle capabilities { publishable { status } }
      field(key: "sections") { references(first: 30) {
        nodes { ... on Metaobject { handle type } }
      } }
    }
  }`,
};

const text = (key, name = key, required = false) => ({
  key,
  name,
  type: 'single_line_text_field',
  required,
});
const multiline = (key, name = key) => ({
  key,
  name,
  type: 'multi_line_text_field',
});
const image = (key = 'image') => ({
  key,
  name: key,
  type: 'file_reference',
  validations: [{name: 'file_type_options', value: '["Image"]'}],
});
const number = (key, max, type = 'number_decimal') => ({
  key,
  name: key,
  type,
  validations: [
    {name: 'min', value: key === 'seats' ? '1' : '0.0'},
    {
      name: 'max',
      value: type === 'number_decimal' ? max.toFixed(1) : String(max),
    },
  ],
});
const choices = (key, values) => ({
  ...text(key),
  validations: [{name: 'choices', value: JSON.stringify(values)}],
});
const listMax = (max) => ({name: 'list.max', value: String(max)});
const common = [
  text('name', 'Internal name', true),
  multiline('title', 'Heading'),
  text('kicker', 'Eyebrow'),
  {key: 'enabled', name: 'Enabled', type: 'boolean'},
];
const sectionKinds = [
  'hero',
  'categories',
  'products',
  'editorial',
  'parallax',
  'configurator',
  'composition',
  'timeline',
  'lookbook',
];

export function definitions(ids) {
  const refs = (key, type, max) => ({
    key,
    name: key,
    type: 'list.metaobject_reference',
    validations: [
      {name: 'metaobject_definition_id', value: ids[type]},
      listMax(max),
    ],
  });
  const links = () => refs('links', 'storefront_link', 8);
  return [
    [
      'storefront_link',
      [
        text('name', 'Internal name', true),
        text('label', 'Label', true),
        text('url', 'Path or URL', true),
      ],
    ],
    [
      'storefront_step',
      [
        text('name', 'Internal name', true),
        text('title', 'Heading', true),
        multiline('body'),
      ],
    ],
    [
      'storefront_option_style',
      [
        text('name', 'Internal name', true),
        text('option_name', 'Exact option name', true),
        text('option_value', 'Exact option value', true),
        {key: 'color', name: 'Color', type: 'color'},
        number('seats', 6, 'number_integer'),
        choices('texture', ['Linen', 'Boucle']),
      ],
    ],
    [
      'storefront_hotspot',
      [
        text('name', 'Internal name', true),
        {
          key: 'product',
          name: 'Product',
          type: 'product_reference',
          required: true,
        },
        number('position_x', 100),
        number('position_y', 100),
      ],
    ],
    [
      'storefront_scene',
      [
        text('name', 'Internal name', true),
        text('title'),
        image(),
        refs('hotspots', 'storefront_hotspot', 8),
      ],
    ],
    ['storefront_hero', [...common, image(), multiline('body'), links()]],
    ['storefront_categories', [...common, links()]],
    [
      'storefront_products',
      [
        ...common,
        {
          key: 'products',
          name: 'Products',
          type: 'list.product_reference',
          validations: [listMax(12)],
        },
      ],
    ],
    ['storefront_editorial', [...common, multiline('body'), links()]],
    ['storefront_parallax', [...common, image(), multiline('body'), links()]],
    [
      'storefront_configurator',
      [
        ...common,
        {
          key: 'product',
          name: 'Product',
          type: 'product_reference',
          required: true,
        },
        choices('preview_mode', ['image', 'sofa']),
        text('preview_title'),
        multiline('body'),
        refs('option_styles', 'storefront_option_style', 30),
      ],
    ],
    [
      'storefront_composition',
      [
        ...common,
        image(),
        image('secondary_image'),
        text('image_caption'),
        text('secondary_caption'),
        links(),
      ],
    ],
    ['storefront_timeline', [...common, refs('steps', 'storefront_step', 8)]],
    ['storefront_lookbook', [...common, refs('scenes', 'storefront_scene', 6)]],
    [
      'storefront_home',
      [
        text('name', 'Internal name', true),
        text('seo_title'),
        multiline('seo_description'),
        {
          key: 'sections',
          name: 'Sections (display order)',
          type: 'list.mixed_reference',
          validations: [
            {
              name: 'metaobject_definition_ids',
              value: JSON.stringify(
                sectionKinds.map((kind) => ids[`storefront_${kind}`]),
              ),
            },
            listMax(30),
          ],
        },
      ],
    ],
  ];
}

async function main() {
  const apply = process.argv.includes('--apply');
  const overwrite = process.argv.includes('--overwrite');
  console.log(
    `${apply ? 'Applying' : 'Dry run:'} homepage seed: 15 definitions, 9 sections, 2 images and linked helper entries.`,
  );
  console.log(
    overwrite
      ? 'Seeded entries will be overwritten.'
      : 'Existing entries will be preserved.',
  );
  if (!apply) return;
  const env = parseEnv(
    fs.readFileSync(path.join(process.cwd(), '.env.seed'), 'utf8'),
  );
  for (const key of [
    'SHOPIFY_SHOP',
    'SHOPIFY_CLIENT_ID',
    'SHOPIFY_CLIENT_SECRET',
    'SHOPIFY_ADMIN_API_VERSION',
  ]) {
    if (!env[key]) throw new Error(`Missing ${key} in .env.seed`);
  }
  const auth = await fetch(
    `https://${env.SHOPIFY_SHOP}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.SHOPIFY_CLIENT_ID,
        client_secret: env.SHOPIFY_CLIENT_SECRET,
      }),
    },
  );
  const authData = await auth.json();
  if (!auth.ok || !authData.access_token)
    throw new Error(`Admin authentication failed (${auth.status}).`);
  async function graphql(query, variables = {}) {
    const response = await fetch(
      `https://${env.SHOPIFY_SHOP}/admin/api/${env.SHOPIFY_ADMIN_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-shopify-access-token': authData.access_token,
        },
        body: JSON.stringify({query, variables}),
      },
    );
    const json = await response.json();
    if (!response.ok || json.errors)
      throw new Error(JSON.stringify(json.errors ?? {status: response.status}));
    return json.data;
  }
  function checked(payload) {
    if (payload.userErrors.length)
      throw new Error(JSON.stringify(payload.userErrors));
    return payload;
  }
  const scopes = new Set(
    (await graphql(operations.scopes)).currentAppInstallation.accessScopes.map(
      (scope) => scope.handle,
    ),
  );
  const missing = [
    'write_metaobject_definitions',
    'write_metaobjects',
    'read_products',
    'write_files',
  ].filter((scope) => !scopes.has(scope));
  if (missing.length)
    throw new Error(
      `Missing seed-app scopes: ${missing.join(', ')}. Install the updated app version before retrying. No data was written.`,
    );
  const productData = await graphql(operations.products);
  const products = Object.fromEntries(
    productData.products.nodes.map((product) => [product.handle, product.id]),
  );
  const productHandles = [
    'luna-modular-sofa',
    'arbor-low-sofa',
    'marin-sleeper-sofa',
    'cove-loveseat',
    'arc-side-table',
    'plinth-coffee-table',
  ];
  for (const handle of productHandles)
    if (!products[handle])
      throw new Error(`Run the catalog seed first: missing ${handle}`);

  const ids = {};
  for (const [type] of definitions(ids)) {
    // Rebuild in dependency order so reference validations use actual definition IDs.
    const fields = definitions(ids).find(([name]) => name === type)[1];
    const existing = (await graphql(operations.definition, {type}))
      .metaobjectDefinitionByType;
    if (existing) {
      const compatible = fields.every((field) =>
        existing.fieldDefinitions.some(
          (item) =>
            item.key === field.key &&
            item.type.name === field.type &&
            (field.validations ?? []).every((rule) =>
              item.validations.some(
                (actual) =>
                  actual.name === rule.name && actual.value === rule.value,
              ),
            ),
        ),
      );
      if (
        !compatible ||
        existing.access.storefront !== 'PUBLIC_READ' ||
        !existing.capabilities.publishable.enabled
      )
        throw new Error(
          `Incompatible definition ${type}; inspect it manually. No schema was overwritten.`,
        );
      ids[type] = existing.id;
      console.log(`Reused definition: ${type}`);
    } else {
      const result = checked(
        (
          await graphql(operations.createDefinition, {
            definition: {
              type,
              name: type.replace('storefront_', 'Home: ').replaceAll('_', ' '),
              displayNameKey: 'name',
              access: {storefront: 'PUBLIC_READ'},
              capabilities: {publishable: {enabled: true}},
              fieldDefinitions: fields,
            },
          })
        ).metaobjectDefinitionCreate,
      );
      ids[type] = result.metaobjectDefinition.id;
      console.log(`Created definition: ${type}`);
    }
  }

  async function uploadImage(filename, alt) {
    const existing = (
      await graphql(operations.files, {query: `filename:${filename}`})
    ).files.nodes.find(
      (file) => file.fileStatus === 'READY' && file.image?.url,
    );
    if (existing) return existing.id;
    const bytes = fs.readFileSync(
      path.join(process.cwd(), 'public/images', filename),
    );
    const staged = checked(
      (
        await graphql(operations.staged, {
          input: [
            {
              filename,
              mimeType: 'image/jpeg',
              resource: 'IMAGE',
              httpMethod: 'POST',
              fileSize: String(bytes.length),
            },
          ],
        })
      ).stagedUploadsCreate,
    ).stagedTargets[0];
    const form = new FormData();
    for (const parameter of staged.parameters)
      form.append(parameter.name, parameter.value);
    form.append('file', new Blob([bytes], {type: 'image/jpeg'}), filename);
    const upload = await fetch(staged.url, {method: 'POST', body: form});
    if (!upload.ok)
      throw new Error(`Upload failed for ${filename}: ${upload.status}`);
    const created = checked(
      (
        await graphql(operations.fileCreate, {
          files: [
            {
              originalSource: staged.resourceUrl,
              filename,
              contentType: 'IMAGE',
              alt,
            },
          ],
        })
      ).fileCreate,
    ).files[0];
    for (let attempt = 0; attempt < 30; attempt++) {
      const file = (await graphql(operations.fileStatus, {id: created.id}))
        .node;
      if (file?.fileStatus === 'READY' && file.image?.url) return created.id;
      if (file?.fileStatus === 'FAILED')
        throw new Error(`Shopify processing failed: ${filename}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error(
      `Image processing timed out: ${filename}. Re-run after it is ready.`,
    );
  }
  const hero = await uploadImage('furniture-hero.jpg', 'A modular living room');
  const detail = await uploadImage(
    'furniture-lookbook.jpg',
    'A side table beside a sofa',
  );
  let created = 0;
  let preserved = 0;
  async function entry(type, handle, fields) {
    const identifier = {type: `storefront_${type}`, handle};
    const existing = (await graphql(operations.entry, {handle: identifier}))
      .metaobjectByHandle;
    if (existing && !overwrite) {
      preserved++;
      return existing.id;
    }
    const result = checked(
      (
        await graphql(operations.upsert, {
          handle: identifier,
          metaobject: {
            capabilities: {publishable: {status: 'ACTIVE'}},
            fields: Object.entries({name: handle, ...fields}).map(
              ([key, value]) => ({
                key,
                value: Array.isArray(value)
                  ? JSON.stringify(value)
                  : String(value),
              }),
            ),
          },
        })
      ).metaobjectUpsert,
    );
    created++;
    console.log(`Seeded entry: ${identifier.type}/${handle}`);
    return result.metaobject.id;
  }
  const link = (handle, label, url) =>
    entry('link', `home-${handle}`, {label, url});
  const featured = await link(
    'featured',
    'Shop featured',
    '/collections/living-room-featured',
  );
  const browse = await link('browse', 'Browse all', '/collections/all');
  const catalog = await link('catalog', 'Shop the catalog', '/collections/all');
  const explore = await link(
    'explore',
    'Explore the living room',
    '/collections/living-room-featured',
  );
  const next = await link('next', 'Find your next piece', '/collections/all');
  const categories = [];
  for (const [handle, label, url] of [
    ['living', 'Living room', '/collections/living-room-featured'],
    ['storage', 'Storage', '/collections/all?filter.p.product_type=Storage'],
    ['tables', 'Tables', '/collections/all?filter.p.product_type=Tables'],
    ['textiles', 'Textiles', '/collections/all?filter.p.product_type=Textiles'],
  ])
    categories.push(await link(handle, label, url));
  const styles = [];
  for (const [handle, fields] of [
    ['ivory', {option_name: 'Color', option_value: 'Ivory', color: '#e4e2d8'}],
    [
      'charcoal',
      {option_name: 'Color', option_value: 'Charcoal', color: '#424749'},
    ],
    ['two', {option_name: 'Size', option_value: '2-seat', seats: 2}],
    ['three', {option_name: 'Size', option_value: '3-seat', seats: 3}],
    [
      'linen',
      {option_name: 'Material', option_value: 'Linen', texture: 'Linen'},
    ],
    [
      'boucle',
      {option_name: 'Material', option_value: 'Boucle', texture: 'Boucle'},
    ],
  ])
    styles.push(await entry('option_style', `home-${handle}`, fields));
  const steps = [];
  for (const [handle, title, body] of [
    [
      'foundation',
      'Find your foundation',
      'A sofa to sink into. A table to gather around. Start with the piece your room needs most.',
    ],
    [
      'details',
      'Make it yours',
      'Choose the size, fabric, and finish that fit your space and the way you live.',
    ],
    [
      'everyday',
      'Settle into everyday',
      'Bring your pieces together, make yourself comfortable, and let life fill the room.',
    ],
  ])
    steps.push(await entry('step', `home-${handle}`, {title, body}));
  const cornerTable = await entry('hotspot', 'home-corner-table', {
    product: products['arc-side-table'],
    position_x: 56,
    position_y: 52,
  });
  const cornerSofa = await entry('hotspot', 'home-corner-sofa', {
    product: products['luna-modular-sofa'],
    position_x: 17,
    position_y: 40,
  });
  const roomSofa = await entry('hotspot', 'home-room-sofa', {
    product: products['luna-modular-sofa'],
    position_x: 72,
    position_y: 65,
  });
  const roomTable = await entry('hotspot', 'home-room-table', {
    product: products['plinth-coffee-table'],
    position_x: 44,
    position_y: 78,
  });
  const corner = await entry('scene', 'home-corner', {
    title: 'The reading corner',
    image: detail,
    hotspots: [cornerTable, cornerSofa],
  });
  const room = await entry('scene', 'home-room', {
    title: 'The living room',
    image: hero,
    hotspots: [roomSofa, roomTable],
  });
  const sections = [];
  const section = async (type, fields) =>
    sections.push(
      await entry(type, `home-${type}`, {enabled: true, ...fields}),
    );
  await section('hero', {
    title: 'Rooms that adapt around real life.',
    kicker: 'Furniture systems',
    image: hero,
    body: 'Start with modular living room essentials, then tune the details with durable materials, compact storage, and calm silhouettes.',
    links: [featured, browse],
  });
  await section('categories', {
    title: 'Featured categories',
    links: categories,
  });
  await section('products', {
    title: 'Pieces with a job to do.',
    kicker: 'New in store',
    products: productHandles.slice(0, 4).map((handle) => products[handle]),
  });
  await section('editorial', {
    title: 'Designed as a set, useful one piece at a time.',
    kicker: 'Systems for living',
    body: 'Make space for everyday living. Pair a comfortable sofa with practical storage and a table that keeps the things you love close at hand.',
    links: [catalog],
  });
  await section('parallax', {
    title: 'Less clutter.\nMore living.',
    kicker: 'Room to breathe',
    image: hero,
    links: [explore],
  });
  await section('configurator', {
    title: 'Luna Modular Sofa',
    kicker: 'Made for your room',
    preview_title: 'Your configuration',
    preview_mode: 'sofa',
    product: products['luna-modular-sofa'],
    option_styles: styles,
  });
  await section('composition', {
    title: 'Bring it\nall together.',
    kicker: 'Every piece belongs',
    image: hero,
    secondary_image: detail,
    image_caption: 'The whole room',
    secondary_caption: 'The little details',
    links: [next],
  });
  await section('timeline', {
    title: 'From a first idea\nto feeling at home.',
    kicker: 'Buying flow',
    steps,
  });
  await section('lookbook', {
    title: 'A room worth a closer look.',
    kicker: 'Lookbook',
    scenes: [corner, room],
  });
  await entry('home', 'home', {
    seo_title: 'Hydrogen | Systems for living',
    seo_description: 'Furniture systems for everyday living.',
    sections,
  });
  console.log(
    JSON.stringify(
      {
        writtenEntries: created,
        preservedEntries: preserved,
        homepage: (await graphql(operations.report)).metaobjectByHandle,
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

/* eslint-enable no-console */
