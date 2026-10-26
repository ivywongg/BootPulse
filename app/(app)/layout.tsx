import BusinessSwitcher from '../../components/BusinessSwitcher';
import Logo from '../../components/Logo';
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <a aria-label="BootPulse dashboard" className="rounded-md" href="/dashboard">
            <Logo size={32} />
          </a>
          <div className="ml-auto flex items-end gap-3">
            <BusinessSwitcher businessLimit={businessLimit} businesses={userBusinesses} activeBusinessId={activeBusiness.id} ownedCount={ownedCount} />
            <form action={signOut}>
              <button className="btn btn-secondary" type="submit">Sign out</button>
            </form>
          </div>
          <nav aria-label="Primary navigation" className="-mx-1 w-full overflow-x-auto px-1 pb-0.5">
            <NavLinks items={navigation} />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 focus:outline-none sm:px-6 sm:py-10" id="main" tabIndex={-1}>{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo size={22} />
          <p className="max-w-xl">BootPulse is a planning tool. It does not provide financial, accounting, tax or investment advice.</p>
        </div>
      </footer>
    </div>
  );
}
