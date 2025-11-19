type PageHeaderProps = {
  title: string;
  description: string;
  badge?: string;
};

export function PageHeader({ title, description, badge }: PageHeaderProps) {
  return (
    <div className="mb-10 flex flex-col gap-3">
      {badge ? (
        <span className="w-fit rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          {badge}
        </span>
      ) : null}
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-2xl text-base text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>
    </div>
  );
}

