import CashFlowChart, { type CashFlowChartDatum, type CashFlowChartLine } from './CashFlowChart';
import { formatMoney } from '../lib/calc/types';

export type ScenarioComparisonProjection = {
  month: string;
  closingBalanceCents: number;
};

export type ScenarioComparisonScenario = {
  id: string;
  name: string;
  runway: number | string;
  closingBalanceCents: number;
  projection: readonly ScenarioComparisonProjection[];
};

type ScenarioComparisonProps = {
  scenarios: readonly ScenarioComparisonScenario[];
  currency?: string;
};

export default function ScenarioComparison({
  scenarios,
  currency = 'USD',
}: ScenarioComparisonProps) {
  const selectedScenarios = scenarios.slice(0, 3);
  const chartData: CashFlowChartDatum[] = [];
  const chartLines: CashFlowChartLine[] = selectedScenarios.map((scenario, index) => ({
    dataKey: `scenario_${index}`,
    label: scenario.name,
    strokeDasharray: index === 0 ? undefined : index === 1 ? '8 4' : '2 4',
  }));

  const months = new Set(selectedScenarios.flatMap((scenario) => scenario.projection.map((row) => row.month)));
  for (const month of months) {
    const row: CashFlowChartDatum = { month };
    selectedScenarios.forEach((scenario, index) => {
      row[`scenario_${index}`] = scenario.projection.find((projection) => projection.month === month)?.closingBalanceCents ?? 0;
    });
    chartData.push(row);
  }
  chartData.sort((left, right) => String(left.month).localeCompare(String(right.month)));

  return (
    <section aria-labelledby="scenario-comparison-heading" className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-950" id="scenario-comparison-heading">Scenario comparison</h2>
        <p className="mt-1 text-slate-700">Compare runway and closing balance across up to three scenarios.</p>
      </div>

      {selectedScenarios.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-6 text-slate-700">Select a scenario to compare.</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {selectedScenarios.map((scenario) => (
              <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={scenario.id}>
                <h3 className="text-lg font-bold text-slate-950">{scenario.name}</h3>
                <dl className="mt-4 space-y-3">
                  <div>
                    <dt className="text-sm text-slate-600">Runway</dt>
                    <dd className="text-2xl font-bold text-slate-950">
                      {typeof scenario.runway === 'number' ? `${scenario.runway.toFixed(1)} months` : scenario.runway}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-slate-600">Closing balance</dt>
                    <dd className="text-lg font-semibold text-slate-900">{formatMoney(scenario.closingBalanceCents, currency)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <CashFlowChart data={chartData} lines={chartLines} />
          </div>
        </>
      )}
    </section>
  );
}
