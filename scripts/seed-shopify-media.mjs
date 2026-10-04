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

const replaceProductMedia = process.argv.includes('--replace-product-media');

const collectionImages = [
  ['sofas', 'Sofas', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1800&q=85'],
  ['chairs', 'Chairs', 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=1800&q=85'],
  ['tables', 'Tables', 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?auto=format&fit=crop&w=1800&q=85'],
  ['lighting', 'Lighting', 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1800&q=85'],
  ['living-room-featured', 'Living Room / Featured', 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1800&q=85'],
];

const productImages = [
  ['luna-modular-sofa', 'Luna Modular Sofa', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1400&q=85'],
  ['arbor-low-sofa', 'Arbor Low Sofa', 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&w=1400&q=85'],
  ['marin-sleeper-sofa', 'Marin Sleeper Sofa', 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1400&q=85'],
  ['cove-loveseat', 'Cove Loveseat', 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1400&q=85'],
  ['nora-lounge-chair', 'Nora Lounge Chair', 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=1400&q=85'],
  ['field-dining-chair', 'Field Dining Chair', 'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1400&q=85'],
  ['palisade-accent-chair', 'Palisade Accent Chair', 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1400&q=85'],
  ['plinth-coffee-table', 'Plinth Coffee Table', 'https://images.unsplash.com/photo-1532372320572-cda25653a694?auto=format&fit=crop&w=1400&q=85'],
  ['arc-side-table', 'Arc Side Table', 'https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=1400&q=85'],
  ['harbor-dining-table', 'Harbor Dining Table', 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?auto=format&fit=crop&w=1400&q=85'],
  ['glow-floor-lamp', 'Glow Floor Lamp', 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1400&q=85'],
  ['linen-table-lamp', 'Linen Table Lamp', 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1400&q=85'],
  ['atlas-wool-rug', 'Atlas Wool Rug', 'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=1400&q=85'],
  ['terra-flatweave-rug', 'Terra Flatweave Rug', 'https://images.unsplash.com/photo-1617103996702-96ff29b1c467?auto=format&fit=crop&w=1400&q=85'],
  ['brass-catchall-tray', 'Brass Catchall Tray', 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1400&q=85'],
  ['linen-storage-basket', 'Linen Storage Basket', 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1400&q=85'],
];

async function main() {
  const failures = [];

  console.log(apply ? 'Seeding Shopify media...' : 'Dry run. Re-run with --apply to upload media.');
  console.log(`Collection images: ${collectionImages.length}`);
  console.log(`Product images: ${productImages.length}`);
  if (replaceProductMedia) {
    console.log('Existing product media will be replaced.');
  }

  if (!apply) return;

  const token = await getAdminToken();

  for (const [handle, title, src] of collectionImages) {
    await updateCollectionImage(token, handle, title, src).catch((error) => {
      failures.push(`collection ${handle}: ${error.message}`);
      console.warn(`Skipped collection image: ${handle}`);
    });
  }

  for (const [handle, title, src] of productImages) {
    await updateProductImage(token, handle, title, src).catch((error) => {
      failures.push(`product ${handle}: ${error.message}`);
      console.warn(`Skipped product image: ${handle}`);
    });
  }

  await wait(5000);
  const report = await mediaReport(token);
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) {
    console.warn('Media seed finished with failures:');
    for (const failure of failures) console.warn(`- ${failure}`);
    process.exitCode = 1;
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
        media(first: 20) {
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

  const existingMediaIds = product.media.nodes.map((media) => media.id);

  if (existingMediaIds.length > 0 && !replaceProductMedia) {
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

  if (existingMediaIds.length > 0) {
    await removeProductMediaReferences(token, product.id, existingMediaIds);
    console.log(`Removed existing product media references: ${handle}`);
  }
}

async function removeProductMediaReferences(token, productId, mediaIds) {
  try {
    const result = await adminGraphql(
      token,
      `mutation FileUpdate($files: [FileUpdateInput!]!) {
        fileUpdate(files: $files) {
          files {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        files: mediaIds.map((id) => ({
          id,
          referencesToRemove: [productId],
        })),
      },
    );

    handleUserErrors('remove product media references', result.fileUpdate.userErrors);
    return;
  } catch (error) {
    if (!String(error.message).includes('ACCESS_DENIED')) throw error;
  }

  const result = await adminGraphql(
    token,
    `mutation ProductDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
      productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
        deletedMediaIds
        mediaUserErrors {
          field
          message
        }
      }
    }`,
    {productId, mediaIds},
  );

  handleUserErrors(
    'delete product media',
    result.productDeleteMedia.mediaUserErrors.filter(
      (error) => !error.message.includes('does not exist'),
    ),
  );
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
