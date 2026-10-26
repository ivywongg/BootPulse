import type { MonthRow, RunwayResult } from './types';

export type WarningType = 'runway_risk' | 'rising_costs' | 'falling_revenue';
export type WarningSeverity = 'critical' | 'warning';

export interface Warning {
  type: WarningType;
  severity: WarningSeverity;
  message: string;
}

export function getRunwayWarning(runway: RunwayResult): Warning | null {
  const months = runway.projectionRunwayMonths;
  if (months === null || months >= 6) {
    return null;
  }

  return {
    type: 'runway_risk',
    severity: months < 3 ? 'critical' : 'warning',
    message:
      months < 3
        ? `Critical runway risk: projected cash falls below zero after ${months} full months.`
        : `Runway risk: projected runway is under 6 months (${months} full months).`,
  };
}

export function getRisingCostsWarning(projection: readonly MonthRow[]): Warning | null {
  if (projection.length < 4) {
    return null;
  }

  const monthOneCosts = projection[0].costsCents;
  const monthFourCosts = projection[3].costsCents;
  const isRising =
    monthOneCosts === 0 ? monthFourCosts > 0 : monthFourCosts * 100 >= monthOneCosts * 110;

  if (!isRising) {
    return null;
  }

  return {
    type: 'rising_costs',
    severity: 'warning',
    message: 'Projected costs in month 4 are at least 10% higher than month 1.',
  };
}

export function getFallingRevenueWarning(projection: readonly MonthRow[]): Warning | null {
  if (projection.length < 4) {
    return null;
  }

  const monthOneRevenue = projection[0].revenueCents;
  const monthFourRevenue = projection[3].revenueCents;
  const isFalling = monthOneRevenue > 0 && monthFourRevenue * 100 <= monthOneRevenue * 90;

  if (!isFalling) {
    return null;
  }

  return {
    type: 'falling_revenue',
    severity: 'warning',
    message: 'Projected revenue in month 4 is at least 10% lower than month 1.',
  };
}

export function getWarnings(
  projection: readonly MonthRow[],
  runway: RunwayResult,
): Warning[] {
  return [
    getRunwayWarning(runway),
    getRisingCostsWarning(projection),
    getFallingRevenueWarning(projection),
  ].filter((warning): warning is Warning => warning !== null);
}
