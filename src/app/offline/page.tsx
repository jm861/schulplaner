'use client';

import Link from 'next/link';

import { SectionCard } from '@/components/ui/section-card';

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-2xl flex-col justify-center gap-6 px-4 text-center text-slate-900 dark:text-white">
      <SectionCard title="Offline">
        <div className="space-y-4 text-sm">
          <p>
            Du bist derzeit offline. Einige Funktionen wie Login, Synchronisation und PDF-Import stehen nur mit
            Internetverbindung zur Verfügung.
          </p>
          <p>Verbinde dich erneut mit dem Internet oder versuche es später noch einmal.</p>
          <div className="flex justify-center">
            <Link href="/" className="rounded-full bg-indigo-600 px-5 py-2 text-white shadow hover:bg-indigo-500">
              Erneut versuchen
            </Link>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}



