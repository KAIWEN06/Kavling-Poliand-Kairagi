<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IonIcon } from '@ionic/vue'
import { addOutline, locationOutline, trashOutline } from 'ionicons/icons'
import AppButton from '@/components/ui/AppButton.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { formatDistance, isHighlightsUnavailable, lotHighlightService, type LotHighlight } from '@/services/lotHighlightService'

/** Pasang dengan :key id kavling. */
const props = defineProps<{ lotId: number }>()

const toast = useToast()
const { confirm } = useConfirm()

/* Semua kavling ikut dimuat supaya nama yang sudah dipakai bisa disarankan. */
const all = ref<LotHighlight[]>([])
const state = ref<'loading' | 'ready' | 'unavailable' | 'error'>('loading')
const facility = ref('')
const distance = ref('')
const saving = ref(false)
const formError = ref('')

const items = computed(() => all.value.filter((item) => item.lotId === props.lotId))

/* Nama yang seragam penting: rekomendasi mencocokkan fasilitas lewat namanya. */
const suggestions = computed(() => {
  const used = new Set(items.value.map((item) => item.facility.toLowerCase()))
  const names = new Map<string, string>()
  for (const item of all.value) {
    const key = item.facility.toLowerCase()
    if (!used.has(key)) names.set(key, item.facility)
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'id'))
})

async function load() {
  try {
    all.value = await lotHighlightService.list()
    state.value = 'ready'
  } catch (error) {
    console.error('[Fasilitas] Gagal memuat:', error)
    if (isHighlightsUnavailable(error)) state.value = 'unavailable'
    else if (state.value !== 'ready') state.value = 'error'
  }
}

function retry() {
  state.value = 'loading'
  void load()
}

async function add() {
  if (saving.value) return
  const name = facility.value.trim()
  const distanceM = Number(distance.value.replace(/\D/g, ''))
  if (name.length < 2 || name.length > 60 || distanceM < 1 || distanceM > 50000) {
    formError.value = 'Isi nama fasilitas (2 sampai 60 huruf) dan jarak 1 sampai 50.000 meter.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await lotHighlightService.add({ lotId: props.lotId, facility: name, distanceM })
    facility.value = ''
    distance.value = ''
    await load()
    toast.success('Fasilitas tersimpan.')
  } catch (error) {
    console.error('[Fasilitas] Gagal menyimpan:', error)
    formError.value = (error as { code?: string })?.code === '23505'
      ? 'Fasilitas ini sudah tercatat. Hapus dulu bila jaraknya perlu diganti.'
      : 'Fasilitas belum tersimpan. Coba lagi.'
  } finally {
    saving.value = false
  }
}

async function remove(item: LotHighlight) {
  const ok = await confirm({
    title: 'Hapus fasilitas ini?',
    message: `${item.facility} tidak akan tampil lagi pada kavling ini.`,
    confirmText: 'Hapus',
    tone: 'error',
  })
  if (!ok) return
  try {
    await lotHighlightService.remove(item.id)
    await load()
    toast.success('Fasilitas dihapus.')
  } catch (error) {
    console.error('[Fasilitas] Gagal menghapus:', error)
    toast.error('Fasilitas belum terhapus. Coba lagi.')
  }
}

onMounted(() => void load())
</script>

<template>
  <section v-if="state !== 'unavailable'" class="facs" aria-labelledby="facs-title">
    <h2 id="facs-title">Fasilitas terdekat</h2>
    <p class="facs__note">Tampil di detail kavling dan denah. Isi jarak hasil pengukuran.</p>

    <p v-if="state === 'loading'" class="facs__note" role="status">Memuat fasilitas...</p>

    <div v-else-if="state === 'error'" class="facs__failed" role="alert">
      <span>Fasilitas belum bisa dimuat.</span>
      <AppButton variant="neutral" fill="outline" size="small" @click="retry">Coba lagi</AppButton>
    </div>

    <template v-else>
      <ul v-if="items.length" class="facs__list">
        <li v-for="item in items" :key="item.id">
          <ion-icon :icon="locationOutline" aria-hidden="true" />
          <span>{{ item.facility }}</span>
          <strong>{{ formatDistance(item.distanceM) }}</strong>
          <button type="button" class="facs__remove" :aria-label="`Hapus ${item.facility}`" @click="remove(item)">
            <ion-icon :icon="trashOutline" aria-hidden="true" />
          </button>
        </li>
      </ul>

      <form class="facs__form" novalidate @submit.prevent="add">
        <label class="facs__field facs__field--name">
          <span>Nama fasilitas</span>
          <input
            v-model="facility"
            type="text"
            maxlength="60"
            autocomplete="off"
            enterkeyhint="next"
            :list="`facs-names-${lotId}`"
            placeholder="Contoh: Sekolah"
          />
          <datalist :id="`facs-names-${lotId}`">
            <option v-for="name in suggestions" :key="name" :value="name" />
          </datalist>
        </label>
        <label class="facs__field">
          <span>Jarak (meter)</span>
          <input
            v-model="distance"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            enterkeyhint="done"
            placeholder="350"
          />
        </label>
        <p v-if="formError" class="facs__error" role="alert">{{ formError }}</p>
        <AppButton class="facs__add" type="submit" variant="primary" fill="outline" :disabled="saving">
          <ion-icon :icon="addOutline" slot="start" aria-hidden="true" />
          {{ saving ? 'Menyimpan...' : 'Tambah fasilitas' }}
        </AppButton>
      </form>
    </template>
  </section>
</template>

<style scoped>
.facs {
  padding: 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
}

.facs h2 {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 700;
}

.facs__note {
  margin: 0 0 10px;
  color: var(--text-secondary, #5f5f66);
  font-size: 12px;
  line-height: 1.5;
}

.facs__failed {
  display: grid;
  justify-items: start;
  gap: 8px;
  font-size: 13px;
}

.facs__list {
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}

.facs__list li {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto 44px;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-default, #eae7e0);
  font-size: 13px;
}

.facs__list li > span {
  overflow-wrap: anywhere;
}

.facs__list li > ion-icon {
  color: var(--poliland-green, #355a2c);
  font-size: 18px;
}

.facs__list strong {
  font-variant-numeric: tabular-nums;
}

.facs__remove {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control, 12px);
  background: transparent;
  color: var(--status-danger, #b13a3a);
  font-size: 18px;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.facs__remove:active {
  background: var(--surface-muted, #f5f3ee);
}

.facs__form {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 10px;
}

.facs__field {
  display: grid;
  align-content: start;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}

.facs__field input {
  width: 100%;
  min-width: 0;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  font: inherit;
  font-size: 16px;
  font-weight: 400;
}

.facs__field input::placeholder {
  color: var(--text-secondary, #5f5f66);
}

.facs__field input:focus-visible,
.facs__remove:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 1px;
}

.facs__error,
.facs__add {
  grid-column: 1 / -1;
}

.facs__error {
  margin: 0;
  color: color-mix(in srgb, var(--status-danger, #b13a3a) 70%, black);
  font-size: 12.5px;
}

.facs__add {
  margin: 0;
}

@media (max-width: 360px) {
  .facs__form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
