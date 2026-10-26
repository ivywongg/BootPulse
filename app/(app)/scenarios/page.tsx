import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import DesktopOnly from '../../../components/DesktopOnly';
import ActionForm from '../../../components/ActionForm';
import ScenarioComparison, { type ScenarioComparisonScenario } from '../../../components/ScenarioComparison';
import { getActiveBusiness } from '../../../lib/access';
import { getOrCreateUser } from '../../../lib/auth';
import { formatMoney } from '../../../lib/calc/types';
import { loadForecast } from '../../../lib/forecast';
import { db } from '../../../db';
import { scenarios } from '../../../db/schema';
import { createCustomScenario, updatePresetAssumptions } from './actions';

function formText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : undefined;
}

function formMonth(formData: FormData) {
  const value = formText(formData, 'extraOneOffMonth')?.trim();
  return value || null;
}

function scenarioAssumptionsFromForm(formData: FormData) {
  return {
    revenueGrowthPct: formText(formData, 'revenueGrowthPct'),
    priceChangePct: formText(formData, 'priceChangePct'),
    revenueLossPct: formText(formData, 'revenueLossPct'),
    extraRecurringCost: formText(formData, 'extraRecurringCost'),
    extraOneOffCost: formText(formData, 'extraOneOffCost'),
    extraOneOffMonth: formMonth(formData),
  };
}

export default async function ScenariosPage() {
  const user = await getOrCreateUser();
  const business = await getActiveBusiness(user.id);
  const scenarioRows = db
    .select()
    .from(scenarios)
    .where(eq(scenarios.businessId, business.id))
    .all();
  const comparisons = await Promise.all(scenarioRows.slice(0, 3).map((scenario) => loadForecast(business.id, scenario.id)));
  const comparisonScenarios: ScenarioComparisonScenario[] = comparisons.map((forecast) => ({
    id: forecast.scenario.id,
    name: forecast.scenario.name,
    runway: forecast.headlineNumbers.runway,
    closingBalanceCents: forecast.rows.at(-1)?.closingBalanceCents ?? business.cashBalanceCents,
    projection: forecast.rows.map((row) => ({ month: row.month, closingBalanceCents: row.closingBalanceCents })),
  }));

  async function updateScenario(formData: FormData) {
    'use server';
    await updatePresetAssumptions(
      business.id,
      formText(formData, 'scenarioId'),
      scenarioAssumptionsFromForm(formData),
    );
    redirect('/scenarios');
  }

  async function createScenario(formData: FormData) {
    'use server';
    await createCustomScenario(
      business.id,
      formText(formData, 'name'),
      scenarioAssumptionsFromForm(formData),
    );
    redirect('/scenarios');
  }

  return (
    <DesktopOnly>
      <div className="space-y-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">{business.name}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Scenarios</h1>
          <p className="mt-3 text-slate-700">Adjust assumptions to see how they change runway and closing balance.</p>
        </header>

        <p className="text-sm text-slate-700">
          BootPulse is a planning tool. It does not provide financial, accounting, tax or investment advice.
        </p>

        <section aria-labelledby="scenario-formulas">
          <h2 className="text-xl font-bold text-slate-950" id="scenario-formulas">Formulas</h2>
          <ul className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
            <li className="rounded-md bg-white p-4">Revenue = base revenue × (1 + growth) × (1 − revenue loss)</li>
            <li className="rounded-md bg-white p-4">Costs = base costs + extra recurring cost</li>
            <li className="rounded-md bg-white p-4">Runway = full months before projected cash becomes negative</li>
          </ul>
        </section>

        <section aria-labelledby="scenario-list-heading">
          <h2 className="text-2xl font-bold text-slate-950" id="scenario-list-heading">Your scenarios</h2>
          <div className="mt-4 space-y-5">
            {scenarioRows.map((scenario) => (
              <ActionForm className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-3" action={updateScenario} key={scenario.id}>
                <input name="scenarioId" type="hidden" value={scenario.id} />
                <div className="md:col-span-3">
                  <h3 className="text-xl font-bold text-slate-950">{scenario.name}</h3>
                  <p className="mt-1 text-sm text-slate-700">{scenario.kind === 'custom' ? 'Custom scenario' : 'Preset scenario'}</p>
                </div>
                {scenario.kind === 'custom' ? (
                  <p className="md:col-span-3 text-sm text-slate-700">Custom scenarios are created with the form below.</p>
                ) : (
                  <>
                    <label className="flex flex-col gap-1 font-semibold text-slate-800">Revenue growth %<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={scenario.revenueGrowthPct} name="revenueGrowthPct" step="0.01" type="number" /></label>
                    <label className="flex flex-col gap-1 font-semibold text-slate-800">Price change %<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={scenario.priceChangePct} name="priceChangePct" step="0.01" type="number" /></label>
                    <label className="flex flex-col gap-1 font-semibold text-slate-800">Revenue loss %<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={scenario.revenueLossPct} name="revenueLossPct" step="0.01" type="number" /></label>
                    <label className="flex flex-col gap-1 font-semibold text-slate-800">Extra recurring cost ({business.currency})<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={(scenario.extraRecurringCostCents / 100).toFixed(2)} min="0" name="extraRecurringCost" step="0.01" type="number" /></label>
                    <label className="flex flex-col gap-1 font-semibold text-slate-800">Extra one-off cost ({business.currency})<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={(scenario.extraOneOffCostCents / 100).toFixed(2)} min="0" name="extraOneOffCost" step="0.01" type="number" /></label>
                    <label className="flex flex-col gap-1 font-semibold text-slate-800">One-off cost month<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={scenario.extraOneOffMonth ?? ''} name="extraOneOffMonth" type="date" /></label>
                    <div className="md:col-span-3"><button className="min-h-11 rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800" type="submit">Save assumptions</button></div>
                  </>
                )}
              </ActionForm>
            ))}
          </div>
        </section>

        <section aria-labelledby="custom-scenario-heading">
          <h2 className="text-2xl font-bold text-slate-950" id="custom-scenario-heading">Create custom scenario</h2>
          <ActionForm className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-3" action={createScenario}>
            <label className="flex flex-col gap-1 font-semibold text-slate-800 md:col-span-3">Scenario name<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" name="name" required /></label>
            <label className="flex flex-col gap-1 font-semibold text-slate-800">Revenue growth %<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue="0" name="revenueGrowthPct" step="0.01" type="number" /></label>
            <label className="flex flex-col gap-1 font-semibold text-slate-800">Price change %<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue="0" name="priceChangePct" step="0.01" type="number" /></label>
            <label className="flex flex-col gap-1 font-semibold text-slate-800">Revenue loss %<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue="0" name="revenueLossPct" step="0.01" type="number" /></label>
            <label className="flex flex-col gap-1 font-semibold text-slate-800">Extra recurring cost ({business.currency})<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue="0.00" min="0" name="extraRecurringCost" step="0.01" type="number" /></label>
            <label className="flex flex-col gap-1 font-semibold text-slate-800">Extra one-off cost ({business.currency})<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue="0.00" min="0" name="extraOneOffCost" step="0.01" type="number" /></label>
            <label className="flex flex-col gap-1 font-semibold text-slate-800">One-off cost month<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" name="extraOneOffMonth" type="date" /></label>
            <div className="md:col-span-3"><button className="min-h-11 rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800" type="submit">Create scenario</button></div>
          </ActionForm>
        </section>

        <ScenarioComparison currency={business.currency} scenarios={comparisonScenarios} />
      </div>
    </DesktopOnly>
  );
}
