import { redirect } from 'next/navigation';
import ActionForm from '../../../components/ActionForm';
import { countOwnedBusinesses, getActiveBusiness, listUserBusinesses } from '../../../lib/access';
import {
  addCollaborator,
  createBusiness,
  deleteBusiness,
  listCollaborators,
  removeCollaborator,
  renameBusiness,
  updateCashSettings,
} from '../../../lib/business-actions';
import { deleteAccount } from '../../../lib/account-actions';
import { getOrCreateUser } from '../../../lib/auth';
import { getBusinessPlan, getUserPlan, PLAN_LIMITS } from '../../../lib/plans';

export const metadata = { title: 'Settings' };

const inputClass = 'min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal';
const labelClass = 'flex flex-col gap-1 font-semibold text-slate-800';
const primaryButton = 'min-h-11 w-fit rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-60';
const card = 'rounded-lg border border-slate-200 bg-white p-6';

const text = (formData: FormData, name: string) => String(formData.get(name) ?? '');

export default async function SettingsPage() {
  const user = await getOrCreateUser();
  const business = await getActiveBusiness(user.id);
  const isOwner = business.role === 'owner';
  const [ownedCount, ownPlan, businessPlan, accessible] = await Promise.all([
    countOwnedBusinesses(user.id),
    getUserPlan(user.id),
    getBusinessPlan(business.id),
    listUserBusinesses(user.id),
  ]);
  const businessLimit = PLAN_LIMITS[ownPlan].businesses;
  const collaborators = isOwner ? await listCollaborators(business.id) : [];

  async function rename(formData: FormData) {
    'use server';
    await renameBusiness(business.id, text(formData, 'name'));
    redirect('/settings');
  }

  async function saveCash(formData: FormData) {
    'use server';
    await updateCashSettings(business.id, text(formData, 'cashBalance'), text(formData, 'cashStartMonth'));
    redirect('/settings');
  }

  async function create(formData: FormData) {
    'use server';
    await createBusiness(text(formData, 'name'), text(formData, 'cashBalance'), text(formData, 'cashStartMonth'));
    redirect('/dashboard');
  }

  async function invite(formData: FormData) {
    'use server';
    await addCollaborator(business.id, text(formData, 'email'));
    redirect('/settings');
  }

  async function revoke(formData: FormData) {
    'use server';
    await removeCollaborator(business.id, text(formData, 'userId'));
    redirect('/settings');
  }

  async function removeBusiness(formData: FormData) {
    'use server';
    await deleteBusiness(business.id, text(formData, 'confirmation'));
    redirect('/dashboard');
  }

  async function removeAccount(formData: FormData) {
    'use server';
    await deleteAccount(text(formData, 'confirmation'));
    redirect('/sign-up');
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">Account settings</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Settings</h1>
        <p className="mt-3 text-slate-700">
          Signed in as {user.email}. You are {isOwner ? 'the owner' : 'a collaborator'} of <strong>{business.name}</strong>.
        </p>
      </header>

      <ActionForm action={rename} className={`${card} grid gap-4 md:grid-cols-2`}>
        <h2 className="text-xl font-bold text-slate-950 md:col-span-2">Business profile</h2>
        <label className={labelClass}>Business name<input className={inputClass} defaultValue={business.name} maxLength={120} name="name" required /></label>
        <div className="flex items-end"><button className={primaryButton} type="submit">Save business name</button></div>
      </ActionForm>

      <ActionForm action={saveCash} className={`${card} grid gap-4 md:grid-cols-3`}>
        <h2 className="text-xl font-bold text-slate-950 md:col-span-3">Opening cash</h2>
        <p className="text-sm text-slate-700 md:col-span-3">Month 1 of every forecast is the month containing the start date. Enter the cash you hold at the start of that month.</p>
        <label className={labelClass}>Cash balance ({business.currency})<input className={inputClass} defaultValue={(business.cashBalanceCents / 100).toFixed(2)} inputMode="decimal" name="cashBalance" required /></label>
        <label className={labelClass}>Start month<input className={inputClass} defaultValue={business.cashStartMonth} name="cashStartMonth" required type="date" /></label>
        <div className="flex items-end"><button className={primaryButton} type="submit">Save cash settings</button></div>
      </ActionForm>

      <section className={card} aria-labelledby="plan-heading">
        <h2 className="text-xl font-bold text-slate-950" id="plan-heading">Demo plan</h2>
        <p className="mt-3 text-lg font-semibold capitalize text-slate-900">{ownPlan}</p>
        <p className="mt-1 text-sm text-slate-700">Assignment demo — no payment is collected. Switching plans never deletes business data.</p>
        {!isOwner ? <p className="mt-2 text-sm text-slate-700">This business follows its owner&apos;s plan ({businessPlan}), not yours.</p> : null}
        <a className="mt-3 inline-flex min-h-11 items-center font-semibold text-blue-900 underline" href="/pricing">Change demo plan</a>
      </section>

      {isOwner ? (
        <section className={card} aria-labelledby="share-heading">
          <h2 className="text-xl font-bold text-slate-950" id="share-heading">Sharing</h2>
          <p className="mt-2 text-sm text-slate-700">Collaborators can edit planning data in this business. They cannot change plans, invite people, delete the business or change ownership.</p>
          <ul className="mt-4 space-y-2">
            {collaborators.length === 0 ? <li className="text-slate-700">No collaborators yet.</li> : null}
            {collaborators.map((collaborator) => (
              <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3" key={collaborator.userId}>
                <span>{collaborator.email}</span>
                <ActionForm action={revoke} className="flex">
                  <input name="userId" type="hidden" value={collaborator.userId} />
                  <button className="min-h-10 rounded-md border border-red-300 px-3 font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60" type="submit">Revoke access</button>
                </ActionForm>
              </li>
            ))}
          </ul>
          <ActionForm action={invite} className="mt-4 flex flex-wrap items-end gap-4">
            <label className={labelClass}>Registered account email<input className={inputClass} maxLength={254} name="email" required type="email" /></label>
            <button className={primaryButton} type="submit">Grant access</button>
          </ActionForm>
          <p className="mt-2 text-sm text-slate-700">The person must already have a BootPulse account. No invitation email is sent.</p>
        </section>
      ) : null}

      <section className={card} aria-labelledby="create-business-heading">
        <h2 className="text-xl font-bold text-slate-950" id="create-business-heading">Create a business</h2>
        {ownedCount < businessLimit ? (
          <ActionForm action={create} className="mt-4 grid gap-4 md:grid-cols-3">
            <label className={labelClass}>Business name<input className={inputClass} maxLength={120} name="name" required /></label>
            <label className={labelClass}>Starting cash ({business.currency})<input className={inputClass} defaultValue="0.00" inputMode="decimal" name="cashBalance" required /></label>
            <label className={labelClass}>Start month<input className={inputClass} name="cashStartMonth" required type="date" /></label>
            <button className={primaryButton} type="submit">Create business</button>
          </ActionForm>
        ) : (
          <p className="mt-3 text-slate-700">
            You own {ownedCount} of {businessLimit} businesses allowed on the {ownPlan} demo plan.{' '}
            <a className="font-semibold text-blue-900 underline" href="/pricing">See demo plans</a>
          </p>
        )}
      </section>

      {isOwner && accessible.length > 1 ? (
        <section className="rounded-lg border border-red-200 bg-white p-6" aria-labelledby="delete-business-heading">
          <h2 className="text-xl font-bold text-red-900" id="delete-business-heading">Delete this business</h2>
          <p className="mt-3 text-slate-700">Permanently deletes {business.name}, its items, scenarios and decisions, and removes access for its collaborators.</p>
          <ActionForm action={removeBusiness} className="mt-4 space-y-4">
            <label className="flex items-start gap-3 text-slate-800">
              <input className="mt-1 h-5 w-5" name="confirmation" required type="checkbox" value="delete" />
              <span>I understand that this business will be permanently deleted.</span>
            </label>
            <button className="min-h-11 rounded-md bg-red-800 px-4 font-semibold text-white hover:bg-red-700 disabled:opacity-60" type="submit">Delete business</button>
          </ActionForm>
        </section>
      ) : null}

      <section className="rounded-lg border border-red-200 bg-white p-6" aria-labelledby="delete-account-heading">
        <h2 className="text-xl font-bold text-red-900" id="delete-account-heading">Delete account and data</h2>
        <p className="mt-3 text-slate-700">Permanently deletes your sign-in account, demo plan and every business you own. Businesses shared with you are not affected. This cannot be undone.</p>
        <ActionForm action={removeAccount} className="mt-4 space-y-4">
          <label className="flex items-start gap-3 text-slate-800">
            <input className="mt-1 h-5 w-5" name="confirmation" required type="checkbox" value="delete" />
            <span>I understand that my BootPulse account and data will be permanently deleted.</span>
          </label>
          <button className="min-h-11 rounded-md bg-red-800 px-4 font-semibold text-white hover:bg-red-700 disabled:opacity-60" type="submit">Delete account and data</button>
        </ActionForm>
      </section>
    </div>
  );
}
