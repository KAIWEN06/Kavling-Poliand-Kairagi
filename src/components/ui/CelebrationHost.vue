<template>
  <Transition name="cel">
    <div
      v-if="current"
      :key="current.id"
      class="cel"
      :class="`cel--${current.tone}`"
      role="status"
      aria-live="polite"
      @click="close"
    >
      <span class="cel__glow" aria-hidden="true" />

      <div class="cel__body">
        <div class="cel__mark" aria-hidden="true">
          <span class="cel__pulse" />
          <span class="cel__pulse cel__pulse--late" />
          <span
            v-for="(p, i) in particles"
            :key="i"
            class="cel__dot"
            :style="{ '--dx': p.dx, '--dy': p.dy, '--d': p.delay, '--s': p.size }"
          />
          <svg class="cel__svg" viewBox="0 0 120 120" fill="none">
            <circle class="cel__disc" cx="60" cy="60" r="52" />
            <circle class="cel__ring" cx="60" cy="60" r="52" pathLength="1" />
            <path
              v-if="current.tone === 'success'"
              class="cel__stroke"
              d="M38 62.5l16 16L84 46"
              pathLength="1"
            />
            <path
              v-else
              class="cel__stroke"
              d="M44 44l32 32M76 44L44 76"
              pathLength="1"
            />
          </svg>
        </div>

        <h2 class="cel__title">{{ current.title }}</h2>
        <p v-if="current.message" class="cel__msg">{{ current.message }}</p>
        <button class="cel__done" type="button" @click.stop="close">Lanjut</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useCelebration } from '@/composables/useCelebration'

const { current, close } = useCelebration()

// 16 titik cahaya menyebar dari pusat; sudut dan jarak tetap agar tidak acak tiap render.
const particles = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + (i % 2 ? 0.12 : 0)
  const radius = i % 2 ? 118 : 86
  return {
    dx: `${Math.round(Math.cos(angle) * radius)}px`,
    dy: `${Math.round(Math.sin(angle) * radius)}px`,
    delay: `${520 + (i % 4) * 40}ms`,
    size: i % 3 === 0 ? '9px' : '6px',
  }
})
</script>

<style scoped>
.cel {
  --cel-accent: var(--gold-500);
  --cel-bg: var(--surface-forest);
  position: fixed;
  inset: 0;
  z-index: var(--nt-z-celebration);
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: calc(var(--space-6) + env(safe-area-inset-top, 0px)) var(--space-6) calc(var(--space-6) + var(--safe-bottom));
  background: var(--cel-bg);
  color: var(--on-forest);
  overflow: hidden;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}
.cel--rejected { --cel-accent: #F2A394; }

/* Cahaya emas di pojok kanan atas, sama seperti panel hero. */
.cel__glow {
  position: absolute;
  top: -22vmax;
  right: -22vmax;
  width: 70vmax;
  height: 70vmax;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--cel-accent) 38%, transparent) 0%, transparent 65%);
  opacity: 0;
  animation: cel-glow 900ms var(--ease-out) 120ms forwards;
  pointer-events: none;
}

.cel__body {
  position: relative;
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  max-width: 340px;
  text-align: center;
}

.cel__mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 148px;
  height: 148px;
  margin-bottom: var(--space-4);
}
.cel__svg {
  width: 120px;
  height: 120px;
  overflow: visible;
  transform-origin: center;
  animation: cel-pop 620ms var(--ease-spring) 80ms both;
}
.cel__disc { fill: color-mix(in srgb, var(--cel-accent) 16%, transparent); }
.cel__ring,
.cel__stroke {
  stroke: var(--cel-accent);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}
.cel__ring { stroke-width: 4; transform: rotate(-90deg); transform-origin: center; animation: cel-draw 620ms var(--ease-out) 160ms forwards; }
.cel__stroke { stroke-width: 7; animation: cel-draw 420ms var(--ease-out) 560ms forwards; }

.cel__pulse {
  position: absolute;
  inset: 14px;
  border-radius: 50%;
  border: 2px solid var(--cel-accent);
  opacity: 0;
  animation: cel-pulse 1100ms var(--ease-out) 520ms forwards;
}
.cel__pulse--late { animation-delay: 700ms; }

.cel__dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--s);
  height: var(--s);
  margin: calc(var(--s) / -2) 0 0 calc(var(--s) / -2);
  border-radius: 50%;
  background: var(--cel-accent);
  opacity: 0;
  animation: cel-burst 900ms var(--ease-out) var(--d) forwards;
}
.cel__dot:nth-of-type(3n) { background: var(--on-forest); }

.cel__title {
  margin: 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: clamp(1.6rem, 7vw, 2rem);
  line-height: 1.15;
  font-weight: 600;
  color: var(--on-forest);
  opacity: 0;
  animation: cel-rise 520ms var(--ease-out) 640ms forwards;
}
.cel__msg {
  margin: 0;
  font-size: var(--text-md);
  line-height: 1.5;
  color: var(--on-forest-muted);
  opacity: 0;
  animation: cel-rise 520ms var(--ease-out) 760ms forwards;
}
.cel__done {
  min-width: 140px;
  min-height: 48px;
  margin-top: var(--space-4);
  padding: 0 var(--space-6);
  border: 0;
  border-radius: 999px;
  background: var(--cel-accent);
  color: var(--text-primary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  opacity: 0;
  animation: cel-rise 520ms var(--ease-out) 900ms forwards;
  transition: transform var(--dur-fast) var(--ease-spring);
}
.cel__done:active { transform: scale(0.97); }

/* Masuk dan keluar layar */
.cel-enter-active { transition: opacity var(--dur-base) var(--ease-out); }
.cel-leave-active { transition: opacity var(--dur-fast) var(--ease-in), transform var(--dur-fast) var(--ease-in); }
.cel-enter-from,
.cel-leave-to { opacity: 0; }
.cel-leave-to { transform: scale(1.03); }

@keyframes cel-glow { to { opacity: 1; } }
@keyframes cel-pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes cel-draw { to { stroke-dashoffset: 0; } }
@keyframes cel-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes cel-pulse { from { opacity: 0.55; transform: scale(0.9); } to { opacity: 0; transform: scale(1.9); } }
@keyframes cel-burst {
  0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .cel__glow, .cel__svg, .cel__title, .cel__msg, .cel__done { animation: none; opacity: 1; transform: none; }
  .cel__ring, .cel__stroke { animation: none; stroke-dashoffset: 0; }
  .cel__pulse, .cel__dot { display: none; }
  .cel-leave-to { transform: none; }
}
</style>
