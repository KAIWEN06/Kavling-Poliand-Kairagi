<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import SkeletonRowList from '@/components/ui/skeletons/SkeletonRowList.vue'
import DirectCancelModal from './DirectCancelModal.vue'
import { useToast } from '@/composables/useToast'
import { currentMakassarDay } from '@/utils/financialCashflow'
import { formatRupiah } from '@/utils/installmentFormat'
import {
  purchaseCancellationService,
  type ArrearsItem,
  type CancellableTransaction,
} from '@/services/Finance/purchaseCancellationService'
import './cancellation.css'

const toast = useToast()
const items = ref<ArrearsItem[]>([])
const loading = ref(true)
const loadError = ref('')

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    items.value = await purchaseCancellationService.listArrears()
  } catch (cause: any) {
    loadError.value = cause?.message || 'Daftar tunggakan belum dapat dimuat.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

/** Surat berikutnya yang belum dicatat; null bila ketiganya sudah ada. */
function nextLevel(item: ArrearsItem) {
  return [1, 2, 3].find(level => !item.notices.some(notice => notice.level === level)) ?? null
}
const DUE_DAY: Record<number, number> = { 1: 30, 2: 60, 3: 75 }
/** SP3 tanpa tanggal terima harus bisa dilengkapi. */
function noticeAction(item: ArrearsItem): number | null {
  const level = nextLevel(item)
  if (level) return item.days_overdue >= DUE_DAY[level] ? level : null
  return item.notices.some(notice => notice.level === 3 && !notice.received_date) ? 3 : null
}

type Form = { kind: 'notice' | 'extension'; item: ArrearsItem; level: number }
const form = ref<Form | null>(null)
const sentDate = ref('')
const receivedDate = ref('')
const method = ref('')
const untilDate = ref('')
const extensionReason = ref('')
const saving = ref(false)
const formError = ref('')

function openNotice(item: ArrearsItem, level: number) {
  const existing = item.notices.find(notice => notice.level === level)
  sentDate.value = existing?.sent_date ?? currentMakassarDay()
  receivedDate.value = existing?.received_date ?? ''
  method.value = existing?.delivery_method ?? ''
  formError.value = ''
  form.value = { kind: 'notice', item, level }
}
function openExtension(item: ArrearsItem) {
  untilDate.value = ''
  extensionReason.value = ''
  formError.value = ''
  form.value = { kind: 'extension', item, level: 0 }
}

const formReady = computed(() => form.value?.kind === 'notice'
  ? Boolean(sentDate.value) && method.value.trim().length >= 2
  : Boolean(untilDate.value) && extensionReason.value.trim().length >= 3)

async function saveForm() {
  const current = form.value
  if (!current || !formReady.value || saving.value) return
  saving.value = true
  formError.value = ''
  try {
    if (current.kind === 'notice') {
      await purchaseCancellationService.recordNotice({
        transactionId: current.item.transaction_id,
        level: current.level,
        sentDate: sentDate.value,
        method: method.value.trim(),
        receivedDate: receivedDate.value || null,
      })
      toast.success(`Surat peringatan ${current.level} tercatat.`)
    } else {
      await purchaseCancellationService.grantExtension(
        current.item.transaction_id, untilDate.value, extensionReason.value.trim())
      toast.success(`Perpanjangan sampai ${formatDate(untilDate.value)} tercatat.`)
    }
    form.value = null
    await load()
  } catch (cause: any) {
    formError.value = cause?.message || 'Data belum tersimpan.'
  } finally {
    saving.value = false
  }
}

const defaultOpen = ref(false)
const defaultTarget = ref<CancellableTransaction | null>(null)
function openDefault(item: ArrearsItem) {
  defaultTarget.value = {
    id: item.transaction_id,
    customer_name: item.customer_name ?? 'Pembeli',
    lot_number: item.lot_number ?? '-',
  }
  defaultOpen.value = true
}
</script>

<template>
  <div class="pc-stack">
    <p class="pc-muted">Surat peringatan pada hari ke-30, 60, dan 75. Wanprestasi bisa ditetapkan paling cepat hari ke-90, setelah tenggang 14 hari sejak surat ketiga diterima.</p>

    <SkeletonRowList v-if="loading" :rows="2" :fields="3" :badges="[3]" label="Memuat tunggakan" />
    <template v-else-if="loadError">
      <AppNotice tone="error" :message="loadError" />
      <button type="button" class="pc-btn" @click="load">Coba lagi</button>
    </template>
    <StatusIllustration v-else-if="!items.length" variant="empty-data" size="sm" title="Tidak ada cicilan yang menunggak" />

    <ul v-else class="pc-list">
      <li v-for="item in items" :key="item.transaction_id" class="pc-card">
        <div class="pc-card__top">
          <div>
            <h3>{{ item.customer_name }}</h3>
            <p class="pc-muted">Kavling {{ item.lot_number }}. {{ item.customer_phone || 'Nomor kontak tidak tersedia' }}</p>
          </div>
          <span :class="item.days_overdue >= 90 ? 'pc-late' : 'pc-strong'">Hari ke-{{ item.days_overdue }}</span>
        </div>
        <p>{{ item.overdue_count }} cicilan, <span class="pc-strong">{{ formatRupiah(item.overdue_amount) }}</span>. Tertua jatuh tempo {{ formatDate(item.oldest_due_date) }}.</p>
        <p v-for="notice in item.notices" :key="notice.level" class="pc-muted">
          SP{{ notice.level }} dikirim {{ formatDate(notice.sent_date) }} ({{ notice.delivery_method }}){{ notice.received_date ? `, diterima ${formatDate(notice.received_date)}` : '' }}.
        </p>
        <p v-if="item.hold_reason">{{ item.hold_reason }}</p>
        <div class="pc-actions">
          <button v-if="noticeAction(item)" type="button" class="pc-btn pc-btn--primary" @click="openNotice(item, noticeAction(item) as number)">
            Catat SP{{ noticeAction(item) }}
          </button>
          <button type="button" class="pc-btn" @click="openExtension(item)">Beri perpanjangan</button>
          <button v-if="item.eligible" type="button" class="pc-btn pc-btn--danger" @click="openDefault(item)">Tetapkan wanprestasi</button>
        </div>
      </li>
    </ul>

    <AppModal
      :model-value="form !== null"
      guard-unsaved
      :title="form?.kind === 'notice' ? `Surat peringatan ${form.level}` : 'Beri perpanjangan'"
      confirm-text="Simpan"
      :loading="saving"
      :confirm-disabled="!formReady"
      @update:model-value="!$event && (form = null)"
      @confirm="saveForm"
    >
      <div v-if="form" class="pc-stack">
        <template v-if="form.kind === 'notice'">
          <label class="pc-field">Tanggal kirim<input v-model="sentDate" type="date" :max="currentMakassarDay()" /></label>
          <label class="pc-field">Cara kirim<input v-model="method" type="text" maxlength="100" placeholder="Contoh: kurir, pos tercatat" /></label>
          <label class="pc-field">
            Tanggal diterima
            <input v-model="receivedDate" type="date" :min="sentDate" :max="currentMakassarDay()" />
            <small v-if="form.level === 3">Tenggang 14 hari dihitung dari tanggal ini.</small>
          </label>
        </template>
        <template v-else>
          <label class="pc-field">Berlaku sampai<input v-model="untilDate" type="date" :min="currentMakassarDay()" /></label>
          <label class="pc-field">Alasan<textarea v-model="extensionReason" rows="3" maxlength="1000" /></label>
        </template>
        <AppNotice v-if="formError" tone="error" :message="formError" />
      </div>
    </AppModal>

    <DirectCancelModal v-model="defaultOpen" source="Default" :preset="defaultTarget" @done="load" />
  </div>
</template>
