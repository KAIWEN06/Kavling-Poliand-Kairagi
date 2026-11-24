<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
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
  <Teleport to="body">
    <Transition name="otp-fade">
      <div
        v-if="open"
        class="otp-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-title"
        @keydown.esc="emit('cancel')"
      >
        <div class="otp-sheet">
          <h2 id="otp-title" class="otp-title">Nomor ini sudah terdaftar</h2>

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

          <p v-if="error" id="otp-error" class="otp-error" role="alert">{{ error }}</p>

          <button
            v-if="step === 'code'"
            type="button"
            class="otp-resend"
            :disabled="cooldown > 0 || busy"
            @click="send"
          >
            {{ cooldown > 0 ? `Kirim ulang dalam ${cooldown} dtk` : 'Kirim ulang kode' }}
          </button>

          <div class="otp-actions">
            <button type="button" class="otp-btn otp-btn--ghost" :disabled="busy" @click="emit('cancel')">Batal</button>
            <button
              v-if="step === 'failed'"
              type="button"
              class="otp-btn otp-btn--primary"
              @click="send"
            >
              Coba lagi
            </button>
            <button
              v-else
              type="button"
              class="otp-btn otp-btn--primary"
              :disabled="busy || step !== 'code' || code.length !== 6"
              @click="submit"
            >
              {{ busy ? 'Memeriksa...' : 'Verifikasi' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.otp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30000;
  display: grid;
  place-items: end center;
  background: rgba(20, 32, 17, 0.72);
  overscroll-behavior: contain;
}

.otp-sheet {
  display: flex;
  width: min(100%, 440px);
  max-height: 100dvh;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 24px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  border-radius: 24px 24px 0 0;
  background: var(--surface-forest, #243d1e);
  color: var(--on-forest, #f4f1e8);
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.35);
}

.otp-title {
  margin: 0;
  font-family: var(--font-display, Georgia, serif);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
}

.otp-copy {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--on-forest, #f4f1e8);
}

.otp-phone {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.otp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.otp-label {
  font-size: 13px;
  font-weight: 600;
}

/* 16px ke atas supaya iOS tidak memperbesar halaman saat fokus. */
.otp-input {
  width: 100%;
  min-height: 56px;
  padding: 10px 12px;
  border: 2px solid transparent;
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
  color: #8a8a90;
  font-weight: 400;
}

.otp-input:focus {
  outline: none;
  border-color: var(--poliland-gold, #cba044);
  box-shadow: 0 0 0 3px rgba(244, 214, 154, 0.45);
}

.otp-input--error {
  border-color: #ffb3ad;
}

.otp-error {
  margin: 0;
  color: #ffd9d6;
  font-size: 13px;
  line-height: 1.45;
}

.otp-resend {
  align-self: flex-start;
  min-height: 44px;
  padding: 0 4px;
  border: 0;
  background: none;
  color: var(--poliland-gold-soft, #f4d69a);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.otp-resend:disabled {
  color: var(--on-forest, #f4f1e8);
  opacity: 0.85;
  text-decoration: none;
}

.otp-actions {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 10px;
}

.otp-btn {
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control, 12px);
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  transition: transform var(--dur-fast, 160ms) var(--ease-spring, ease-out);
}

.otp-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.otp-btn:disabled {
  opacity: 0.55;
}

.otp-btn--primary {
  background: var(--poliland-gold, #cba044);
  color: var(--ink, #1b1f1a);
}

.otp-btn--ghost {
  background: rgba(244, 241, 232, 0.12);
  color: var(--on-forest, #f4f1e8);
}

.otp-btn:focus-visible,
.otp-resend:focus-visible {
  outline: 3px solid var(--poliland-gold-soft, #f4d69a);
  outline-offset: 2px;
}

.otp-fade-enter-active,
.otp-fade-leave-active {
  transition: opacity var(--dur-base, 240ms) var(--ease-out, ease-out);
}

.otp-fade-enter-active .otp-sheet {
  transition: transform var(--dur-slow, 380ms) var(--ease-out, ease-out);
}

.otp-fade-enter-from,
.otp-fade-leave-to {
  opacity: 0;
}

.otp-fade-enter-from .otp-sheet {
  transform: translateY(32px);
}

@media (prefers-reduced-motion: reduce) {
  .otp-fade-enter-active .otp-sheet,
  .otp-btn {
    transition: none;
  }

  .otp-fade-enter-from .otp-sheet {
    transform: none;
  }
}
</style>
