'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface GuestEmailDialogProps {
  /** Called when the user submits an email */
  onEmailSubmit: (email: string) => void;
  /** Called when the user skips (if allowed) */
  onSkip?: () => void;
}

export function GuestEmailDialog({ onEmailSubmit, onSkip }: GuestEmailDialogProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    onEmailSubmit(email);
    setSubmitted(true);
    toast.success('Check your email for the download link!');
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Thank you!</CardTitle>
          <CardDescription>Your CSV is ready. A download link has been sent to {email}.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Your CSV is Ready</CardTitle>
        <CardDescription>Enter your email to receive the download link. No spam, ever.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full">
            Send Download Link
          </Button>
        </form>
      </CardContent>
      {onSkip && (
        <CardFooter className="justify-center">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            No thanks, just show me the preview
          </button>
        </CardFooter>
      )}
    </Card>
  );
}
