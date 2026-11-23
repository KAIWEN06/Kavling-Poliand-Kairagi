<template>
  <section
    class="status-state"
    :class="[
      `status-state--${size}`,
      { 'status-state--fill': fill, 'status-state--framed': framed },
    ]"
    :role="def.role"
    :aria-busy="def.busy ? 'true' : undefined"
    :data-variant="key"
  >
    <div class="status-state__art" aria-hidden="true">
      <img
        v-if="!imageFailed"
        class="status-state__img"
        :src="def.image"
        alt=""
        width="1536"
        height="1024"
        decoding="async"
        :loading="eager ? 'eager' : 'lazy'"
        draggable="false"
        @error="imageFailed = true"
      />
      <!-- Fallback aman bila file gambar gagal dimuat -->
      <svg
        v-else
        class="status-state__fallback"
        viewBox="0 0 120 80"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M30 70 V38 L60 14 L90 38 V70 Z" class="fb-house" />
        <rect x="50" y="46" width="20" height="24" rx="3" class="fb-door" />
        <circle cx="92" cy="22" r="7" class="fb-dot" />
      </svg>
    </div>

    <component :is="`h${headingLevel}`" class="status-state__title">{{ titleText }}</component>
    <p class="status-state__text">{{ descriptionText }}</p>

    <ion-spinner v-if="def.busy" class="status-state__spinner" name="dots" aria-hidden="true" />

    <div v-if="hasPrimary || hasSecondary" class="status-state__actions">
      <AppButton
        v-if="hasPrimary"
        expand="block"
        size="large"
        variant="primary"
        :loading="actionLoading"
        @click="onAction?.()"
      >
        {{ actionLabel || def.actionLabel }}
      </AppButton>
      <AppButton
        v-if="hasSecondary"
        expand="block"
        size="large"
        variant="neutral"
        fill="outline"
        @click="onSecondaryAction?.()"
      >
        {{ secondaryActionLabel }}
      </AppButton>
    </div>

    <!-- Slot opsional untuk konten tambahan (kompatibilitas EmptyState lama) -->
    <div v-if="$slots.default" class="status-state__extra">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IonSpinner } from '@ionic/vue'
import AppButton from '@/components/ui/AppButton.vue'
import {
  STATUS_REGISTRY,
  resolveVariant,
  type StatusVariantAlias,
} from '@/components/ui/state/stateRegistry'

const props = withDefaults(
  defineProps<{
    variant: StatusVariantAlias
    /** Judul singkat. Kosong -> teks default varian. */
    title?: string
    /** Penyebab + langkah berikutnya. Kosong -> teks default varian. */
    description?: string
    /** Tombol utama. Tampil bila `onAction` diberikan. */
    actionLabel?: string
    onAction?: () => void
    /** Tombol sekunder. Tampil bila label dan handler diberikan. */
    secondaryActionLabel?: string
    onSecondaryAction?: () => void
    /** Spinner pada tombol utama (mis. sedang memuat ulang). */
    actionLoading?: boolean
    /** sm = di dalam kartu/popup, md = daftar/halaman, lg = layar penuh. */
    size?: 'sm' | 'md' | 'lg'
    /** Pusatkan secara vertikal pada ruang yang tersedia. */
    fill?: boolean
    /** Kotak putus-putus untuk state di dalam daftar. */
    framed?: boolean
    /** Muat gambar segera (state di atas lipatan layar). */
    eager?: boolean
    headingLevel?: 2 | 3 | 4
  }>(),
  {
    title: '',
    description: '',
    actionLabel: '',
    secondaryActionLabel: '',
    actionLoading: false,
    size: 'md',
    fill: false,
    framed: false,
    eager: false,
    headingLevel: 2,
  },
)

const key = computed(() => resolveVariant(props.variant))
const def = computed(() => STATUS_REGISTRY[key.value])
const titleText = computed(() => props.title || def.value.title)
const descriptionText = computed(() => props.description || def.value.description)
const hasPrimary = computed(() => typeof props.onAction === 'function')
const hasSecondary = computed(
  () => typeof props.onSecondaryAction === 'function' && !!props.secondaryActionLabel,
)

const imageFailed = ref(false)
watch(key, () => { imageFailed.value = false })
</script>

<style scoped>
.status-state {
  box-sizing: border-box;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  text-align: center;
  overflow-wrap: anywhere;
}

/* Di tengah ruang konten yang tersedia (aman di layar kecil & keyboard) */
.status-state--fill {
  min-height: var(--status-state-min-height, 60dvh);
  padding-bottom: calc(var(--space-8) + env(safe-area-inset-bottom, 0px));
}

.status-state--framed {
  background: var(--surface-primary);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-card);
}

/* Ilustrasi: rasio tetap 3:2, tidak pecah / terpotong */
.status-state__art {
  width: var(--status-art-w);
  aspect-ratio: 3 / 2;
  margin-bottom: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.status-state--sm { --status-art-w: min(150px, 46vw); padding-block: var(--space-5); }
.status-state--md { --status-art-w: min(240px, 66vw); }
.status-state--lg { --status-art-w: min(300px, 78vw); }

.status-state__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.status-state__fallback { width: 70%; height: auto; stroke: var(--green-700); stroke-width: 2.5; }
.fb-house { fill: var(--surface-primary); }
.fb-door { fill: var(--gold-50); stroke: var(--gold-700); }
.fb-dot { fill: var(--gold-100); stroke: var(--gold-700); }

.status-state__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-primary);
  text-wrap: balance;
}
.status-state--sm .status-state__title { font-size: var(--text-lg, 1.0625rem); }

.status-state__text {
  margin: 0;
  max-width: 36ch;
  font-size: var(--text-md);
  line-height: var(--leading-body);
  color: var(--text-secondary);
  text-wrap: pretty;
}

.status-state__spinner { color: var(--poliland-green); width: 40px; height: 24px; }

.status-state__actions {
  width: min(100%, 320px);
  margin-top: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.status-state__actions :deep(ion-button) { margin: 0; }

.status-state__extra {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

@media (max-width: 360px) {
  .status-state { padding-inline: var(--space-3); }
  .status-state__title { font-size: var(--text-lg, 1.0625rem); }
}
/* Layar landscape / pendek: perkecil ilustrasi agar CTA tetap terlihat */
@media (max-height: 520px) {
  .status-state--md, .status-state--lg { --status-art-w: min(150px, 34vh); }
}
</style>
