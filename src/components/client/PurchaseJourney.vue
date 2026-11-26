<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import type { ClientSpkRecord } from '@/services/clientSpkService'
import { getSpkProcessSteps, stepIsDone, type SpkProcessStep } from '@/services/spkProcessService'

const props = defineProps<{
  /** SPK aktif milik pesanan yang sedang dipilih. */
  spk: ClientSpkRecord | null
  /** Pembelian yang dibuat tanpa pengajuan dari aplikasi tidak punya tahap yang bisa dihitung. */
  hasPurchase: boolean
  /** Tampilkan nama kavling bila tidak ada kartu lain yang menyebutnya. */
  showLot: boolean
}>()

const router = useRouter()

const STAGES = ['Pilih kavling', 'Ajukan SPK', 'Tanda tangan SPK', 'Notaris sampai serah terima']

const steps = ref<SpkProcessStep[]>([])
const stepsState = ref<'loading' | 'ready' | 'error'>('ready')
let requestVersion = 0

let loadedSpkId: number | null = null
let resolvedSpkId: number | null = null

async function loadSteps() {
  const version = ++requestVersion
  const spk = props.spk
  // Tahapan pesanan sebelumnya tidak boleh tampil untuk pesanan yang baru dipilih.
  if ((spk?.id ?? null) !== loadedSpkId) {
    loadedSpkId = spk?.id ?? null
    steps.value = []
  }
  if (spk?.status !== 'Approved') {
    steps.value = []
    resolvedSpkId = null
    stepsState.value = 'ready'
    return
  }
  // Hanya pesanan yang tahapannya belum pernah termuat; muat ulang tidak mengosongkan penanda.
  if (resolvedSpkId !== spk.id) stepsState.value = 'loading'
  try {
    const rows = await getSpkProcessSteps(spk.id)
    if (version !== requestVersion) return
    steps.value = rows
    resolvedSpkId = spk.id
    stepsState.value = 'ready'
  } catch (error) {
    console.error('[Beranda Klien] Gagal memuat tahapan proses:', error)
    if (version === requestVersion && resolvedSpkId !== spk.id) stepsState.value = 'error'
  }
}

// Setiap pemuatan ulang daftar SPK memberi objek baru, jadi tahapannya ikut segar.
watch(() => props.spk, loadSteps, { immediate: true })

/** Indeks tahap yang sedang berjalan; sama dengan jumlah tahap bila semuanya selesai. */
const current = computed(() => {
  const spk = props.spk
  if (!spk) return 0
  if (spk.status !== 'Approved') return 1
  if (steps.value.length && steps.value.every((step) => step.status === 'done')) return STAGES.length
  return stepIsDone(steps.value, 'ttd_spk') ? 3 : 2
})

/* Kartu tetap menempati ruangnya selama tahapan dimuat agar isi di bawahnya tidak terdorong. */
const visible = computed(() => Boolean(props.spk) || !props.hasPurchase)
const pending = computed(() => stepsState.value === 'loading')
/** -1 selama memuat: belum ada tahap yang ditandai. */
const marked = computed(() => (pending.value ? -1 : current.value))

const note = computed(() => {
  if (current.value === STAGES.length) return 'Semua tahap selesai.'
  return [
    'Kavling berstatus Tersedia bisa langsung diajukan.',
    'Admin sedang memeriksa pengajuan Anda.',
    'SPK disetujui. Jadwal tanda tangan ada di detail pengajuan.',
    'Proses berlanjut sampai sertifikat Anda terima.',
  ][current.value]
})
</script>

<template>
  <section v-if="visible" class="journey" aria-labelledby="journey-title" :aria-busy="pending">
    <header>
      <h2 id="journey-title">Perjalanan pembelian</h2>
      <span v-if="spk && showLot">Kavling {{ spk.lot.name }}</span>
    </header>

    <template v-if="stepsState === 'error'">
      <p role="alert">Tahapan proses belum bisa dimuat.</p>
      <AppButton size="small" fill="outline" @click="loadSteps">Coba lagi</AppButton>
    </template>

    <template v-else>
      <ol>
        <li
          v-for="(stage, index) in STAGES"
          :key="stage"
          :class="{ 'is-done': index < marked, 'is-current': index === marked }"
          :aria-current="index === marked ? 'step' : undefined"
        >
          <span class="journey__mark" aria-hidden="true">{{ index < marked ? '✓' : index + 1 }}</span>
          <span>
            {{ stage }}
            <span v-if="index < marked" class="journey__sr">, selesai</span>
          </span>
        </li>
      </ol>

      <p class="journey__note" :class="{ 'is-pending': pending }">{{ note }}</p>
      <AppButton
        v-if="spk"
        size="small"
        fill="outline"
        @click="router.push({ path: '/client/dokumen', query: { spk_id: spk.id } })"
      >
        Buka SPK
      </AppButton>
    </template>
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
  transition:
    background-color var(--dur-base, 240ms) var(--ease-out, ease-out),
    border-color var(--dur-base, 240ms) var(--ease-out, ease-out),
    color var(--dur-base, 240ms) var(--ease-out, ease-out);
}

.journey__note {
  transition: opacity var(--dur-base, 240ms) var(--ease-out, ease-out);
}

.journey__note.is-pending {
  opacity: 0;
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

@media (prefers-reduced-motion: reduce) {
  .journey__mark {
    transition: none;
  }
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
