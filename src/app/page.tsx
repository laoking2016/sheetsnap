import { auth } from '@/lib/auth';
import { AuthButtons } from '@/components/auth-buttons';
import { UploadZone } from '@/components/upload-zone';

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-xl font-bold tracking-tight">Sheetsnap</h1>
        <AuthButtons />
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="max-w-lg space-y-4">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Quotation to CSV
            <br />
            <span className="text-muted-foreground">in Seconds</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Upload supplier Excel or PDF quotation files and get a clean, standardized table.
            No more manual data entry.
          </p>
        </div>

        <UploadZone isLoggedIn={!!session?.user} />

        {session?.user && (
          <p className="text-sm text-green-600">
            Signed in as {session.user.email}
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Sheetsnap. Built for B2B procurement teams.
      </footer>
    </div>
  );
}
