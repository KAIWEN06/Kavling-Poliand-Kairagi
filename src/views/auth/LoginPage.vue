<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import MascotCanvas from '@/components/auth/MascotCanvas.vue'

import { useRoute, useRouter, RouterLink } from 'vue-router'

import {

  IonPage,

  IonContent,

  IonCard,

  IonCardHeader,

  IonCardTitle,

  IonCardContent,

  IonInput,

  IonButton,

  IonText,

  IonSpinner,

  IonIcon,

  onIonViewWillEnter,

} from '@ionic/vue'

import { authService } from '@/services/auth/authService'
import { AUTH_MESSAGES, authErrorMessage, emailInputError } from '@/services/auth/authErrorMessage'
import { clearPostLoginRedirect, consumePostLoginRedirect, peekPostLoginRedirect } from '@/services/auth/postLoginRedirect'
import { supabase } from '@/services/config/supabase'
import { useGoogleAuthSpinner } from '@/composables/useGoogleAuthSpinner'

import AppInput from '@/components/ui/AppInput.vue'

import { arrowBackOutline, personAddOutline, mailOutline, lockClosedOutline } from 'ionicons/icons'

import AppButton from '@/components/ui/AppButton.vue'
import Skeleton from '@/components/ui/Skeleton.vue'



interface LoginMascotHandle {

  setEmailFocus(active: boolean): Promise<void>

  setPasswordFocus(active: boolean, visible: boolean): Promise<void>

  setPasswordVisible(visible: boolean): Promise<void>

  playError(): Promise<void>

  stopIntro(): void

}

const mascotRef = ref<LoginMascotHandle | null>(null)
const passwordInputRef = ref<InstanceType<typeof IonInput> | null>(null)

const route = useRoute()

const router = useRouter()

const email = ref('')

const password = ref('')

const showPassword = ref(false)

const loading = ref(false)
const googleLoading = ref(false)
useGoogleAuthSpinner(googleLoading)

// Loading visual untuk initial page load dan Pull-to-Refresh.
// Tidak bergantung pada request auth/Supabase agar tidak pernah stuck.
const isPageLoading = ref(true)
const entered = ref(false)
const isRefreshing = ref(false)
const REFRESH_DURATION = 1800
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const errorMessage = ref('')

// Dibaca ulang tiap halaman tampil: Ionic menyimpan halaman, jadi setup tidak berjalan lagi.
const surveyPending = ref(false)
onIonViewWillEnter(() => {
  // Tujuan tersimpan bertahan 1 jam, jadi notif hanya tampil bila kunjungan ini memang dari alur survei.
  const fromSurvey = route.query.survei === '1' || String(route.query.redirect ?? '').includes('survei=1')
  surveyPending.value = fromSurvey && (peekPostLoginRedirect()?.includes('survei=1') ?? false)
})

// Kembali ke situs publik berarti batal survei: login berikutnya tidak boleh dibelokkan ke kavling itu.
function leaveToHome() {
  clearPostLoginRedirect()
  router.push('/home')
}
const resendLoading = ref(false)
const resendMessage = ref('')
const resendSucceeded = ref(false)
const isEmailUnconfirmed = computed(() => errorMessage.value === AUTH_MESSAGES.emailNotConfirmed)



function handleRefresh() {
  if (isRefreshing.value) return

  isRefreshing.value = true
  isPageLoading.value = true

  if (refreshTimer) {
    clearTimeout(refreshTimer)
  }

  refreshTimer = setTimeout(() => {
    isPageLoading.value = false
    isRefreshing.value = false
    refreshTimer = null

    window.dispatchEvent(
      new CustomEvent('poliland:refresh-complete')
    )
  }, REFRESH_DURATION)
}

function finishInitialLoad() {
  window.setTimeout(() => {
    isPageLoading.value = false
    // Animasi masuk dimulai bersamaan skeleton memudar.
    entered.value = true
  }, 800)
}

onMounted(() => {
  window.addEventListener('poliland:refresh', handleRefresh)
  finishInitialLoad()
})

onBeforeUnmount(() => {
  window.removeEventListener('poliland:refresh', handleRefresh)

  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
})

const queryError = computed(() => {

  if (route.query.error === 'role_missing') {

    return 'Akun Anda belum punya hak akses. Hubungi admin PoliLand.'

  }

  if (route.query.error === 'role_lookup_failed') {

    return 'Akun Anda belum bisa diperiksa. Coba lagi, atau hubungi admin PoliLand.'

  }

  if (route.query.error === 'oauth_state_used') {

    return 'Waktu masuk dengan Google sudah habis. Silakan coba lagi.'

  }

  if (route.query.error === 'oauth_failed') {

    return 'Belum berhasil masuk dengan Google. Silakan coba lagi.'

  }

  return ''

})



async function togglePasswordVisibility() {
  // Keep the password field focused when the eye button is tapped.
  showPassword.value = !showPassword.value
  await mascotRef.value?.setPasswordVisible(showPassword.value)
  await nextTick()

  try {
    const input = await passwordInputRef.value?.$el?.getInputElement?.()
    input?.focus({ preventScroll: true })
  } catch {
    // The visibility toggle should still work if focus restoration is unavailable.
  }
}

async function submitLogin() {

  if (loading.value || googleLoading.value) return

  mascotRef.value?.stopIntro()



  errorMessage.value = ''
  resendMessage.value = ''

  const inputError =
    emailInputError(email.value) || (password.value ? '' : 'Isi kata sandi Anda terlebih dahulu.')
  if (inputError) {
    errorMessage.value = inputError
    void mascotRef.value?.playError()
    return
  }

  loading.value = true



  try {

    let result

    try {

      result = await authService.login(email.value.trim(), password.value)

    } catch (error) {

      errorMessage.value = authErrorMessage(error, 'Belum berhasil masuk. Silakan coba lagi.')

      void mascotRef.value?.playError()

      return

    }



    const userId = result.user?.id

    if (!userId) {

      errorMessage.value = 'Belum berhasil masuk. Silakan coba lagi.'

      return

    }



    let role

    try {

      role = await authService.getUserRole(userId)

    } catch {

      errorMessage.value =

        'Akun Anda belum bisa diperiksa. Coba lagi, atau hubungi admin PoliLand.'

      return

    }



    const homePath = authService.getRoleHomePath(role)

    if (!homePath) {

      errorMessage.value =

        'Akun Anda belum punya hak akses. Hubungi admin PoliLand.'

      return

    }



    await router.replace(consumePostLoginRedirect(role) ?? homePath)

  } finally {

    loading.value = false

  }

}

async function resendSignupConfirmation() {
  const address = email.value.trim()
  if (!address || resendLoading.value) return

  resendLoading.value = true
  resendMessage.value = ''

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })
    if (error) throw error

    resendSucceeded.value = true
    resendMessage.value = 'Email konfirmasi sudah dikirim ulang. Periksa kotak masuk dan folder spam.'
  } catch (error) {
    resendSucceeded.value = false
    resendMessage.value = authErrorMessage(error, AUTH_MESSAGES.emailNotSent)
  } finally {
    resendLoading.value = false
  }
}



async function loginWithGoogle() {

  if (loading.value || googleLoading.value) return

  mascotRef.value?.stopIntro()



  errorMessage.value = ''

  googleLoading.value = true



  try {

    await authService.signInWithGoogle()

  } catch (error) {

    errorMessage.value = authErrorMessage(error, 'Belum berhasil membuka Google. Silakan coba lagi.')

    googleLoading.value = false

  }

}

</script>

<template>
  <ion-page>
    <ion-content class="auth-content" :fullscreen="true">
      <main class="auth-shell" :class="{ 'is-entered': entered }">
        <div class="auth-topbar reveal reveal--fade" style="--i: 0">
          <button
            class="back-home-button"
            type="button"
            @click="leaveToHome"
          >
            <ion-icon
              :icon="arrowBackOutline"
              aria-hidden="true"
            />
            <span>Halaman utama</span>
          </button>
        </div>

        <section class="auth-visual reveal reveal--pop" style="--i: 1" aria-label="Maskot PoliLand">
          <MascotCanvas ref="mascotRef" />
        </section>

        <ion-card class="auth-card reveal" style="--i: 2">
          <ion-card-header class="reveal reveal--fade" style="--i: 3">
            <ion-card-title>SELAMAT DATANG</ion-card-title>
            <span class="title-ornament" aria-hidden="true"></span>
            <p class="subtitle">Masuk untuk mengakses PoliLand Kairagi</p>
          </ion-card-header>

          <ion-card-content>
            <AppNotice v-if="surveyPending && !queryError && !errorMessage" tone="info">
              Survei lokasi perlu akun. Setelah masuk, Anda kembali ke kavling tadi.
            </AppNotice>
            <AppNotice v-if="queryError" tone="error">
              {{ queryError }}
            </AppNotice>
            <AppNotice v-if="errorMessage" tone="error">
              {{ errorMessage }}
            </AppNotice>
            <div v-if="isEmailUnconfirmed" class="confirmation-resend">
              <button
                type="button"
                :disabled="resendLoading || !email.trim()"
                @click="resendSignupConfirmation"
              >
                {{ resendLoading ? 'Mengirim...' : 'Kirim ulang email' }}
              </button>
              <AppNotice v-if="resendMessage" :tone="resendSucceeded ? 'success' : 'error'">
                {{ resendMessage }}
              </AppNotice>
            </div>

            <form class="auth-form" novalidate @submit.prevent="submitLogin">
                <AppInput
                  class="reveal" style="--i: 4"
                  v-model="email"
                  input-id="login-email"
                  label="Email"
                  placeholder="contoh@email.com"
                  type="email"
                  autocomplete="email"
                  :icon="mailOutline"
                  required
                  @focus="mascotRef?.setEmailFocus(true)"
                  @blur="mascotRef?.setEmailFocus(false)"
                />
                <AppInput
                  class="reveal" style="--i: 5"
                  v-model="password"
                  input-id="login-password"
                  label="Kata sandi"
                  placeholder="Masukkan kata sandi"
                  type="password"
                  autocomplete="current-password"
                  :icon="lockClosedOutline"
                  required
                  @focus="mascotRef?.setPasswordFocus(true, showPassword)"
                  @blur="mascotRef?.setPasswordFocus(false, showPassword)"
                  @visibility-change="togglePasswordVisibility"
                />
              <div class="password-tools password-tools--right reveal reveal--fade" style="--i: 6">
                <RouterLink to="/forgot-password">Lupa kata sandi?</RouterLink>
              </div>
              
              <AppButton
                class="submit-button reveal"
                style="--i: 6"
                type="submit"
                expand="block"
                :disabled="loading"
                color="primary"
              >
                <IonSpinner
                  v-if="loading"
                  name="crescent"
                />

                <span v-else>
                  MASUK
                </span>
              </AppButton>

            </form>

            <div class="separator reveal reveal--fade" style="--i: 7"><span>atau</span></div>

            <ion-button
              expand="block"
              fill="outline"
              class="google-button reveal"
              style="--i: 7"
              :disabled="loading || googleLoading"
              @click="loginWithGoogle"
            > 
              <ion-spinner v-if="googleLoading" name="crescent" />
              <span v-else class="google-label">
                <img class="google-logo-image" src="data:image/png;base64,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" alt="" aria-hidden="true" />
                Masuk dengan Google
              </span>
            </ion-button>

            <RouterLink class="register-link reveal" style="--i: 8" to="/register">
              <ion-icon :icon="personAddOutline" aria-hidden="true" />
              <span>Daftar akun baru</span>
            </RouterLink>
          </ion-card-content>
        </ion-card>

        <footer class="auth-footer reveal reveal--fade" style="--i: 9">
          <strong>PoliLand Kairagi</strong>
          <span>Solusi Investasi Tanah Masa Depan</span>
        </footer>

        <Transition name="login-skeleton-fade">
          <div
            v-if="isPageLoading"
            class="login-skeleton-overlay"
            aria-hidden="true"
          >
            <div class="login-skeleton-shell">
              <div class="login-skeleton-topbar">
                <Skeleton width="118px" height="42px" border-radius="30px" />
              </div>

              <section class="login-skeleton-visual">
                <Skeleton
                  width="190px"
                  height="190px"
                  border-radius="50%"
                />
              </section>

              <section class="login-skeleton-card">
                <div class="login-skeleton-header">
                  <Skeleton width="185px" height="25px" border-radius="7px" />
                  <Skeleton width="76px" height="4px" border-radius="999px" />
                  <Skeleton width="260px" height="14px" border-radius="7px" />
                  <Skeleton width="225px" height="14px" border-radius="7px" />
                </div>

                <div class="login-skeleton-form">
                  <Skeleton width="100%" height="66px" border-radius="12px" />
                  <Skeleton width="100%" height="66px" border-radius="12px" />
                  <div class="login-skeleton-forgot">
                    <Skeleton width="105px" height="12px" border-radius="6px" />
                  </div>
                  <Skeleton width="100%" height="48px" border-radius="12px" />
                </div>

                <div class="login-skeleton-separator">
                  <Skeleton width="100%" height="1px" border-radius="1px" />
                  <Skeleton width="24px" height="10px" border-radius="5px" />
                  <Skeleton width="100%" height="1px" border-radius="1px" />
                </div>

                <Skeleton width="100%" height="48px" border-radius="12px" />
                <div class="login-skeleton-register">
                  <Skeleton width="100%" height="48px" border-radius="12px" />
                </div>
              </section>

              <div class="login-skeleton-footer">
                <Skeleton width="110px" height="13px" border-radius="6px" />
                <Skeleton width="190px" height="10px" border-radius="5px" />
              </div>
            </div>
          </div>
        </Transition>
      </main>
    </ion-content>
  </ion-page>
</template>

<style scoped>
/* =========================================================
   LOGIN: satu layar, tanpa scroll di ponsel umum.
   Maskot menyusut/hilang lebih dulu bila layar pendek,
   semua tombol satu baris (nowrap).
   ========================================================= */

.auth-content {
  --background: #f7f3ea;
  --overflow: auto; /* cadangan untuk layar sangat pendek */
}

.auth-shell {
  --mascot-basis: 150px;
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--safe-top) 14px max(12px, var(--safe-bottom));
  overflow-x: hidden;
  background-color: #f7f3ea;
  background-image: radial-gradient(ellipse at 50% 10%, rgb(255 255 255 / 28%) 0%, transparent 68%);
}

.auth-shell::before {
  content: '';
  position: absolute;
  z-index: -1;
  left: 0;
  right: 0;
  bottom: 0;
  height: 170px;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20900%20240%22%20preserveAspectRatio%3D%22none%22%3E%3Cpath%20fill%3D%22%23e8dfc7%22%20d%3D%22M0%2018%20C120%2044%20185%20102%20310%20124%20C435%20151%20510%20149%20620%20113%20C730%2077%20810%2034%20900%2016%20L900%20240%20L0%20240Z%22%2F%3E%3Cpath%20fill%3D%22%23f8f5ee%22%20d%3D%22M0%200%20C115%2036%20190%2095%20310%20112%20C425%20132%20520%20139%20630%20102%20C740%2066%20820%2025%20900%200%20L900%2075%20C800%20103%20732%20146%20620%20174%20C500%20205%20418%20190%20300%20166%20C170%20140%20100%2082%200%2060Z%22%2F%3E%3Cpath%20fill%3D%22%23aab39a%22%20d%3D%22M0%2083%20C105%20107%20187%20164%20310%20181%20C425%20199%20520%20211%20630%20174%20C750%20134%20820%2091%20900%2074%20L900%20240%20L0%20240Z%22%2F%3E%3Cpath%20fill%3D%22%238e9d80%22%20d%3D%22M0%20130%20C115%20151%20187%20202%20310%20215%20C430%20231%20520%20235%20635%20205%20C744%20176%20822%20131%20900%20116%20L900%20240%20L0%20240Z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: 100% 100%;
}

/* ---------- Animasi masuk ----------
   Elemen disembunyikan sampai skeleton selesai (.is-entered),
   lalu naik bergantian lewat --i. Fill 'backwards' supaya
   state :active tombol tidak tertimpa setelah animasi selesai. */
.auth-shell:not(.is-entered) .reveal {
  opacity: 0;
}

.auth-shell.is-entered .reveal {
  animation: reveal-up 520ms var(--ease-out) backwards;
  animation-delay: calc(var(--i, 0) * 60ms);
}

.auth-shell.is-entered .reveal--fade {
  animation-name: reveal-fade;
  animation-duration: 420ms;
}

.auth-shell.is-entered .reveal--pop {
  animation-name: reveal-pop;
  animation-duration: 640ms;
  animation-timing-function: var(--ease-spring);
}

@keyframes reveal-up {
  from { opacity: 0; transform: translateY(18px); }
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
  .auth-shell.is-entered .reveal {
    animation: none;
  }
}

/* ---------- Topbar ---------- */
.auth-topbar {
  position: relative;
  z-index: 3;
  width: min(100%, 480px);
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  padding: 4px 2px 0;
}

.back-home-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  border: 1.5px solid #77806f;
  border-radius: 30px;
  background: transparent;
  color: #5f6858;
  font-family: inherit;
  font-size: 13px;
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
    background: #8a6508;
    border-color: #8a6508;
    color: #fff;
  }
}

.back-home-button:active {
  background: #755407;
  border-color: #755407;
  color: #fff;
  transform: scale(.97);
}

.back-home-button:focus-visible {
  outline: 2px solid #77806f;
  outline-offset: 2px;
}

.back-home-button ion-icon {
  font-size: 16px;
  flex-shrink: 0;
}

/* ---------- Maskot ---------- */
.auth-visual {
  position: relative;
  z-index: 1;
  width: min(100%, 480px);
  flex: 1 1 var(--mascot-basis);
  min-height: 0;
  max-height: 280px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
  background: transparent !important;
}

.auth-visual :deep(.mascot-canvas) {
  width: 100%;
  height: 100%;
  max-width: none;
  min-height: 0;
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
  z-index: 2;
  box-sizing: border-box;
  width: min(100%, 480px);
  flex: 0 0 auto;
  margin: 0;
  border: 1.5px solid rgb(196 190 177 / 85%);
  border-radius: 26px;
  background: rgb(255 253 248 / 96%);
  box-shadow: 0 8px 24px rgb(54 49 36 / 15%);
  overflow: visible;
}

ion-card-header {
  flex-direction: column; /* Ionic default column-reverse membalik urutan judul */
  padding: 16px 20px 2px;
  text-align: center;
}

ion-card-title {
  color: #a07f33;
  font-size: clamp(20px, 5.4vw, 26px);
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: .005em;
  white-space: nowrap;
}

.title-ornament {
  display: block;
  width: 64px;
  height: 3px;
  margin: 10px auto;
  border-radius: 2px;
  background: #c4a052;
}

.subtitle {
  margin: 0;
  color: #5f6858;
  font-size: clamp(13px, 3.5vw, 15px);
  line-height: 1.4;
  font-weight: 600;
}

ion-card-content {
  padding: 8px 18px 16px;
}

.confirmation-resend {
  display: grid;
  justify-items: start;
  gap: 6px;
  margin: 0 0 10px;
}

.confirmation-resend button {
  min-height: 32px;
  padding: 0;
  border: 0;
  color: #805708;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  text-decoration: underline;
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation;
}

.confirmation-resend button:disabled {
  opacity: .55;
  cursor: default;
}

/* ---------- Form ---------- */
.auth-form {
  display: grid;
  gap: 10px;
  margin-top: 4px;
}

.auth-form :deep(.app-field) {
  gap: 4px;
}

.auth-form :deep(.app-field__label) {
  font-size: 13px;
  line-height: 1.3;
}

.auth-form :deep(input) {
  font-size: 16px; /* cegah iOS zoom saat fokus */
}

.password-tools {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin: -6px 0 -2px;
}

.password-tools a {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 2px;
  color: #7d5e1a;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.password-tools a:active {
  opacity: .65;
}

.password-tools a:focus-visible {
  outline: 2px solid #b18e45;
  outline-offset: 2px;
  border-radius: 6px;
}

.submit-button {
  --background: #8a6a24;
  --background-activated: #6f551c;
  --background-hover: #7a5d1f;
  --color: #ffffff;
  --border-radius: 12px;
  --box-shadow: 0 4px 12px rgb(138 106 36 / 24%);
  margin: 0;
  min-height: 48px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .02em;
  white-space: nowrap;
}

/* ---------- Pemisah + Google + Daftar ---------- */
.separator {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 10px 0;
  color: #6b6b66;
  font-size: 13px;
  line-height: 1;
}

.separator::before,
.separator::after {
  content: '';
  height: 1px;
  flex: 1;
  background: #dedbd5;
}

.google-button {
  --color: #333;
  --border-color: #cecece;
  --border-width: 1.5px;
  --border-radius: 12px;
  --background: #fff;
  --background-activated: #f8f4eb;
  margin: 0;
  min-height: 48px;
  font-size: 15px;
  font-weight: 650;
  white-space: nowrap;
}

.google-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  white-space: nowrap;
}

.google-logo-image {
  display: block;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  object-fit: contain;
}

.register-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  min-height: 48px;
  margin-top: 10px;
  padding: 0 14px;
  border: 1.5px solid #e3cf9a;
  border-radius: 12px;
  background: #fbf1d9;
  color: #4d3b0f;
  font-size: 15px;
  font-weight: 750;
  white-space: nowrap;
  text-decoration: none;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    transform var(--dur-instant) var(--ease-out);
}

.register-link ion-icon {
  font-size: 20px;
  flex-shrink: 0;
}

@media (hover: hover) and (pointer: fine) {
  .register-link:hover {
    background: #f6e6bd;
  }
}

.register-link:active {
  background: #f1dca8;
  transform: scale(.98);
}

.register-link:focus-visible {
  outline: 2px solid #8a6a24;
  outline-offset: 2px;
}

/* ---------- Footer ---------- */
.auth-footer {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 8px 4px;
  text-align: center;
}

.auth-footer strong {
  color: #2f3b2b;
  font-size: 13px;
  line-height: 1.3;
  font-weight: 700;
}

.auth-footer span {
  color: #3f4a3a;
  font-size: 12px;
  line-height: 1.3;
}

/* =========================================================
   SKELETON (mengikuti tata letak ringkas di atas)
   ========================================================= */

.login-skeleton-overlay {
  position: absolute;
  inset: 0;
  z-index: 9999;
  overflow: hidden;
  background: #f7f3ea;
}

.login-skeleton-shell {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--safe-top) 14px max(12px, var(--safe-bottom));
  background-color: #f7f3ea;
}

.login-skeleton-topbar {
  width: min(100%, 480px);
  min-height: 52px;
  display: flex;
  align-items: center;
  padding: 4px 2px 0;
  box-sizing: border-box;
}

.login-skeleton-visual {
  width: min(100%, 480px);
  flex: 1 1 150px;
  min-height: 0;
  max-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-skeleton-visual :deep(.skeleton) {
  opacity: .72;
  max-height: 100%;
}

.login-skeleton-card {
  box-sizing: border-box;
  width: min(100%, 480px);
  padding: 16px 18px 16px;
  border: 1.5px solid rgb(196 190 177 / 85%);
  border-radius: 26px;
  background: rgb(255 253 248 / 96%);
  box-shadow: 0 8px 24px rgb(54 49 36 / 15%);
}

.login-skeleton-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.login-skeleton-form {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.login-skeleton-forgot {
  display: flex;
  justify-content: flex-end;
}

.login-skeleton-separator {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  margin: 10px 0;
}

.login-skeleton-register {
  margin-top: 10px;
}

.login-skeleton-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 12px 8px 4px;
}

.login-skeleton-fade-enter-active,
.login-skeleton-fade-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}

.login-skeleton-fade-enter-from,
.login-skeleton-fade-leave-to {
  opacity: 0;
}

/* =========================================================
   RESPONSIF
   ========================================================= */

@media (min-width: 700px) {
  .auth-shell {
    --mascot-basis: 220px;
    padding-left: 24px;
    padding-right: 24px;
  }

  .auth-visual,
  .login-skeleton-visual {
    max-height: 340px;
  }
}

/* Layar pendek: padatkan dulu, lalu buang elemen dekoratif. */
@media (max-height: 780px) {
  .auth-footer,
  .login-skeleton-footer {
    display: none;
  }
}

@media (max-height: 740px) {
  .auth-shell {
    --mascot-basis: 110px;
  }

  .auth-topbar,
  .login-skeleton-topbar {
    min-height: 48px;
  }
}

@media (max-height: 700px) {
  .subtitle,
  .title-ornament {
    display: none;
  }

  ion-card-header {
    padding-top: 14px;
  }

  .auth-shell {
    --mascot-basis: 84px;
  }
}

@media (max-height: 640px) {
  .auth-visual,
  .login-skeleton-visual {
    display: none;
  }
}
</style>
