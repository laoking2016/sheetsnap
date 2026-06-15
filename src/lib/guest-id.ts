'use client';

/**
 * Guest ID management for anonymous usage tracking.
 * Stores a UUID in localStorage so repeat visits are identified.
 */

const GUEST_ID_KEY = 'sheetsnap_guest_id';

export function getGuestId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function clearGuestId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_ID_KEY);
}
