'use client';

import { Suspense } from 'react';
import Importer from './Importer';

// Force this page to be rendered dynamically. This is the crucial fix.
// This tells Next.js not to cache the page and to re-render it for every request,
// ensuring that the new URL parameters are always detected.
export const dynamic = 'force-dynamic';

export default function ImportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Importer />
    </Suspense>
  );
}
