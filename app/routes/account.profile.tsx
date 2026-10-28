import type {CustomerFragment} from 'customer-accountapi.generated';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from 'react-router';
import type {Route} from './+types/account.profile';
import {useState} from 'react';
import {accountForm, accountFailure, saveProfile} from '~/lib/account.server';
export {accountHeaders as headers} from '~/lib/account';
export const meta = () => [{title: 'Profile'}];
export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();
  return {};
}
export async function action({request, context}: Route.ActionArgs) {
  try {
    const form = await accountForm(request, context.customerAccount);
    await saveProfile(context.customerAccount, form);
    return data({error: null, status: 200});
  } catch (error) {
    const failure = accountFailure(error);
    return data(failure, {status: failure.status});
  }
}
export default function AccountProfile() {
  const {customer} = useOutletContext<{customer: CustomerFragment}>();
  const result = useActionData<typeof action>();
  const pending = useNavigation().state !== 'idle';
  const [edit, setEdit] = useState<{result: typeof result} | null>(null);
  const edited = edit !== null && edit.result === result;
  return (
    <section className="account-panel">
      <h2>Profile</h2>
      <Form
        method="post"
        className="account-form"
        key={`${customer.firstName}:${customer.lastName}`}
        onChange={() => setEdit({result})}
      >
        <div className="account-form-grid">
          <label>
            First name
            <input
              name="firstName"
              autoComplete="given-name"
              defaultValue={customer.firstName ?? ''}
              maxLength={80}
              disabled={pending}
            />
          </label>
          <label>
            Last name
            <input
              name="lastName"
              autoComplete="family-name"
              defaultValue={customer.lastName ?? ''}
              maxLength={80}
              disabled={pending}
            />
          </label>
        </div>
        <div className="account-form-footer">
          <div className="account-form-status">
            {!pending && edited ? (
              <p role="status">Unsaved changes</p>
            ) : !pending && result?.error ? (
              <p role="alert" className="account-error">
                {result.error}
              </p>
            ) : (
              !pending &&
              result &&
              !edited && (
                <p role="status" className="account-success">
                  Profile saved.
                </p>
              )
            )}
          </div>
          <button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </Form>
    </section>
  );
}
