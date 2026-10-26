import BusinessSwitcher from '../../components/BusinessSwitcher';
import NavLinks from '../../components/NavLinks';
import { signOut } from '../auth-actions';
import { getOrCreateUser } from '../../lib/auth';
import { getActiveBusiness, listUserBusinesses } from '../../lib/access';
import { getUserPlan, PLAN_LIMITS } from '../../lib/plans';

const navigation = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/revenue', label: 'Revenue' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/cash-flow', label: 'Cash flow' },
  { href: '/scenarios', label: 'Scenarios' },
  { href: '/milestones', label: 'Milestones' },
  { href: '/decisions', label: 'Decisions' },
  { href: '/settings', label: 'Settings' },
  { href: '/pricing', label: 'Demo plans' },
];

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getOrCreateUser();
  const userBusinesses = await listUserBusinesses(user.id);
  const activeBusiness = await getActiveBusiness(user.id);
  const plan = await getUserPlan(user.id);
  const businessLimit = PLAN_LIMITS[plan].businesses;
  const ownedCount = userBusinesses.filter((business) => business.role === 'owner').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-blue-900" href="#main">
        Skip to main content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-5">
          <a className="text-xl font-bold text-blue-900" href="/dashboard">
            BootPulse
          </a>
          <div className="flex w-full items-center gap-3 sm:w-auto sm:gap-4">
            <BusinessSwitcher businessLimit={businessLimit} businesses={userBusinesses} activeBusinessId={activeBusiness.id} ownedCount={ownedCount} />
            <form action={signOut}>
              <button
                className="min-h-11 whitespace-nowrap rounded-md border border-slate-300 px-4 font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Primary navigation" className="mx-auto max-w-7xl overflow-x-auto px-6 pb-3">
          <NavLinks items={navigation} />
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 focus:outline-none" id="main" tabIndex={-1}>{children}</main>

      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-sm text-slate-700">
        BootPulse is a planning tool. It does not provide financial, accounting, tax or investment advice.
      </footer>
    </div>
  );
}
