import { useState } from 'react'
import { MdMusicNote, MdPerson } from 'react-icons/md'
import { cn } from '@/lib/utils'
import { useSubsonic } from '@/stores/session'

interface CoverArtProps {
  /** Subsonic coverArt id (album, song or artist). */
  id: string | undefined
  /** Requested image size in px; ask for ~2x the displayed size for sharp HiDPI art. */
  size: number
  alt?: string
  fallback?: 'music' | 'person'
  className?: string
}

/** Album/artist art on the #444 placeholder from the Android app. */
export function CoverArt({ id, size, alt = '', fallback = 'music', className }: CoverArtProps) {
  const client = useSubsonic()
  const src = client.coverArtUrl(id, size)
  const [failedSrc, setFailedSrc] = useState<string>()
  const Icon = fallback === 'person' ? MdPerson : MdMusicNote

  return (
    <div className={cn('relative overflow-hidden bg-art', className)}>
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailedSrc(src)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <Icon className="absolute inset-0 m-auto size-1/3 text-foreground/25" />
      )}
    </div>
  )
}
