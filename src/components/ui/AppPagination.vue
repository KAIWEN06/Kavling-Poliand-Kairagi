<template>
  <nav v-if="totalPages > 1" ref="root" class="app-pager" :class="{ 'app-pager--loading': loading }" :aria-label="label">
    <p v-if="showSummary && total > 0" class="app-pager__summary">
      <template v-if="pageSize">
        <strong>{{ from }}–{{ to }}</strong> dari {{ total }} data
      </template>
      <template v-else><strong>{{ total }}</strong> data</template>
    </p>

    <div class="app-pager__bar">
      <button
        type="button"
        class="app-pager__btn"
        aria-label="Halaman sebelumnya"
        :disabled="page <= 1 || loading"
        @click="go(page - 1)"
      >
        <ion-icon :icon="chevronBackOutline" aria-hidden="true" />
      </button>

      <!-- Layar kecil: indikator ringkas -->
      <span class="app-pager__compact" aria-live="polite">
        <strong>{{ page }}</strong> / {{ totalPages }}
      </span>

      <!-- Layar lebar: nomor halaman -->
      <ul class="app-pager__numbers">
        <li v-for="(token, index) in pages" :key="token ?? `gap-${index}`">
          <span v-if="token === null" class="app-pager__gap" aria-hidden="true">…</span>
          <button
            v-else
            type="button"
            class="app-pager__num"
            :class="{ 'is-active': token === page }"
            :aria-current="token === page ? 'page' : undefined"
            :aria-label="`Halaman ${token}`"
            :disabled="loading"
            @click="go(token)"
          >
            {{ token }}
          </button>
        </li>
      </ul>

      <button
        type="button"
        class="app-pager__btn"
        aria-label="Halaman berikutnya"
        :disabled="page >= totalPages || loading"
        @click="go(page + 1)"
      >
        <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { IonIcon } from '@ionic/vue'
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons'
import { buildPageWindow } from '@/composables/usePagination'

const props = withDefaults(defineProps<{
  page: number
  totalPages: number
  /** Jumlah seluruh data. Bila 0, ringkasan disembunyikan. */
  total?: number
  /** Ukuran halaman; dipakai untuk ringkasan "1–10 dari 47". */
  pageSize?: number
  label?: string
  loading?: boolean
  showSummary?: boolean
  /** Selector elemen yang digulir ke atas setelah pindah halaman. Bawaan: induk langsung pager. */
  scrollTo?: string
}>(), { total: 0, pageSize: 0, label: 'Navigasi halaman', loading: false, showSummary: true, scrollTo: '' })

const emit = defineEmits<{ (event: 'update:page', value: number): void }>()
const root = ref<HTMLElement | null>(null)

const pages = computed(() => buildPageWindow(props.page, props.totalPages))
const from = computed(() => (props.page - 1) * props.pageSize + 1)
const to = computed(() => Math.min(props.total, props.page * props.pageSize))

async function go(next: number) {
  const target = Math.min(Math.max(1, next), props.totalPages)
  if (target === props.page || props.loading) return
  const anchor = (props.scrollTo ? document.querySelector<HTMLElement>(props.scrollTo) : null) ?? root.value?.parentElement ?? null
  emit('update:page', target)
  await nextTick()
  if (anchor) {
    anchor.style.scrollMarginTop = '96px'
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<style scoped>
.app-pager {
  display: grid;
  gap: 10px;
  justify-items: center;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border-default);
  transition: opacity 160ms var(--ease-out, ease);
}
.app-pager--loading { opacity: 0.6; }

.app-pager__summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.35;
}
.app-pager__summary strong { color: var(--text-primary); font-weight: var(--font-weight-bold); }

.app-pager__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  max-width: 320px;
}

.app-pager__btn,
.app-pager__num {
  display: inline-grid;
  place-items: center;
  min-width: 44px;
  height: 44px;
  padding: 0 10px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  font-weight: var(--font-weight-bold);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
  transition: transform 120ms var(--ease-spring, ease), background-color 120ms var(--ease-out, ease), border-color 120ms var(--ease-out, ease);
}
.app-pager__btn { font-size: 20px; }
.app-pager__btn:active:not(:disabled),
.app-pager__num:active:not(:disabled) { transform: scale(0.97); }
.app-pager__btn:disabled,
.app-pager__num:disabled { opacity: 0.4; cursor: default; }
.app-pager__num.is-active {
  border-color: var(--poliland-green);
  background: var(--poliland-green);
  color: #fff;
  opacity: 1;
}
.app-pager__btn:focus-visible,
.app-pager__num:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }

@media (hover: hover) and (pointer: fine) {
  .app-pager__btn:not(:disabled):hover,
  .app-pager__num:not(:disabled):not(.is-active):hover {
    border-color: var(--poliland-green);
    background: var(--status-success-bg);
  }
}

.app-pager__compact {
  flex: 1;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.app-pager__compact strong { color: var(--text-primary); font-weight: var(--font-weight-bold); }

.app-pager__numbers { display: none; }
.app-pager__gap {
  display: inline-grid;
  place-items: center;
  min-width: 28px;
  height: 44px;
  color: var(--text-secondary);
}

@media (min-width: 640px) {
  .app-pager {
    grid-template-columns: minmax(0, 1fr) auto;
    justify-items: stretch;
    align-items: center;
    gap: 16px;
  }
  .app-pager__summary { grid-column: 1; }
  .app-pager:not(:has(.app-pager__summary)) { grid-template-columns: 1fr; justify-items: end; }
  .app-pager__bar { grid-column: 2; width: auto; max-width: none; justify-content: flex-end; gap: 6px; }
  .app-pager__compact { display: none; }
  .app-pager__numbers {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-pager,
  .app-pager__btn,
  .app-pager__num { transition: none; }
}
</style>
