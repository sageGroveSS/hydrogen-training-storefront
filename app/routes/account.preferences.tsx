import {
  data,
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type {Route} from './+types/account.preferences';
import {useState} from 'react';
import {
  accountForm,
  accountFailure,
  loadPreferences,
  savePreferences,
} from '~/lib/account.server';
export {accountHeaders as headers} from '~/lib/account';

export const meta = () => [{title: 'Email preferences'}];
export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();
  const {values, versions} = await loadPreferences(context.customerAccount);
  return {values, versions};
}
export async function action({request, context}: Route.ActionArgs) {
  try {
    const form = await accountForm(request, context.customerAccount);
    await savePreferences(context.customerAccount, form);
    return data({error: null, status: 200});
  } catch (error) {
    const failure = accountFailure(error);
    return data(failure, {status: failure.status});
  }
}
export default function Preferences() {
  const {values, versions} = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const pending = useNavigation().state !== 'idle';
  const [edit, setEdit] = useState<{result: typeof result} | null>(null);
  const edited = edit !== null && edit.result === result;
  return (
    <section className="account-panel">
      <h2>Email preferences</h2>
      <p className="account-description">
        Choose the emails you would like to receive.
      </p>
      <Form
        method="post"
        className="account-preferences"
        key={`${versions.saleAlerts}:${versions.backInStock}`}
        onChange={() => setEdit({result})}
      >
        <input
          type="hidden"
          name="saleAlertsVersion"
          value={versions.saleAlerts}
        />
        <input
          type="hidden"
          name="backInStockVersion"
          value={versions.backInStock}
        />
        <label className="account-preference" htmlFor="account-sale-alerts">
          <span>
            Sales & offers<small>Promotions and selected offers.</small>
          </span>
          <input
            id="account-sale-alerts"
            type="checkbox"
            name="saleAlerts"
            value="true"
            defaultChecked={values.saleAlerts}
            role="switch"
            disabled={pending}
          />
        </label>
        <label className="account-preference" htmlFor="account-back-in-stock">
          <span>
            Back in stock
            <small>Availability updates for products you follow.</small>
          </span>
          <input
            id="account-back-in-stock"
            type="checkbox"
            name="backInStock"
            value="true"
            defaultChecked={values.backInStock}
            role="switch"
            disabled={pending}
          />
        </label>
        <div className="account-form-footer">
          <div className="account-form-status">
            {!pending && edited && result?.status !== 409 ? (
              <p role="status">Unsaved changes</p>
            ) : !pending && result?.error ? (
              <p role="alert" className="account-error">
                {result.error}{' '}
                {result.status === 409 && (
                  <Link to="/account/preferences" reloadDocument>
                    Reload preferences
                  </Link>
                )}
              </p>
            ) : (
              !pending &&
              result &&
              !edited && (
                <p role="status" className="account-success">
                  Preferences saved.
                </p>
              )
            )}
          </div>
          <button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </Form>
    </section>
  );
}
