<template>
  <ion-page>
    <ion-content :fullscreen="true" :scroll-y="true" class="welcome-content">
      <div class="welcome" :class="{ 'is-leaving': leaving }">
        <!-- Latar: matahari + bukit kavling. Naik bertahap saat halaman dibuka. -->
        <div class="sky" aria-hidden="true"></div>
        <svg class="hills" viewBox="0 0 390 220" preserveAspectRatio="none" aria-hidden="true">
          <motion.path
            v-for="(hill, i) in hills"
            :key="i"
            :d="hill.d"
            :fill="hill.fill"
            :initial="reduced ? false : { y: 46, opacity: 0 }"
            :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.8, delay: 0.05 + i * 0.1, ease: MOTION_EASE_OUT }"
          />
          <!-- Garis petak kavling digambar pelan seperti denah -->
          <motion.path
            v-for="(d, i) in parcelLines"
            :key="'p' + i"
            class="parcel-line"
            :d="d"
            :initial="reduced ? false : { pathLength: 0, opacity: 0 }"
            :animate="{ pathLength: 1, opacity: 1 }"
            :transition="{ duration: 1.2, delay: 0.7 + i * 0.18, ease: MOTION_EASE_OUT }"
          />
        </svg>

        <header class="topbar">
          <motion.button
            type="button"
            class="skip"
            :initial="reduced ? false : { opacity: 0 }"
            :animate="{ opacity: 1 }"
            :transition="{ duration: 0.4, delay: 1.1 }"
            @click="explore"
          >
            Lewati
          </motion.button>
        </header>

        <!-- Maskot: menyapa, mengikuti sentuhan jari, dan bereaksi saat diketuk. -->
        <motion.button
          type="button"
          class="scene"
          aria-label="Sapa maskot PoliLand"
          :initial="reduced ? false : { opacity: 0, scale: 1.06, y: 14 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.9, delay: 0.15, ease: MOTION_EASE_OUT }"
          @click="interact"
          @pointermove="onPointerMove"
          @pointerleave="resetTilt"
          @pointercancel="resetTilt"
        >
          <span ref="stageEl" class="scene-stage">
            <canvas ref="canvasEl" class="scene-frame" width="1280" height="720" />
          </span>
        </motion.button>

        <div class="bubble-slot" aria-hidden="true">
          <motion.div
            v-if="showBubble"
            :key="lineIndex"
            class="bubble"
            :initial="reduced ? false : { opacity: 0, scale: 0.85, y: 8 }"
            :animate="{ opacity: 1, scale: 1, y: 0 }"
            :transition="{ type: 'spring', stiffness: 380, damping: 26 }"
          >
            {{ story[lineIndex].text }}
          </motion.div>
        </div>

        <main class="copy">
          <h1 class="headline">
            <span v-for="(line, i) in headlineLines" :key="line" class="line">
              <motion.span
                class="line-inner"
                :initial="reduced ? false : { y: '110%' }"
                :animate="{ y: '0%' }"
                :transition="{ duration: 0.7, delay: 0.5 + i * 0.1, ease: MOTION_EASE_OUT }"
              >
                {{ line }}
              </motion.span>
            </span>
          </h1>

          <motion.p
            class="lead"
            :initial="reduced ? false : { opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.6, delay: 0.95, ease: MOTION_EASE_OUT }"
          >
            Lihat denah, pilih petak yang cocok, lalu pantau pembayaran dan dokumennya dari ponsel.
          </motion.p>
        </main>

        <footer class="actions">
          <motion.button
            type="button"
            class="btn-primary"
            :initial="reduced ? false : { opacity: 0, y: 28 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 22, delay: 1.1 }"
            :while-tap="reduced ? undefined : { scale: 0.97 }"
            @click="go('/login')"
          >
            Masuk
          </motion.button>

          <div class="secondary-row">
            <motion.button
              type="button"
              class="btn-ghost"
              :initial="reduced ? false : { opacity: 0, y: 20 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 22, delay: 1.2 }"
              :while-tap="reduced ? undefined : { scale: 0.97 }"
              @click="explore"
            >
              Lihat kavling
            </motion.button>
            <motion.button
              type="button"
              class="btn-text"
              :initial="reduced ? false : { opacity: 0, y: 20 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 22, delay: 1.28 }"
              :while-tap="reduced ? undefined : { scale: 0.96 }"
              @click="go('/register')"
            >
              Daftar
            </motion.button>
          </div>
        </footer>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage } from '@ionic/vue'
import { motion } from 'motion-v'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '@/assets/logos/logo.png'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { MOTION_EASE_OUT } from '@/utils/motionTokens'
import { mascotAnimations } from '@/data/mascotAnimations'

const router = useRouter()
const reduced = useReducedMotion()

const headlineLines = ['Kaveling Siap Bangun,', 'Temukan Kaveling Impian Anda.']

/** Alur sapaan: tiap langkah punya gerakan maskot dan ucapannya sendiri. */
const story = [
  { text: 'Halo, saya Poli!', clip: 'wave' },
  { text: 'Pilih kavling lewat tombol di bawah.', clip: 'point' },
  { text: 'Sudah punya akun? Langsung masuk saja.', clip: 'wave' },
] as const
const lineIndex = ref(0)
const showBubble = ref(false)

/** Tiga lapis bukit, dari belakang ke depan. */
const hills = [
  { d: 'M0 120 C70 96 150 112 230 98 S350 84 390 96 L390 220 L0 220 Z', fill: 'rgba(203,160,68,0.16)' },
  { d: 'M0 150 C80 126 160 142 240 128 S350 118 390 128 L390 220 L0 220 Z', fill: 'rgba(92,141,78,0.16)' },
  { d: 'M0 174 C90 156 170 166 250 154 S350 146 390 152 L390 220 L0 220 Z', fill: 'rgba(53,90,44,0.14)' },
]

const parcelLines = [
  'M0 176 C90 160 170 168 250 156 S350 150 390 154',
  'M0 196 C100 182 180 190 260 178 S350 172 390 176',
  'M120 163 L96 220 M200 160 L190 220 M278 154 L296 220',
]

/* ---------- Maskot: pemutar frame berbasis waktu (rAF) ---------- */

type Clip = { dir: string; count: number; loop: boolean }
const clips = {
  idle: { dir: mascotAnimations.idle, count: 25, loop: true },
  wave: { dir: mascotAnimations.wave, count: 57, loop: false },
  point: { dir: mascotAnimations.pointDown, count: 38, loop: false },
} satisfies Record<string, Clip>
type ClipName = keyof typeof clips

const FRAME_MS = 40
const frameUrl = (clip: Clip, n: number) =>
  `/mascot-frames/${clip.dir}/frame-${String(n).padStart(4, '0')}.webp`

const canvasEl = ref<HTMLCanvasElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

let active: ClipName = 'idle'
let clipStart = 0
let rafId = 0
let ready = false
let drawn: HTMLImageElement | null = null
let startTimer: number | null = null
let storyTimer: number | null = null

const frames: Partial<Record<ClipName, HTMLImageElement[]>> = {}
const loading: Partial<Record<ClipName, Promise<void>>> = {}

/** Muat semua frame satu klip ke memori (HTMLImageElement) agar ditampilkan tanpa jeda. */
const preload = (name: ClipName) => {
  const existing = loading[name]
  if (existing) return existing
  const clip = clips[name]
  const task = Promise.all(
    Array.from(
      { length: clip.count },
      (_, i) =>
        new Promise<HTMLImageElement>((resolve) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = () => resolve(img)
          img.src = frameUrl(clip, i + 1)
        }),
    ),
  ).then((list) => {
    frames[name] = list
  })
  loading[name] = task
  return task
}

const draw = (img: HTMLImageElement | undefined) => {
  if (!img || img === drawn || !ctx || !canvasEl.value || !img.naturalWidth) return
  const canvas = canvasEl.value
  if (canvas.width !== img.naturalWidth) canvas.width = img.naturalWidth
  if (canvas.height !== img.naturalHeight) canvas.height = img.naturalHeight
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  drawn = img
}

const play = (name: ClipName) => {
  active = name
  clipStart = performance.now()
}

/* Kemiringan halus mengikuti jari atau kursor. */
let tiltX = 0
let tiltY = 0
let targetX = 0
let targetY = 0

const onPointerMove = (e: PointerEvent) => {
  if (reduced.value) return // hanya kemiringan dekoratif yang dimatikan
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  targetX = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width - 0.5) * 2))
  targetY = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height - 0.5) * 2))
}

const resetTilt = () => {
  targetX = 0
  targetY = 0
}

const tick = (now: number) => {
  rafId = requestAnimationFrame(tick)

  if (ready) {
    let frame = Math.floor((now - clipStart) / FRAME_MS)
    if (frame >= clips[active].count) {
      if (clips[active].loop) {
        frame %= clips[active].count
      } else {
        play('idle')
        frame = 0
      }
    }
    draw(frames[active]?.[frame])
  }

  // Interpolasi eksponensial: gerak mengalir tanpa patah.
  tiltX += (targetX - tiltX) * 0.09
  tiltY += (targetY - tiltY) * 0.09
  const el = stageEl.value
  if (el) {
    el.style.transform = `translate3d(${(tiltX * 10).toFixed(2)}px, ${(tiltY * 5).toFixed(2)}px, 0) rotate(${(tiltX * 1.6).toFixed(2)}deg)`
  }
}

/* Jalankan satu langkah, lalu lanjut otomatis ke langkah berikut setelah jeda. */
const runStep = (i: number, auto: boolean) => {
  if (storyTimer !== null) window.clearTimeout(storyTimer)
  lineIndex.value = i
  showBubble.value = true
  const step = story[i]
  play(step.clip)
  if (auto && i < story.length - 1) {
    storyTimer = window.setTimeout(() => runStep(i + 1, true), clips[step.clip].count * FRAME_MS + 2200)
  }
}

const interact = () => {
  if (!ready) return
  runStep((lineIndex.value + 1) % story.length, false)
}

const onVisibility = () => {
  cancelAnimationFrame(rafId)
  if (!document.hidden) {
    clipStart = performance.now()
    rafId = requestAnimationFrame(tick)
  }
}

onMounted(async () => {
  ctx = canvasEl.value?.getContext('2d') ?? null
  rafId = requestAnimationFrame(tick)
  document.addEventListener('visibilitychange', onVisibility)
  await Promise.all([preload('idle'), preload('wave')])
  draw(frames.idle?.[0])
  ready = true
  void preload('point')
  // Maskot adalah karakter utama, jadi tetap bergerak walau reduced-motion aktif
  // (sama seperti halaman Login). Yang dimatikan hanya gerak dekoratif lain.
  startTimer = window.setTimeout(() => runStep(0, true), 350)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  document.removeEventListener('visibilitychange', onVisibility)
  if (startTimer !== null) window.clearTimeout(startTimer)
  if (storyTimer !== null) window.clearTimeout(storyTimer)
})

/* ---------- Navigasi ---------- */

const leaving = ref(false)

const go = (path: string) => {
  if (leaving.value) return
  leaving.value = true
  window.setTimeout(() => {
    void router.push(path)
    // Kembalikan tampilan agar tombol Back dari Login tidak menampilkan layar kosong.
    window.setTimeout(() => {
      leaving.value = false
    }, 400)
  }, reduced.value ? 0 : 220)
}

const explore = () => {
  if (leaving.value) return
  leaving.value = true
  window.setTimeout(() => {
    void router.replace('/home')
  }, reduced.value ? 0 : 220)
}
</script>

<style scoped>
.welcome-content {
  --background: #f7f0e2;
}

.welcome {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 0 calc(env(safe-area-inset-bottom, 0px) + 20px);
  overflow: hidden;
  background: linear-gradient(180deg, #fbf5e6 0%, #f7f0e2 55%, #f1e8d4 100%);
  color: var(--text-primary, #252525);
  transition: opacity 0.22s var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)),
    transform 0.22s var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1));
}

.welcome.is-leaving {
  opacity: 0;
  transform: translateY(-10px);
  pointer-events: none;
}

/* Satu-satunya cahaya di halaman: matahari terbit di sisi kanan atas. */
.sky {
  position: absolute;
  top: -120px;
  right: -140px;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(244, 214, 154, 0.75) 0%, rgba(244, 214, 154, 0) 68%);
  pointer-events: none;
}

.hills {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 46%;
  pointer-events: none;
}

.parcel-line {
  fill: none;
  stroke: rgba(53, 90, 44, 0.24);
  stroke-width: 0.8;
}

.topbar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 20px;
}

.brand-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.skip {
  min-height: 44px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: var(--poliland-gold-text, #966a12);
  font: 700 14px/1 var(--font-primary, 'Plus Jakarta Sans', sans-serif);
  cursor: pointer;
}

/* Adegan maskot: tepi dipudarkan agar menyatu dengan latar krem. */
.scene {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: clamp(220px, 36dvh, 340px);
  margin: 4px 0 0;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 9%, #000 91%, transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 10%, #000 88%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image: linear-gradient(to right, transparent 0, #000 9%, #000 91%, transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 10%, #000 88%, transparent 100%);
  mask-composite: intersect;
}

.scene-stage {
  position: absolute;
  inset: 0;
  display: block;
  will-change: transform;
}

.scene-frame {
  position: absolute;
  top: 0;
  left: 50%;
  height: 100%;
  width: auto;
  max-width: none;
  transform: translateX(-52%);
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}

/* Gelembung ucapan: tidak memakai ruang layout agar teks di bawahnya tidak bergeser. */
.bubble-slot {
  position: relative;
  z-index: 3;
  height: 0;
}

.bubble {
  position: absolute;
  top: -72px;
  right: 24px;
  max-width: 190px;
  padding: 9px 14px;
  border-radius: 16px 16px 4px 16px;
  background: #fff;
  box-shadow: 0 8px 20px -8px rgba(53, 90, 44, 0.35);
  color: var(--poliland-green, #355a2c);
  font: 700 13px/1.35 var(--font-primary, 'Plus Jakarta Sans', sans-serif);
  transform-origin: bottom right;
  pointer-events: none;
}

.copy {
  position: relative;
  z-index: 2;
  padding: 12px 24px 0;
}

.headline {
  margin: 0;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(32px, 9.4vw, 42px);
  line-height: 1.08;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--text-primary, #252525);
}

/* Pembungkus memotong teks agar tiap baris naik dari garis bawahnya. */
.line {
  display: block;
  overflow: hidden;
  padding-bottom: 0.08em;
}

.line-inner {
  display: block;
  will-change: transform;
}

.lead {
  max-width: 34ch;
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-secondary, #63636a);
}

.actions {
  position: relative;
  z-index: 2;
  margin-top: auto;
  padding: 28px 24px 0;
}

.btn-primary,
.btn-ghost,
.btn-text {
  font-family: var(--font-primary, 'Plus Jakarta Sans', sans-serif);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.btn-primary {
  width: 100%;
  min-height: 56px;
  border: 0;
  border-radius: 16px;
  background: var(--poliland-green, #355a2c);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 10px 24px -10px rgba(53, 90, 44, 0.7);
}

.secondary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.btn-ghost {
  flex: 1;
  min-height: 48px;
  border: 1.5px solid rgba(53, 90, 44, 0.35);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
  color: var(--poliland-green, #355a2c);
  font-size: 14px;
  font-weight: 700;
}

.btn-text {
  min-height: 48px;
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: var(--poliland-gold-text, #966a12);
  font-size: 14px;
  font-weight: 800;
}

.btn-primary:focus-visible,
.btn-ghost:focus-visible,
.btn-text:focus-visible,
.skip:focus-visible,
.scene:focus-visible {
  outline: 3px solid var(--poliland-gold, #cba044);
  outline-offset: 3px;
}

@media (min-width: 768px) {
  .welcome {
    max-width: 520px;
    margin: 0 auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .welcome {
    transition: none;
  }
}
</style>
