import type { OpenSubsonicExtensions, User } from 'subsonic-api'
import { createCredentials, SubsonicClient } from './client'
import type { Session } from '@/stores/session'

/**
 * Verifies the credentials against the server and gathers what we want to
 * remember about it. Throws SubsonicError on failure.
 */
export async function login(url: string, username: string, password: string): Promise<Session> {
  const client = new SubsonicClient(createCredentials(url, username, password))

  const ping = await client.get('ping')
  const [{ user }, extensions] = await Promise.all([
    client.get<{ user: User }>('getUser', { username }),
    ping.openSubsonic
      ? client
          .get<{ openSubsonicExtensions: OpenSubsonicExtensions[] }>('getOpenSubsonicExtensions')
          .then((r) => r.openSubsonicExtensions ?? [])
          .catch(() => [])
      : Promise.resolve([]),
  ])

  return {
    credentials: client.credentials,
    server: {
      type: ping.openSubsonic ? ping.type : 'subsonic',
      version: ping.openSubsonic ? ping.serverVersion : ping.version,
      openSubsonic: !!ping.openSubsonic,
      extensions: extensions.map((e) => e.name),
    },
    user: { name: user.username, isAdmin: user.adminRole },
  }
}
