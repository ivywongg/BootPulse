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
        Open on desktop for full view
      </p>
    </>
  );
}
