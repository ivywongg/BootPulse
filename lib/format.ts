import type { RunwayDisplay } from './calc/types';

/** Runway is a whole number of fully funded months; text results pass through. */
export function formatRunway(runway: RunwayDisplay | string): string {
  if (typeof runway !== 'number') return runway;
  return `${runway} ${runway === 1 ? 'month' : 'months'}`;
}

export const centsToMajor = (cents: number) => cents / 100;
