import { toast } from 'sonner'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import { effects, useEffectsStore } from './effects'
import { nextIndex, previousIndex, type Track } from './queue'
import { usePlayerStore } from './store'

/*
 * The audio engine. It owns two <audio> elements: one plays while the other
 * preloads the next track, and they swap when a track ends, so playback
 * moves on with almost no gap. All state lives in usePlayerStore; UI calls
 * the `player` controller exported at the bottom.
 */

const store = usePlayerStore
const SEEK_STEP = 10
/** Prev restarts the current track instead of going back, after this many seconds. */
const RESTART_THRESHOLD = 3
const MAX_ERROR_STREAK = 3

class AudioEngine {
  private els: [HTMLAudioElement, HTMLAudioElement] | null = null
  private cur = 0
  /** Track id loaded into the spare element, ready to swap in. */
  private preloadedId: string | null = null
  /** The current element has buffered enough that preloading the next won't compete with it. */
  private currentReady = false
  private pendingSeek: number | null = null
  private errorStreak = 0
  private lastSavedAt = 0
  private scrobble = { qid: '', nowPlayingSent: false, submitted: false }

  private get audio() {
    return this.els![this.cur]
  }
  private get spare() {
    return this.els![1 - this.cur]
  }

  init() {
    if (this.els) return
    this.els = [this.createElement(), this.createElement()]
    this.applyVolume()
    this.setupMediaSession()

    // Re-preload when what comes next changes (queue edits, shuffle, repeat).
    store.subscribe((s, p) => {
      if (s.queue !== p.queue || s.index !== p.index || s.repeat !== p.repeat) this.preloadNext()
      if (s.volume !== p.volume || s.muted !== p.muted) this.applyVolume()
    })

    // A different user must not inherit the queue.
    useSessionStore.subscribe((s, p) => {
      if (p.session && !s.session) {
        this.stop()
        store.getState()._clear()
      }
    })

    window.addEventListener('pagehide', () => this.savePosition())

    // Restore the last session's track, paused at its saved position.
    if (store.getState().queue.length > 0) this.load(false, store.getState().savedPosition)
  }

  private createElement() {
    const el = new Audio()
    // Lets the Web Audio equalizer (phase 5) read the stream; Navidrome sends CORS headers.
    el.crossOrigin = 'anonymous'
    el.preload = 'auto'
    const onCurrent = (fn: () => void) => () => {
      if (el === this.audio) fn()
    }
    el.addEventListener('playing', onCurrent(() => {
      this.errorStreak = 0
      store.setState({ playing: true, buffering: false })
      this.sendNowPlaying()
      this.updatePositionState()
    }))
    el.addEventListener('play', onCurrent(() => store.setState({ playing: true })))
    el.addEventListener('pause', onCurrent(() => {
      store.setState({ playing: false })
      this.savePosition()
    }))
    el.addEventListener('waiting', onCurrent(() => store.setState({ buffering: true })))
    el.addEventListener('canplay', onCurrent(() => store.setState({ buffering: false })))
    el.addEventListener('loadedmetadata', onCurrent(() => {
      if (this.pendingSeek !== null) {
        el.currentTime = this.pendingSeek
        this.pendingSeek = null
      }
      this.updateDuration()
    }))
    el.addEventListener('durationchange', onCurrent(() => this.updateDuration()))
    el.addEventListener('timeupdate', onCurrent(() => this.onTimeUpdate()))
    el.addEventListener('canplaythrough', onCurrent(() => {
      this.currentReady = true
      this.preloadNext()
    }))
    el.addEventListener('ended', onCurrent(() => this.onEnded()))
    el.addEventListener('error', onCurrent(() => this.onError()))
    return el
  }

  private streamUrl(track: Track) {
    const client = useSessionStore.getState().client!
    const { streamFormat, maxBitRate } = useSettingsStore.getState()
    return client.url('stream', {
      id: track.id,
      // Omitting format with a bitrate cap lets the server pick its default transcoding.
      format: streamFormat === 'raw' ? undefined : streamFormat,
      maxBitRate: maxBitRate || undefined,
    })
  }

  /** Load the store's current item into the playing element. */
  load(autoplay: boolean, startAt = 0) {
    if (!this.els) return
    const s = store.getState()
    const item = s.queue[s.index]
    if (!item) return this.stop()
    const { track } = item

    this.currentReady = false
    if (this.preloadedId === track.id && this.spare.src) {
      // Swap in the preloaded element. Switch first, so the old one's
      // pause event is ignored as not-current.
      const old = this.audio
      this.cur = 1 - this.cur
      old.pause()
      old.removeAttribute('src')
      old.load()
      if (startAt) this.audio.currentTime = startAt
      this.updateDuration()
      // Its canplaythrough fired while it was the spare (and was ignored).
      this.currentReady = this.audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA
    } else {
      this.audio.src = this.streamUrl(track)
      this.pendingSeek = startAt || null
    }
    this.preloadedId = null
    this.preloadNext()

    this.scrobble = { qid: item.qid, nowPlayingSent: false, submitted: false }
    store.setState({ currentTime: startAt, duration: track.duration ?? 0, savedPosition: startAt })
    this.updateMetadata(track)

    if (autoplay) this.play()
    else store.setState({ playing: false, buffering: false })
  }

  private preloadNext() {
    if (!this.els || !this.currentReady) return
    const s = store.getState()
    const ni = nextIndex(s.index, s.queue.length, s.repeat, true)
    if (ni === null || ni === s.index) return
    const track = s.queue[ni].track
    if (this.preloadedId === track.id) return
    this.spare.src = this.streamUrl(track)
    this.spare.load()
    this.preloadedId = track.id
  }

  /** Route playback through the effects graph (equalizer etc). Needs a user gesture the first time. */
  enableEffects() {
    if (this.els) effects.attach(this.els)
  }

  play() {
    if (!this.els) return
    // Effects persisted as on: build the graph on the first play, which is a user gesture.
    if (useEffectsStore.getState().enabled) this.enableEffects()
    void effects.resume()
    if (!this.audio.src) return this.load(true)
    store.setState({ buffering: true })
    this.audio.play().catch((e: DOMException) => {
      // Autoplay blocked (no user gesture yet) or interrupted by a new load.
      if (e.name !== 'AbortError') store.setState({ playing: false, buffering: false })
    })
  }

  pause() {
    if (this.els) this.audio.pause()
  }

  togglePlay() {
    if (!this.els || store.getState().index === -1) return
    if (this.audio.paused) this.play()
    else this.pause()
  }

  seek(time: number) {
    if (!this.els) return
    const duration = store.getState().duration
    const t = Math.max(0, duration ? Math.min(time, duration) : time)
    if (this.audio.readyState === 0) this.pendingSeek = t
    else this.audio.currentTime = t
    store.setState({ currentTime: t })
    this.updatePositionState()
  }

  next() {
    const s = store.getState()
    const ni = nextIndex(s.index, s.queue.length, s.repeat, false)
    if (ni === null) return
    s._setIndex(ni)
    this.load(true)
  }

  previous() {
    const s = store.getState()
    if (s.currentTime > RESTART_THRESHOLD) return this.seek(0)
    const pi = previousIndex(s.index, s.queue.length, s.repeat)
    if (pi === null) return this.seek(0)
    s._setIndex(pi)
    this.load(s.playing)
  }

  stop() {
    if (!this.els) return
    for (const el of this.els) {
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
    this.preloadedId = null
    this.currentReady = false
    store.setState({ playing: false, buffering: false, currentTime: 0 })
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null
  }

  private onEnded() {
    const s = store.getState()
    if (s.repeat === 'one') {
      this.audio.currentTime = 0
      this.scrobble = { qid: this.scrobble.qid, nowPlayingSent: false, submitted: false }
      return this.play()
    }
    const ni = nextIndex(s.index, s.queue.length, s.repeat, true)
    if (ni === null) {
      // End of the queue: stay on the last track, rewound and paused.
      this.audio.currentTime = 0
      store.setState({ playing: false, currentTime: 0, savedPosition: 0 })
      return
    }
    s._setIndex(ni)
    this.load(true)
  }

  private onError() {
    const s = store.getState()
    const track = s.queue[s.index]?.track
    this.errorStreak++
    toast.error(`Couldn't play “${track?.title ?? 'this track'}”`)
    const ni = nextIndex(s.index, s.queue.length, s.repeat === 'one' ? 'off' : s.repeat, true)
    if (this.errorStreak >= MAX_ERROR_STREAK || ni === null || ni === s.index) {
      store.setState({ playing: false, buffering: false })
      return
    }
    s._setIndex(ni)
    this.load(true)
  }

  private onTimeUpdate() {
    const t = this.audio.currentTime
    store.setState({ currentTime: t })
    if (Math.abs(t - this.lastSavedAt) > 5) this.savePosition()
    this.maybeSubmitScrobble(t)
  }

  private updateDuration() {
    const d = this.audio.duration
    const s = store.getState()
    // Transcoded streams can report Infinity until fully loaded; fall back to the tag duration.
    store.setState({ duration: Number.isFinite(d) && d > 0 ? d : (s.queue[s.index]?.track.duration ?? 0) })
    this.updatePositionState()
  }

  private savePosition() {
    if (!this.els) return
    this.lastSavedAt = this.audio.currentTime
    store.setState({ savedPosition: this.audio.currentTime })
  }

  private applyVolume() {
    if (!this.els) return
    const { volume, muted } = store.getState()
    for (const el of this.els) {
      el.volume = volume
      el.muted = muted
    }
  }

  // --- Scrobbling ---------------------------------------------------------

  private sendNowPlaying() {
    if (this.scrobble.nowPlayingSent || !useSettingsStore.getState().scrobble) return
    const id = this.currentTrack()?.id
    if (!id) return
    this.scrobble.nowPlayingSent = true
    useSessionStore.getState().client?.get('scrobble', { id, submission: false }).catch(() => {})
  }

  /** Last.fm rules: tracks over 30s count once played for half their length or 4 minutes. */
  private maybeSubmitScrobble(time: number) {
    if (this.scrobble.submitted || !useSettingsStore.getState().scrobble) return
    const duration = store.getState().duration
    if (duration <= 30 || time < Math.min(duration / 2, 240)) return
    const id = this.currentTrack()?.id
    if (!id) return
    this.scrobble.submitted = true
    useSessionStore.getState().client?.get('scrobble', { id, submission: true, time: Date.now() }).catch(() => {})
  }

  private currentTrack() {
    const s = store.getState()
    return s.queue[s.index]?.track
  }

  // --- Media Session (OS media keys, lock screen, notifications) ----------

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => this.play()],
      ['pause', () => this.pause()],
      ['stop', () => this.pause()],
      ['previoustrack', () => this.previous()],
      ['nexttrack', () => this.next()],
      ['seekto', (d) => d.seekTime !== undefined && this.seek(d.seekTime)],
      ['seekbackward', (d) => this.seek(this.audio.currentTime - (d.seekOffset ?? SEEK_STEP))],
      ['seekforward', (d) => this.seek(this.audio.currentTime + (d.seekOffset ?? SEEK_STEP))],
    ]
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler)
      } catch {
        // Action not supported by this browser.
      }
    }
    store.subscribe((s, p) => {
      if (s.playing !== p.playing) ms.playbackState = s.playing ? 'playing' : 'paused'
    })
  }

  private updateMetadata(track: Track) {
    if (!('mediaSession' in navigator)) return
    const client = useSessionStore.getState().client
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist ?? '',
      album: track.album ?? '',
      artwork: track.coverArt
        ? [96, 256, 512].map((size) => ({
            src: client!.coverArtUrl(track.coverArt, size)!,
            sizes: `${size}x${size}`,
          }))
        : [],
    })
  }

  private updatePositionState() {
    if (!('mediaSession' in navigator) || !this.els) return
    const duration = store.getState().duration
    if (!duration || !Number.isFinite(duration)) return
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(this.audio.currentTime, duration),
        playbackRate: this.audio.playbackRate,
      })
    } catch {
      // Ignore invalid states during track transitions.
    }
  }
}

const engine = new AudioEngine()

/** Starts the engine. Called once the user is signed in (stream URLs need credentials). */
export function initPlayer() {
  engine.init()
}

/** Player controls for the UI. */
export const player = {
  /** Replace the queue and start playing at `startIndex`. */
  playQueue(tracks: Track[], startIndex = 0, opts?: { shuffle?: boolean }) {
    if (tracks.length === 0) return
    store.getState()._setQueue(tracks, startIndex, opts?.shuffle)
    engine.load(true)
  },
  playNext(tracks: Track[]) {
    const wasEmpty = store.getState().queue.length === 0
    store.getState()._insertNext(tracks)
    if (wasEmpty) engine.load(true)
    toast(tracks.length === 1 ? `“${tracks[0].title}” will play next` : `${tracks.length} songs will play next`)
  },
  addToQueue(tracks: Track[]) {
    const wasEmpty = store.getState().queue.length === 0
    store.getState()._append(tracks)
    if (wasEmpty) engine.load(true)
    toast(tracks.length === 1 ? `Added “${tracks[0].title}” to the queue` : `Added ${tracks.length} songs to the queue`)
  },
  togglePlay: () => engine.togglePlay(),
  play: () => engine.play(),
  pause: () => engine.pause(),
  next: () => engine.next(),
  previous: () => engine.previous(),
  seek: (time: number) => engine.seek(time),
  jumpTo(index: number) {
    store.getState()._setIndex(index)
    engine.load(true)
  },
  remove(qid: string) {
    const wasCurrent = store.getState()._remove(qid)
    if (!wasCurrent) return
    if (store.getState().queue.length === 0) engine.stop()
    else engine.load(store.getState().playing)
  },
  move: (from: number, to: number) => store.getState()._move(from, to),
  clear() {
    engine.stop()
    store.getState()._clear()
  },
  setVolume: (volume: number) => store.setState({ volume, muted: false }),
  toggleMute: () => store.setState({ muted: !store.getState().muted }),
  toggleShuffle: () => store.getState()._toggleShuffle(),
  /** Call from the click that turns effects on (browsers need a gesture to start audio processing). */
  enableEffects: () => engine.enableEffects(),
  cycleRepeat() {
    const order = ['off', 'all', 'one'] as const
    store.setState({ repeat: order[(order.indexOf(store.getState().repeat) + 1) % order.length] })
  },
}

// Handy for debugging in the browser console (dev builds only).
if (import.meta.env.DEV) Object.assign(window, { __coffee: { player, store, effects } })
