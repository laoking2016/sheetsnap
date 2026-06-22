import Link from 'next/link';
import { auth } from '@/lib/auth';
import { AuthButtons } from '@/components/auth-buttons';
import { FeedbackForm } from '@/components/feedback-form';
import { UploadZone } from '@/components/upload-zone';

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Sheetsnap
        </Link>
        <nav className="flex items-center gap-4">
          <AuthButtons />
        </nav>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center gap-12 px-4 py-16 text-center sm:py-24">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            Turn supplier quotes into
            <br />
            <span className="text-primary">clean CSV in seconds</span>
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Stop manually typing data from Excel and PDF quotation files.
            Sheetsnap extracts the numbers you need into a ready-to-use spreadsheet.
          </p>
        </div>

        {/* Upload area */}
        <div className="w-full max-w-6xl">
          <UploadZone isLoggedIn={!!session?.user} />
        </div>

        {session?.user && (
          <p className="text-sm text-green-600">
            Signed in as {session.user.email}
          </p>
        )}

        {/* How it works */}
        <div className="grid w-full max-w-3xl gap-8 sm:grid-cols-3">
          <div className="space-y-2 rounded-lg border p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              1
            </div>
            <h3 className="font-semibold">Upload</h3>
            <p className="text-sm text-muted-foreground">
              Drop your supplier&apos;s Excel, CSV, or PDF quotation file.
            </p>
          </div>
          <div className="space-y-2 rounded-lg border p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              2
            </div>
            <h3 className="font-semibold">Parse</h3>
            <p className="text-sm text-muted-foreground">
              Our AI extracts product names, specs, prices, and MOQs automatically.
            </p>
          </div>
          <div className="space-y-2 rounded-lg border p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              3
            </div>
            <h3 className="font-semibold">Download</h3>
            <p className="text-sm text-muted-foreground">
              Get a clean CSV file, ready to paste into your ERP or spreadsheet.
            </p>
          </div>
        </div>

        {/* Formats */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Supports <strong>.xlsx</strong>, <strong>.xls</strong>,{' '}
            <strong>.csv</strong>, and <strong>.pdf</strong> &mdash; free, no
            signup required.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        <p className="mb-2">
          &copy; {new Date().getFullYear()} Sheetsnap. Built for B2B procurement
          teams.
        </p>
        <p>
          Your data is processed in memory and never stored.{' '}
          <FeedbackForm />{' '}
          &middot;{' '}
          <a href="mailto:hello@sheetsnap.dev" className="underline hover:text-foreground">
            Contact
          </a>
        </p>
      </footer>
    </div>
  );
}
