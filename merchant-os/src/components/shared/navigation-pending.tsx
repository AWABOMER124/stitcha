'use client';

import { useLinkStatus } from 'next/link';

/** Fixed space keeps labels still while acknowledging a single navigation. */
export function NavigationPending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={`ms-auto h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent ${pending ? 'animate-spin opacity-70' : 'opacity-0'}`} />;
}
