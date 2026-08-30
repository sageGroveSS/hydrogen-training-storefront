/* eslint-disable no-console */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envPath = path.join(root, '.env.seed');
const apply = process.argv.includes('--apply');

const requiredEnv = [
  'SHOPIFY_SHOP',
  'SHOPIFY_CLIENT_ID',
  'SHOPIFY_CLIENT_SECRET',
  'SHOPIFY_ADMIN_API_VERSION',
];

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath}`);
  }

  const env = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trimStart().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return env;
}

const env = loadEnv(envPath);
for (const key of requiredEnv) {
  if (!env[key]) throw new Error(`Missing ${key} in .env.seed`);
}

const collections = [
  {
    key: 'sofas',
    title: 'Sofas',
    description: 'Modular and fixed sofas for living rooms.',
  },
  {
    key: 'chairs',
    title: 'Chairs',
    description: 'Accent chairs, dining chairs, and lounge seating.',
  },
  {
    key: 'tables',
    title: 'Tables',
    description: 'Coffee tables, side tables, and dining tables.',
  },
  {
    key: 'lighting',
    title: 'Lighting',
    description: 'Floor, table, and pendant lighting.',
  },
  {
    key: 'living-room-featured',
    title: 'Living Room / Featured',
    description: 'Featured furniture and accessories for Hydrogen demos.',
  },
];

const productMetafieldDefinitions = [
  ['material_details', 'Material details', 'multi_line_text_field'],
  ['room', 'Room', 'list.single_line_text_field'],
  ['style', 'Style', 'list.single_line_text_field'],
  ['width_cm', 'Width cm', 'number_integer'],
  ['height_cm', 'Height cm', 'number_integer'],
  ['depth_cm', 'Depth cm', 'number_integer'],
  ['delivery_weeks', 'Delivery weeks', 'number_integer'],
  ['badge', 'Badge', 'single_line_text_field'],
  ['features', 'Features', 'list.single_line_text_field'],
  ['configurator_enabled', 'Configurator enabled', 'boolean'],
  ['configurator_options', 'Configurator options', 'json'],
];

const customerMetafieldDefinitions = [
  ['wishlist', 'Wishlist', 'list.product_reference'],
  ['email_sale_alerts', 'Email sale alerts', 'boolean'],
  ['email_back_in_stock', 'Email back in stock', 'boolean'],
  ['preferred_materials', 'Preferred materials', 'list.single_line_text_field'],
];

const LOOKBOOK_METAOBJECT_TYPE = '$app:lookbook_scene';

const products = [
  sofa('luna-modular-sofa', 'Luna Modular Sofa', 'North Studio', 1899, ['Ivory', 'Charcoal'], ['Linen', 'Boucle'], ['2-seat', '3-seat'], 'Bestseller', true),
  sofa('arbor-low-sofa', 'Arbor Low Sofa', 'Form Works', 1499, ['Moss', 'Sand'], ['Cotton', 'Velvet'], ['2-seat', '3-seat'], 'New', false),
  sofa('marin-sleeper-sofa', 'Marin Sleeper Sofa', 'Aster', 2199, ['Oat', 'Navy'], ['Linen'], ['Queen', 'King'], 'Sale', false),
  sofa('cove-loveseat', 'Cove Loveseat', 'North Studio', 1199, ['Clay', 'Graphite'], ['Boucle'], ['Compact'], null, false),
  chair('nora-lounge-chair', 'Nora Lounge Chair', 'Aster', 649, ['Ivory', 'Rust', 'Black'], ['Boucle', 'Leather'], 'Bestseller'),
  chair('field-dining-chair', 'Field Dining Chair', 'Form Works', 249, ['Walnut', 'Black'], ['Wood', 'Cord'], null),
  chair('palisade-accent-chair', 'Palisade Accent Chair', 'North Studio', 529, ['Sage', 'Cream'], ['Velvet'], 'Limited'),
  table('plinth-coffee-table', 'Plinth Coffee Table', 'Form Works', 799, ['Small', 'Large'], ['Oak', 'Travertine'], 'New'),
  table('arc-side-table', 'Arc Side Table', 'Aster', 329, ['One Size'], ['Black Metal', 'Brass'], null),
  table('harbor-dining-table', 'Harbor Dining Table', 'North Studio', 1399, ['180cm', '220cm'], ['Oak', 'Walnut'], 'Sale'),
  lamp('glow-floor-lamp', 'Glow Floor Lamp', 'Aster', 399, ['Black', 'Brass', 'White'], 'New'),
  lamp('linen-table-lamp', 'Linen Table Lamp', 'Form Works', 189, ['Natural', 'Graphite'], null),
  rug('atlas-wool-rug', 'Atlas Wool Rug', 'North Studio', 549, ['160x230', '200x300'], ['Cream', 'Terracotta'], null),
  rug('terra-flatweave-rug', 'Terra Flatweave Rug', 'Aster', 299, ['140x200', '170x240'], ['Sand', 'Olive'], 'Sale'),
  accessory('brass-catchall-tray', 'Brass Catchall Tray', 'Form Works', 79, 'Accessory'),
  accessory('linen-storage-basket', 'Linen Storage Basket', 'North Studio', 119, 'Accessory'),
];

const customers = [
  {
    email: 'ava.rivera@example.com',
    firstName: 'Ava',
    lastName: 'Rivera',
    tags: ['seed', 'hydrogen-demo'],
    preferredMaterials: ['Linen', 'Oak', 'Boucle'],
  },
  {
    email: 'noah.kim@example.com',
    firstName: 'Noah',
    lastName: 'Kim',
    tags: ['seed', 'hydrogen-demo'],
    preferredMaterials: ['Leather', 'Walnut', 'Brass'],
  },
];

function sofa(handle, title, vendor, basePrice, colors, materials, sizes, badge, configurator) {
  return makeProduct({
    handle,
    title,
    vendor,
    productType: 'Sofa',
    collectionKeys: ['sofas', 'living-room-featured'],
    options: {Color: colors, Material: materials, Size: sizes},
    basePrice,
    badge,
    room: ['Living Room'],
    style: ['Modern', 'Soft Minimal'],
    dimensions: [220, 82, 96],
    configurator,
  });
}

function chair(handle, title, vendor, basePrice, colors, materials, badge) {
  return makeProduct({
    handle,
    title,
    vendor,
    productType: 'Chair',
    collectionKeys: ['chairs', 'living-room-featured'],
    options: {Color: colors, Material: materials},
    basePrice,
    badge,
    room: ['Living Room', 'Dining Room'],
    style: ['Modern'],
    dimensions: [76, 84, 82],
  });
}

function table(handle, title, vendor, basePrice, sizes, materials, badge) {
  return makeProduct({
    handle,
    title,
    vendor,
    productType: title.includes('Dining') ? 'Dining Table' : 'Coffee Table',
    collectionKeys: ['tables', 'living-room-featured'],
    options: {Size: sizes, Material: materials},
    basePrice,
    badge,
    room: ['Living Room', 'Dining Room'],
    style: ['Architectural'],
    dimensions: [120, 38, 70],
  });
}

function lamp(handle, title, vendor, basePrice, colors, badge) {
  return makeProduct({
    handle,
    title,
    vendor,
    productType: 'Lamp',
    collectionKeys: ['lighting', 'living-room-featured'],
    options: {Color: colors},
    basePrice,
    badge,
    room: ['Living Room', 'Bedroom'],
    style: ['Warm Modern'],
    dimensions: [42, 158, 42],
  });
}

function rug(handle, title, vendor, basePrice, sizes, colors, badge) {
  return makeProduct({
    handle,
    title,
    vendor,
    productType: 'Rug',
    collectionKeys: ['living-room-featured'],
    options: {Size: sizes, Color: colors},
    basePrice,
    badge,
    room: ['Living Room'],
    style: ['Textural'],
    dimensions: [200, 1, 300],
  });
}

function accessory(handle, title, vendor, basePrice, productType) {
  return makeProduct({
    handle,
    title,
    vendor,
    productType,
    collectionKeys: ['living-room-featured'],
    options: {Title: ['Default Title']},
    basePrice,
    badge: null,
    room: ['Living Room', 'Entryway'],
    style: ['Everyday'],
    dimensions: [36, 12, 24],
  });
}

function makeProduct({
  handle,
  title,
  vendor,
  productType,
  collectionKeys,
  options,
  basePrice,
  badge,
  room,
  style,
  dimensions,
  configurator = false,
}) {
  const optionEntries = Object.entries(options);
  return {
    handle,
    title,
    vendor,
    productType,
    collectionKeys,
    options,
    basePrice,
    badge,
    room,
    style,
    dimensions,
    configurator,
    descriptionHtml: `<p>${title} is a seeded ${productType.toLowerCase()} for Hydrogen storefront development. It includes variants, metafields, inventory states, and storefront content hooks.</p>`,
    variants: cartesian(optionEntries).map((values, index) => {
      const titleParts = values.map(([, value]) => value);
      const soldOut = handle === 'cove-loveseat' || (handle === 'luna-modular-sofa' && index === 2);
      const lowStock = index === 1 || handle === 'brass-catchall-tray';
      const notTracked = handle === 'linen-table-lamp';
      const sale = badge === 'Sale' || (handle === 'luna-modular-sofa' && index % 3 === 0);
      const price = basePrice + index * 25;

      return {
        optionValues: values.map(([optionName, name]) => ({optionName, name})),
        price: price.toFixed(2),
        compareAtPrice: sale ? (price * 1.18).toFixed(2) : undefined,
        sku: `SEED-${handle.toUpperCase().replaceAll('-', '_')}-${index + 1}`,
        tracked: !notTracked,
        quantity: soldOut ? 0 : lowStock ? 2 : 25,
        inventoryPolicy: soldOut ? 'DENY' : 'CONTINUE',
        title: titleParts.join(' / '),
      };
    }),
  };
}

function cartesian(optionEntries) {
  return optionEntries.reduce(
    (acc, [name, values]) =>
      acc.flatMap((prefix) => values.map((value) => [...prefix, [name, value]])),
    [[]],
  );
}

async function main() {
  console.log(apply ? 'Seeding Shopify store...' : 'Dry run. Re-run with --apply to create data.');
  console.log(`Shop: ${env.SHOPIFY_SHOP}`);
  console.log(`Products: ${products.length}`);
  console.log(`Collections: ${collections.length}`);
  console.log(`Customers: ${customers.length}`);

  if (!apply) return;

  const adminToken = await getAdminToken();
  const locationId = await getFirstLocationId(adminToken);
  const publications = await getPublications(adminToken);

  await createMetafieldDefinitions(adminToken, 'PRODUCT', productMetafieldDefinitions);
  await createMetafieldDefinitions(adminToken, 'CUSTOMER', customerMetafieldDefinitions);
  await createLookbookDefinition(adminToken);

  const collectionIds = {};
  for (const collection of collections) {
    collectionIds[collection.key] = await upsertCollection(adminToken, collection);
  }

  const productIds = [];
  for (const product of products) {
    const id = await upsertProduct(adminToken, product, collectionIds, locationId);
    productIds.push({id, handle: product.handle});
    await publishIfPossible(adminToken, id, publications);
  }

  await createLookbookScenes(adminToken, productIds);
  await createCustomers(adminToken, customers, productIds);

  const storefrontCount = await countStorefrontProducts();
  console.log(`Done. Storefront API product sample count: ${storefrontCount}`);
  if (!publications.length) {
    console.log('Publication auto-publish was skipped. If products are not visible, publish them to the Hydrogen storefront sales channel in Shopify Admin.');
  }
}

async function getAdminToken() {
  const response = await fetch(`https://${env.SHOPIFY_SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
    }),
  });
  const json = await response.json();
  if (!response.ok || !json.access_token) {
    throw new Error(`Unable to get Admin API token: ${JSON.stringify(redact(json))}`);
  }
  return json.access_token;
}

async function adminGraphql(token, query, variables = {}) {
  const response = await fetch(
    `https://${env.SHOPIFY_SHOP}/admin/api/${env.SHOPIFY_ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-shopify-access-token': token,
      },
      body: JSON.stringify({query, variables}),
    },
  );
  const json = await response.json();
  if (!response.ok || json.errors) {
    throw new Error(JSON.stringify(redact(json.errors ?? json), null, 2));
  }
  return json.data;
}

async function optionalAdminGraphql(token, query, variables = {}) {
  try {
    return await adminGraphql(token, query, variables);
  } catch (error) {
    console.log(`Optional step skipped: ${error.message.split('\n')[0]}`);
    return null;
  }
}

async function getFirstLocationId(token) {
  const data = await optionalAdminGraphql(
    token,
    `query FirstLocation {
      locations(first: 1) {
        nodes {
          id
        }
      }
    }`,
  );
  return data?.locations?.nodes?.[0]?.id ?? null;
}

async function getPublications(token) {
  const data = await optionalAdminGraphql(
    token,
    `query Publications {
      publications(first: 20) {
        nodes {
          id
          name
        }
      }
    }`,
  );
  return data?.publications?.nodes ?? [];
}

async function createMetafieldDefinitions(token, ownerType, definitions) {
  const mutation = `mutation MetafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        key
      }
      userErrors {
        field
        message
      }
    }
  }`;

  for (const [key, name, type] of definitions) {
    const data = await adminGraphql(token, mutation, {
      definition: {
        namespace: 'custom',
        key,
        name,
        ownerType,
        type,
        pin: true,
        access: {
          storefront: ownerType === 'PRODUCT' ? 'PUBLIC_READ' : 'NONE',
          customerAccount: ownerType === 'CUSTOMER' ? 'READ_WRITE' : 'NONE',
        },
      },
    });
    handleUserErrors(`metafield ${ownerType}.${key}`, data.metafieldDefinitionCreate.userErrors, true);
  }
}

async function createLookbookDefinition(token) {
  const mutation = `mutation MetaobjectDefinitionCreate($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition {
        id
        type
      }
      userErrors {
        field
        message
      }
    }
  }`;

  const data = await adminGraphql(token, mutation, {
    definition: {
      name: 'Lookbook Scene',
      type: LOOKBOOK_METAOBJECT_TYPE,
      displayNameKey: 'title',
      access: {
        admin: 'MERCHANT_READ_WRITE',
        storefront: 'PUBLIC_READ',
      },
      fieldDefinitions: [
        {key: 'title', name: 'Title', type: 'single_line_text_field', required: true},
        {key: 'image_url', name: 'Image URL', type: 'url', required: true},
        {key: 'hotspots', name: 'Hotspots', type: 'json', required: true},
      ],
    },
  });
  handleUserErrors('lookbook_scene definition', data.metaobjectDefinitionCreate.userErrors, true);
}

async function upsertCollection(token, collection) {
  const existing = await adminGraphql(
    token,
    `query CollectionByHandle($query: String!) {
      collections(first: 1, query: $query) {
        nodes {
          id
          handle
        }
      }
    }`,
    {query: `handle:${collection.key}`},
  );
  const found = existing.collections.nodes[0];
  if (found) {
    console.log(`Collection exists: ${collection.key}`);
    return found.id;
  }

  const data = await adminGraphql(
    token,
    `mutation CollectionCreate($collection: CollectionCreateInput!) {
      collectionCreate(collection: $collection) {
        collection {
          id
          handle
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      collection: {
        title: collection.title,
        handle: collection.key,
        descriptionHtml: `<p>${collection.description}</p>`,
      },
    },
  );
  handleUserErrors(`collection ${collection.key}`, data.collectionCreate.userErrors);
  console.log(`Created collection: ${collection.key}`);
  return data.collectionCreate.collection.id;
}

async function upsertProduct(token, product, collectionIds, locationId) {
  const mutation = `mutation ProductSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers!) {
    productSet(input: $input, identifier: $identifier, synchronous: true) {
      product {
        id
        handle
        title
      }
      userErrors {
        field
        message
      }
    }
  }`;

  const data = await adminGraphql(token, mutation, {
    identifier: {handle: product.handle},
    input: {
      handle: product.handle,
      title: product.title,
      vendor: product.vendor,
      productType: product.productType,
      descriptionHtml: product.descriptionHtml,
      status: 'ACTIVE',
      tags: ['seed', 'hydrogen-demo', product.productType],
      collections: product.collectionKeys.map((key) => collectionIds[key]).filter(Boolean),
      productOptions: Object.entries(product.options).map(([name, values], index) => ({
        name,
        position: index + 1,
        values: values.map((value) => ({name: value})),
      })),
      variants: product.variants.map((variant, index) => ({
        optionValues: variant.optionValues,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        sku: variant.sku,
        position: index + 1,
        published: true,
        taxable: true,
        inventoryPolicy: variant.inventoryPolicy,
        inventoryItem: {
          sku: variant.sku,
          tracked: variant.tracked,
          requiresShipping: true,
        },
        inventoryQuantities:
          locationId && variant.tracked
            ? [{locationId, name: 'available', quantity: variant.quantity}]
            : undefined,
      })),
      metafields: productMetafields(product),
    },
  });

  handleUserErrors(`product ${product.handle}`, data.productSet.userErrors);
  console.log(`Upserted product: ${product.handle}`);
  return data.productSet.product.id;
}

function productMetafields(product) {
  const [width, height, depth] = product.dimensions;
  return [
    metafield('material_details', 'multi_line_text_field', `${product.title} uses demo materials for filtering and PDP sections.`),
    metafield('room', 'list.single_line_text_field', product.room),
    metafield('style', 'list.single_line_text_field', product.style),
    metafield('width_cm', 'number_integer', width),
    metafield('height_cm', 'number_integer', height),
    metafield('depth_cm', 'number_integer', depth),
    metafield('delivery_weeks', 'number_integer', product.badge === 'Sale' ? 1 : 4),
    metafield('features', 'list.single_line_text_field', ['Variant aware', 'Hydrogen seeded', 'Lookbook ready']),
    metafield('configurator_enabled', 'boolean', product.configurator),
    metafield(
      'configurator_options',
      'json',
      product.configurator
        ? {
            modules: ['left-arm', 'center', 'corner', 'right-arm'],
            legs: ['oak', 'black-metal'],
            fabrics: ['linen', 'boucle', 'velvet'],
            maxModules: 5,
          }
        : {},
    ),
    product.badge ? metafield('badge', 'single_line_text_field', product.badge) : null,
  ].filter(Boolean);
}

function metafield(key, type, value) {
  return {
    namespace: 'custom',
    key,
    type,
    value: typeof value === 'string' ? value : JSON.stringify(value),
  };
}

async function publishIfPossible(token, productId, publications) {
  if (!publications.length) return;
  const data = await optionalAdminGraphql(
    token,
    `mutation Publish($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        publishable {
          availablePublicationsCount {
            count
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {id: productId, input: publications.map((publication) => ({publicationId: publication.id}))},
  );
  if (data) {
    handleUserErrors(`publish ${productId}`, data.publishablePublish.userErrors, true);
  }
}

async function createLookbookScenes(token, productIds) {
  const scenes = [
    {
      handle: 'living-room-studio',
      title: 'Living Room Studio',
      image: 'https://picsum.photos/seed/living-room-studio/1800/1200',
      hotspots: productIds.slice(0, 4),
    },
    {
      handle: 'evening-lounge',
      title: 'Evening Lounge',
      image: 'https://picsum.photos/seed/evening-lounge/1800/1200',
      hotspots: productIds.slice(4, 8),
    },
  ];

  const mutation = `mutation MetaobjectCreate($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }`;

  for (const scene of scenes) {
    const hotspots = scene.hotspots.map((product, index) => ({
      productId: product.id,
      productHandle: product.handle,
      label: `Shop ${product.handle}`,
      x: [24, 47, 66, 78][index],
      y: [56, 42, 61, 35][index],
    }));

    const data = await adminGraphql(token, mutation, {
      metaobject: {
        type: LOOKBOOK_METAOBJECT_TYPE,
        handle: scene.handle,
        fields: [
          {key: 'title', value: scene.title},
          {key: 'image_url', value: scene.image},
          {key: 'hotspots', value: JSON.stringify(hotspots)},
        ],
      },
    });
    handleUserErrors(`lookbook scene ${scene.handle}`, data.metaobjectCreate.userErrors, true);
  }
}

async function createCustomers(token, records, productIds) {
  const mutation = `mutation CustomerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
      }
      userErrors {
        field
        message
      }
    }
  }`;

  for (const [index, customer] of records.entries()) {
    const wishlist = productIds.slice(index * 2, index * 2 + 3).map((product) => product.id);
    const data = await adminGraphql(token, mutation, {
      input: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        tags: customer.tags,
        note: 'Seed customer for Hydrogen Customer Account API exercises.',
        metafields: [
          metafield('wishlist', 'list.product_reference', wishlist),
          metafield('email_sale_alerts', 'boolean', true),
          metafield('email_back_in_stock', 'boolean', index === 0),
          metafield('preferred_materials', 'list.single_line_text_field', customer.preferredMaterials),
        ],
      },
    });
    handleUserErrors(`customer ${customer.email}`, data.customerCreate.userErrors, true);
  }
}

async function countStorefrontProducts() {
  const storefrontEnvPath = path.join(root, '.env');
  if (!fs.existsSync(storefrontEnvPath)) return 'skipped';
  const storefrontEnv = loadEnv(storefrontEnvPath);
  if (!storefrontEnv.PUBLIC_STORE_DOMAIN || !storefrontEnv.PUBLIC_STOREFRONT_API_TOKEN) {
    return 'skipped';
  }

  const version = storefrontEnv.PUBLIC_STOREFRONT_API_VERSION ?? env.SHOPIFY_ADMIN_API_VERSION;
  const response = await fetch(`https://${storefrontEnv.PUBLIC_STORE_DOMAIN}/api/${version}/graphql.json`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-shopify-storefront-access-token': storefrontEnv.PUBLIC_STOREFRONT_API_TOKEN,
    },
    body: JSON.stringify({
      query: `query ProductSample {
        products(first: 20) {
          nodes {
            id
          }
        }
      }`,
    }),
  });
  const json = await response.json();
  if (json.errors) return `0 or unavailable (${json.errors[0].message})`;
  return json.data.products.nodes.length;
}

function handleUserErrors(label, errors, allowAlreadyExists = false) {
  const actionable = errors.filter((error) => {
    if (!allowAlreadyExists) return true;
    return !/already exists|taken|has already been|key is in use/i.test(
      error.message,
    );
  });
  if (actionable.length) {
    throw new Error(`${label}: ${JSON.stringify(actionable)}`);
  }
  if (errors.length && allowAlreadyExists) {
    console.log(`Skipped existing ${label}`);
  }
}

function redact(value) {
  return JSON.parse(
    JSON.stringify(value).replace(/shp[a-z_]*[A-Za-z0-9_]+/g, '[redacted]'),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
