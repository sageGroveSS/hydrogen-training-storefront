import {redirect} from 'react-router';
import type {Route} from './+types/account_.logout';
import {readBoundedForm} from '~/lib/forms.server';
export {accountHeaders as headers} from '~/lib/account';

// if we don't implement this, /account/logout will get caught by account.$.tsx to do login
export async function loader() {
  return redirect('/');
}

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST')
    throw new Response('Method not allowed.', {status: 405});
  await readBoundedForm(request);
  return context.customerAccount.logout();
}
