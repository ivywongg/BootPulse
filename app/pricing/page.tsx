import { redirect } from 'next/navigation';
import { setDemoPlan } from '../../lib/account-actions';
import { getAuthenticatedUser } from '../../lib/auth';
import { getUserPlan, isPlanName, PLAN_DETAILS, PLAN_LIMITS, type PlanName } from '../../lib/plans';
import ActionForm from '../../components/ActionForm';

export const metadata = { title: 'Demo plans' };

type PricingPageProps = { searchParams: Promise<{ confirm?: string; switched?: string }> };

function featureList(plan: PlanName) {
  const limits = PLAN_LIMITS[plan];
  return [
    `${limits.businesses} owned ${limits.businesses === 1 ? 'business' : 'businesses'}`,
    `${limits.forecastMonths}-month forecast`,
    limits.customScenarios ? 'Custom scenarios plus Base, Cautious and Growth' : 'Base, Cautious and Growth presets (editable)',
    limits.warnings.length === 1 ? 'Runway warning only' : 'Runway, rising-cost and falling-revenue warnings',
  ];
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const { confirm, switched } = await searchParams;
  const user = await getAuthenticatedUser();
  const currentPlan = user ? await getUserPlan(user.id) : null;
  const pending = isPlanName(confirm) && confirm !== currentPlan ? confirm : null;

  async function applyPlan(formData: FormData) {
    'use server';
    const plan = String(formData.get('plan') ?? '');
    await setDemoPlan(plan);
    redirect(`/pricing?switched=${plan}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <a className="text-xl font-bold text-blue-900" href={user ? '/dashboard' : '/'}>BootPulse</a>
          <h1 className="mt-6 text-4xl font-bold">Plans and limits</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-700">Prices are fictional. Choose a demo plan to see how forecast length, scenarios and warnings change.</p>
          <p className="mx-auto mt-4 inline-block rounded-md border border-blue-900 bg-white px-4 py-2 text-sm font-semibold text-blue-900">Assignment demo — no payment is collected</p>
        </header>

        {switched && isPlanName(switched) && switched === currentPlan ? (
          <p className="mx-auto mt-6 max-w-2xl rounded-md border border-slate-300 bg-white p-4 text-center text-slate-900" role="status">
            Demo plan switched to {PLAN_DETAILS.find((plan) => plan.name === switched)?.label}. No purchase was made and your business data is unchanged.
          </p>
        ) : null}

        {pending && user ? (
          <section aria-labelledby="confirm-heading" className="mx-auto mt-8 max-w-2xl rounded-lg border border-blue-900 bg-white p-6">
            <h2 className="text-xl font-bold" id="confirm-heading">
              Switch to the {PLAN_DETAILS.find((plan) => plan.name === pending)?.label} demo plan?
            </h2>
            <p className="mt-2 text-slate-700">This enables the following on your account. It is not a purchase: no payment details are requested and nothing is charged.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-800">
              {featureList(pending).map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            {PLAN_LIMITS[pending].forecastMonths < PLAN_LIMITS[currentPlan ?? 'free'].forecastMonths ? (
              <p className="mt-3 text-sm text-slate-700">Existing businesses and data are kept. Views are limited to the shorter forecast, and you cannot create businesses or custom scenarios beyond the new limits.</p>
            ) : null}
            <ActionForm action={applyPlan} className="mt-5 flex flex-wrap gap-3">
              <input name="plan" type="hidden" value={pending} />
              <button className="min-h-11 rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-60" type="submit">Confirm demo plan</button>
              <a className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 font-semibold text-slate-900 hover:bg-slate-100" href="/pricing">Cancel</a>
            </ActionForm>
          </section>
        ) : null}

        <section aria-label="Plans" className="mt-10 grid gap-6 md:grid-cols-3">
          {PLAN_DETAILS.map((plan) => {
            const isCurrent = currentPlan === plan.name;
            return (
              <article className={`flex flex-col rounded-xl border bg-white p-6 ${isCurrent ? 'border-blue-900 ring-2 ring-blue-100' : 'border-slate-200'}`} key={plan.name}>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">{plan.label}</p>
                <p className="mt-3 text-3xl font-bold">{plan.price}</p>
                <p className="text-xs text-slate-600">Fictional price</p>
                <p className="mt-3 min-h-12 text-slate-700">{plan.description}</p>
                <ul className="mt-6 space-y-3 border-t border-slate-200 pt-6 text-sm text-slate-800">
                  {featureList(plan.name).map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <div className="mt-auto pt-8">
                  {isCurrent ? (
                    <p className="rounded-md bg-slate-100 px-4 py-3 text-center font-semibold text-slate-800">Current demo plan</p>
                  ) : !user ? (
                    <a className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-blue-900 px-4 font-semibold text-blue-900 hover:bg-slate-100" href="/sign-up">Create an account to try</a>
                  ) : (
                    <a
                      className={`inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 font-semibold ${plan.name === 'free' ? 'border border-slate-300 text-slate-900 hover:bg-slate-100' : 'bg-blue-900 text-white hover:bg-blue-800'}`}
                      href={`/pricing?confirm=${plan.name}`}
                    >
                      {plan.name === 'free' ? 'Return to Free' : `Try ${plan.label} demo`}
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-700">
          Demo plans are stored on your account only so limits can be demonstrated. Collaborators always follow the business owner&apos;s plan.
        </p>
      </div>
    </main>
  );
}
