import type { Metadata } from 'next';
import { SessionProvider } from '@/components/session-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sheetsnap — Quotation to CSV in Seconds',
  description:
    'Upload supplier quotation files (Excel, PDF) and get a clean, standardized CSV. Built for B2B procurement teams.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <SessionProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
