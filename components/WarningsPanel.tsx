import type { Warning, WarningSeverity, WarningType } from '../lib/calc/warnings';

type WarningsPanelProps = {
  warnings: readonly Warning[];
  lockedWarningTypes?: readonly WarningType[];
  upgradeHref?: string;
};

const severityLabels: Record<WarningSeverity, string> = {
  critical: 'Critical',
  warning: 'Warning',
};

function WarningIcon({ severity }: { severity: WarningSeverity }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${
        severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      !
    </span>
  );
}

export default function WarningsPanel({
  warnings,
  lockedWarningTypes = [],
  upgradeHref = '/pricing',
}: WarningsPanelProps) {
  return (
    <section aria-labelledby="warnings-heading" className="card">
      <h2 className="text-xl font-bold text-slate-950" id="warnings-heading">Warnings</h2>
      {warnings.length === 0 ? (
        <p className="mt-4 text-slate-700">
          {lockedWarningTypes.length ? 'No available warnings for this projection.' : 'No warnings for this projection.'}
        </p>
      ) : (
        <ul aria-label="Planning warnings" className="mt-4 space-y-3">
          {warnings.map((warning) => (
            <li className="flex items-start gap-3 rounded-md border border-slate-200 p-4" key={`${warning.type}-${warning.message}`}>
              <WarningIcon severity={warning.severity} />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  {severityLabels[warning.severity]}: {warning.type.replace('_', ' ')}
                </p>
                <p className="mt-1 text-slate-900">{warning.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {lockedWarningTypes.length > 0 ? (
        <ul aria-label="Locked warnings" className="mt-4 space-y-3">
          {lockedWarningTypes.map((type) => (
            <li className="rounded-md border border-slate-200 bg-slate-50 p-4" key={type}>
              <p className="font-semibold capitalize text-slate-900">{type.replace('_', ' ')} warning</p>
              <a className="mt-2 inline-block font-semibold text-blue-900 underline underline-offset-4 hover:text-blue-700" href={upgradeHref}>
                Upgrade to unlock this warning
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
