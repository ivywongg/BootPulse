import type { MonthRow, RunwayResult } from './types';

export interface GetRunwayInput {
  cash: number;
  projection: readonly MonthRow[];
}

export function netBurnCents(revenueCents: number, costsCents: number): number {
  return Math.max(0, costsCents - revenueCents);
}

export function simpleRunwayMonths(
  cashCents: number,
  revenueCents: number,
  costsCents: number,
): number | null {
  const burn = netBurnCents(revenueCents, costsCents);
  return burn === 0 ? null : cashCents / burn;
}

export function projectionRunwayMonths(projection: readonly MonthRow[]): number | null {
  const firstNegativeIndex = projection.findIndex((row) => row.closingBalanceCents < 0);
  return firstNegativeIndex === -1 ? null : firstNegativeIndex;
}

export function getRunway({ cash, projection }: GetRunwayInput): RunwayResult {
  const firstRow = projection[0];
  if (!firstRow) {
    throw new Error('At least one projection month is required to calculate runway.');
  }

  const burn = netBurnCents(firstRow.revenueCents, firstRow.costsCents);
  const simpleMonths = simpleRunwayMonths(cash, firstRow.revenueCents, firstRow.costsCents);
  const projectionMonths = projectionRunwayMonths(projection);
  const isCashFlowPositive = burn === 0;

  let display: RunwayResult['display'];
  if (projectionMonths !== null) {
    display = projectionMonths;
  } else if (isCashFlowPositive) {
    display = 'cash-flow positive';
  } else {
    display = `more than ${projection.length} months`;
  }

  return {
    netBurnCents: burn,
    simpleRunwayMonths: simpleMonths,
    projectionRunwayMonths: projectionMonths,
    display,
    isCashFlowPositive,
  };
}
