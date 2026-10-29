import {HydratedRouter} from 'react-router/dom';
import {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {NonceProvider} from '@shopify/hydrogen';

async function hydrate() {
  // Load the server-rendered lazy section before hydration can update its boundary.
  if (document.querySelector('[data-has-configurator]')) {
    await import('./components/ProductConfigurator').catch((error: unknown) => {
      console.error('Configurator bundle preload failed:', error);
    });
  }
  startTransition(() => {
    // Extract nonce from existing script tags
    const existingNonce =
      document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;

    hydrateRoot(
      document,
      <StrictMode>
        <NonceProvider value={existingNonce}>
          <HydratedRouter />
        </NonceProvider>
      </StrictMode>,
    );
  });
}

if (!window.location.origin.includes('webcache.googleusercontent.com')) {
  void hydrate();
}
