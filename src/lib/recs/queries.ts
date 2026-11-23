import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { FeedbackEntry, ItemPage, RecItem, RecsClient, RecsStatus } from './client'

/*
 * TanStack Query option factories for Coffee Recs. Every key starts with
 * ['recs', client.cacheKey] so a new address or key never shows stale data,
 * and every list key with ['recs', cacheKey, 'list'] so feedback can update
 * them all at once (see feedback.ts).
 */

const PAGE_SIZE = 60

/** Lists only change after a nightly run or feedback; no need to refetch on every visit. */
const LIST_STALE_TIME = 30 * 60 * 1000

export type AlbumSource = 'related' | 'library'
export type ReleaseScope = 'library' | 'related'

export const recsListKey = (c: RecsClient) => ['recs', c.cacheKey, 'list'] as const

function pagedList(c: RecsClient, name: string, path: string, params: Record<string, string | boolean | undefined> = {}) {
  return infiniteQueryOptions({
    queryKey: [...recsListKey(c), name, params],
    queryFn: ({ pageParam, signal }) => c.get<ItemPage>(path, { ...params, limit: PAGE_SIZE, offset: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0)
      return last.items.length > 0 && loaded < last.total ? loaded : undefined
    },
    select: (data): { items: RecItem[]; total: number } => ({
      items: dedupe(data.pages.flatMap((p) => p.items)),
      total: data.pages.at(-1)?.total ?? 0,
    }),
    staleTime: LIST_STALE_TIME,
  })
}

/** A rescore between page loads can shift an item onto the next page too. */
function dedupe(items: RecItem[]): RecItem[] {
  const seen = new Set<string>()
  return items.filter((i) => !seen.has(i.mbid) && seen.add(i.mbid))
}

export const recArtistsQuery = (c: RecsClient) => pagedList(c, 'artists', '/recommendations/artists')

export const recAlbumsQuery = (c: RecsClient, source: AlbumSource) => pagedList(c, 'albums', '/recommendations/albums', { source })

export const recSongsQuery = (c: RecsClient) => pagedList(c, 'songs', '/recommendations/songs')

export const newReleasesQuery = (c: RecsClient, scope: ReleaseScope) => pagedList(c, 'releases', '/releases/new', { scope })

/** Likes and dismissals, newest first. */
export const feedbackQuery = (c: RecsClient) =>
  queryOptions({
    queryKey: ['recs', c.cacheKey, 'feedback'],
    queryFn: ({ signal }) => c.get<FeedbackEntry[]>('/feedback', {}, signal),
    staleTime: LIST_STALE_TIME,
  })

export const recsStatusQuery = (c: RecsClient) =>
  queryOptions({
    queryKey: ['recs', c.cacheKey, 'status'],
    queryFn: ({ signal }) => c.get<RecsStatus>('/status', {}, signal),
    staleTime: 60 * 1000,
  })
