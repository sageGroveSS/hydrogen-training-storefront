import type {CustomerAccount} from '@shopify/hydrogen';
import {readBoundedForm} from './forms.server.ts';
import {
  AccountError,
  formText,
  formCheckbox,
  profileInput,
  addressInput,
} from './account.ts';
import {
  CUSTOMER_PREFERENCES_QUERY,
  CUSTOMER_PREFERENCES_MUTATION,
} from '../graphql/customer-account/CustomerPreferences.ts';
import {CUSTOMER_UPDATE_MUTATION} from '../graphql/customer-account/CustomerUpdateMutation.ts';
import {CUSTOMER_DETAILS_QUERY} from '../graphql/customer-account/CustomerDetailsQuery.ts';
import {
  CREATE_ADDRESS_MUTATION,
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
} from '../graphql/customer-account/CustomerAddressMutations.ts';

type AccountClient = Pick<
  CustomerAccount,
  'query' | 'mutate' | 'isLoggedIn' | 'i18n'
>;

export async function accountForm(
  request: Request,
  account: Pick<CustomerAccount, 'isLoggedIn'>,
) {
  if (request.method !== 'POST')
    throw new Response('Method not allowed.', {status: 405});
  if (!(await account.isLoggedIn()))
    throw new Response('Your session ended. Please sign in again.', {
      status: 401,
    });
  return readBoundedForm(request);
}

export function accountFailure(error: unknown) {
  if (error instanceof Response) throw error;
  return {
    error:
      error instanceof AccountError
        ? error.message
        : 'Your changes could not be saved. Please try again.',
    status: error instanceof AccountError ? error.status : 503,
  };
}

export async function loadPreferences(account: Pick<CustomerAccount, 'query'>) {
  const {data, errors} = await account.query(CUSTOMER_PREFERENCES_QUERY);
  if (errors?.length || !data?.customer)
    throw new AccountError(
      'Email preferences are temporarily unavailable.',
      503,
    );
  const {customer} = data;
  for (const field of [customer.saleAlerts, customer.backInStock]) {
    if (field && field.value !== 'true' && field.value !== 'false')
      throw new AccountError(
        'Email preferences are temporarily unavailable.',
        503,
      );
  }
  return {
    customerId: customer.id,
    values: {
      saleAlerts: customer.saleAlerts?.value === 'true',
      backInStock: customer.backInStock?.value === 'true',
    },
    versions: {
      saleAlerts: customer.saleAlerts?.compareDigest ?? '',
      backInStock: customer.backInStock?.compareDigest ?? '',
    },
  };
}

export async function savePreferences(
  account: Pick<CustomerAccount, 'query' | 'mutate'>,
  form: URLSearchParams,
) {
  const values = {
    saleAlerts: formCheckbox(form, 'saleAlerts'),
    backInStock: formCheckbox(form, 'backInStock'),
  };
  const versions = {
    saleAlerts: formText(form, 'saleAlertsVersion', 256),
    backInStock: formText(form, 'backInStockVersion', 256),
  };
  const current = await loadPreferences(account);
  const stale = () =>
    new AccountError(
      'Your preferences changed in another window. Reload this page and try again.',
      409,
    );
  if (
    versions.saleAlerts !== current.versions.saleAlerts ||
    versions.backInStock !== current.versions.backInStock
  )
    throw stale();
  if (
    values.saleAlerts === current.values.saleAlerts &&
    values.backInStock === current.values.backInStock
  )
    return;
  const result = await account.mutate(CUSTOMER_PREFERENCES_MUTATION, {
    variables: {
      metafields: [
        {
          ownerId: current.customerId,
          namespace: 'custom',
          key: 'email_sale_alerts',
          type: 'boolean',
          value: String(values.saleAlerts),
          compareDigest: versions.saleAlerts || null,
        },
        {
          ownerId: current.customerId,
          namespace: 'custom',
          key: 'email_back_in_stock',
          type: 'boolean',
          value: String(values.backInStock),
          compareDigest: versions.backInStock || null,
        },
      ],
    },
  });
  const payload = result.data?.metafieldsSet;
  if (
    payload?.userErrors.some((error) =>
      ['STALE_OBJECT', 'INVALID_COMPARE_DIGEST'].includes(error.code ?? ''),
    )
  )
    throw stale();
  if (result.errors?.length || !payload || payload.userErrors.length)
    throw new AccountError(
      'Your preferences could not be saved. Please try again.',
      503,
    );
}

export async function saveProfile(
  account: AccountClient,
  form: URLSearchParams,
) {
  const result = await account.mutate(CUSTOMER_UPDATE_MUTATION, {
    variables: {customer: profileInput(form), language: account.i18n.language},
  });
  const validation = result.data?.customerUpdate?.userErrors[0];
  if (validation) throw new AccountError(validation.message);
  if (
    result.errors?.length ||
    !result.data?.customerUpdate?.customer ||
    result.data.customerUpdate.userErrors.length
  )
    throw new AccountError(
      'Your profile could not be saved. Please try again.',
      503,
    );
}

export async function saveAddress(
  account: AccountClient,
  form: URLSearchParams,
) {
  const intent = formText(form, 'intent', 10);
  const addressId = formText(form, 'addressId', 1024);
  if (!['create', 'update', 'delete'].includes(intent) || !addressId)
    throw new AccountError('Invalid address action.');
  if (intent !== 'create') {
    const result = await account.query(CUSTOMER_DETAILS_QUERY, {
      variables: {language: account.i18n.language},
    });
    if (result.errors?.length || !result.data?.customer)
      throw new AccountError('Your addresses could not be loaded.', 503);
    if (
      !result.data.customer.addresses.nodes.some(
        (address) => address.id === addressId,
      )
    )
      throw new AccountError(
        'This address is not available in your account.',
        404,
      );
  }
  const language = account.i18n.language;
  if (intent === 'delete') {
    const result = await account.mutate(DELETE_ADDRESS_MUTATION, {
      variables: {addressId, language},
    });
    const validation = result.data?.customerAddressDelete?.userErrors[0];
    if (validation) throw new AccountError(validation.message);
    if (
      result.errors?.length ||
      !result.data?.customerAddressDelete?.deletedAddressId ||
      result.data.customerAddressDelete.userErrors.length
    )
      throw new AccountError(
        'The address could not be deleted. Please try again.',
      );
    return;
  }
  const variables = {
    address: addressInput(form),
    defaultAddress: formCheckbox(form, 'defaultAddress'),
    language,
  };
  if (intent === 'create') {
    const result = await account.mutate(CREATE_ADDRESS_MUTATION, {variables});
    const validation = result.data?.customerAddressCreate?.userErrors[0];
    if (validation) throw new AccountError(validation.message);
    if (
      result.errors?.length ||
      !result.data?.customerAddressCreate?.customerAddress ||
      result.data.customerAddressCreate.userErrors.length
    )
      throw new AccountError(
        'The address could not be added. Check the address fields and try again.',
      );
  } else {
    const result = await account.mutate(UPDATE_ADDRESS_MUTATION, {
      variables: {...variables, addressId},
    });
    const validation = result.data?.customerAddressUpdate?.userErrors[0];
    if (validation) throw new AccountError(validation.message);
    if (
      result.errors?.length ||
      !result.data?.customerAddressUpdate?.customerAddress ||
      result.data.customerAddressUpdate.userErrors.length
    )
      throw new AccountError(
        'The address could not be saved. Check the address fields and try again.',
      );
  }
}
