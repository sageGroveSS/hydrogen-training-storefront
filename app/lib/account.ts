import type {CustomerAddressInput} from '@shopify/hydrogen/customer-account-api-types';

export class AccountError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const ACCOUNT_PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};

export function isAccountPath(pathname: string) {
  return /^\/account(?:[/.]|$)/.test(pathname);
}

export function accountHeaders({actionHeaders}: {actionHeaders: Headers}) {
  const headers = new Headers(actionHeaders);
  for (const [name, value] of Object.entries(ACCOUNT_PRIVATE_HEADERS))
    headers.set(name, value);
  return headers;
}

export function formText(form: URLSearchParams, key: string, max = 255) {
  const values = form.getAll(key);
  const value = (values[0] ?? '').trim();
  if (
    values.length > 1 ||
    value.length > max ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    throw new AccountError('Check the form fields and try again.');
  return value;
}

export function profileInput(form: URLSearchParams) {
  return {
    firstName: formText(form, 'firstName', 80),
    lastName: formText(form, 'lastName', 80),
  };
}

export function addressInput(form: URLSearchParams): CustomerAddressInput {
  const address = {
    firstName: formText(form, 'firstName', 80),
    lastName: formText(form, 'lastName', 80),
    company: formText(form, 'company'),
    address1: formText(form, 'address1'),
    address2: formText(form, 'address2'),
    city: formText(form, 'city'),
    zoneCode: formText(form, 'zoneCode', 64),
    zip: formText(form, 'zip', 32),
    territoryCode: formText(form, 'territoryCode', 2).toUpperCase(),
    phoneNumber: formText(form, 'phoneNumber', 16),
  };
  if (
    !address.firstName ||
    !address.lastName ||
    !address.address1 ||
    !address.city
  )
    throw new AccountError('Enter your name, street address and city.');
  if (!/^[A-Z]{2}$/.test(address.territoryCode))
    throw new AccountError(
      'Enter a two-letter country code, such as UA or US.',
    );
  if (address.phoneNumber && !/^\+?[1-9]\d{3,14}$/.test(address.phoneNumber))
    throw new AccountError(
      'Enter a valid phone number, including country code.',
    );
  return address;
}

export function formCheckbox(form: URLSearchParams, key: string) {
  const value = formText(form, key, 4);
  if (value && value !== 'true')
    throw new AccountError('Invalid preference value.');
  return value === 'true';
}
