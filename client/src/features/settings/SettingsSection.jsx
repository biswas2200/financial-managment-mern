export function Section({ title, description, children }) {
  return (
    <section className="grid gap-4 border-b border-line py-8 first:pt-0 last:border-0 last:pb-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="font-wide text-[1.0625rem] font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
