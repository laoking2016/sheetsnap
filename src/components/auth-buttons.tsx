'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <Button disabled>Loading…</Button>;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{session.user.email}</span>
        <Button variant="outline" onClick={() => signOut()}>
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={() => signIn()}>
      Sign In
    </Button>
  );
}
