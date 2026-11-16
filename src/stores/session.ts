import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type Credentials, SubsonicClient } from '@/lib/subsonic/client'

export interface Session {
  credentials: Credentials
  server: {
    /** e.g. "navidrome" */
    type: string
    version: string
    openSubsonic: boolean
    /** Supported OpenSubsonic extension names, e.g. "songLyrics". */
    extensions: string[]
  }
  user: { name: string; isAdmin: boolean }
}

interface SessionState {
  session: Session | null
  client: SubsonicClient | null
  setSession: (session: Session) => void
  logout: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      client: null,
      setSession: (session) => set({ session, client: new SubsonicClient(session.credentials) }),
      logout: () => set({ session: null, client: null }),
    }),
    {
      name: 'coffee.session',
      // Only the plain data is saved; the client is rebuilt on load.
      partialize: (s) => ({ session: s.session }),
      merge: (persisted, current) => {
        const session = (persisted as Partial<SessionState> | undefined)?.session ?? null
        return { ...current, session, client: session ? new SubsonicClient(session.credentials) : null }
      },
    },
  ),
)

/** The API client for the logged-in user. Only use inside the authenticated layout. */
export function useSubsonic(): SubsonicClient {
  const client = useSessionStore((s) => s.client)
  if (!client) throw new Error('useSubsonic() called without a session')
  return client
}

/** Non-hook access for route loaders (which only run under the authenticated layout). */
export function getClient(): SubsonicClient {
  const client = useSessionStore.getState().client
  if (!client) throw new Error('getClient() called without a session')
  return client
}
