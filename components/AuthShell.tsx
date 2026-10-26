import type { ReactNode } from 'react';
import Logo from './Logo';

type AuthShellProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Secondary links under the card. */
  footer?: ReactNode;
  /** "wide" suits text-heavy screens such as the privacy statement. */
  width?: 'narrow' | 'wide';
};

export default function AuthShell({ title, description, children, footer, width = 'narrow' }: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-10 sm:justify-center sm:py-14">
      <a aria-label="BootPulse home" className="mb-8 rounded-md" href="/">
        <Logo size={36} />
      </a>
      <div className={`card w-full p-6 sm:p-8 ${width === 'wide' ? 'max-w-2xl' : 'max-w-[26rem]'}`}>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
        {description ? <p className="mt-2 text-slate-700">{description}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? <div className="mt-6 text-center text-sm text-slate-700">{footer}</div> : null}
    </main>
  );
}
