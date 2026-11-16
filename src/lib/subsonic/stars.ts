import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { create } from 'zustand'
import { useSessionStore, useSubsonic } from '@/stores/session'

export type StarKind = 'song' | 'album' | 'artist'

/*
 * Starring is shown instantly everywhere via local overrides keyed by id;
 * cached server data (albums, songs, queue tracks) catches up on refetch.
 */
const useStarOverrides = create<{ overrides: Record<string, boolean> }>(() => ({ overrides: {} }))

useSessionStore.subscribe((s, p) => {
  if (p.session && !s.session) useStarOverrides.setState({ overrides: {} })
})

/** Whether an item is starred, given the server's `starred` field (a date when starred). */
export function useIsStarred(id: string | undefined, serverStarred: unknown): boolean {
  return useStarOverrides((s) => (id ? (s.overrides[id] ?? !!serverStarred) : false))
}

export function useToggleStar() {
  const client = useSubsonic()
  const queryClient = useQueryClient()
  const set = (id: string, value: boolean | undefined) =>
    useStarOverrides.setState((s) => {
      const overrides = { ...s.overrides }
      if (value === undefined) delete overrides[id]
      else overrides[id] = value
      return { overrides }
    })

  const mutation = useMutation({
    mutationFn: ({ kind, id, star }: { kind: StarKind; id: string; star: boolean }) =>
      client.get(star ? 'star' : 'unstar', kind === 'song' ? { id } : kind === 'album' ? { albumId: id } : { artistId: id }),
    onMutate: ({ id, star }) => {
      const previous = useStarOverrides.getState().overrides[id]
      set(id, star)
      return { previous }
    },
    onError: (error, { id }, ctx) => {
      set(id, ctx?.previous)
      toast.error(`Couldn't update favorites: ${error.message}`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['starred'] }),
  })

  return (kind: StarKind, id: string, star: boolean) => mutation.mutate({ kind, id, star })
}
