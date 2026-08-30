/* eslint-disable no-console */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envPath = path.join(root, '.env.seed');
const apply = process.argv.includes('--apply');

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
for (const key of ['SHOPIFY_SHOP', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'SHOPIFY_ADMIN_API_VERSION']) {
  if (!env[key]) throw new Error(`Missing ${key} in .env.seed`);
}

const imageBase = 'https://picsum.photos/seed';

const collectionImages = [
  ['sofas', 'Sofas', `${imageBase}/hydrogen-sofas-cover/1800/1000.jpg`],
  ['chairs', 'Chairs', `${imageBase}/hydrogen-chairs-cover/1800/1000.jpg`],
  ['tables', 'Tables', `${imageBase}/hydrogen-tables-cover/1800/1000.jpg`],
  ['lighting', 'Lighting', `${imageBase}/hydrogen-lighting-cover/1800/1000.jpg`],
  ['living-room-featured', 'Living Room / Featured', `${imageBase}/hydrogen-living-room-cover/1800/1000.jpg`],
];

const productImages = [
  ['luna-modular-sofa', 'Luna Modular Sofa', `${imageBase}/luna-modular-sofa/1400/1000.jpg`],
  ['arbor-low-sofa', 'Arbor Low Sofa', `${imageBase}/arbor-low-sofa/1400/1000.jpg`],
  ['marin-sleeper-sofa', 'Marin Sleeper Sofa', `${imageBase}/marin-sleeper-sofa/1400/1000.jpg`],
  ['cove-loveseat', 'Cove Loveseat', `${imageBase}/cove-loveseat/1400/1000.jpg`],
  ['nora-lounge-chair', 'Nora Lounge Chair', `${imageBase}/nora-lounge-chair/1400/1000.jpg`],
  ['field-dining-chair', 'Field Dining Chair', `${imageBase}/field-dining-chair/1400/1000.jpg`],
  ['palisade-accent-chair', 'Palisade Accent Chair', `${imageBase}/palisade-accent-chair/1400/1000.jpg`],
  ['plinth-coffee-table', 'Plinth Coffee Table', `${imageBase}/plinth-coffee-table/1400/1000.jpg`],
  ['arc-side-table', 'Arc Side Table', `${imageBase}/arc-side-table/1400/1000.jpg`],
  ['harbor-dining-table', 'Harbor Dining Table', `${imageBase}/harbor-dining-table/1400/1000.jpg`],
  ['glow-floor-lamp', 'Glow Floor Lamp', `${imageBase}/glow-floor-lamp/1400/1000.jpg`],
  ['linen-table-lamp', 'Linen Table Lamp', `${imageBase}/linen-table-lamp/1400/1000.jpg`],
  ['atlas-wool-rug', 'Atlas Wool Rug', `${imageBase}/atlas-wool-rug/1400/1000.jpg`],
  ['terra-flatweave-rug', 'Terra Flatweave Rug', `${imageBase}/terra-flatweave-rug/1400/1000.jpg`],
  ['brass-catchall-tray', 'Brass Catchall Tray', `${imageBase}/brass-catchall-tray/1400/1000.jpg`],
  ['linen-storage-basket', 'Linen Storage Basket', `${imageBase}/linen-storage-basket/1400/1000.jpg`],
];

async function main() {
  console.log(apply ? 'Seeding Shopify media...' : 'Dry run. Re-run with --apply to upload media.');
  console.log(`Collection images: ${collectionImages.length}`);
  console.log(`Product images: ${productImages.length}`);

  if (!apply) return;

  const token = await getAdminToken();

  for (const [handle, title, src] of collectionImages) {
    await updateCollectionImage(token, handle, title, src);
  }

  for (const [handle, title, src] of productImages) {
    await updateProductImage(token, handle, title, src);
  }

  await wait(5000);
  const report = await mediaReport(token);
  console.log(JSON.stringify(report, null, 2));
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
    throw new Error(`Unable to get Admin API token: ${JSON.stringify(json)}`);
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
    throw new Error(JSON.stringify(json.errors ?? json, null, 2));
  }
  return json.data;
}

async function updateCollectionImage(token, handle, title, src) {
  const data = await adminGraphql(
    token,
    `query CollectionByHandle($query: String!) {
      collections(first: 1, query: $query) {
        nodes {
          id
          handle
        }
      }
    }`,
    {query: `handle:${handle}`},
  );
  const collection = data.collections.nodes[0];
  if (!collection) {
    console.warn(`Collection not found: ${handle}`);
    return;
  }

  const result = await adminGraphql(
    token,
    `mutation CollectionUpdate($input: CollectionInput!) {
      collectionUpdate(input: $input) {
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
      input: {
        id: collection.id,
        image: {
          src,
          altText: title,
        },
      },
    },
  );
  handleUserErrors(`collection ${handle}`, result.collectionUpdate.userErrors);
  console.log(`Updated collection image: ${handle}`);
}

async function updateProductImage(token, handle, title, src) {
  const data = await adminGraphql(
    token,
    `query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        media(first: 1) {
          nodes {
            id
          }
        }
      }
    }`,
    {handle},
  );
  const product = data.productByHandle;
  if (!product) {
    console.warn(`Product not found: ${handle}`);
    return;
  }

  if (product.media.nodes.length > 0) {
    console.log(`Product already has media, skipping: ${handle}`);
    return;
  }

  const result = await adminGraphql(
    token,
    `mutation ProductSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers!) {
      productSet(input: $input, identifier: $identifier, synchronous: true) {
        product {
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
      identifier: {id: product.id},
      input: {
        files: [
          {
            originalSource: src,
            alt: title,
            contentType: 'IMAGE',
          },
        ],
      },
    },
  );
  handleUserErrors(`product ${handle}`, result.productSet.userErrors);
  console.log(`Uploaded product image: ${handle}`);
}

async function mediaReport(token) {
  const data = await adminGraphql(
    token,
    `query MediaReport {
      products(first: 50, query: "tag:seed") {
        nodes {
          handle
          media(first: 1) {
            nodes {
              status
              ... on MediaImage {
                image {
                  url
                }
              }
            }
          }
        }
      }
      collections(first: 20) {
        nodes {
          handle
          image {
            url
          }
        }
      }
    }`,
  );

  return {
    productsWithReadyImages: data.products.nodes.filter((product) =>
      product.media.nodes.some((media) => media.status === 'READY' && media.image?.url),
    ).length,
    productsWithProcessingImages: data.products.nodes.filter((product) =>
      product.media.nodes.some((media) => media.status !== 'READY'),
    ).length,
    collectionsWithImages: data.collections.nodes.filter((collection) => collection.image?.url).length,
  };
}

function handleUserErrors(label, errors) {
  if (errors.length) {
    throw new Error(`${label}: ${JSON.stringify(errors)}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
