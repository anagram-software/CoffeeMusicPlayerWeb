import type { ReactNode } from 'react'
import { CoverArt } from '@/components/CoverArt'
import { Marquee } from '@/components/Marquee'
import { useSubsonic } from '@/stores/session'

interface DetailHeaderProps {
  coverArt?: string
  fallback?: 'music' | 'person'
  /** Small label above the title, e.g. "Album". */
  kind: string
  title: string
  subtitle?: ReactNode
  tags?: (string | undefined | false)[]
  children?: ReactNode
}

/**
 * Header for album/artist/genre pages, after the Android detail_app_bar:
 * art card, large light title, bold subtitle and white tag pills, over a
 * blurred copy of the art.
 */
export function DetailHeader({ coverArt, fallback, kind, title, subtitle, tags = [], children }: DetailHeaderProps) {
  const client = useSubsonic()
  const bg = client.coverArtUrl(coverArt, 300)

  return (
    <header className="relative isolate overflow-hidden">
      {bg && (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 scale-125 bg-cover bg-center opacity-40 blur-3xl"
          style={{ backgroundImage: `url("${bg}")` }}
        />
      )}
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-b from-transparent to-background" />

      <div className="flex flex-col items-center gap-6 px-4 pt-6 pb-8 sm:flex-row sm:items-end md:px-6">
        <CoverArt
          id={coverArt}
          size={500}
          fallback={fallback}
          className="size-44 shrink-0 rounded-lg shadow-2xl shadow-black/50 md:size-52"
        />
        <div className="flex w-full min-w-0 flex-col items-center gap-2 text-center sm:items-start sm:text-left">
          <span className="text-xs font-medium tracking-wider text-white/60 uppercase">{kind}</span>
          <Marquee as="h1" title={title} className="text-3xl font-light text-white md:text-5xl md:leading-tight">
            {title}
          </Marquee>
          {subtitle && <div className="font-bold text-white">{subtitle}</div>}
          {tags.some(Boolean) && (
            <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {tags.filter(Boolean).map((t) => (
                <span key={t as string} className="rounded-sm bg-white px-1.5 py-0.5 text-xs font-medium text-black uppercase">
                  {t}
                </span>
              ))}
            </div>
          )}
          {children}
        </div>
      </div>
    </header>
  )
}
