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
      className={`rounded-[32px] border border-slate-200/80 bg-white/90 p-8 shadow-[0_20px_45px_-25px_rgba(15,23,42,0.45)] backdrop-blur-md transition hover:border-slate-200 hover:shadow-[0_25px_55px_-20px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-900/80 ${className}`}
    >
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h3>
        {action}
      </header>
      <div className="space-y-5 text-sm text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  );
}

