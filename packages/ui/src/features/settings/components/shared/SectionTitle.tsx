export function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs text-[var(--text-3)]">{description}</p>
      )}
    </div>
  );
}
