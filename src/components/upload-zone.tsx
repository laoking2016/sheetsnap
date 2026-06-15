'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { GuestEmailDialog } from '@/components/guest-email-dialog';
import { getGuestId } from '@/lib/guest-id';

interface UploadZoneProps {
  isLoggedIn: boolean;
}

export function UploadZone({ isLoggedIn }: UploadZoneProps) {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);

  const handleUploadClick = () => {
    // Stage 1 will implement actual file upload + parsing.
    // For now, simulate a successful parse to demonstrate the guest flow.
    if (!isLoggedIn) {
      // Generate guest ID on first interaction
      getGuestId();
      setShowEmailDialog(true);
    } else {
      // Logged-in users skip the email dialog
      toast('Parsing coming in Stage 1. Stay tuned!');
    }
  };

  const handleEmailSubmit = (email: string) => {
    setGuestEmail(email);
    // In Stage 1, this will trigger: save to parse_records + send CSV download
    console.log('Guest email collected:', email);
  };

  const handleSkip = () => {
    setShowEmailDialog(false);
  };

  if (showEmailDialog && !guestEmail) {
    return (
      <div className="flex flex-col items-center gap-4">
        <GuestEmailDialog onEmailSubmit={handleEmailSubmit} onSkip={handleSkip} />
      </div>
    );
  }

  if (guestEmail && !isLoggedIn) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-green-600">
          Download link sent to <strong>{guestEmail}</strong>
        </p>
        <Button variant="outline" onClick={() => { setShowEmailDialog(false); setGuestEmail(null); }}>
          Upload Another File
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Button size="lg" className="h-14 px-10 text-lg" onClick={handleUploadClick}>
        Upload Quotation File
      </Button>
      <p className="text-sm text-muted-foreground">
        Supports .xlsx, .xls, .csv, .pdf &mdash; up to 10 MB
      </p>
    </div>
  );
}
