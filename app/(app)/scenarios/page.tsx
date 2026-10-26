import { asc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import DesktopOnly from '../../../components/DesktopOnly';
import ActionForm from '../../../components/ActionForm';
import ScenarioComparison, { type ScenarioComparisonScenario } from '../../../components/ScenarioComparison';
import { getActiveBusiness } from '../../../lib/access';
import { getOrCreateUser } from '../../../lib/auth';
import { loadForecast } from '../../../lib/forecast';
import { getBusinessPlan, PLAN_LIMITS } from '../../../lib/plans';
import { entityIdSchema } from '../../../lib/validation';
import { db } from '../../../db';
import { scenarios } from '../../../db/schema';
import { createCustomScenario, deleteCustomScenario, updateScenarioAssumptions } from './actions';

export const metadata = { title: 'Scenarios' };

const inputClass = 'input';
const labelClass = 'field';
const primaryButton = 'btn btn-primary';

function formText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : undefined;
}

function scenarioAssumptionsFromForm(formData: FormData) {
  return {
    revenueGrowthPct: formText(formData, 'revenueGrowthPct'),
    priceChangePct: formText(formData, 'priceChangePct'),
    revenueLossPct: formText(formData, 'revenueLossPct'),
    extraRecurringCost: formText(formData, 'extraRecurringCost'),
    extraOneOffCost: formText(formData, 'extraOneOffCost'),
    extraOneOffMonth: formText(formData, 'extraOneOffMonth')?.trim() || null,
  };
}

type Assumptions = {
  revenueGrowthPct: number;
  priceChangePct: number;
  revenueLossPct: number;
  extraRecurringCostCents: number;
  extraOneOffCostCents: number;
  extraOneOffMonth: string | null;
};

function AssumptionFields({ currency, values }: { currency: string; values?: Assumptions }) {
  return (
    <>
      <label className={labelClass}>Revenue growth % per month<input className={inputClass} defaultValue={values?.revenueGrowthPct ?? 0} name="revenueGrowthPct" step="0.01" type="number" /></label>
      <label className={labelClass}>Price change %<input className={inputClass} defaultValue={values?.priceChangePct ?? 0} name="priceChangePct" step="0.01" type="number" /></label>
      <label className={labelClass}>Customer / revenue loss %<input className={inputClass} defaultValue={values?.revenueLossPct ?? 0} max="100" min="0" name="revenueLossPct" step="0.01" type="number" /></label>
      <label className={labelClass}>Extra recurring cost per month ({currency})<input className={inputClass} defaultValue={((values?.extraRecurringCostCents ?? 0) / 100).toFixed(2)} min="0" name="extraRecurringCost" step="0.01" type="number" /></label>
      <label className={labelClass}>Extra one-off cost ({currency})<input className={inputClass} defaultValue={((values?.extraOneOffCostCents ?? 0) / 100).toFixed(2)} min="0" name="extraOneOffCost" step="0.01" type="number" /></label>
      <label className={labelClass}>One-off cost month<input className={inputClass} defaultValue={values?.extraOneOffMonth ?? ''} name="extraOneOffMonth" type="date" /></label>
    </>
  );
}

type ScenariosPageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function ScenariosPage({ searchParams }: ScenariosPageProps) {
  const user = await getOrCreateUser();
  const business = await getActiveBusiness(user.id);
  const limits = PLAN_LIMITS[await getBusinessPlan(business.id)];
  const isOwner = business.role === 'owner';
  const scenarioRows = await db.select().from(scenarios).where(eq(scenarios.businessId, business.id)).orderBy(asc(scenarios.createdAt));
  const usable = scenarioRows.filter((scenario) => scenario.kind !== 'custom' || limits.customScenarios);

  const requested = z.array(entityIdSchema).safeParse([(await searchParams)?.compare ?? []].flat());
  const chosen = requested.success ? usable.filter((scenario) => requested.data.includes(scenario.id)).slice(0, 3) : [];
  const compared = chosen.length > 0 ? chosen : usable.slice(0, 3);

  const comparisons = await Promise.all(compared.map((scenario) => loadForecast(business.id, scenario.id)));
  const comparisonScenarios: ScenarioComparisonScenario[] = comparisons.map((forecast) => ({
    id: forecast.scenario.id,
    name: forecast.scenario.name,
    runway: forecast.headlineNumbers.runway,
    closingBalanceCents: forecast.rows.at(-1)?.closingBalanceCents ?? business.cashBalanceCents,
    projection: forecast.rows.map((row) => ({ month: row.month, closingBalanceCents: row.closingBalanceCents })),
  }));

  async function updateScenario(formData: FormData) {
    'use server';
    await updateScenarioAssumptions(business.id, formText(formData, 'scenarioId'), scenarioAssumptionsFromForm(formData));
    redirect('/scenarios');
  }

  async function createScenario(formData: FormData) {
    'use server';
    await createCustomScenario(business.id, formText(formData, 'name'), scenarioAssumptionsFromForm(formData));
    redirect('/scenarios');
  }

  async function removeScenario(formData: FormData) {
    'use server';
    await deleteCustomScenario(business.id, formText(formData, 'scenarioId'));
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
          <h2 className="text-xl font-bold text-slate-950" id="scenario-formulas">How scenarios work</h2>
          <ul className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
            <li className="notice">Revenue in month m = base revenue × (1 + price change) × (1 − loss) × (1 + growth)<sup>m−1</sup>, rounded to the nearest cent.</li>
            <li className="notice">Costs = base costs + extra recurring cost, plus the extra one-off cost in its chosen month.</li>
            <li className="notice">Runway = full months before projected cash first falls below zero. The forecast is {limits.forecastMonths} months on this business&apos;s plan.</li>
          </ul>
        </section>

        <section aria-label="Scenario comparison">
          <form className="card card-sm flex flex-wrap items-center gap-4" method="get">
            <fieldset className="flex flex-wrap gap-4">
              <legend className="sr-only">Choose up to three scenarios</legend>
              {usable.map((scenario) => (
                <label className="flex items-center gap-2 text-slate-800" key={scenario.id}>
                  <input defaultChecked={compared.some((item) => item.id === scenario.id)} name="compare" type="checkbox" value={scenario.id} />
                  {scenario.name}
                </label>
              ))}
            </fieldset>
            <button className="btn btn-secondary" type="submit">Compare selected (max 3)</button>
          </form>
          <div className="mt-4">
            <ScenarioComparison currency={business.currency} scenarios={comparisonScenarios} />
          </div>
        </section>

        <section aria-labelledby="scenario-list-heading">
          <h2 className="text-2xl font-bold text-slate-950" id="scenario-list-heading">Your scenarios</h2>
          <div className="mt-4 space-y-5">
            {scenarioRows.map((scenario) => {
              const locked = scenario.kind === 'custom' && !limits.customScenarios;
              return (
                <article className="card" key={scenario.id}>
                  <h3 className="text-xl font-bold text-slate-950">{scenario.name}</h3>
                  <p className="mt-1 text-sm text-slate-700">{scenario.kind === 'custom' ? 'Custom scenario' : 'Preset scenario (editable)'}</p>
                  {locked ? (
                    <p className="mt-4 text-sm text-slate-700">Custom scenarios are locked on the owner&apos;s current plan. Your data is kept and returns when a Founder or Adviser demo plan is active.</p>
                  ) : (
                    <ActionForm action={updateScenario} className="mt-4 grid gap-4 md:grid-cols-3">
                      <input name="scenarioId" type="hidden" value={scenario.id} />
                      <AssumptionFields currency={business.currency} values={scenario} />
                      <div className="flex flex-wrap gap-3 md:col-span-3">
                        <button className={primaryButton} type="submit">Save {scenario.name} assumptions</button>
                      </div>
                    </ActionForm>
                  )}
                  {scenario.kind === 'custom' && !locked ? (
                    <ActionForm action={removeScenario} className="mt-3">
                      <input name="scenarioId" type="hidden" value={scenario.id} />
                      <button className="btn btn-danger-outline btn-sm" type="submit">Delete scenario</button>
                    </ActionForm>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="custom-scenario-heading">
          <h2 className="text-2xl font-bold text-slate-950" id="custom-scenario-heading">Create custom scenario</h2>
          {limits.customScenarios ? (
            <ActionForm className="card grid gap-4 md:grid-cols-3 mt-4" action={createScenario}>
              <label className={`${labelClass} md:col-span-3`}>Scenario name<input className={inputClass} maxLength={100} name="name" required /></label>
              <AssumptionFields currency={business.currency} />
              <div className="md:col-span-3"><button className={primaryButton} type="submit">Create scenario</button></div>
            </ActionForm>
          ) : (
            <p className="empty mt-3">
              Custom scenarios need a Founder or Adviser demo plan on the business owner&apos;s account.{' '}
              {isOwner ? <a className="font-semibold text-blue-900 underline" href="/pricing">See demo plans</a> : 'Ask the owner of this business.'}
            </p>
          )}
        </section>
      </div>
    </DesktopOnly>
  );
}
