import { ReactNode } from 'react';

type SectionCardProps = {
  title: string | ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, action, children, className = '' }: SectionCardProps) {
  return (
    <section
      className={`rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900 min-w-0 sm:p-6 md:p-8 ${className}`}
    >
      <header className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900 dark:text-white min-w-0">{title}</h3>
        {action}
      </header>
      <div className="space-y-4 sm:space-y-5 text-sm text-gray-700 dark:text-gray-300 min-w-0">{children}</div>
    </section>
  );
}

