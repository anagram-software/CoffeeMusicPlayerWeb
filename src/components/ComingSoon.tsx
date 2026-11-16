import type { IconType } from 'react-icons'

export function ComingSoon({ icon: Icon, title, phase }: { icon: IconType; title: string; phase: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
      <Icon className="size-16 text-section opacity-80" />
      <p className="text-lg font-light text-foreground">{title}</p>
      <p className="text-sm">Coming in phase {phase}</p>
    </div>
  )
}
