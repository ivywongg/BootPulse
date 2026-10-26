import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '../../lib/auth';
import { getUserPlan, PLAN_LIMITS, type PlanName } from '../../lib/plans';

const planDetails: ReadonlyArray<{
  name: PlanName;
  label: string;
  description: string;
  price: string;
}> = [
  { name: 'free', label: 'Free', description: 'A focused starting point for one business.', price: '$0' },
  { name: 'founder', label: 'Founder', description: 'More forecast depth and custom scenario planning.', price: '$19/mo' },
  { name: 'adviser', label: 'Adviser', description: 'Support up to ten businesses for advisory work.', price: '$49/mo' },
];

export default async function PricingPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/sign-up');
  const currentPlan = getUserPlan(user.id);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <a className="text-xl font-bold text-blue-900" href="/dashboard">BootPulse</a>
          <h1 className="mt-6 text-4xl font-bold">Choose the plan that fits your planning rhythm</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-700">Simple limits for cash-flow planning, runway forecasts, and scenario decisions.</p>
        </header>

        <section aria-label="Pricing plans" className="mt-10 grid gap-6 md:grid-cols-3">
          {planDetails.map((plan) => {
            const limits = PLAN_LIMITS[plan.name];
            const isCurrent = currentPlan === plan.name;
            return (
              <article className={`flex flex-col rounded-xl border bg-white p-6 shadow-sm ${isCurrent ? 'border-blue-800 ring-2 ring-blue-100' : 'border-slate-200'}`} key={plan.name}>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">{plan.label}</p>
                  <h2 className="mt-3 text-3xl font-bold">{plan.price}</h2>
                  <p className="mt-3 min-h-12 text-slate-700">{plan.description}</p>
                </div>
                <ul className="mt-6 space-y-3 border-t border-slate-200 pt-6 text-sm text-slate-800">
                  <li>{limits.businesses} {limits.businesses === 1 ? 'business' : 'businesses'}</li>
                  <li>{limits.forecastMonths}-month forecasts</li>
                  <li>{limits.customScenarios ? 'Custom scenarios included' : 'Preset scenarios only'}</li>
                  <li>{limits.warnings.length === 1 ? 'Runway warning' : 'All three planning warnings'}</li>
                </ul>
                <div className="mt-auto pt-8">
                  {isCurrent ? (
                    <p className="rounded-md bg-slate-100 px-4 py-3 text-center font-semibold text-slate-800">Current plan</p>
                  ) : plan.name === 'founder' ? (
                    <form action="/api/checkout" method="post"><button className="min-h-11 w-full rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800" type="submit">Upgrade to Founder</button></form>
                  ) : plan.name === 'adviser' ? (
                    <button className="min-h-11 w-full cursor-not-allowed rounded-md border border-slate-300 px-4 font-semibold text-slate-500" disabled type="button">Coming soon</button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-600">Demo mode: upgrading to Founder is simulated locally. No real payment, Stripe account, card, or webhook is used.</p>
      </div>
    </main>
  );
}
