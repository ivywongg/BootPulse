import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BootPulse',
  description: 'Cash-flow and runway planning for founders',
  icons: { icon: 'data:,' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
