<template>
  <AppModal
    :model-value="modelValue"
    title="Laporkan ulasan"
    variant="dialog"
    confirm-text="Kirim laporan"
    confirm-variant="danger"
    cancel-text="Batal"
    :loading="submitting"
    :confirm-disabled="!reason"
    @update:model-value="(v: boolean) => $emit('update:modelValue', v)"
    @confirm="submit"
  >
    <div class="report">
      <p class="intro">Pilih alasan yang paling sesuai. Admin akan memeriksa laporan Anda.</p>
      <fieldset class="reasons">
        <legend class="sr-only">Alasan laporan</legend>
        <label v-for="item in REASONS" :key="item.value" class="reason">
          <input v-model="reason" type="radio" name="report-reason" :value="item.value" />
          {{ item.label }}
        </label>
      </fieldset>
      <label class="details">
        Keterangan tambahan (opsional)
        <textarea v-model="details" rows="3" maxlength="500" />
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import { reviewErrorMessage, reviewService } from '@/services/reviewService'
import { useToast } from '@/composables/useToast'
import type { ReviewReportReason } from '@/types/review'

const props = defineProps<{ modelValue: boolean; reviewId: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const REASONS: { value: ReviewReportReason; label: string }[] = [
  { value: 'abusive', label: 'Kata kasar atau penghinaan' },
  { value: 'hate', label: 'Ujaran kebencian' },
  { value: 'spam', label: 'Spam atau promosi tidak relevan' },
  { value: 'personal_info', label: 'Memuat informasi pribadi' },
  { value: 'irrelevant', label: 'Tidak berhubungan dengan PoliLand' },
  { value: 'scam', label: 'Penipuan atau tautan mencurigakan' },
  { value: 'other', label: 'Lainnya' },
]

const toast = useToast()
const reason = ref<ReviewReportReason | ''>('')
const details = ref('')
const submitting = ref(false)
const error = ref('')

watch(() => props.modelValue, (open) => {
  if (open) {
    reason.value = ''
    details.value = ''
    error.value = ''
  }
})

async function submit() {
  if (!props.reviewId || !reason.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    await reviewService.report(props.reviewId, reason.value, details.value)
    toast.success('Terima kasih. Laporan Anda telah diterima dan akan diperiksa Admin.')
    emit('update:modelValue', false)
  } catch (e) {
    error.value = reviewErrorMessage(e, 'Laporan gagal dikirim. Silakan coba lagi.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.report { display: grid; gap: var(--space-3); }
.intro { margin: 0; color: var(--text-secondary); font-size: var(--font-size-sm); }
.reasons { display: grid; gap: var(--space-2); margin: 0; padding: 0; border: 0; }
.reason { display: flex; align-items: center; gap: var(--space-2); color: var(--text-primary); font-size: var(--font-size-sm); }
.reason input { width: 18px; height: 18px; accent-color: var(--poliland-green); }
.details { display: grid; gap: 6px; color: var(--text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.details textarea {
  width: 100%; box-sizing: border-box; padding: 10px 12px;
  border: 1px solid var(--border-default); border-radius: var(--radius-sm);
  background: var(--surface-muted); color: var(--text-primary); font: inherit; font-size: var(--font-size-sm);
}
.details textarea:focus { outline: none; border-color: var(--poliland-green); box-shadow: var(--ring-focus); }
.error { margin: 0; color: var(--danger-text); font-size: var(--font-size-xs); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
</style>
