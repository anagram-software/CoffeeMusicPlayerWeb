import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayerStore } from './store'

const tracks = Array.from({ length: 5 }, (_, i) => ({ id: String(i), title: `t${i}` }))
const s = () => usePlayerStore.getState()
const ids = () => s().queue.map((i) => i.track.id)
const current = () => s().queue[s().index]?.track.id

describe('player store', () => {
  beforeEach(() => {
    s()._clear()
    s().set({ shuffle: false, repeat: 'off' })
  })

  it('sets a queue starting at an index', () => {
    s()._setQueue(tracks, 2)
    expect(ids()).toEqual(['0', '1', '2', '3', '4'])
    expect(current()).toBe('2')
  })

  it('shuffles with the chosen track first, and restores order when unshuffled', () => {
    s()._setQueue(tracks, 3, true)
    expect(current()).toBe('3')
    expect(s().index).toBe(0)
    s()._toggleShuffle()
    expect(ids()).toEqual(['0', '1', '2', '3', '4'])
    expect(current()).toBe('3')
  })

  it('inserts "play next" after the current track, in both orders', () => {
    s()._setQueue(tracks, 1)
    s()._toggleShuffle()
    s()._insertNext([{ id: 'x', title: 'x' }])
    expect(s().queue[s().index + 1].track.id).toBe('x')
    s()._toggleShuffle()
    expect(ids()).toEqual(['0', '1', 'x', '2', '3', '4'])
  })

  it('keeps the current track when removing or moving others', () => {
    s()._setQueue(tracks, 2)
    expect(s()._remove(s().queue[0].qid)).toBe(false)
    expect(current()).toBe('2')
    s()._move(s().index, 0)
    expect(current()).toBe('2')
    expect(s().index).toBe(0)
  })

  it('removing the current track moves to the next one', () => {
    s()._setQueue(tracks, 4)
    expect(s()._remove(s().queue[4].qid)).toBe(true)
    expect(current()).toBe('3') // was last, so falls back to the new last
    s()._setQueue(tracks, 1)
    s()._remove(s().queue[1].qid)
    expect(current()).toBe('2')
  })

  it('appending to an empty queue makes the first item current', () => {
    s()._append(tracks.slice(0, 2))
    expect(current()).toBe('0')
  })
})
