export default function HomePage() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      summary: 'A focused starting point for one business and a six-month forecast.',
    },
    {
      name: 'Founder',
      price: '$19/mo',
      summary: 'A 24-month forecast, editable scenarios, and the full warning set.',
    },
    {
      name: 'Adviser',
      price: '$49/mo',
      summary: 'Up to ten businesses for advisers, with the full forecast and warning set.',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a className="text-xl font-bold text-blue-900" href="/">
            BootPulse
          </a>
          <a className="font-semibold text-blue-900 underline-offset-4 hover:underline" href="/login">
            Sign in
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-20" aria-labelledby="hero-heading">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-900">Cash-flow clarity for founders</p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl" id="hero-heading">
            Know how long your business can survive.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-slate-700">
            BootPulse turns your cash flow into a clear runway number and helps you test decisions before they affect your business.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              className="inline-flex min-h-12 items-center rounded-md bg-blue-900 px-6 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
              href="/sign-up"
            >
              Start free
            </a>
            <a
              className="inline-flex min-h-12 items-center rounded-md border border-slate-300 bg-white px-6 font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
              href="/pricing"
            >
              Compare plans
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20" aria-labelledby="plans-heading">
        <div className="mb-7">
          <h2 className="text-2xl font-bold text-slate-950" id="plans-heading">Choose the right starting point</h2>
          <p className="mt-2 text-slate-700">Fictional prices for an assignment demo. Plans only change limits; no payment is collected.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <article className="rounded-lg border border-slate-200 bg-white p-6" key={plan.name}>
              <h3 className="text-xl font-semibold text-slate-950">{plan.name}</h3>
              <p className="mt-3 text-2xl font-bold text-blue-900">{plan.price}</p>
              <p className="mt-4 text-slate-700">{plan.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-sm text-slate-700">
        BootPulse is a planning tool. It does not provide financial, accounting, tax or investment advice.
      </footer>
    </main>
  );
}
