import { type InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FeedbackAction, FeedbackEntry, FeedbackResult, ItemPage, RecItem, RecsClient } from './client'
import { feedbackQuery, recsListKey } from './queries'

/** True if `item` is, or is credited to, one of `mbids` (dismissing an artist hides its albums and songs). */
export function hiddenBy(item: RecItem, mbids: Set<string>): boolean {
  return mbids.has(item.mbid) || !!item.artist_credit?.some((a) => a.mbid && mbids.has(a.mbid))
}

/**
 * Likes and dismissals. The service applies a dismissal to every list at once
 * and rescores in the background after any change, so a dismissed item is
 * dropped from the cached lists right away instead of refetching them (which
 * would reshuffle the page while you're reading it).
 */
export function useRecFeedback(c: RecsClient) {
  const queryClient = useQueryClient()
  const { data: entries } = useQuery(feedbackQuery(c))
  const fbKey = feedbackQuery(c).queryKey

  const actionOf = (mbid: string): FeedbackAction | undefined => entries?.find((e) => e.mbid === mbid)?.action

  const send = async (item: RecItem, action: FeedbackAction | 'clear') => {
    const result = await c.post<FeedbackResult>('/feedback', { mbid: item.mbid, kind: item.kind, action })
    queryClient.setQueryData<FeedbackEntry[]>(fbKey, (old = []) => {
      const rest = old.filter((e) => e.mbid !== item.mbid && e.mbid !== result.mbid)
      if (action === 'clear') return rest
      return [{ mbid: result.mbid, kind: item.kind, action, created_at: new Date().toISOString() }, ...rest]
    })
    return result
  }

  const toggleLike = async (item: RecItem) => {
    const liked = actionOf(item.mbid) === 'like'
    try {
      await send(item, liked ? 'clear' : 'like')
      if (!liked) toast(`Liked “${item.name}”`, { description: 'Recommendations will lean towards it.' })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const dismiss = async (item: RecItem) => {
    try {
      await send(item, 'dismiss')
    } catch (e) {
      toast.error((e as Error).message)
      return
    }
    const hidden = new Set([item.mbid])
    queryClient.setQueriesData<InfiniteData<ItemPage>>({ queryKey: recsListKey(c) }, (data) =>
      data && {
        ...data,
        pages: data.pages.map((p) => {
          const items = p.items.filter((i) => !hiddenBy(i, hidden))
          return { ...p, items, total: p.total - (p.items.length - items.length) }
        }),
      },
    )
    toast(`Hid “${item.name}”`, {
      description: item.kind === 'artist' ? 'Its albums and songs are hidden too.' : undefined,
      action: {
        label: 'Undo',
        onClick: async () => {
          try {
            await send(item, 'clear')
            await queryClient.invalidateQueries({ queryKey: recsListKey(c) })
          } catch (e) {
            toast.error((e as Error).message)
          }
        },
      },
    })
  }

  return { actionOf, toggleLike, dismiss }
}
