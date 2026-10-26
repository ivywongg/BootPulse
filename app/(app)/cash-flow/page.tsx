import { getActiveBusiness } from '../../../lib/access';
import CashFlowChart from '../../../components/CashFlowChart';
import DesktopOnly from '../../../components/DesktopOnly';
import { formatMoney } from '../../../lib/calc/types';
import { centsToMajor } from '../../../lib/format';
import { getOrCreateUser } from '../../../lib/auth';
import { loadForecast } from '../../../lib/forecast';

export const metadata = { title: 'Cash flow' };

export default async function CashFlowPage() {
  const user = await getOrCreateUser();
  const business = await getActiveBusiness(user.id);
  const forecast = await loadForecast(business.id);
  const currency = forecast.business.currency;
  const money = (cents: number) => formatMoney(cents, currency);
  const chartData = forecast.rows.map((row) => ({
    month: row.month.slice(0, 7),
    revenue: centsToMajor(row.revenueCents),
    costs: centsToMajor(row.costsCents),
    closingBalance: centsToMajor(row.closingBalanceCents),
  }));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">{forecast.scenario.name} scenario</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Cash flow</h1>
        <p className="mt-3 text-slate-700">Monthly revenue, costs, net cash flow, and closing balance.</p>
      </header>

      <p className="text-sm text-slate-700">
        BootPulse is a planning tool. It does not provide financial, accounting, tax or investment advice.
      </p>

      <section aria-labelledby="cash-flow-formulas">
        <h2 className="text-xl font-bold text-slate-950" id="cash-flow-formulas">Formulas</h2>
        <ul className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <li className="notice">Net cash flow = revenue − costs</li>
          <li className="notice">Closing balance = opening cash + cumulative net cash flow</li>
          <li className="notice">Runway = full months before the balance falls below zero</li>
        </ul>
      </section>

      <DesktopOnly>
        <div className="space-y-6">
          <div className="card card-sm">
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

          <div className="card overflow-x-auto p-0">
            <table className="data-table">
              <caption className="sr-only">{forecast.rows.length}-month cash-flow projection</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th className="num" scope="col">Revenue</th>
                  <th className="num" scope="col">Costs</th>
                  <th className="num" scope="col">Net</th>
                  <th className="num" scope="col">Closing balance</th>
                </tr>
              </thead>
              <tbody>
                {forecast.rows.map((row) => (
                  <tr key={row.month}>
                    <th className="font-medium text-slate-900" scope="row">{row.month}</th>
                    <td className="num text-slate-700">{money(row.revenueCents)}</td>
                    <td className="num text-slate-700">{money(row.costsCents)}</td>
                    <td className="num text-slate-700">{money(row.netCashFlowCents)}</td>
                    <td className="num font-semibold text-slate-900">
                      {money(row.closingBalanceCents)}
                      {row.closingBalanceCents < 0 ? <span className="ml-2 text-xs font-bold uppercase text-red-800">Negative</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DesktopOnly>

      <a
        className="btn btn-secondary"
        download
        href="/api/export?type=cash-flow"
      >
        Download CSV
      </a>
    </div>
  );
}
