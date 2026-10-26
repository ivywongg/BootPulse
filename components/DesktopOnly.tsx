import type { ReactNode } from 'react';

type DesktopOnlyProps = {
  children: ReactNode;
};

export default function DesktopOnly({ children }: DesktopOnlyProps) {
  return (
    <>
      <div className="hidden min-[1024px]:block">{children}</div>
      <p
        className="block rounded-md border border-slate-300 bg-slate-50 p-4 text-center text-slate-700 min-[1024px]:hidden"
        role="status"
      >
        <strong className="block text-slate-950">Open on desktop for full view</strong>
        This planning view uses wide tables, forms and charts that need a screen at least 1024px wide. Your headline figures and warnings are on the{' '}
        <a className="font-semibold text-blue-900 underline" href="/dashboard">Dashboard</a>.
      </p>
    </>
  );
}
