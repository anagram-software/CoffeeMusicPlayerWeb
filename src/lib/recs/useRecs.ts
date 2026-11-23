import { useMemo } from 'react'
import { useSettingsStore } from '@/stores/settings'
import { RecsClient } from './client'

/** The Coffee Recs client from Settings, or null until an address and key are set. */
export function useRecs(): RecsClient | null {
  const url = useSettingsStore((s) => s.recsUrl)
  const key = useSettingsStore((s) => s.recsKey)
  return useMemo(() => (url.trim() && key.trim() ? new RecsClient(url, key) : null), [url, key])
}
