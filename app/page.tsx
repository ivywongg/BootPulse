import Logo from '../components/Logo';
import { PLAN_DETAILS, PLAN_LIMITS } from '../lib/plans';

const steps = [
  { title: 'Enter what you have', text: 'Add your opening cash, recurring revenue and costs, and one-off items. No bank connection needed.' },
  { title: 'See your runway', text: 'One number: how many full months until cash first falls below zero, with the formula shown next to it.' },
  { title: 'Test a decision first', text: 'Compare base, cautious and growth cases side by side before you hire, buy software or change prices.' },
];

function featureList(plan: (typeof PLAN_DETAILS)[number]['name']) {
  const limits = PLAN_LIMITS[plan];
  return [
    `${limits.businesses} owned ${limits.businesses === 1 ? 'business' : 'businesses'}`,
    `${limits.forecastMonths}-month forecast`,
    limits.customScenarios ? 'Custom scenarios' : 'Editable Base, Cautious and Growth cases',
    limits.warnings.length === 1 ? 'Runway warning' : 'Runway, rising-cost and falling-revenue warnings',
  ];
}

// Fictional example balances for the hero preview (USD 10,000 cash, USD 2,000 net burn).
const previewBalances = [10000, 8000, 6000, 4000, 2000, 0];

function RunwayPreview() {
  const width = 320;
  const height = 120;
  const points = previewBalances.map((value, index) => {
    const x = 12 + (index * (width - 24)) / (previewBalances.length - 1);
    const y = 12 + ((10000 - value) / 10000) * (height - 28);
    return [x, y] as const;
  });
  const last = points[points.length - 1];
  return (
    <svg aria-hidden="true" className="mt-5 h-auto w-full" viewBox={`0 0 ${width} ${height}`}>
      <line stroke="#e2e8f0" strokeWidth="1" x1="12" x2={width - 12} y1={height - 16} y2={height - 16} />
      <polyline fill="none" points={points.map(([x, y]) => `${x},${y}`).join(' ')} stroke="#1e3a8a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      <circle cx={last[0]} cy={last[1]} fill="#2563eb" r="5" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <a aria-label="BootPulse home" className="rounded-md" href="/">
            <Logo size={32} />
          </a>
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
            <a className="btn btn-ghost hidden sm:inline-flex" href="#plans">Plans</a>
            <a className="btn btn-ghost" href="/login">Sign in</a>
            <a className="btn btn-primary btn-sm" href="/sign-up">Start free</a>
          </nav>
        </div>
      </header>

      <main>
        <section aria-labelledby="hero-heading" className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-20">
          <div>
            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl" id="hero-heading">
              Know how long your business can survive.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
              BootPulse turns your cash, revenue and costs into one clear runway number, and lets you test decisions before they affect your business.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a className="btn btn-primary btn-lg" href="/sign-up">Start free</a>
              <a className="btn btn-secondary btn-lg" href="#plans">Compare plans</a>
            </div>
            <p className="mt-5 text-sm text-slate-600">Assignment demo with fictional data. No payment is collected.</p>
          </div>

          <aside aria-label="Example runway summary" className="card mx-auto w-full max-w-md lg:max-w-none">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Example · fictional business</p>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-4">
              <div>
                <p className="text-sm text-slate-600">Cash</p>
                <p className="text-xl font-bold">$10,000</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Net burn</p>
                <p className="text-xl font-bold">$2,000</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Runway</p>
                <p className="whitespace-nowrap text-xl font-bold text-blue-800">5 months</p>
              </div>
            </div>
            <RunwayPreview />
            <p className="mt-2 text-sm text-slate-600">Closing balance by month. It reaches zero after month 5.</p>
          </aside>
        </section>

        <section aria-labelledby="how-heading" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" id="how-heading">From spreadsheet to a clear answer</h2>
            <ol className="mt-10 grid gap-10 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <p aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-900 text-sm font-bold text-white">{index + 1}</p>
                  <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 leading-7 text-slate-700">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="plans-heading" className="mx-auto max-w-6xl scroll-mt-4 px-6 py-16 lg:py-24" id="plans">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" id="plans-heading">Choose a starting point</h2>
          <p className="mt-3 max-w-2xl text-slate-700">Prices are fictional. Plans only change limits such as forecast length and the number of businesses; no payment is collected.</p>
          <div className="mt-10 grid items-stretch gap-6 md:grid-cols-3">
            {PLAN_DETAILS.map((plan) => (
              <article className="card flex flex-col" key={plan.name}>
                <h3 className="text-lg font-bold">{plan.label}</h3>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-blue-900">{plan.price.split('/')[0]}</span>
                  {plan.price.includes('/') ? <span className="text-slate-600">/month</span> : null}
                </p>
                <p className="text-sm text-slate-600">Fictional price</p>
                <p className="mt-4 text-slate-700">{plan.description}</p>
                <ul className="mt-6 space-y-2.5 border-t border-slate-200 pt-6 text-sm text-slate-800">
                  {featureList(plan.name).map((feature) => (
                    <li className="flex gap-2.5" key={feature}>
                      <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 16 16"><path d="m3 8.5 3.2 3.2L13 4.8" /></svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <a className="btn btn-secondary w-full" href="/sign-up">
                    {plan.name === 'free' ? 'Start free' : `Try ${plan.label} demo`}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <Logo size={24} />
          <p className="max-w-xl">BootPulse is a planning tool. It does not provide financial, accounting, tax or investment advice.</p>
        </div>
      </footer>
    </div>
  );
}
