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
          <!-- Garis petak kavling di bukit depan -->
          <motion.g
            class="parcel-lines"
            :initial="reduced ? false : { opacity: 0 }"
            :animate="{ opacity: 1 }"
            :transition="{ duration: 0.6, delay: 0.7 }"
          >
            <path d="M0 176 C90 160 170 168 250 156 S350 150 390 154" />
            <path d="M0 196 C100 182 180 190 260 178 S350 172 390 176" />
            <path d="M120 163 L96 220 M200 160 L190 220 M278 154 L296 220" />
          </motion.g>
        </svg>

        <header class="topbar">
          <motion.img
            :src="logo"
            alt="PoliLand Kairagi"
            class="brand-logo"
            width="40"
            height="40"
            :initial="reduced ? false : { opacity: 0, scale: 0.8 }"
            :animate="{ opacity: 1, scale: 1 }"
            :transition="{ duration: 0.5, delay: 0.1, ease: MOTION_EASE_OUT }"
          />
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

        <!-- Maskot menyapa di depan pintu. Ketuk untuk melambai lagi. -->
        <motion.button
          type="button"
          class="scene"
          aria-label="Ketuk maskot PoliLand untuk melihatnya melambai"
          :initial="reduced ? false : { opacity: 0, scale: 1.06, y: 14 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.9, delay: 0.15, ease: MOTION_EASE_OUT }"
          :while-tap="reduced ? undefined : { scale: 0.97 }"
          @click="playWave"
        >
          <img
            :src="currentFrame"
            class="scene-frame"
            alt=""
            width="1280"
            height="720"
            draggable="false"
            fetchpriority="high"
          />
        </motion.button>

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
            Kavling dengan legalitas jelas dan akses jalan yang baik. Lihat denahnya, pilih petaknya, pantau
            prosesnya dari ponsel Anda.
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
            Masuk ke akun
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
              Lihat kavling dulu
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '@/assets/logos/logo.png'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { MOTION_EASE_OUT } from '@/utils/motionTokens'
import { mascotAnimations } from '@/data/mascotAnimations'

const router = useRouter()
const reduced = useReducedMotion()

const headlineLines = ['Kavling impian', 'Anda dimulai', 'dari pintu ini.']

/** Tiga lapis bukit, dari belakang ke depan. Warna hijau merek dengan opasitas rendah. */
const hills = [
  { d: 'M0 120 C70 96 150 112 230 98 S350 84 390 96 L390 220 L0 220 Z', fill: 'rgba(203,160,68,0.16)' },
  { d: 'M0 150 C80 126 160 142 240 128 S350 118 390 128 L390 220 L0 220 Z', fill: 'rgba(92,141,78,0.16)' },
  { d: 'M0 174 C90 156 170 166 250 154 S350 146 390 152 L390 220 L0 220 Z', fill: 'rgba(53,90,44,0.14)' },
]

/* ---------- Animasi lambaian maskot (frame sequence) ---------- */

const FRAME_COUNT = 57
const FRAME_DURATION = 40
const frameUrl = (n: number) =>
  `/mascot-frames/${mascotAnimations.wave}/frame-${String(n).padStart(4, '0')}.webp`

const frameIndex = ref(1)
const currentFrame = computed(() => frameUrl(frameIndex.value))

let waveTimer: number | null = null
let waveStartTimer: number | null = null
let framesReady = false

const preloadFrames = () =>
  Promise.all(
    Array.from({ length: FRAME_COUNT }, (_, i) =>
      new Promise<void>((resolve) => {
        const image = new Image()
        image.onload = () => resolve()
        image.onerror = () => resolve()
        image.src = frameUrl(i + 1)
      }),
    ),
  ).then(() => {
    framesReady = true
  })

const stopWave = () => {
  if (waveTimer !== null) {
    window.clearInterval(waveTimer)
    waveTimer = null
  }
}

const playWave = () => {
  if (reduced.value || !framesReady || waveTimer !== null) return
  frameIndex.value = 1
  waveTimer = window.setInterval(() => {
    if (frameIndex.value < FRAME_COUNT) {
      frameIndex.value++
    } else {
      stopWave()
    }
  }, FRAME_DURATION)
}

onMounted(async () => {
  await preloadFrames()
  // Lambaian pertama berjalan sekali, setelah judul selesai muncul.
  waveStartTimer = window.setTimeout(playWave, 350)
})

onBeforeUnmount(() => {
  stopWave()
  if (waveStartTimer !== null) window.clearTimeout(waveStartTimer)
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

.parcel-lines path {
  fill: none;
  stroke: rgba(53, 90, 44, 0.22);
  stroke-width: 0.8;
  stroke-dasharray: 3 4;
}

.topbar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 14%, #000 86%, transparent 100%),
    linear-gradient(to bottom, #000 78%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image: linear-gradient(to right, transparent 0, #000 14%, #000 86%, transparent 100%),
    linear-gradient(to bottom, #000 78%, transparent 100%);
  mask-composite: intersect;
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
