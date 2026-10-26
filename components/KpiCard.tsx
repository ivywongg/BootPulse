'use client';

import { useId, useState, type ReactNode } from 'react';

type KpiCardProps = {
  label: string;
  value: ReactNode;
  formula: string;
};

// Each card sizes to its own content: the parent grid uses items-start, so opening one
// explanation never stretches the other cards.
export default function KpiCard({ label, value, formula }: KpiCardProps) {
  const [showFormula, setShowFormula] = useState(false);
  const formulaId = useId();

  return (
    <article className="card card-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      <button
        aria-controls={formulaId}
        aria-expanded={showFormula}
        className="btn btn-ghost btn-sm -ml-2.5 mt-3 justify-start text-left"
        onClick={() => setShowFormula((visible) => !visible)}
        type="button"
      >
        {showFormula ? 'Hide calculation' : 'How is this calculated?'}
      </button>
      {showFormula ? (
        <p className="notice notice-info mt-2 text-sm" id={formulaId}>
          {formula}
        </p>
      ) : null}
    </article>
  );
}
