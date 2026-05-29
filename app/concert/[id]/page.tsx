/**
 * Tujuan: Redirect legacy /concert/[id] → /c/[id]
 * Caller: Old bookmarks/links
 * Side Effects: HTTP redirect
 */
'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ConcertRedirect() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/c/${params.id}`);
  }, [params.id, router]);
  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Redirecting...</p>
    </div>
  );
}
