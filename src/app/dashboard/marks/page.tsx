// src/app/dashboard/marks/page.tsx
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import MarksEntryForm from './marks-entry-form';

function LoadingFallback() {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
}

export default function MarkSharePageContainer() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MarksEntryForm />
    </Suspense>
  );
}
