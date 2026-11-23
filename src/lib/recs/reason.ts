import type { RecItem } from './client'

/**
 * The reason path without the step a card already shows ("By X", "New from X",
 * "A top track by X"), e.g. "You have Dua Lipa · Listeners of Dua Lipa also play Ariana Grande".
 */
export function reasonText(item: RecItem): string {
  return item.reason.filter((r) => !/^(By|New from|A top track by) /.test(r)).join(' · ')
}
