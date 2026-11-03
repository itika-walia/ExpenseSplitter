import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { AuthProvider } from '@/hooks/useAuth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Expense Splitter',
  description: 'Log shared costs and see who owes whom, settled to the rupee.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
