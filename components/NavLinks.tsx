'use client';

import { usePathname } from 'next/navigation';

type NavLinksProps = {
  items: ReadonlyArray<{ href: string; label: string }>;
};

export default function NavLinks({ items }: NavLinksProps) {
  const pathname = usePathname();
  return (
    <ul className="flex min-w-max gap-1">
      {items.map((item) => {
        const current = pathname === item.href;
        return (
          <li key={item.href}>
            <a
              aria-current={current ? 'page' : undefined}
              className={`inline-flex min-h-10 items-center rounded-md px-3.5 text-sm font-semibold transition-colors ${
                current ? 'bg-blue-50 text-blue-900 ring-1 ring-inset ring-blue-200' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
              href={item.href}
            >
              {item.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
