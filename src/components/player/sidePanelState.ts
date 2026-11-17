import { usePlayerStore } from '@/player/store'

/** Width of the docked queue/lyrics panel on wide screens. */
export const SIDE_PANEL_WIDTH = '22rem'

export type Panel = 'queue' | 'lyrics'

/** Open the panel on `p`, or close it if it's already showing `p`. */
export function togglePanel(p: Panel) {
  const current = usePlayerStore.getState().panel
  usePlayerStore.setState({ panel: current === p ? null : p })
}
