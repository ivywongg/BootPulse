'use client';

import { ChangeEvent } from 'react';

export type SwitcherBusiness = {
  id: string;
  name: string;
  role?: 'owner' | 'collaborator';
};

type BusinessSwitcherProps = {
  businesses: readonly SwitcherBusiness[];
  activeBusinessId?: string;
  businessLimit: number;
  ownedCount: number;
};

export default function BusinessSwitcher({
  businesses,
  activeBusinessId,
  businessLimit,
  ownedCount,
}: BusinessSwitcherProps) {
  if (businesses.length === 0) {
    return null;
  }

  const selectedId = businesses.some((business) => business.id === activeBusinessId)
    ? activeBusinessId
    : businesses[0].id;

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    document.cookie = `bp_business=${encodeURIComponent(event.target.value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-52 sm:flex-none">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor="business-switcher">
        Business
      </label>
      <p className="text-xs text-slate-600">{ownedCount > businessLimit ? `${ownedCount} owned (plan allows ${businessLimit})` : `${ownedCount} of ${businessLimit} owned businesses`}</p>
      <select
        className="min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
        id="business-switcher"
        value={selectedId}
        onChange={handleChange}
      >
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.name}{business.role === 'collaborator' ? ' (shared with you)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
