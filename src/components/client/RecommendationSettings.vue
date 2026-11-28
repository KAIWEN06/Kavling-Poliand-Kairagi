<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { askNotificationPermission } from '@/composables/useNotificationPrompt'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { recommendationService, type RecommendationSettings } from '@/services/recommendationService'

const toast = useToast()
const { confirm } = useConfirm()

/* null: fiturnya belum ada atau statusnya belum terbaca, bagian ini disembunyikan. */
const settings = ref<RecommendationSettings | null>(null)
const saving = ref(false)

async function refresh() {
  try {
    settings.value = await recommendationService.getSettings()
  } catch (error) {
    console.error('[Rekomendasi] Gagal membaca pengaturan:', error)
  }
}

async function change(key: keyof RecommendationSettings, event: Event) {
  const input = event.target as HTMLInputElement
  const next = input.checked
  saving.value = true
  try {
    await recommendationService.saveSettings({ [key]: next })
    if (settings.value) settings.value = { ...settings.value, [key]: next }
    if (key === 'matchAlerts' && next) {
      void askNotificationPermission('Supaya kabar kavling yang cocok sampai ke HP Anda.', { requested: true })
    }
  } catch (error) {
    console.error('[Rekomendasi] Gagal menyimpan pengaturan:', error)
    input.checked = !next
    toast.error('Pengaturan belum tersimpan. Coba lagi.')
  } finally {
    saving.value = false
  }
}

async function clearHistory() {
  const ok = await confirm({
    title: 'Hapus riwayat lihat?',
    message: 'Rekomendasi dihitung ulang dari kavling yang Anda simpan atau pesan.',
    confirmText: 'Hapus',
    tone: 'error',
  })
  if (!ok) return
  try {
    await recommendationService.clearHistory()
    toast.success('Riwayat lihat sudah dihapus.')
  } catch (error) {
    console.error('[Rekomendasi] Gagal menghapus riwayat:', error)
    toast.error('Riwayat belum terhapus. Coba lagi.')
  }
}

onMounted(() => void refresh())
defineExpose({ refresh })
</script>

<template>
  <section v-if="settings" class="pref" aria-labelledby="pref-title">
    <h2 id="pref-title">Rekomendasi</h2>

    <label class="pref__row">
      <span>
        <strong>Simpan riwayat lihat</strong>
        <small>Dipakai memilih kavling yang cocok. Tidak ditampilkan ke staf.</small>
      </span>
      <input
        type="checkbox"
        role="switch"
        :checked="settings.viewHistory"
        :disabled="saving"
        @change="change('viewHistory', $event)"
      />
    </label>

    <label class="pref__row">
      <span>
        <strong>Kabari kaveling yang cocok</strong>
        <small>Saat harga turun atau tersedia lagi. Paling sering sekali dalam 3 hari.</small>
      </span>
      <input
        type="checkbox"
        role="switch"
        :checked="settings.matchAlerts"
        :disabled="saving"
        @change="change('matchAlerts', $event)"
      />
    </label>

    <button type="button" class="pref__clear" @click="clearHistory">Hapus riwayat lihat</button>
  </section>
</template>

<style scoped>
.pref {
  padding: 14px 16px 4px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
}

.pref h2 {
  margin: 0 0 4px;
  font-size: 18px;
}

.pref__row {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-default, #eae7e0);
  cursor: pointer;
}

.pref__row > span {
  display: grid;
  gap: 2px;
  font-size: 14px;
}

.pref__row small {
  color: var(--text-secondary, #5f5f66);
  font-size: 12px;
  line-height: 1.4;
}

.pref__row input {
  position: relative;
  flex: 0 0 auto;
  width: 48px;
  height: 28px;
  margin: 0;
  appearance: none;
  border-radius: var(--radius-pill, 999px);
  background: #8a8a90;
  cursor: pointer;
}

.pref__row input::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform 160ms var(--ease-out, ease-out);
}

.pref__row input:checked {
  background: var(--poliland-green, #355a2c);
}

.pref__row input:checked::after {
  transform: translateX(20px);
}

.pref__clear {
  min-height: 48px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--poliland-green, #355a2c);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.pref__row,
.pref__clear {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.pref__row:active,
.pref__clear:active {
  opacity: 0.7;
}

.pref__row input:focus-visible,
.pref__clear:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .pref__row input::after { transition: none; }
}
</style>
