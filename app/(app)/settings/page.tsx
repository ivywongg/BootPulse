import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '../../../db';
import { businesses, scenarios, subscriptions, teamMembers, users } from '../../../db/schema';
import { getActiveBusiness, listUserBusinesses, requireBusinessAccess } from '../../../lib/access';
import { getAuthenticatedUser, getOrCreateUser } from '../../../lib/auth';
import { getUserPlan, PLAN_LIMITS } from '../../../lib/plans';
import { entityIdSchema, moneyCentsSchema, monthDateSchema } from '../../../lib/validation';
import ActionForm from '../../../components/ActionForm';

const businessNameSchema = z.string().trim().min(1).max(120);

function formValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? '');
}

async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export default async function SettingsPage() {
  const user = await getOrCreateUser();
  const business = await getActiveBusiness(user.id);
  const businessCount = listUserBusinesses(user.id).length;
  const currentPlan = getUserPlan(user.id);
  const businessLimit = PLAN_LIMITS[currentPlan].businesses;
  const canCreateBusiness = businessCount < businessLimit;
  const subscription = db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).get();

  async function renameBusiness(formData: FormData) {
    'use server';
    const currentUser = await requireAuthenticatedUser();
    const businessId = entityIdSchema.parse(formValue(formData, 'businessId'));
    requireBusinessAccess(currentUser.id, businessId);
    const name = businessNameSchema.parse(formValue(formData, 'name'));
    db.update(businesses).set({ name }).where(and(eq(businesses.id, businessId))).run();
    redirect('/settings');
  }

  async function updateCashSettings(formData: FormData) {
    'use server';
    const currentUser = await requireAuthenticatedUser();
    const businessId = entityIdSchema.parse(formValue(formData, 'businessId'));
    requireBusinessAccess(currentUser.id, businessId);
    const cashStartMonth = monthDateSchema.parse(formValue(formData, 'cashStartMonth'));
    const cashBalanceCents = moneyCentsSchema.parse(formValue(formData, 'cashBalance'));
    db.update(businesses).set({ cashBalanceCents, cashStartMonth }).where(eq(businesses.id, businessId)).run();
    redirect('/settings');
  }

  async function createBusiness(formData: FormData) {
    'use server';
    const currentUser = await requireAuthenticatedUser();
    const currentBusinessCount = listUserBusinesses(currentUser.id).length;
    const currentBusinessLimit = PLAN_LIMITS[getUserPlan(currentUser.id)].businesses;
    if (currentBusinessCount >= currentBusinessLimit) {
      redirect('/settings');
    }
    const name = businessNameSchema.parse(formValue(formData, 'name'));
    const cashStartMonth = monthDateSchema.parse(formValue(formData, 'cashStartMonth'));
    const cashBalanceCents = moneyCentsSchema.parse(formValue(formData, 'cashBalance'));
    const created = db.insert(businesses).values({ name, currency: 'USD', cashStartMonth, cashBalanceCents, isDemo: false }).returning().get();
    db.insert(teamMembers).values({ businessId: created.id, userId: currentUser.id, role: 'owner' }).run();
    db.insert(scenarios).values({ businessId: created.id, name: 'Base', kind: 'base' }).run();
    const cookieStore = await cookies();
    cookieStore.set('bp_business', created.id, { httpOnly: false, maxAge: 31536000, path: '/', sameSite: 'lax' });
    redirect('/settings');
  }

  async function deleteAccount(formData: FormData) {
    'use server';
    const confirmation = z.literal('delete').parse(formValue(formData, 'confirmation'));
    if (confirmation !== 'delete') {
      throw new Error('Account deletion was not confirmed.');
    }

    const currentUser = await requireAuthenticatedUser();
    db.transaction((tx) => {
      tx
        .update(subscriptions)
        .set({
          plan: 'free',
          status: 'canceled',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        })
        .where(eq(subscriptions.userId, currentUser.id))
        .run();

      const ownedBusinesses = tx
        .select({ businessId: teamMembers.businessId })
        .from(teamMembers)
        .where(and(eq(teamMembers.userId, currentUser.id), eq(teamMembers.role, 'owner')))
        .all();

      for (const ownedBusiness of ownedBusinesses) {
        tx.delete(businesses).where(eq(businesses.id, ownedBusiness.businessId)).run();
      }

      tx.delete(users).where(eq(users.id, currentUser.id)).run();
    });

    const cookieStore = await cookies();
    cookieStore.delete('bp_session');
    cookieStore.delete('bp_consent');
    cookieStore.delete('bp_business');
    redirect('/sign-up');
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">Account settings</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Settings</h1>
        <p className="mt-3 text-slate-700">Manage your business details, starting cash, and plan.</p>
      </header>

      <ActionForm action={renameBusiness} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
        <h2 className="text-xl font-bold text-slate-950 md:col-span-2">Business profile</h2>
        <input name="businessId" type="hidden" value={business.id} />
        <label className="flex flex-col gap-1 font-semibold text-slate-800">Business name<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={business.name} name="name" required /></label>
        <div className="flex items-end"><button className="min-h-11 rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800" type="submit">Save business name</button></div>
      </ActionForm>

      <ActionForm action={updateCashSettings} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-3">
        <h2 className="text-xl font-bold text-slate-950 md:col-span-3">Cash settings</h2>
        <input name="businessId" type="hidden" value={business.id} />
        <label className="flex flex-col gap-1 font-semibold text-slate-800">Cash balance ({business.currency})<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={(business.cashBalanceCents / 100).toFixed(2)} inputMode="decimal" name="cashBalance" required /></label>
        <label className="flex flex-col gap-1 font-semibold text-slate-800">Cash start month<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={business.cashStartMonth} name="cashStartMonth" required type="date" /></label>
        <div className="flex items-end"><button className="min-h-11 rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800" type="submit">Save cash settings</button></div>
      </ActionForm>

      <section className="rounded-lg border border-slate-200 bg-white p-6" aria-labelledby="plan-heading">
        <h2 className="text-xl font-bold text-slate-950" id="plan-heading">Current plan</h2>
        <p className="mt-3 text-lg font-semibold capitalize text-slate-900">{subscription?.plan ?? 'free'}</p>
        <p className="mt-1 text-sm text-slate-700">Status: {subscription?.status ?? 'active'}</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6" aria-labelledby="create-business-heading">
        <h2 className="text-xl font-bold text-slate-950" id="create-business-heading">Create a business</h2>
        {canCreateBusiness ? (
          <ActionForm action={createBusiness} className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 font-semibold text-slate-800">Business name<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" name="name" required /></label>
            <label className="flex flex-col gap-1 font-semibold text-slate-800">Starting cash ({business.currency})<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue="0.00" inputMode="decimal" name="cashBalance" required /></label>
            <label className="flex flex-col gap-1 font-semibold text-slate-800">Cash start month<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" name="cashStartMonth" required type="date" /></label>
            <button className="min-h-11 w-fit rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800" type="submit">Create business</button>
          </ActionForm>
        ) : (
          <p className="mt-3 text-slate-700">
            You are using {businessCount} of {businessLimit} businesses on the {currentPlan} plan. <a className="font-semibold text-blue-900 underline" href="/pricing">Upgrade your plan</a> to create another business.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-red-200 bg-white p-6" aria-labelledby="delete-account-heading">
        <h2 className="text-xl font-bold text-red-900" id="delete-account-heading">Delete account and data</h2>
        <p className="mt-3 text-slate-700">This permanently deletes your account, subscription, businesses, and all planning data. This cannot be undone.</p>
        <details className="mt-4 rounded-md border border-red-200 p-4">
          <summary className="cursor-pointer font-semibold text-red-900">Start account deletion</summary>
          <ActionForm action={deleteAccount} className="mt-4 space-y-4">
            <label className="flex items-start gap-3 text-slate-800">
              <input className="mt-1 h-5 w-5" name="confirmation" required type="checkbox" value="delete" />
              <span>I understand that my BootPulse account and data will be permanently deleted.</span>
            </label>
            <button className="min-h-11 rounded-md bg-red-800 px-4 font-semibold text-white hover:bg-red-700" type="submit">Delete account and data</button>
          </ActionForm>
        </details>
      </section>
    </div>
  );
}
