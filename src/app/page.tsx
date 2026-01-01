// This is the root page.
// We are redirecting to the default locale.
// The default locale is defined in middleware.ts

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/en');
}
