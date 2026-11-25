<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import {
  claimCustomerByVerifiedPhone,
  PhoneOtpError,
  sendPhoneOtp,
  verifyPhoneOtp,
} from '@/services/phoneOtpService'

const props = defineProps<{ open: boolean; phone: string }>()
const emit = defineEmits<{
  cancel: []
  verified: [customerId: number | null]
}>()

const RESEND_SECONDS = 60
const CODE_LENGTH = 6

type Step = 'sending' | 'code' | 'failed'

const step = ref<Step>('sending')
const maskedPhone = ref('')
const code = ref('')
const error = ref('')
const busy = ref(false)
const cooldown = ref(0)
const codeInput = ref<HTMLInputElement | null>(null)

function onConfirm() {
  if (step.value === 'failed') void send()
  else void submit()
}
let timer: ReturnType<typeof setInterval> | null = null

function stopTimer() {
  if (timer) clearInterval(timer)
  timer = null
}

function startCooldown() {
  stopTimer()
  cooldown.value = RESEND_SECONDS
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) stopTimer()
  }, 1000)
}

async function send() {
  step.value = 'sending'
  error.value = ''
  code.value = ''
  try {
    const result = await sendPhoneOtp(props.phone)
    maskedPhone.value = result.maskedPhone ? `+${result.maskedPhone}` : ''
    step.value = 'code'
    startCooldown()
    await nextTick()
    codeInput.value?.focus()
  } catch (e) {
    step.value = 'failed'
    error.value = e instanceof PhoneOtpError ? e.message : 'Kode gagal dikirim. Coba lagi.'
  }
}

function failureMessage(reason: string, attemptsLeft?: number): string {
  switch (reason) {
    case 'wrong':
      return attemptsLeft && attemptsLeft > 0 ? `Kode salah. Sisa ${attemptsLeft} percobaan.` : 'Kode salah. Ini percobaan terakhir.'
    case 'expired':
      return 'Kode sudah kedaluwarsa. Minta kode baru.'
    case 'locked':
      return 'Terlalu banyak percobaan. Minta kode baru.'
    default:
      return 'Kode tidak ditemukan. Minta kode baru.'
  }
}

async function submit() {
  if (busy.value || code.value.length !== CODE_LENGTH) return
  busy.value = true
  error.value = ''
  try {
    const result = await verifyPhoneOtp(props.phone, code.value)
    if (!result.ok) {
      error.value = failureMessage(result.reason, result.attemptsLeft)
      code.value = ''
      if (result.reason !== 'wrong') {
        // Kode ini sudah tidak berlaku, jadi tombol kirim ulang dibuka lebih awal.
        stopTimer()
        cooldown.value = 0
      }
      await nextTick()
      codeInput.value?.focus()
      return
    }
    const customerId = await claimCustomerByVerifiedPhone(props.phone)
    emit('verified', customerId)
  } catch (e) {
    error.value = e instanceof PhoneOtpError ? e.message : 'Verifikasi gagal. Coba lagi.'
  } finally {
    busy.value = false
  }
}

function onCodeInput(event: Event) {
  const input = event.target as HTMLInputElement
  code.value = input.value.replace(/\D/g, '').slice(0, CODE_LENGTH)
  input.value = code.value
  if (error.value) error.value = ''
  if (code.value.length === CODE_LENGTH) void submit()
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) void send()
    else stopTimer()
  },
  { immediate: true },
)

onBeforeUnmount(stopTimer)
</script>

<template>
  <AppModal
    :model-value="open"
    title="Nomor ini sudah terdaftar"
    variant="dialog"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="!busy"
    cancel-text="Batal"
    :confirm-text="step === 'failed' ? 'Coba lagi' : busy ? 'Memeriksa...' : 'Verifikasi'"
    :confirm-disabled="step === 'sending' || (step === 'code' && code.length !== CODE_LENGTH)"
    :loading="busy"
    max-width="440px"
    @confirm="onConfirm"
    @close="emit('cancel')"
  >
    <div class="otp-body">
      <p v-if="step === 'sending'" class="otp-copy" role="status">Mengirim kode ke WhatsApp Anda...</p>

      <template v-else-if="step === 'code'">
        <p class="otp-copy">
          Kami kirim kode 6 digit ke WhatsApp <span class="otp-phone">{{ maskedPhone }}</span>. Masukkan kode itu untuk menautkan data Anda.
        </p>

        <div class="otp-field">
          <label for="otp-code" class="otp-label">Kode verifikasi</label>
          <input
            id="otp-code"
            ref="codeInput"
            class="otp-input"
            :class="{ 'otp-input--error': error }"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            autocomplete="one-time-code"
            enterkeyhint="done"
            maxlength="6"
            placeholder="------"
            :value="code"
            :disabled="busy"
            :aria-invalid="error ? 'true' : 'false'"
            aria-describedby="otp-error"
            @input="onCodeInput"
            @keydown.enter.prevent="submit"
          />
        </div>
      </template>

      <AppNotice v-if="error" id="otp-error" tone="error">
        {{ error }}
      </AppNotice>

      <button
        v-if="step === 'code'"
        type="button"
        class="otp-resend"
        :disabled="cooldown > 0 || busy"
        @click="send"
      >
        {{ cooldown > 0 ? `Kirim ulang dalam ${cooldown} dtk` : 'Kirim ulang kode' }}
      </button>
    </div>
  </AppModal>
</template>

<style scoped>
.otp-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.otp-copy {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-secondary, #5f5f66);
}

.otp-phone {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--text-primary, #252525);
}

.otp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.otp-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #252525);
}

/* 16px ke atas supaya iOS tidak memperbesar halaman saat fokus. */
.otp-input {
  width: 100%;
  min-height: 56px;
  padding: 10px 12px;
  border: 2px solid var(--border-default, #dcdcd6);
  border-radius: var(--radius-control, 12px);
  background: var(--pl-paper, #f9f5ec);
  color: var(--ink, #1b1f1a);
  font-family: inherit;
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.4em;
  text-align: center;
  text-indent: 0.4em;
  touch-action: manipulation;
}

.otp-input::placeholder {
  color: #767676;
  font-weight: 400;
}

.otp-input:focus {
  outline: none;
  border-color: var(--poliland-green, #355a2c);
  box-shadow: 0 0 0 3px rgba(53, 90, 44, 0.2);
}

.otp-input--error {
  border-color: #b3261e;
}

.otp-resend {
  align-self: flex-start;
  min-height: 44px;
  padding: 0 4px;
  border: 0;
  background: none;
  color: var(--poliland-gold-text, #805708);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.otp-resend:active:not(:disabled) {
  opacity: 0.7;
}

.otp-resend:disabled {
  color: var(--text-secondary, #5f5f66);
  text-decoration: none;
  cursor: not-allowed;
}
</style>
