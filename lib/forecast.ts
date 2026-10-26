import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '../db';
import { expenseItems, businesses, revenueItems, scenarios } from '../db/schema';
import { requireBusinessAccess } from './access';
import { getOrCreateUser } from './auth';
import { projectMonths } from './calc/projection';
import { getRunway } from './calc/runway';
import { getWarnings } from './calc/warnings';
import type { CashFlowItem, MonthRow, RunwayResult, ScenarioAssumptions } from './calc/types';
import type { Warning, WarningType } from './calc/warnings';
import { getBusinessPlan, PLAN_LIMITS } from './plans';

export interface ForecastResult {
  business: typeof businesses.$inferSelect;
  scenario: typeof scenarios.$inferSelect;
  rows: MonthRow[];
  monthRows: MonthRow[];
  headlineNumbers: {
    currentCashCents: number;
    monthlyRevenueCents: number;
    monthlyCostsCents: number;
    netBurnCents: number;
    runway: RunwayResult['display'];
  }
  runway: RunwayResult;
  warnings: Warning[];
  lockedWarningTypes: WarningType[];
}

export async function loadForecast(
  businessId: string,
  scenarioId?: string,
): Promise<ForecastResult> {
  const user = await getOrCreateUser();
  await requireBusinessAccess(user.id, businessId);
  const planLimits = PLAN_LIMITS[await getBusinessPlan(businessId)];

  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business) {
    notFound();
  }

  const [scenario] = await db
    .select()
    .from(scenarios)
    .where(
      scenarioId
        ? and(eq(scenarios.id, scenarioId), eq(scenarios.businessId, businessId))
        : and(eq(scenarios.businessId, businessId), eq(scenarios.kind, 'base')),
    )
    .limit(1);

  if (!scenario) {
    notFound();
  }
  if (scenario.kind === 'custom' && !planLimits.customScenarios) {
    throw new Error('Custom scenarios need a Founder or Adviser plan.');
  }

  const [revenueRows, expenseRows] = await Promise.all([
    db.select().from(revenueItems).where(eq(revenueItems.businessId, businessId)),
    db.select().from(expenseItems).where(eq(expenseItems.businessId, businessId)),
  ]);

  const items = {
    revenue: revenueRows as CashFlowItem[],
    expenses: expenseRows as CashFlowItem[],
  };
  const assumptions: ScenarioAssumptions = {
    revenueGrowthPct: scenario.revenueGrowthPct,
    priceChangePct: scenario.priceChangePct,
    revenueLossPct: scenario.revenueLossPct,
    extraRecurringCostCents: scenario.extraRecurringCostCents,
    extraOneOffCostCents: scenario.extraOneOffCostCents,
    extraOneOffMonth: scenario.extraOneOffMonth,
  };

  const rows = projectMonths({
    cash: business.cashBalanceCents,
    items,
    assumptions,
    months: planLimits.forecastMonths,
    startMonth: business.cashStartMonth,
  });
  const runway = getRunway({ cash: business.cashBalanceCents, projection: rows });
  const allWarnings = getWarnings(rows, runway);
  const warnings = allWarnings.filter((warning) => planLimits.warnings.includes(warning.type));
  const lockedWarningTypes = allWarnings
    .filter((warning) => !planLimits.warnings.includes(warning.type))
    .map((warning) => warning.type);
  const firstRow = rows[0];

  return {
    business,
    scenario,
    rows,
    monthRows: rows,
    headlineNumbers: {
      currentCashCents: business.cashBalanceCents,
      monthlyRevenueCents: firstRow.revenueCents,
      monthlyCostsCents: firstRow.costsCents,
      netBurnCents: runway.netBurnCents,
      runway: runway.display,
    },
    runway,
    warnings,
    lockedWarningTypes,
  };
}
