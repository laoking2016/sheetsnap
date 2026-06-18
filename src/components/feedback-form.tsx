'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function FeedbackForm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, email: email || undefined, pageUrl: window.location.href }),
      });
      toast.success('Thank you for your feedback!');
      setOpen(false);
      setMessage('');
      setEmail('');
    } catch {
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground underline hover:text-foreground"
      >
        Feedback
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-lg">Feedback</CardTitle>
            <CardDescription>Help us improve Sheetsnap.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fb-message">Message</Label>
              <textarea
                id="fb-message"
                className="w-full rounded-md border bg-background p-2 text-sm"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What worked well? What could be better?"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fb-email">Email (optional)</Label>
              <Input
                id="fb-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending || !message.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
