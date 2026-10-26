'use client';

import { usePathname } from 'next/navigation';

type NavLinksProps = {
  items: ReadonlyArray<{ href: string; label: string }>;
};

export default function NavLinks({ items }: NavLinksProps) {
  const pathname = usePathname();
  return (
    <ul className="flex min-w-max gap-1 text-sm font-semibold">
      {items.map((item) => {
        const current = pathname === item.href;
        return (
          <li key={item.href}>
            <a
              aria-current={current ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-md px-3 ${
                current ? 'bg-blue-900 text-white' : 'text-slate-800 hover:bg-slate-100'
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
