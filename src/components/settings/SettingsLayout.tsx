/** Uppercase accent-coloured category header, like the Android PreferenceCategory. */
export function SettingsGroup({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-6 scroll-mt-4">
      <h2 className="mb-1 text-xs font-medium tracking-wider text-section-ink uppercase">{title}</h2>
      <div className="divide-y divide-border">{children}</div>
    </section>
  )
}

export function Row({
  label,
  value,
  title,
  description,
  children,
}: {
  label: string
  value?: string
  title?: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3" title={title}>
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}
      </div>
      {children ?? <span className="truncate text-sm text-muted-foreground">{value}</span>}
    </div>
  )
}
