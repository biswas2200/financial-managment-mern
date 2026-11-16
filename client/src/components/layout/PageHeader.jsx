export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
      <div className="min-w-0">
        <h1 className="font-wide text-[1.75rem] leading-tight font-semibold tracking-[-0.01em] sm:text-[2.125rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[0.9375rem] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full">{actions}</div>}
    </div>
  );
}
