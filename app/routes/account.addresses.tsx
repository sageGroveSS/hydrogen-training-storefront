import type {CustomerAddressInput} from '@shopify/hydrogen/customer-account-api-types';
import type {
  AddressFragment,
  CustomerFragment,
} from 'customer-accountapi.generated';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from 'react-router';
import type {Route} from './+types/account.addresses';
import {useEffect, useRef, useState} from 'react';
import {ACCOUNT_COUNTRIES} from '~/lib/countries';
import {accountForm, accountFailure, saveAddress} from '~/lib/account.server';
export {accountHeaders as headers} from '~/lib/account';
export const meta = () => [{title: 'Addresses'}];
export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();
  return {};
}
export async function action({request, context}: Route.ActionArgs) {
  let formId = 'new';
  try {
    const form = await accountForm(request, context.customerAccount);
    formId = form.get('addressId') ?? 'new';
    await saveAddress(context.customerAccount, form);
    return data({formId, error: null, status: 200});
  } catch (error) {
    const failure = accountFailure(error);
    return data({...failure, formId}, {status: failure.status});
  }
}
export default function Addresses() {
  const {customer} = useOutletContext<{customer: CustomerFragment}>();
  const result = useActionData<typeof action>();
  const addAddress = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (result && !result.error && result.formId === 'new') {
      addAddress.current?.removeAttribute('open');
      addAddress.current?.querySelector('summary')?.focus();
    }
  }, [result]);
  return (
    <section>
      <div className="account-section-heading">
        <h2>Addresses</h2>
        <span>{customer.addresses.nodes.length} saved</span>
      </div>
      {result &&
        !result.error &&
        (result.formId === 'new' ||
          !customer.addresses.nodes.some(
            (address) => address.id === result.formId,
          )) && (
          <p role="status" className="account-success">
            {result.formId === 'new' ? 'Address added.' : 'Address deleted.'}
          </p>
        )}
      <details className="account-add-address" ref={addAddress}>
        <summary>
          <span aria-hidden="true">+</span>Add address
        </summary>
        <div className="account-panel">
          <AddressForm key={customer.addresses.nodes.length} />
        </div>
      </details>
      {!customer.addresses.nodes.length && (
        <p className="account-empty">You have no saved addresses.</p>
      )}
      <div className="account-address-list">
        {customer.addresses.nodes.map((address) => (
          <section key={address.id} className="account-panel">
            <div className="account-section-heading">
              <h3>
                {[address.firstName, address.lastName]
                  .filter(Boolean)
                  .join(' ') || 'Address'}
              </h3>
              {customer.defaultAddress?.id === address.id && (
                <span className="account-badge account-default-badge">
                  Default
                </span>
              )}
            </div>
            <address>{address.formatted.join('\n')}</address>
            <details>
              <summary>Edit address</summary>
              <AddressForm
                address={address}
                isDefault={customer.defaultAddress?.id === address.id}
              />
            </details>
          </section>
        ))}
      </div>
    </section>
  );
}
const fields = [
  {
    name: 'firstName',
    label: 'First name',
    autoComplete: 'given-name',
    required: true,
    max: 80,
  },
  {
    name: 'lastName',
    label: 'Last name',
    autoComplete: 'family-name',
    required: true,
    max: 80,
  },
  {
    name: 'address1',
    label: 'Street address',
    autoComplete: 'address-line1',
    required: true,
    max: 255,
  },
  {
    name: 'address2',
    label: 'Apartment, suite, etc.',
    autoComplete: 'address-line2',
    max: 255,
  },
  {
    name: 'city',
    label: 'City',
    autoComplete: 'address-level2',
    required: true,
    max: 255,
  },
  {
    name: 'zoneCode',
    label: 'State / province',
    autoComplete: 'address-level1',
    max: 64,
  },
  {name: 'zip', label: 'Postal code', autoComplete: 'postal-code', max: 32},
  {
    name: 'territoryCode',
    label: 'Country',
    autoComplete: 'country',
    required: true,
    max: 2,
  },
  {name: 'phoneNumber', label: 'Phone', autoComplete: 'tel', max: 16},
  {name: 'company', label: 'Company', autoComplete: 'organization', max: 255},
] as const;
export function AddressForm({
  address,
  isDefault = false,
}: {
  address?: AddressFragment;
  isDefault?: boolean;
}) {
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const pending = navigation.state !== 'idle';
  const formId = address?.id ?? 'new';
  const feedback = result?.formId === formId ? result : null;
  const [edit, setEdit] = useState<{result: typeof feedback} | null>(null);
  const edited = edit !== null && edit.result === feedback;
  return (
    <Form
      method="post"
      className="account-form account-address-form"
      onChange={() => setEdit({result: feedback})}
    >
      <input type="hidden" name="addressId" value={formId} />
      <div className="account-form-grid">
        {fields.map((field) => (
          <label
            key={field.name}
            className={
              field.name === 'address1' || field.name === 'address2'
                ? 'account-field-wide'
                : undefined
            }
          >
            {field.label}
            {'required' in field && field.required ? ' *' : ''}
            {field.name === 'territoryCode' ? (
              <select
                name="territoryCode"
                required
                autoComplete="country"
                defaultValue={address?.territoryCode ?? ''}
                disabled={pending}
              >
                <option value="" disabled>
                  Select country
                </option>
                {address?.territoryCode &&
                  !ACCOUNT_COUNTRIES.some(
                    (country) => country.code === address.territoryCode,
                  ) && (
                    <option value={address.territoryCode}>
                      {address.territoryCode}
                    </option>
                  )}
                {ACCOUNT_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={field.name}
                autoComplete={field.autoComplete}
                defaultValue={
                  address?.[field.name as keyof CustomerAddressInput] ?? ''
                }
                required={'required' in field && field.required}
                maxLength={field.max}
                type={field.name === 'phoneNumber' ? 'tel' : 'text'}
                disabled={pending}
                pattern={
                  field.name === 'phoneNumber'
                    ? '[+]?[1-9][0-9]{3,14}'
                    : undefined
                }
              />
            )}
          </label>
        ))}
      </div>
      <label className="account-checkbox">
        <input
          type="checkbox"
          name="defaultAddress"
          value="true"
          defaultChecked={isDefault}
          disabled={pending}
        />
        Set as default address
      </label>
      <div className="account-form-footer">
        <div className="account-form-status">
          {!pending && edited ? (
            <p role="status">Unsaved changes</p>
          ) : !pending && feedback?.error ? (
            <p role="alert" className="account-error">
              {feedback.error}
            </p>
          ) : (
            !pending &&
            feedback &&
            !edited && (
              <p role="status" className="account-success">
                Address saved.
              </p>
            )
          )}
        </div>
        <div className="account-form-actions">
          <button
            name="intent"
            value={address ? 'update' : 'create'}
            type="submit"
            disabled={pending}
          >
            {pending ? 'Saving…' : address ? 'Save address' : 'Add address'}
          </button>
          {address && (
            <button
              name="intent"
              value="delete"
              type="submit"
              className="account-delete"
              formNoValidate
              disabled={pending}
            >
              Delete address
            </button>
          )}
        </div>
      </div>
    </Form>
  );
}
