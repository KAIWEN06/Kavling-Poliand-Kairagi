<template>
  <section class="state-screen" :class="{ 'is-busy': busy }" :role="busy ? 'status' : undefined" :aria-busy="busy ? 'true' : undefined">
    <SceneBackdrop class="state-scene" height="46%" breathe sparkle />

    <div class="state-copy">
      <Reveal :order="0">
        <span v-if="mark" class="state-mark" aria-hidden="true">{{ mark }}</span>
        <span v-else-if="busy" class="state-spinner" aria-hidden="true"></span>
      </Reveal>
      <Reveal :order="1">
        <h1 class="state-title">{{ title }}</h1>
      </Reveal>
      <Reveal v-if="description" :order="2">
        <p class="state-text">{{ description }}</p>
      </Reveal>
      <Reveal v-if="actionLabel" :order="3">
        <button class="state-btn" type="button" @click="$emit('action')">{{ actionLabel }}</button>
      </Reveal>
      <Reveal v-if="secondaryLabel" :order="4">
        <button class="state-link" type="button" @click="$emit('secondary')">{{ secondaryLabel }}</button>
      </Reveal>
    </div>
  </section>
</template>

<script setup lang="ts">
import Reveal from '@/components/ui/Reveal.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'

/**
 * Layar status penuh bergaya Welcome: hero hijau hutan, matahari, bukit, judul serif.
 * Dipakai 404, Maintenance, dan status muat/gagal pada Panorama.
 */
withDefaults(
  defineProps<{
    title: string
    description?: string
    actionLabel?: string
    secondaryLabel?: string
    /** Sedang memuat: tampilkan indikator berputar. */
    busy?: boolean
    /** Penanda teks pendek (mis. "404") di atas judul. */
    mark?: string
  }>(),
  { description: '', actionLabel: '', secondaryLabel: '', busy: false, mark: '' },
)

defineEmits<{ (e: 'action'): void; (e: 'secondary'): void }>()
</script>

<style scoped>
.state-screen {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  min-height: 100dvh;
  padding: calc(var(--safe-top) + 32px) 28px calc(var(--safe-bottom) + 32px);
  overflow: hidden;
  background:
    radial-gradient(110% 60% at 100% 0%, rgba(244, 214, 154, 0.26) 0%, rgba(244, 214, 154, 0) 62%),
    linear-gradient(165deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  color: #fff;
}

.state-scene { z-index: 1; }

.state-copy {
  position: relative;
  z-index: 3;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding-bottom: 22vh; /* ruang untuk bukit */
}

.state-mark {
  display: block;
  margin-bottom: 12px;
  color: var(--poliland-gold-soft, #f4d69a);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(64px, 22vw, 96px);
  line-height: 1;
  font-weight: 650;
  letter-spacing: -0.03em;
}

.state-spinner {
  display: block;
  width: 32px;
  height: 32px;
  margin-bottom: 18px;
  border: 3px solid rgba(244, 214, 154, 0.25);
  border-top-color: var(--poliland-gold-soft, #f4d69a);
  border-radius: 50%;
  animation: state-spin 0.9s linear infinite;
}

.state-title {
  margin: 0;
  color: #fff;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(30px, 8.6vw, 40px);
  line-height: 1.1;
  font-weight: 650;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.state-text {
  max-width: 34ch;
  margin: 14px 0 0;
  color: rgba(244, 241, 232, 0.9);
  font-size: 16px;
  line-height: 1.6;
  text-wrap: pretty;
}

.state-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  margin-top: 26px;
  padding: 0 28px;
  border: 0;
  border-radius: 14px;
  background: var(--poliland-gold, #cba044);
  color: var(--ink, #1b1f1a);
  font: 800 15px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  box-shadow: 0 12px 26px -10px rgba(203, 160, 68, 0.85);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base, 200ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
}
.state-btn:active { transform: scale(0.97); }
.state-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }

.state-link {
  display: block;
  min-height: 44px;
  margin-top: 8px;
  padding: 0 4px;
  border: 0;
  background: none;
  color: var(--poliland-gold-soft, #f4d69a);
  font: 700 14px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.state-link:active { opacity: 0.75; }
.state-link:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }

@keyframes state-spin { to { transform: rotate(360deg); } }

@media (min-width: 768px) {
  .state-copy { max-width: 480px; }
}

@media (prefers-reduced-motion: reduce) {
  .state-spinner { animation-duration: 2.4s; }
  .state-btn:active { transform: none; }
}
</style>
