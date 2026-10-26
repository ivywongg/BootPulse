import { getActiveBusiness } from '../../../lib/access';
import { formatMoney } from '../../../lib/calc/types';
import { centsToMajor, formatRunway } from '../../../lib/format';
import CashFlowChart from '../../../components/CashFlowChart';
import DesktopOnly from '../../../components/DesktopOnly';
import KpiCard from '../../../components/KpiCard';
import WarningsPanel from '../../../components/WarningsPanel';
import { getOrCreateUser } from '../../../lib/auth';
import { loadForecast } from '../../../lib/forecast';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await getOrCreateUser();
  const business = await getActiveBusiness(user.id);
  const forecast = await loadForecast(business.id);
  const { headlineNumbers, rows } = forecast;
  const currency = forecast.business.currency;

  const money = (cents: number) => formatMoney(cents, currency);
  const runwayValue = formatRunway(headlineNumbers.runway);
  const chartData = rows.map((row) => ({
    month: row.month.slice(0, 7),
    revenue: centsToMajor(row.revenueCents),
    costs: centsToMajor(row.costsCents),
    closingBalance: centsToMajor(row.closingBalanceCents),
  }));

  return (
    <div>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">{forecast.scenario.name} scenario</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{forecast.business.name}</h1>
        <p className="mt-3 text-slate-700">Your current cash-flow and runway overview.</p>
      </header>

      {forecast.business.isDemo ? (
        <p className="mt-4 rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800">
          Fictional demo data: every figure here is invented and fully editable. Replace it with your own numbers on the Revenue, Expenses and Settings pages.
        </p>
      ) : null}

      {headlineNumbers.monthlyRevenueCents === 0 && headlineNumbers.monthlyCostsCents === 0 ? (
        <p className="mt-4 rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800">
          No revenue or expenses are active in month 1 yet, so runway is not meaningful. Add items on the{' '}
          <a className="font-semibold text-blue-900 underline" href="/revenue">Revenue</a> and{' '}
          <a className="font-semibold text-blue-900 underline" href="/expenses">Expenses</a> pages.
        </p>
      ) : null}

      <p className="mt-4 text-sm text-slate-700">
        BootPulse is a planning tool. It does not provide financial, accounting, tax or investment advice.
      </p>

      <section aria-label="Key performance indicators" className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-5 [&>*:last-child]:col-span-2 xl:[&>*:last-child]:col-span-1">
        <KpiCard
          formula="Current cash is the opening cash balance entered for this business."
          label="Current cash"
          value={money(headlineNumbers.currentCashCents)}
        />
        <KpiCard
          formula="Monthly revenue is the total of active revenue items in month 1."
          label="Monthly revenue"
          value={money(headlineNumbers.monthlyRevenueCents)}
        />
        <KpiCard
          formula="Monthly costs are the total of active expense items in month 1."
          label="Monthly costs"
          value={money(headlineNumbers.monthlyCostsCents)}
        />
        <KpiCard
          formula="Net burn is max(0, monthly costs − monthly revenue)."
          label="Net burn"
          value={money(headlineNumbers.netBurnCents)}
        />
        <KpiCard
          formula="Runway is the number of full projected months before the closing balance first falls below zero. A balance of exactly zero still counts as funded."
          label="Runway"
          value={runwayValue}
        />
      </section>

      <section className="mt-8" aria-label="Warnings">
        <WarningsPanel lockedWarningTypes={forecast.lockedWarningTypes} warnings={forecast.warnings} />
      </section>

      <section className="mt-8" aria-labelledby="projection-heading">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-slate-950" id="projection-heading">{forecast.rows.length}-month projection</h2>
          <p className="mt-1 text-slate-700">Revenue, costs, and closing balance for the active scenario.</p>
        </div>
        <DesktopOnly>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <CashFlowChart
              currency={currency}
              data={chartData}
              lines={[
                { dataKey: 'revenue', label: 'Revenue' },
                { dataKey: 'costs', label: 'Costs' },
                { dataKey: 'closingBalance', label: 'Closing balance' },
              ]}
            />
          </div>
        </DesktopOnly>
      </section>
    </div>
  );
}
