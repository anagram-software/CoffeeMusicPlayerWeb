import { create } from 'zustand'

interface UiState {
  settingsOpen: boolean
  /** Settings section id to scroll to when the dialog opens, e.g. "equalizer". */
  settingsSection?: string
}

export const useUiStore = create<UiState>(() => ({ settingsOpen: false }))

export function openSettings(section?: string) {
  useUiStore.setState({ settingsOpen: true, settingsSection: section })
}
