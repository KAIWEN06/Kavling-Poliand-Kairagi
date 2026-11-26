<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import { ref, watch } from 'vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import IdentityFields from '@/components/identity/IdentityFields.vue'
import { useToast } from '@/composables/useToast'
import {
  emptyIdentity,
  formatBirthDate,
  getCustomerIdentity,
  getMyIdentity,
  saveCustomerIdentity,
  type CustomerIdentity,
} from '@/services/customerIdentityService'

const props = withDefaults(defineProps<{
  /** Pembeli yang ditampilkan. Abaikan bila `self` dipakai. */
  customerId?: number | null
  /** Tampilkan identitas milik akun klien yang sedang masuk. */
  self?: boolean
  editable?: boolean
  title?: string
}>(), { customerId: null, self: false, editable: false, title: 'Identitas sesuai KTP' })

/** ready = true bila datanya lengkap, atau fiturnya belum aktif sehingga tidak boleh menghalangi. */
const emit = defineEmits<{ ready: [value: boolean] }>()

const toast = useToast()
const loading = ref(true)
const available = ref(true)
const loadError = ref('')
const identity = ref<CustomerIdentity | null>(null)
const editing = ref(false)
const draft = ref<CustomerIdentity>(emptyIdentity())
const saving = ref(false)
const saveError = ref('')
let requestId = 0

async function load({ silent = false }: LoadOptions = {}) {
  const current = ++requestId
  if (!silent) {
    loading.value = true
    loadError.value = ''
    editing.value = false
    identity.value = null
    emit('ready', false)
  }
  if (!props.self && !props.customerId) {
    loading.value = false
    return
  }
  try {
    const result = props.self ? await getMyIdentity() : await getCustomerIdentity(Number(props.customerId))
    if (current !== requestId) return
    available.value = result.available
    identity.value = result.identity
    loadError.value = ''
    emit('ready', !result.available || result.identity !== null)
  } catch (error) {
    if (current !== requestId) return
    if (!silent) loadError.value = error instanceof Error ? error.message : 'Data identitas gagal dimuat.'
  } finally {
    if (current === requestId) loading.value = false
  }
}

watch(() => [props.customerId, props.self], () => load(), { immediate: true })

function startEdit() {
  draft.value = { ...(identity.value ?? emptyIdentity()) }
  saveError.value = ''
  editing.value = true
}

async function save() {
  if (saving.value || !props.customerId) return
  saving.value = true
  saveError.value = ''
  try {
    await saveCustomerIdentity(Number(props.customerId), draft.value)
    identity.value = { ...draft.value, birthPlace: draft.value.birthPlace.trim() }
    editing.value = false
    emit('ready', true)
    toast.success('Data identitas disimpan.')
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'Data identitas gagal disimpan.'
  } finally {
    saving.value = false
  }
}

useRealtimeRefresh(['customer_identities'], () => load({ silent: true }), {
  pauseWhen: () => loading.value || editing.value,
})

</script>

<template>
  <div v-if="available && (self || customerId)" class="idi">
    <div class="idi-head">
      <h4>{{ title }}</h4>
      <button v-if="editable && !editing && !loading && !loadError" type="button" class="idi-btn" @click="startEdit">
        {{ identity ? 'Ubah' : 'Lengkapi' }}
      </button>
    </div>

    <p v-if="loading" class="idi-muted" role="status">Memuat data identitas...</p>

    <div v-else-if="loadError" class="idi-error" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" class="idi-btn" @click="load()">Coba lagi</button>
    </div>

    <!-- Enter di dalam formulir induk tidak boleh mengirim formulir itu. -->
    <div v-else-if="editing" class="idi-edit" @keydown.enter.prevent="save">
      <IdentityFields v-model="draft" audience="staff" />
      <AppNotice v-if="saveError" tone="error">{{ saveError }}</AppNotice>
      <div class="idi-actions">
        <button type="button" class="idi-btn" :disabled="saving" @click="editing = false">Batal</button>
        <button type="button" class="idi-btn idi-btn--primary" :disabled="saving" @click="save">
          {{ saving ? 'Menyimpan...' : 'Simpan identitas' }}
        </button>
      </div>
    </div>

    <template v-else>
      <dl class="idi-list">
        <div>
          <dt>NIK</dt>
          <dd :class="{ 'is-missing': !identity }">{{ identity?.nik || 'Belum diisi' }}</dd>
        </div>
        <div>
          <dt>Tempat, tanggal lahir</dt>
          <dd :class="{ 'is-missing': !identity }">
            {{ identity ? `${identity.birthPlace}, ${formatBirthDate(identity.birthDate)}` : 'Belum diisi' }}
          </dd>
        </div>
      </dl>
      <p class="idi-muted">Untuk keperluan administrasi, yaitu data pembeli di dokumen SPK.</p>
    </template>
  </div>
</template>

<style scoped>
.idi {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  text-align: left;
}

.idi-head { display: flex; min-height: 44px; align-items: center; justify-content: space-between; gap: 10px; }
.idi-head h4 { margin: 0; font-size: 13.5px; font-weight: 800; }

.idi-list { display: grid; margin: 0; }
.idi-list > div { display: grid; gap: 3px; padding: 8px 0; border-top: 1px solid var(--border-default, #eae7e0); }
.idi-list dt { color: var(--text-secondary, #5f5f66); font-size: 11.5px; font-weight: 500; }
.idi-list dd { margin: 0; font-size: 13.5px; font-weight: 700; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.idi-list dd.is-missing { color: var(--status-danger-text, #b13d36); }

.idi-muted { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 11.5px; line-height: 1.5; }

.idi-error { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; color: var(--status-danger-text, #b13d36); font-size: 12.5px; }

.idi-edit { display: grid; gap: 12px; }
.idi-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }

.idi-btn {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--poliland-green, #355a2c);
  border-radius: var(--radius-sm, 10px);
  background: var(--surface-primary, #fff);
  color: var(--poliland-green, #355a2c);
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.idi-btn:active { transform: scale(0.97); }
.idi-btn:disabled { opacity: 0.6; cursor: default; }
.idi-btn:focus-visible { outline: 2px solid var(--poliland-green, #355a2c); outline-offset: 2px; }
.idi-btn--primary { background: var(--poliland-green, #355a2c); color: #fff; }
</style>
