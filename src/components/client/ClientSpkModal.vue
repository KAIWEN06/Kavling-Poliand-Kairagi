<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import { modalEnterAnimation, modalLeaveAnimation } from '@/utils/modalAnimation'
import { computed, reactive, ref, watch } from 'vue'
import { IonIcon, IonModal, IonSpinner } from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import { authService } from '@/services/auth/authService'
import { supabase } from '@/services/config/supabase'
import { lotService, type LotRecord } from '@/services/lotService'
import { createClientSpk, getAvailableClientSpkBookingFees, getClientSpkErrorMessage, type AvailableBookingFeeReuse } from '@/services/clientSpkService'

const props = defineProps<{ isOpen: boolean; lot: LotRecord | null }>()
const emit = defineEmits<{ close: []; submitted: [] }>()
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const plans = ref<Awaited<ReturnType<typeof lotService.getLotInstallments>>>([])
const fees = ref<AvailableBookingFeeReuse[]>([])
const reusePaymentId = ref<number | null>(null)
const selectedPlanId = ref<number | null>(null)
const paymentScheme = ref<'Cash' | 'Installment'>('Cash')
const downPayment = ref('')
const files = reactive<Record<'ktp' | 'kk' | 'npwp' | 'paymentProof', File | null>>({ ktp: null, kk: null, npwp: null, paymentProof: null })
/** Email akun yang sedang masuk; kolom email dikunci ke nilai ini. */
const accountEmail = ref('')
const buyer = reactive({ fullName: '', phone: '', whatsappPhone: '', email: '', address: '' })

const price = computed(() => {
  if (!props.lot) return null
  const promo = Number(props.lot.promo_price || 0); const cash = Number(props.lot.cash_price || 0)
  return promo > 0 && promo < cash ? promo : cash > 0 ? cash : null
})
const selectedPlan = computed(() => plans.value.find(plan => plan.plan_id === selectedPlanId.value) ?? null)
const dpAmount = computed(() => Number(downPayment.value.replace(/\D/g, '')) || 0)
const estimate = computed(() => {
  if (!price.value || !selectedPlan.value || dpAmount.value <= 0 || dpAmount.value >= price.value) return null
  const total = Math.round((price.value - dpAmount.value) * (1 + Number(selectedPlan.value.margin_percent || 0) / 100))
  return Math.floor(total / selectedPlan.value.months)
})
const canSubmit = computed(() => Boolean(props.lot && price.value && buyer.fullName.trim() && buyer.phone.trim() && buyer.email.trim() && buyer.address.trim() && files.ktp && files.kk && (reusePaymentId.value !== null || files.paymentProof) && (paymentScheme.value === 'Cash' || (selectedPlanId.value && estimate.value))))

function currency(value: number | null) { return value ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value) : 'Belum tersedia' }
function onFile(key: keyof typeof files, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  if (file && file.size > 5 * 1024 * 1024) { error.value = 'Ukuran file maksimal 5 MB.'; files[key] = null; return }
  files[key] = file; error.value = ''
}
async function loadPlans() { if (!props.lot) return; plans.value = await lotService.getLotInstallments(props.lot.id) }
async function open() {
  loading.value = true; error.value = ''; fees.value = []; reusePaymentId.value = null
  try {
    const user = await authService.getCurrentUser()
    const metadata = user?.user_metadata ?? {}
    buyer.fullName = String(metadata.full_name || metadata.name || '')
    buyer.phone = String(metadata.phone || metadata.phone_number || user?.phone || '')
    buyer.whatsappPhone = String(metadata.whatsapp_phone || '')
    accountEmail.value = String(user?.email || '')
    buyer.email = accountEmail.value
    buyer.address = String(metadata.address || '')
    if (user) {
      const { data } = await supabase.from('customers').select('full_name, phone, whatsapp_phone, email, address').eq('user_id', user.id).maybeSingle()
      if (data) Object.assign(buyer, { fullName: data.full_name || buyer.fullName, phone: data.phone || data.whatsapp_phone || buyer.phone, whatsappPhone: data.whatsapp_phone || buyer.whatsappPhone, email: buyer.email || data.email || '', address: data.address || buyer.address })
    }
    fees.value = await getAvailableClientSpkBookingFees()
  } catch (cause) { error.value = getClientSpkErrorMessage(cause, 'Profil atau tanda jadi belum dapat dimuat.') } finally { loading.value = false }
}
watch(() => props.isOpen, value => { if (value) void open() })
async function submit() {
  if (!canSubmit.value || !props.lot || !price.value) { error.value = 'Lengkapi profil, dokumen KTP/KK, dan bukti tanda jadi.'; return }
  submitting.value = true; error.value = ''
  try {
    await createClientSpk({ lot: { id: props.lot.id, price: price.value }, buyer: { ...buyer }, payment: { scheme: paymentScheme.value, method: 'Transfer Bank', planId: paymentScheme.value === 'Installment' ? selectedPlanId.value : null, tenorMonths: selectedPlan.value?.months ?? null, monthlyPayment: estimate.value, downPaymentAmount: paymentScheme.value === 'Installment' ? dpAmount.value : 0 }, documents: files, reuseBookingPaymentId: reusePaymentId.value })
    emit('submitted'); emit('close')
  } catch (cause) { error.value = getClientSpkErrorMessage(cause, 'Pengajuan SPK gagal disimpan.') } finally { submitting.value = false }
}
</script>

<template>
  <IonModal :enter-animation="modalEnterAnimation" :leave-animation="modalLeaveAnimation" :is-open="isOpen" class="client-spk-create-modal" @didDismiss="emit('close')">
    <div class="client-spk-form">
      <header><div><span>Pengajuan pembelian</span><h2>Pembuatan SPK</h2></div><button type="button" aria-label="Tutup formulir SPK" @click="emit('close')"><IonIcon :icon="closeOutline" /></button></header>
      <p v-if="lot" class="selected-lot">Kaveling {{ lot.lot_number }} · {{ currency(price) }}</p>
      <div v-if="loading" class="form-state"><IonSpinner name="crescent" /> Memuat profil pembeli...</div>
      <form v-else @submit.prevent="submit">
        <fieldset><legend>Data pembeli</legend><label>Nama lengkap<input v-model="buyer.fullName" data-input="name" required /></label><label>Nomor HP<input v-model="buyer.phone" required inputmode="tel" /></label><label>Email<input v-model="buyer.email" type="email" :readonly="Boolean(accountEmail)" required /></label><label>Alamat<input v-model="buyer.address" required /></label></fieldset>
        <fieldset><legend>Pembayaran</legend><div class="scheme"><button type="button" :class="{active: paymentScheme === 'Cash'}" @click="paymentScheme = 'Cash'">Tunai</button><button type="button" :class="{active: paymentScheme === 'Installment'}" @click="paymentScheme = 'Installment'; void loadPlans()">Cicilan</button></div><template v-if="paymentScheme === 'Installment'"><label>Skema cicilan<select v-model.number="selectedPlanId"><option :value="null">Pilih tenor</option><option v-for="plan in plans" :key="plan.plan_id" :value="plan.plan_id">{{ plan.plan_name }} · {{ plan.months }} bulan</option></select></label><label>Uang muka<input v-model="downPayment" inputmode="numeric" placeholder="Rp" /></label><p v-if="estimate">Estimasi cicilan: <strong>{{ currency(estimate) }}/bulan</strong></p></template></fieldset>
        <fieldset><legend>Dokumen wajib</legend><label>KTP *<input type="file" accept="image/*,.pdf" required @change="onFile('ktp', $event)" /><small>{{ files.ktp?.name || 'Pilih file maksimal 5 MB' }}</small></label><label>KK *<input type="file" accept="image/*,.pdf" required @change="onFile('kk', $event)" /><small>{{ files.kk?.name || 'Pilih file maksimal 5 MB' }}</small></label><label v-if="reusePaymentId === null">Bukti tanda jadi *<input type="file" accept="image/*,.pdf" required @change="onFile('paymentProof', $event)" /><small>{{ files.paymentProof?.name || 'Pilih file maksimal 5 MB' }}</small></label><label v-else>Tanda jadi<input disabled value="Menggunakan pembayaran terverifikasi sebelumnya" /></label><label>NPWP (opsional)<input type="file" accept="image/*,.pdf" @change="onFile('npwp', $event)" /><small>{{ files.npwp?.name || 'Opsional' }}</small></label><label v-if="fees.length">Tanda jadi tersedia<select v-model.number="reusePaymentId"><option :value="null">Bayar tanda jadi baru</option><option v-for="fee in fees" :key="fee.paymentId" :value="fee.paymentId">{{ fee.sourceSpkNumber }} · {{ currency(fee.amount) }}</option></select></label></fieldset>
        <AppNotice v-if="error" tone="error">
          {{ error }}
        </AppNotice><button class="submit" type="submit" :disabled="submitting">{{ submitting ? 'Mengirim...' : 'Kirim pengajuan SPK' }}</button>
      </form>
    </div>
  </IonModal>
</template>

<style scoped>
input[type='email']:read-only { border-style: dashed; }
.client-spk-create-modal { --width: min(680px, 100%); --height: min(94vh, 900px); --border-radius: 18px; }
.client-spk-form { padding: 20px; color: var(--text-primary, #25302a); background: var(--app-background, #faf9f6); height: 100%; overflow: auto; }
header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; } header span { color:#68756d; font-size:.8rem; } h2 { margin:4px 0 0; } header button { min-width:44px; min-height:44px; border:0; background:transparent; color:inherit; } .selected-lot { padding:12px; background:#e9f3eb; border-radius:10px; font-weight:700; }
fieldset { border:0; padding:16px 0; margin:0; border-top:1px solid #dce3dd; display:grid; gap:12px; } legend { font-weight:800; margin-bottom:4px; } label { display:grid; gap:6px; font-weight:600; font-size:.9rem; } input, select { min-height:44px; border:1px solid #cbd5ce; border-radius:8px; padding:10px; background:#fff; color:inherit; } small { color:#68756d; font-weight:400; } .scheme { display:flex; gap:8px; } .scheme button { min-height:44px; flex:1; border:1px solid #b8c9bc; background:#fff; border-radius:8px; } .scheme button.active, .submit { background:#176b3a; color:#fff; border-color:#176b3a; } .submit { width:100%; min-height:48px; border-radius:9px; font-weight:800; border:0; } .form-state { display:flex; gap:8px; align-items:center; padding:30px 0; }
</style>
