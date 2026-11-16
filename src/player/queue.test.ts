import { describe, expect, it } from 'vitest'
import { moveItem, nextIndex, previousIndex, shuffleKeepingFirst, toItems } from './queue'

const items = toItems(Array.from({ length: 5 }, (_, i) => ({ id: String(i), title: `t${i}` })))

describe('queue helpers', () => {
  it('gives unique qids even for duplicate tracks', () => {
    const dup = toItems([items[0].track, items[0].track])
    expect(dup[0].qid).not.toBe(dup[1].qid)
  })

  it('nextIndex respects repeat modes', () => {
    expect(nextIndex(1, 5, 'off', true)).toBe(2)
    expect(nextIndex(4, 5, 'off', true)).toBeNull()
    expect(nextIndex(4, 5, 'all', true)).toBe(0)
    expect(nextIndex(2, 5, 'one', true)).toBe(2)
    expect(nextIndex(2, 5, 'one', false)).toBe(3) // manual "next" skips repeat-one
    expect(nextIndex(0, 0, 'all', true)).toBeNull()
  })

  it('previousIndex wraps only with repeat', () => {
    expect(previousIndex(2, 5, 'off')).toBe(1)
    expect(previousIndex(0, 5, 'off')).toBeNull()
    expect(previousIndex(0, 5, 'all')).toBe(4)
  })

  it('shuffleKeepingFirst keeps the chosen item first and all items present', () => {
    const s = shuffleKeepingFirst(items, items[3])
    expect(s[0]).toBe(items[3])
    expect(s.map((i) => i.qid).sort()).toEqual(items.map((i) => i.qid).sort())
  })

  it('moveItem moves', () => {
    expect(moveItem([0, 1, 2, 3], 0, 2)).toEqual([1, 2, 0, 3])
    expect(moveItem([0, 1, 2, 3], 3, 1)).toEqual([0, 3, 1, 2])
  })
})
