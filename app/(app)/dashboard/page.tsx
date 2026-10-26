import { getActiveBusiness } from '../../../lib/access';
import { formatMoney } from '../../../lib/calc/types';
import CashFlowChart from '../../../components/CashFlowChart';
import DesktopOnly from '../../../components/DesktopOnly';
import KpiCard from '../../../components/KpiCard';
import WarningsPanel from '../../../components/WarningsPanel';
import { getOrCreateUser } from '../../../lib/auth';
import { loadForecast } from '../../../lib/forecast';

export default async function DashboardPage() {
  const user = await getOrCreateUser();
  const business = await getActiveBusiness(user.id);
  const forecast = await loadForecast(business.id);
  const { headlineNumbers, rows } = forecast;
  const currency = forecast.business.currency;

  const money = (cents: number) => formatMoney(cents, currency);
  const runwayValue =
    typeof headlineNumbers.runway === 'number'
      ? `${headlineNumbers.runway.toFixed(1)} months`
      : headlineNumbers.runway;
  const chartData = rows.map((row) => ({
    month: row.month.slice(0, 7),
    revenue: row.revenueCents,
    costs: row.costsCents,
    closingBalance: row.closingBalanceCents,
  }));

  return (
    <div>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">{forecast.scenario.name} scenario</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{forecast.business.name}</h1>
        <p className="mt-3 text-slate-700">Your current cash-flow and runway overview.</p>
      </header>

      <p className="mt-4 text-sm text-slate-700">
        BootPulse is a planning tool. It does not provide financial, accounting, tax or investment advice.
      </p>

      <section aria-label="Key performance indicators" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
          formula="Runway is the number of full projected months before the cash balance first falls below zero."
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
