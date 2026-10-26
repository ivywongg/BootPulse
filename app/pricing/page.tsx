import { redirect } from 'next/navigation';
import { setDemoPlan } from '../../lib/account-actions';
import { getAuthenticatedUser } from '../../lib/auth';
import { getUserPlan, isPlanName, PLAN_DETAILS, PLAN_LIMITS, type PlanName } from '../../lib/plans';
import ActionForm from '../../components/ActionForm';
import Logo from '../../components/Logo';

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
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <a aria-label="BootPulse home" className="inline-block rounded-md" href={user ? '/dashboard' : '/'}><Logo size={34} /></a>
          <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">Plans and limits</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-700">Prices are fictional. Choose a demo plan to see how forecast length, scenarios and warnings change.</p>
          <p className="notice notice-info mt-5 inline-block font-semibold">Assignment demo — no payment is collected</p>
        </header>

        {switched && isPlanName(switched) && switched === currentPlan ? (
          <p className="notice mx-auto mt-6 max-w-2xl text-center" role="status">
            Demo plan switched to {PLAN_DETAILS.find((plan) => plan.name === switched)?.label}. No purchase was made and your business data is unchanged.
          </p>
        ) : null}

        {pending && user ? (
          <section aria-labelledby="confirm-heading" className="card mx-auto mt-8 max-w-2xl border-blue-900">
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
              <button className="btn btn-primary" type="submit">Confirm demo plan</button>
              <a className="btn btn-secondary" href="/pricing">Cancel</a>
            </ActionForm>
          </section>
        ) : null}

        <section aria-label="Plans" className="mt-10 grid gap-6 md:grid-cols-3">
          {PLAN_DETAILS.map((plan) => {
            const isCurrent = currentPlan === plan.name;
            return (
              <article className={`card flex flex-col ${isCurrent ? 'border-blue-900 ring-2 ring-blue-100' : ''}`} key={plan.name}>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">{plan.label}</p>
                <p className="mt-3 text-3xl font-bold">{plan.price}</p>
                <p className="text-xs text-slate-600">Fictional price</p>
                <p className="mt-3 min-h-12 text-slate-700">{plan.description}</p>
                <ul className="mt-6 space-y-3 border-t border-slate-200 pt-6 text-sm text-slate-800">
                  {featureList(plan.name).map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <div className="mt-auto pt-8">
                  {isCurrent ? (
                    <p className="flex min-h-11 items-center justify-center rounded-md bg-slate-100 px-4 text-center font-semibold text-slate-800">Current demo plan</p>
                  ) : !user ? (
                    <a className="btn btn-secondary w-full" href="/sign-up">Create an account to try</a>
                  ) : (
                    <a
                      className={`btn w-full ${plan.name === 'free' ? 'btn-secondary' : 'btn-primary'}`}
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
