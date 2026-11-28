<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import { ref } from 'vue'
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
  IonSpinner,
  IonIcon,
} from '@ionic/vue'
import { RouterLink, useRouter } from 'vue-router'
import { authService } from '@/services/auth/authService'
import { authErrorMessage, emailInputError } from '@/services/auth/authErrorMessage'
import MascotCanvas from '@/components/auth/MascotCanvas.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { mailOutline, arrowBackOutline } from 'ionicons/icons'

const router = useRouter()

interface MascotHandle {
  setEmailFocus(active: boolean): Promise<void>
  setPasswordFocus(active: boolean, visible: boolean): Promise<void>
  setPasswordVisible(visible: boolean): Promise<void>
  playError(): Promise<void>
  stopIntro(): void
}

const mascotRef = ref<MascotHandle | null>(null)

const email = ref('')
const loading = ref(false)
const errorMessage = ref('')
const sent = ref(false)

async function handleEmailFocus() {
  await mascotRef.value?.setEmailFocus(true)
}

async function handleEmailBlur() {
  await mascotRef.value?.setEmailFocus(false)
}

async function sendResetLink() {
  if (loading.value) return

  errorMessage.value = ''
  sent.value = false

  const emailError = emailInputError(email.value)
  if (emailError) {
    errorMessage.value = emailError
    await mascotRef.value?.playError()
    return
  }

  loading.value = true

  try {
    await authService.sendPasswordReset(email.value.trim())

    sent.value = true
  } catch (error) {
    errorMessage.value = authErrorMessage(error, 'Tautan belum bisa dikirim. Coba lagi nanti.')

    await mascotRef.value?.playError()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ion-page>
    <ion-content class="auth-content" :fullscreen="true">
      <main class="auth-shell">
        <section
          class="auth-visual reveal reveal--pop"
          style="--i: 0"
          aria-label="Maskot PoliLand"
        >
          <MascotCanvas ref="mascotRef" />
        </section>

        <ion-card class="auth-card reveal" style="--i: 1">
          <ion-card-header class="reveal reveal--fade" style="--i: 2">
            <ion-card-title>Lupa kata sandi?</ion-card-title>
            <p class="subtitle">
              Masukkan email akunmu untuk menerima tautan atur ulang kata sandi.
            </p>
          </ion-card-header>

          <ion-card-content>
            <AppNotice v-if="sent" tone="success">
              Jika email tersebut terdaftar, tautan atur ulang kata sandi akan
                dikirim. Periksa kotak masuk dan folder spam.
            </AppNotice>

            <AppNotice v-if="errorMessage" tone="error">
              {{ errorMessage }}
            </AppNotice>

            <form class="auth-form" novalidate @submit.prevent="sendResetLink">
              <AppInput
                class="reveal"
                style="--i: 3"
                v-model="email"
                input-id="forgot-password-email"
                label="Email"
                placeholder="nama@email.com"
                type="email"
                autocomplete="email"
                :icon="mailOutline"
                :disabled="loading"
                required
                @focus="handleEmailFocus"
                @blur="handleEmailBlur"
              />

              <AppButton
                class="submit-button reveal"
                style="--i: 4"
                type="submit"
                expand="block"
                :disabled="loading"
                color="primary"
              >
                <IonSpinner v-if="loading" name="crescent" />
                <span v-else>Kirim tautan</span>
              </AppButton>

              <button
                class="back-home-button reveal"
                style="--i: 5"
                type="button"
                @click="router.push('/login')"
              >
                <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
                <span>Kembali ke halaman masuk</span>
              </button>
            </form>
          </ion-card-content>
        </ion-card>

        <div class="bottom-waves" aria-hidden="true">
          <div class="wave wave-back"></div>
          <div class="wave wave-middle"></div>
          <div class="wave wave-front"></div>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<style scoped>
/* =========================================================
   LUPA KATA SANDI: satu layar, tombol satu baris.
   ========================================================= */

.auth-content {
  --background: #faf7f2;
  --overflow: auto; /* cadangan untuk layar sangat pendek */
}

.auth-shell {
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding:
    max(12px, var(--safe-top))
    14px
    max(16px, var(--safe-bottom));
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 0%, rgb(231 222 202 / 72%) 0%, rgb(250 247 242 / 0%) 48%),
    linear-gradient(180deg, #f7f4ec 0%, #faf7f2 56%, #f3ead9 100%);
}

/* ---------- Animasi masuk (selaras dengan login) ---------- */
.auth-shell .reveal {
  animation: reveal-up 520ms var(--ease-out) backwards;
  animation-delay: calc(var(--i, 0) * 60ms);
}

.auth-shell .reveal--fade {
  animation-name: reveal-fade;
  animation-duration: 420ms;
}

.auth-shell .reveal--pop {
  animation-name: reveal-pop;
  animation-duration: 640ms;
  animation-timing-function: var(--ease-spring);
}

@keyframes reveal-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: none; }
}

@keyframes reveal-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes reveal-pop {
  from { opacity: 0; transform: translateY(10px) scale(.86); }
  to   { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .auth-shell .reveal {
    animation: none;
  }
}

/* ---------- Maskot ---------- */
.auth-visual {
  position: relative;
  z-index: 2;
  width: min(100%, 440px);
  flex: 0 1 200px;
  min-height: 0;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
}

.auth-visual :deep(.mascot-canvas) {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent !important;
}

.auth-visual :deep(canvas) {
  width: 100%;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
  background: transparent !important;
}

/* ---------- Kartu ---------- */
.auth-card {
  position: relative;
  z-index: 3;
  box-sizing: border-box;
  width: min(100%, 440px);
  flex: 0 0 auto;
  margin: 0;
  border: 1px solid rgb(217 210 196 / 62%);
  border-radius: 24px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 12px 32px rgb(42 77 57 / 9%);
  overflow: visible;
}

ion-card-header {
  flex-direction: column; /* Ionic default column-reverse membalik urutan judul */
  padding: 18px 18px 2px;
  text-align: center;
}

ion-card-title {
  color: #1a2824;
  font-size: clamp(20px, 5.4vw, 24px);
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -.02em;
  white-space: nowrap;
}

.subtitle {
  margin: 6px 0 0;
  color: #5f6561;
  font-size: 13px;
  line-height: 1.45;
}

ion-card-content {
  padding: 6px 18px 18px;
}

/* ---------- Form ---------- */
.auth-form {
  display: grid;
  gap: 10px;
  margin-top: 8px;
}

.auth-form :deep(.app-field) {
  gap: 4px;
}

.auth-form :deep(.app-field__label) {
  font-size: 13px;
}

.auth-form :deep(input) {
  font-size: 16px; /* cegah iOS zoom saat fokus */
}

.submit-button {
  --background: #2e6a50;
  --background-activated: #24563f;
  --background-hover: #285e47;
  --color: #ffffff;
  --border-radius: 12px;
  --box-shadow: 0 4px 12px rgb(46 106 80 / 16%);
  margin: 2px 0 0;
  min-height: 48px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .01em;
  white-space: nowrap;
}

.back-home-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  min-height: 48px;
  padding: 0 18px;
  border: 1.5px solid #77806f;
  border-radius: 12px;
  background: transparent;
  color: #4d5647;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-instant) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .back-home-button:hover {
    background: #eef1e9;
  }
}

.back-home-button:active {
  background: #e1e6d9;
  transform: scale(.98);
}

.back-home-button:focus-visible {
  outline: 2px solid #2e6a50;
  outline-offset: 2px;
}

.back-home-button ion-icon {
  font-size: 18px;
  flex-shrink: 0;
}

/* ---------- Gelombang bawah ---------- */
.bottom-waves {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 145px;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}

.wave {
  position: absolute;
  left: -15%;
  width: 130%;
  height: 150px;
  border-radius: 50% 50% 0 0 / 70% 70% 0 0;
}

.wave-back {
  bottom: -112px;
  background: #dedfca;
  transform: rotate(-7deg) translateX(-5%);
}

.wave-middle {
  bottom: -122px;
  background: #b2bea4;
  transform: rotate(7deg) translateX(5%);
}

.wave-front {
  bottom: -134px;
  background: #91a282;
  transform: rotate(-5deg) translateX(-3%);
}

/* ---------- Responsif ---------- */
@media (max-height: 700px) {
  .auth-visual {
    flex-basis: 130px;
    height: 130px;
  }

  .subtitle {
    display: none;
  }
}

@media (max-height: 580px) {
  .auth-visual {
    display: none;
  }
}

@media (min-width: 700px) {
  .auth-visual {
    flex-basis: 260px;
    height: 260px;
  }
}
</style>
