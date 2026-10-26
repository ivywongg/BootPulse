'use client';

import { useId, useState, type ReactNode } from 'react';

type KpiCardProps = {
  label: string;
  value: ReactNode;
  formula: string;
};

export default function KpiCard({ label, value, formula }: KpiCardProps) {
  const [showFormula, setShowFormula] = useState(false);
  const formulaId = useId();

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      <button
        aria-controls={formulaId}
        aria-expanded={showFormula}
        className="mt-5 min-h-11 text-left text-sm font-semibold text-blue-900 underline underline-offset-4 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
        onClick={() => setShowFormula((visible) => !visible)}
        type="button"
      >
        How is this calculated?
      </button>
      {showFormula ? (
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700" id={formulaId}>
          {formula}
        </p>
      ) : null}
    </article>
  );
}
