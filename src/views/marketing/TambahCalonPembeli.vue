<template>
  <MarketingPageLayout title="Tambah Klien" show-back back-route="/marketing/clients" :refreshable="false">
  <div class="prospect-page">
    <main class="page-content">
      <ClientForm
        v-model="form"
        :assignee="rules.assignee"
        :interest="rules.interest"
        :lots="lots"
        :lots-loading="loadingLots"
        :lots-error="lotsError"
        :plans="paymentPlans"
        :plans-loading="loadingPlans"
        :error="errorMessage"
        @retry-lots="loadData"
      >
        <template #error-action>
          <button v-if="conflictCustomerId !== null" type="button" class="mk-link" @click="openConflictCustomer">
            Buka data klien
          </button>
        </template>
      </ClientForm>

      <!-- AKSI -->
      <div class="form-actions">
        <button type="button" class="cancel-button" :disabled="saving" @click="cancel">
          Batal
        </button>
        <button type="button" class="save-button" :disabled="saving" @click="submit">
          <span v-if="saving" class="spinner"></span>
          {{ saving ? 'Menyimpan…' : 'Simpan klien' }}
        </button>
      </div>
    </main>

  </div>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import { onMounted, ref } from 'vue'
import { useIonRouter } from '@ionic/vue'
import ClientForm from '@/components/client-form/ClientForm.vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import {
  createProspectiveCustomer,
  getAvailableLots,
  getCurrentMarketingProfile,
  getPaymentPlans,
} from '@/services/marketing/customerService'
import { findContactConflict } from '@/services/marketing/marketingCrmService'
import {
  clientDraftColumns,
  clientDraftInterests,
  emptyClientDraft,
  validateClientDraft,
  type ClientDraftRules,
} from '@/utils/clientDraft'
import { useSmartBack } from '@/composables/useSmartBack'
import { useToast } from '@/composables/useToast'

type AvailableLot = Awaited<ReturnType<typeof getAvailableLots>>[number] & { blocks?: any }
type PlanOption = Awaited<ReturnType<typeof getPaymentPlans>>[number]

const ionRouter = useIonRouter()

const listPath = '/marketing/clients'
const rules: ClientDraftRules = { assignee: 'self', interest: 'optional' }

const form = ref(emptyClientDraft())
const loadingLots = ref(true)
const loadingPlans = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const lotsError = ref('')
// Client yang sudah memakai nomor ini dan boleh dibuka pemanggil (null bila bukan miliknya).
const conflictCustomerId = ref<number | null>(null)

const lots = ref<AvailableLot[]>([])
const paymentPlans = ref<PlanOption[]>([])

const { goBack: cancel } = useSmartBack(() => listPath)

async function submit() {
  errorMessage.value = validateClientDraft(form.value, rules) ?? ''
  if (errorMessage.value) return

  saving.value = true
  errorMessage.value = ''
  conflictCustomerId.value = null

  try {
    // Validasi awal duplikasi; database tetap memvalidasi ulang saat INSERT.
    const draft = form.value
    const conflict = await findContactConflict(draft.phone, draft.whatsapp_phone || null)
    if (conflict) {
      errorMessage.value = conflict.message
      conflictCustomerId.value = conflict.customerId
      return
    }

    const customer = await createProspectiveCustomer({
      customer: {
        ...clientDraftColumns(draft),
        marketing_id: null, // layanan memakai akun yang sedang masuk
      },
      interests: clientDraftInterests(draft),
    })

    useToast().success('Klien tersimpan.', {
      to: `${listPath}/${customer.id}`,
      actionLabel: 'Lihat klien',
    })
    // Formulir diganti (bukan ditumpuk) agar tombol kembali tidak membukanya lagi.
    ionRouter.navigate(listPath, 'back', 'replace')
  } catch (cause) {
    const error = cause as { message?: string; hint?: string }
    console.error('Gagal menyimpan klien:', error)

    errorMessage.value =
      error?.message ||
      'Klien gagal disimpan. Coba lagi.'

    // Nomor baru terdaftar di antara pengecekan dan penyimpanan: jelaskan siapa pemegangnya.
    if (error?.hint === 'phone_exists') {
      try {
        const conflict = await findContactConflict(form.value.phone, form.value.whatsapp_phone || null)
        if (conflict) {
          errorMessage.value = conflict.message
          conflictCustomerId.value = conflict.customerId
        }
      } catch {
        // Pesan dari database tetap ditampilkan.
      }
    }
  } finally {
    saving.value = false
  }
}

function openConflictCustomer() {
  if (conflictCustomerId.value === null) return
  void ionRouter.push(`${listPath}/${conflictCustomerId.value}`)
}

async function loadData() {
  loadingLots.value = true
  loadingPlans.value = true
  lotsError.value = ''

  try {
    await refreshOptions()
  } catch (error) {
    console.error(error)
    lotsError.value = 'Daftar kaveling atau tenor gagal dimuat.'
  } finally {
    loadingLots.value = false
    loadingPlans.value = false
  }
}

onMounted(async () => {
  try {
    await getCurrentMarketingProfile()

    await loadData()
  } catch (error) {
    console.error(error)
    loadingLots.value = false
    loadingPlans.value = false
    errorMessage.value =
      'Akun belum bisa dipakai di sini. Masuk ulang dengan akun pemasar.'
  }
})

/* Hanya daftar pilihan yang diperbarui; isian formulir tidak disentuh. */
async function refreshOptions() {
  const [availableLots, plans] = await Promise.all([getAvailableLots(), getPaymentPlans()])
  lots.value = availableLots
  paymentPlans.value = plans
}

useRealtimeRefresh(['lots', 'payment_plans'], refreshOptions, {
  pauseWhen: () => loadingLots.value || saving.value,
})

</script>

<style scoped>
.prospect-page { font-family: var(--font-primary); color: var(--text-primary); }
.prospect-page button { font: inherit; -webkit-tap-highlight-color: transparent; }
.page-content { width: 100%; display: grid; gap: 16px; }

.form-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 10px;
}

.cancel-button {
  min-height: 52px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  touch-action: manipulation;
}

.cancel-button:active:not(:disabled) {
  background: var(--surface-muted);
}

.cancel-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-button:focus-visible {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}

.save-button {
  width: 100%;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--poliland-green);
  color: #fff;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.save-button:active:not(:disabled) {
  background: var(--green-800);
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-button:focus-visible {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
