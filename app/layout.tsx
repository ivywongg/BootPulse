import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'BootPulse', template: '%s · BootPulse' },
  description: 'Cash-flow and runway planning for founders',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
