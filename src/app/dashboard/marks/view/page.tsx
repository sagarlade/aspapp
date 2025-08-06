// src/app/dashboard/marks/view/page.tsx
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ViewMarksPage from './view-marks-page';

function LoadingFallback() {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
}

export default function ViewMarksPageContainer() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ViewMarksPage />
    </Suspense>
  );
}
