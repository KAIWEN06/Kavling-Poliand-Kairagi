<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import type { ClientSpkRecord } from '@/services/clientSpkService'
import { getSpkProcessSteps, stepIsDone, type SpkProcessStep } from '@/services/spkProcessService'

const props = defineProps<{
  spks: ClientSpkRecord[]
  /** Pembelian yang dibuat tanpa pengajuan dari aplikasi tidak punya tahap yang bisa dihitung. */
  hasPurchase: boolean
}>()

const router = useRouter()

const STAGES = ['Pilih kavling', 'Ajukan SPK', 'Tanda tangan SPK', 'Notaris sampai serah terima']

/* Daftar SPK sudah diurutkan dari yang terbaru. */
const activeSpk = computed(() =>
  props.spks.find((spk) => ['Submitted', 'Under Review', 'Approved'].includes(spk.status)) ?? null,
)

const steps = ref<SpkProcessStep[]>([])
const stepsState = ref<'loading' | 'ready' | 'error'>('ready')
let requestVersion = 0

watch(
  // Setiap pemuatan ulang daftar SPK juga menyegarkan tahapannya.
  () => props.spks,
  async () => {
    const version = ++requestVersion
    const spk = activeSpk.value
    if (spk?.status !== 'Approved') {
      steps.value = []
      stepsState.value = 'ready'
      return
    }
    if (!steps.value.length) stepsState.value = 'loading'
    try {
      const rows = await getSpkProcessSteps(spk.id)
      if (version !== requestVersion) return
      steps.value = rows
      stepsState.value = 'ready'
    } catch (error) {
      console.error('[Beranda Klien] Gagal memuat tahapan proses:', error)
      if (version === requestVersion && !steps.value.length) stepsState.value = 'error'
    }
  },
  { immediate: true },
)

/** Indeks tahap yang sedang berjalan; sama dengan jumlah tahap bila semuanya selesai. */
const current = computed(() => {
  const spk = activeSpk.value
  if (!spk) return 0
  if (spk.status !== 'Approved') return 1
  if (steps.value.length && steps.value.every((step) => step.status === 'done')) return STAGES.length
  return stepIsDone(steps.value, 'ttd_spk') ? 3 : 2
})

const visible = computed(() => (activeSpk.value ? stepsState.value === 'ready' : !props.hasPurchase))

const note = computed(() => {
  if (current.value === STAGES.length) return 'Semua tahap selesai.'
  return [
    'Kavling berstatus Tersedia bisa langsung diajukan.',
    'Admin sedang memeriksa pengajuan Anda.',
    'SPK disetujui. Pantau jadwal tanda tangan di Dokumen.',
    'Proses berlanjut sampai sertifikat Anda terima.',
  ][current.value]
})
</script>

<template>
  <section v-if="visible" class="journey" aria-labelledby="journey-title">
    <header>
      <h2 id="journey-title">Perjalanan pembelian</h2>
      <span v-if="activeSpk">Kavling {{ activeSpk.lot.name }}</span>
    </header>

    <ol>
      <li
        v-for="(stage, index) in STAGES"
        :key="stage"
        :class="{ 'is-done': index < current, 'is-current': index === current }"
        :aria-current="index === current ? 'step' : undefined"
      >
        <span class="journey__mark" aria-hidden="true">{{ index < current ? '✓' : index + 1 }}</span>
        <span>
          {{ stage }}
          <span v-if="index < current" class="journey__sr">, selesai</span>
        </span>
      </li>
    </ol>

    <p>{{ note }}</p>
    <AppButton v-if="activeSpk" size="small" fill="outline" @click="router.push('/client/dokumen')">
      Buka Dokumen
    </AppButton>
  </section>
</template>

<style scoped>
.journey {
  display: grid;
  justify-items: start;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
}

.journey header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
  width: 100%;
}

.journey h2 {
  margin: 0;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 18px;
  font-weight: 700;
}

.journey header span,
.journey p {
  color: var(--text-secondary, #5f5f66);
  font-size: 13px;
}

.journey p {
  margin: 0;
  line-height: 1.55;
}

.journey ol {
  display: grid;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.journey li {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 40px;
  color: var(--text-secondary, #5f5f66);
  font-size: 14px;
}

/* Garis penghubung antar tahap. */
.journey li + li::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 13px;
  width: 2px;
  height: 12px;
  background: var(--border-default, #eae7e0);
}

.journey li.is-done + li::before {
  background: var(--poliland-green, #355a2c);
}

.journey__mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1.5px solid var(--border-default, #eae7e0);
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.journey li.is-done {
  color: var(--text-primary, #252525);
}

.journey li.is-done .journey__mark {
  border-color: var(--poliland-green, #355a2c);
  background: var(--poliland-green, #355a2c);
  color: #fff;
}

.journey li.is-current {
  color: var(--text-primary, #252525);
  font-weight: 800;
}

.journey li.is-current .journey__mark {
  border: 2px solid var(--poliland-green, #355a2c);
  color: var(--poliland-green, #355a2c);
}

.journey__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
