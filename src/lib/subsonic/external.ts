/*
 * Octo-Fiesta (github.com/V1ck3s/octo-fiesta) sits in front of Navidrome and
 * mixes streaming-provider results (Qobuz, Deezer, Tidal…) into search. Its
 * items have ids like "ext-qobuz-song-123"; streaming one makes the proxy
 * download it.
 */

const EXTERNAL_ID = /^ext-([a-z0-9]+)-/i

export function isExternalId(id: string | undefined): boolean {
  return !!id && EXTERNAL_ID.test(id)
}

const providerNames: Record<string, string> = {
  qobuz: 'Qobuz',
  deezer: 'Deezer',
  tidal: 'Tidal',
  yandex: 'Yandex',
  squidwtf: 'SquidWTF',
}

/** Display name of the provider behind an external id ("Qobuz"), or undefined for library items. */
export function externalProvider(id: string | undefined): string | undefined {
  const m = id?.match(EXTERNAL_ID)
  if (!m) return undefined
  const key = m[1].toLowerCase()
  return providerNames[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}
