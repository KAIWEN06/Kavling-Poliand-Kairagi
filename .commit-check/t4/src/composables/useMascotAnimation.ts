import { computed, ref } from 'vue'
import {
  mascotAnimations,
  type MascotClip,
  type MascotPose,
  type MascotInputState,
} from '@/data/mascotAnimations'

type TransitionClip =
  | 'coverEnter' | 'coverExit' | 'peekEnter' | 'peekExit'
  | 'peekToCover' | 'lookDownEnter' | 'lookDownExit'
type IntroClip = 'wave' | 'pointDown'
interface Transition { clip: TransitionClip; target: MascotPose }

const poseClip: Record<MascotPose, MascotClip> = {
  idle: 'idle', lookDown: 'lookDown', cover: 'passwordCover', peek: 'passwordPeek',
}
const FPS = 25
const FRAME_MS = 1000 / FPS
const MAX_FRAMES = 500
const DISCOVERY_BATCH = 24

/** Jumlah frame tiap klip, dipakai agar semua frame diminta sekaligus. Bila ada yang tidak
 *  cocok dengan isi folder, pemuat tetap menemukan jumlah sebenarnya lewat batch. */
const FRAME_COUNTS: Partial<Record<MascotClip, number>> = {
  passwordCover: 56, coverEnter: 21, coverExit: 21, passwordPeek: 50, peekEnter: 11,
  peekExit: 19, pointDown: 38, wave: 57, peekToCover: 11, passwordError: 85,
  idle: 25, lookDown: 25, lookDownEnter: 12, lookDownExit: 12,
}

const frameUrl = (folder: string, n: number) =>
  `/mascot-frames/${folder}/frame-${String(n).padStart(4, '0')}.webp`

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

export function useMascotAnimation() {
  const currentClip = ref<MascotClip>('idle')
  const currentPose = ref<MascotPose>('idle')
  const desiredState = ref<MascotInputState>('idle')
  const isTransitioning = ref(false)
  const isUnavailable = ref(false)
  const source = computed(() => mascotAnimations[currentClip.value])

  let canvas: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D | null = null
  const frameCache = new Map<MascotClip, Promise<HTMLImageElement[]>>()
  let activeFrames: HTMLImageElement[] = []
  let frameIndex = 0
  let lastTimestamp = 0
  let rafId = 0
  let playbackId = 0
  let disposed = false
  let transition: Transition | null = null
  let errorPending = false
  let isPlayingError = false
  let introEnabled = true
  let introTimer: ReturnType<typeof setTimeout> | undefined
  let introAction: IntroClip | null = null
  let nextIntroClip: IntroClip = 'wave'
  let hasDrawn = false

  function draw(image: HTMLImageElement) {
    if (!canvas || !ctx || !image.complete || !image.naturalWidth) return
    if (canvas.width !== image.naturalWidth) canvas.width = image.naturalWidth
    if (canvas.height !== image.naturalHeight) canvas.height = image.naturalHeight
    // Gambar frame baru langsung tanpa clearRect agar tidak muncul kilatan kosong.
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    hasDrawn = true
  }

  function loadClipFrames(clip: MascotClip): Promise<HTMLImageElement[]> {
    const cached = frameCache.get(clip)
    if (cached) return cached

    const folder = mascotAnimations[clip]
    const promise = (async () => {
      const frames: HTMLImageElement[] = []
      const hint = FRAME_COUNTS[clip]
      let start = 1
      let size = hint ?? DISCOVERY_BATCH
      // Satu batch diminta paralel; batch berikutnya hanya bila frame belum habis.
      while (start <= MAX_FRAMES) {
        const batch = await Promise.all(
          Array.from({ length: size }, (_, i) => loadImage(frameUrl(folder, start + i))),
        )
        let ended = false
        for (const image of batch) {
          if (!image) { ended = true; break }
          frames.push(image)
        }
        if (ended || (hint !== undefined && frames.length >= hint)) break
        start += size
        size = DISCOVERY_BATCH
      }
      if (frames.length === 0) throw new Error(`Frame tidak ditemukan: ${frameUrl(folder, 1)}`)
      return frames
    })()
    frameCache.set(clip, promise)
    promise.catch(() => frameCache.delete(clip))
    return promise
  }

  function clearIntroTimer() {
    if (introTimer) {
      clearTimeout(introTimer)
      introTimer = undefined
    }
  }

  function stopIntro() {
    introEnabled = false
    clearIntroTimer()
    introAction = null
  }

  function scheduleIntro(delay = 4200) {
    clearIntroTimer()
    if (!introEnabled || disposed || isUnavailable.value) return
    introTimer = setTimeout(() => {
      introTimer = undefined
      if (!introEnabled || disposed || isUnavailable.value ||
        desiredState.value !== 'idle' || isTransitioning.value || isPlayingError) return
      introAction = nextIntroClip
      nextIntroClip = nextIntroClip === 'wave' ? 'pointDown' : 'wave'
      void playClip(introAction)
    }, delay)
  }

  function startFrameLoop(id: number, loop: boolean) {
    cancelAnimationFrame(rafId)
    frameIndex = 0
    lastTimestamp = 0
    const tick = (timestamp: number) => {
      if (disposed || id !== playbackId || activeFrames.length === 0) return
      if (!lastTimestamp) lastTimestamp = timestamp
      const elapsed = timestamp - lastTimestamp
      if (elapsed >= FRAME_MS) {
        const advance = Math.max(1, Math.floor(elapsed / FRAME_MS))
        lastTimestamp += advance * FRAME_MS
        const next = frameIndex + advance
        if (next >= activeFrames.length) {
          if (!loop) {
            frameIndex = activeFrames.length - 1
            draw(activeFrames[frameIndex])
            return void onEnded(id)
          }
          frameIndex = next % activeFrames.length
        } else {
          frameIndex = next
        }
        draw(activeFrames[frameIndex])
      }
      rafId = requestAnimationFrame(tick)
    }
    // Frame pertama ditampilkan segera, baru lanjutkan animasi.
    draw(activeFrames[0])
    rafId = requestAnimationFrame(tick)
  }

  async function playClip(clip: MascotClip, loop = false) {
    if (disposed || isUnavailable.value) return
    const id = ++playbackId
    currentClip.value = clip
    try {
      const frames = await loadClipFrames(clip)
      if (disposed || id !== playbackId) return
      activeFrames = frames
      startFrameLoop(id, loop)
    } catch (error) {
      if (disposed || id !== playbackId) return
      console.error(`[MascotCanvas] Gagal memuat animasi "${clip}".`, error)
      isUnavailable.value = true
      isTransitioning.value = false
      transition = null
      clearIntroTimer()
    }
  }

  function statePose(state: MascotInputState): MascotPose {
    if (state === 'email') return 'lookDown'
    if (state === 'passwordCover') return 'cover'
    if (state === 'passwordPeek') return 'peek'
    return 'idle'
  }

  async function reconcile() {
    if (disposed || isUnavailable.value || isTransitioning.value || isPlayingError) return
    if (errorPending) {
      errorPending = false
      isPlayingError = true
      await playClip('passwordError')
      return
    }
    const target = statePose(desiredState.value)
    if (currentPose.value === target) {
      await playClip(poseClip[target], true)
      return
    }
    let next: Transition | null = null
    if (currentPose.value === 'idle') {
      if (target === 'lookDown') next = { clip: 'lookDownEnter', target: 'lookDown' }
      else if (target === 'cover' || target === 'peek') next = { clip: 'coverEnter', target: 'cover' }
    } else if (currentPose.value === 'lookDown') {
      next = { clip: 'lookDownExit', target: 'idle' }
    } else if (currentPose.value === 'cover') {
      next = target === 'peek'
        ? { clip: 'peekEnter', target: 'peek' }
        : { clip: 'coverExit', target: 'idle' }
    } else if (currentPose.value === 'peek') {
      next = target === 'cover'
        ? { clip: 'peekToCover', target: 'cover' }
        : { clip: 'peekExit', target: 'idle' }
    }
    if (next) {
      transition = next
      isTransitioning.value = true
      await playClip(next.clip)
    }
  }

  async function onEnded(id: number) {
    if (disposed || id !== playbackId || isUnavailable.value) return
    if (introAction) {
      introAction = null
      await playClip('idle', true)
      scheduleIntro(4200)
      return
    }
    if (isPlayingError) {
      isPlayingError = false
      await reconcile()
      return
    }
    if (isTransitioning.value && transition) {
      currentPose.value = transition.target
      transition = null
      isTransitioning.value = false
      await reconcile()
      return
    }
    await reconcile()
  }

  async function setState(state: MascotInputState) {
    stopIntro()
    desiredState.value = state
    await reconcile()
  }
  async function setEmailFocus(active: boolean) {
    if (active) return setState('email')
    if (desiredState.value === 'email') return setState('idle')
  }
  async function setPasswordFocus(active: boolean, visible: boolean) {
    if (!active) {
      if (desiredState.value === 'passwordCover' || desiredState.value === 'passwordPeek') {
        await setState('idle')
      } else stopIntro()
      return
    }
    await setState(visible ? 'passwordPeek' : 'passwordCover')
  }
  async function setPasswordVisible(visible: boolean) {
    stopIntro()
    if (desiredState.value !== 'passwordCover' && desiredState.value !== 'passwordPeek') return
    await setState(visible ? 'passwordPeek' : 'passwordCover')
  }
  async function playError() {
    stopIntro()
    errorPending = true
    if (!isTransitioning.value && !isPlayingError) await reconcile()
  }

  function attachCanvas(element: HTMLCanvasElement | null) {
    if (!element || disposed) return
    canvas = element
    // Canvas dengan alpha:false berwarna hitam sampai frame pertama digambar (kilatan hitam
    // saat halaman dibuka). Frame sendiri tidak transparan, jadi alpha default aman dipakai.
    ctx = element.getContext('2d')
    // Tampilkan frame pertama segera, tanpa menunggu seluruh klip selesai dimuat.
    void loadImage(frameUrl(mascotAnimations.idle, 1)).then((image) => {
      if (image && !hasDrawn && !disposed) draw(image)
    })
    void playClip('idle', true)
    scheduleIntro(1400)
  }

  function dispose() {
    disposed = true
    clearIntroTimer()
    cancelAnimationFrame(rafId)
    playbackId++
    frameCache.clear()
    activeFrames = []
  }

  return {
    source, currentClip, currentPose, desiredState, isTransitioning, isUnavailable,
    attachCanvas, setEmailFocus, setPasswordFocus, setPasswordVisible, playError,
    stopIntro, dispose,
  }
}
