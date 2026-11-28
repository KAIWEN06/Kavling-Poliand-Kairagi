<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonText, IonSpinner, IonIcon,
} from '@ionic/vue'
import {
  arrowBackOutline, personOutline, mailOutline, lockClosedOutline,
  logInOutline,
} from 'ionicons/icons'
import MascotCanvas from '@/components/auth/MascotCanvas.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { supabase } from '@/services/config/supabase'
import { authService } from '@/services/auth/authService'
import { AUTH_MESSAGES, authErrorMessage, emailInputError } from '@/services/auth/authErrorMessage'
import { resolveHome } from '@/services/auth/resolveHome'
import { useGoogleAuthSpinner } from '@/composables/useGoogleAuthSpinner'

interface MascotHandle {
  setEmailFocus(active: boolean): Promise<void>
  setPasswordFocus(active: boolean, visible: boolean): Promise<void>
  setPasswordVisible(visible: boolean): Promise<void>
  playError(): Promise<void>
  stopIntro(): void
}

const router = useRouter()
const mascotRef = ref<MascotHandle | null>(null)
const fullName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const googleLoading = ref(false)
useGoogleAuthSpinner(googleLoading)
const errorMessage = ref('')
const successMessage = ref('')
const passwordIsValid = computed(() => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password.value))


async function onPasswordVisibilityChange(visible: boolean) {
  showPassword.value = visible
  await mascotRef.value?.setPasswordVisible(visible)
}

async function onConfirmPasswordVisibilityChange(visible: boolean) {
  showConfirmPassword.value = visible
  await mascotRef.value?.setPasswordVisible(visible)
}

// Email yang sudah terdaftar langsung masuk, hanya bila kata sandinya cocok dengan akun itu.
async function loginExistingAccount() {
  try {
    const { user } = await authService.login(email.value, password.value)
    const destination = await resolveHome(user.id)
    password.value = ''
    confirmPassword.value = ''
    await router.replace(destination)
  } catch (error) {
    const message = authErrorMessage(error, 'Email ini sudah terdaftar. Coba dari halaman Masuk.')
    errorMessage.value =
      message === AUTH_MESSAGES.wrongCredentials
        ? 'Email ini sudah terdaftar dengan kata sandi lain. Buka halaman Masuk untuk memakai kata sandi akun, Google, atau Lupa kata sandi.'
        : message
    void mascotRef.value?.playError()
  }
}

async function submitRegistration() {
  if (loading.value || googleLoading.value) return
  errorMessage.value = ''
  successMessage.value = ''

  if (fullName.value.trim().length < 2) {
    errorMessage.value = 'Isi nama lengkap Anda.'
    return
  }
  const emailError = emailInputError(email.value)
  if (emailError) {
    errorMessage.value = emailError
    return
  }
  if (!passwordIsValid.value) {
    errorMessage.value = 'Kata sandi minimal 8 karakter dan harus mengandung huruf, angka, serta simbol.'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi kata sandi tidak sama.'
    return
  }

  mascotRef.value?.stopIntro()
  loading.value = true
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value,
      options: {
        data: {
          full_name: fullName.value.trim(),
          role: 'client',
        },
      },
    })
    // Tanpa konfirmasi email Supabase membalas error; dengan konfirmasi, user tanpa identities.
    const alreadyRegistered = error
      ? error.code === 'user_already_exists' || error.code === 'email_exists'
      : !data.session && data.user?.identities?.length === 0

    if (alreadyRegistered) {
      await loginExistingAccount()
      return
    }
    if (error) throw error

    if (data.session) {
      successMessage.value = 'Akun berhasil dibuat. Silakan masuk ke PoliLand.'
      window.setTimeout(() => { void router.replace('/login') }, 900)
    } else {
      successMessage.value = 'Pendaftaran berhasil. Periksa email untuk konfirmasi akun, lalu masuk.'
    }
  } catch (error) {
    errorMessage.value = authErrorMessage(error, 'Pendaftaran belum berhasil. Silakan coba lagi.')
    void mascotRef.value?.playError()
  } finally {
    loading.value = false
  }
}

async function registerWithGoogle() {
  if (loading.value || googleLoading.value) return
  errorMessage.value = ''
  googleLoading.value = true
  mascotRef.value?.stopIntro()
  try {
    // Jalur yang sama dengan halaman Masuk, agar Android kembali lewat deep link.
    await authService.signInWithGoogle()
  } catch (error) {
    errorMessage.value = authErrorMessage(error, 'Belum berhasil membuka Google. Silakan coba lagi.')
    googleLoading.value = false
    void mascotRef.value?.playError()
  }
}
</script>

<template>
  <ion-page>
    <ion-content class="register-content" :fullscreen="true">
      <main class="register-shell">
        <div class="register-topbar reveal reveal--fade" style="--i: 0">
          <button
            class="back-home-button"
            type="button"
            @click="router.push('/home')"
          >
            <ion-icon
              :icon="arrowBackOutline"
              aria-hidden="true"
            />
            <span>Halaman utama</span>
          </button>
        </div>

        <section class="register-visual reveal reveal--pop" style="--i: 1" aria-label="Animasi maskot PoliLand">
          <MascotCanvas ref="mascotRef" />
        </section>

        <ion-card class="register-card reveal" style="--i: 2">
          <ion-card-header class="reveal reveal--fade" style="--i: 3">
            <ion-card-title>Buat Akun</ion-card-title>
            <span class="title-ornament" aria-hidden="true"></span>
          </ion-card-header>

          <ion-card-content>
            <AppNotice v-if="errorMessage" tone="error">
              {{ errorMessage }}
            </AppNotice>
            <AppNotice v-if="successMessage" tone="success">
              {{ successMessage }}
            </AppNotice>

            <form class="register-form" novalidate @submit.prevent="submitRegistration">
              <div class="input-wrap reveal" style="--i: 3">
                <AppInput
                  v-model="fullName" data-input="name"
                  input-id="full-name"
                  label="Nama Lengkap"
                  placeholder="Masukkan nama lengkap..."
                  type="text"
                  autocomplete="name"
                  :icon="personOutline"
                  required
                  @focus="mascotRef?.setEmailFocus(true)"
                  @blur="mascotRef?.setEmailFocus(false)"
                />
              </div>

              <div class="input-wrap reveal" style="--i: 4">
                <AppInput
                  v-model="email"
                  input-id="register-email"
                  label="Email"
                  placeholder="contoh@email.com"
                  type="email"
                  autocomplete="email"
                  :icon="mailOutline"
                  required
                  @focus="mascotRef?.setEmailFocus(true)"
                  @blur="mascotRef?.setEmailFocus(false)"
                />
              </div>
              <div class="input-wrap password-wrap reveal" style="--i: 5">
              <AppInput
                v-model="password"
                input-id="register-password"
                label="Kata sandi"
                placeholder="Masukan kata sandi"
                type="password"
                autocomplete="new-password"
                :icon="lockClosedOutline"
                required
                @focus="mascotRef?.setPasswordFocus(true, showPassword)"
                @blur="mascotRef?.setPasswordFocus(false, showPassword)"
                @visibility-change="onPasswordVisibilityChange"
              />
              </div>
              <p class="password-hint reveal reveal--fade" style="--i: 5" :class="{ 'password-hint--valid': passwordIsValid }">Min. 8 karakter: huruf, angka, simbol</p>

              <div class="input-wrap password-wrap reveal" style="--i: 6">
              <AppInput
                v-model="confirmPassword"
                input-id="confirm-password"
                label="Konfirmasi kata sandi"
                placeholder="Masukan kembali kata sandi"
                type="password"
                autocomplete="new-password"
                :icon="lockClosedOutline"
                required
                @focus="mascotRef?.setPasswordFocus(true, showConfirmPassword)"
                @blur="mascotRef?.setPasswordFocus(false, showConfirmPassword)"
                @visibility-change="onConfirmPasswordVisibilityChange"
              />
              </div>

              <ion-button
                class="submit-button reveal"
                style="--i: 7"
                type="submit"

                expand="block"

                :disabled="loading || googleLoading"

              >

                <ion-spinner v-if="loading" name="crescent" />

                <span v-else>Buat Akun</span>

              </ion-button>
            </form>

            <div class="separator reveal reveal--fade" style="--i: 8"><span>atau</span></div>
            <ion-button class="google-button reveal" style="--i: 8" type="button" expand="block" fill="outline" :disabled="loading || googleLoading" @click="registerWithGoogle">
              <ion-spinner v-if="googleLoading" name="crescent" />
              <span v-else class="google-label">
                <svg
                  class="google-logo"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
                  <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
                  <path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z" />
                  <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z" />
                </svg>
                <span>Buat dengan Google</span>
              </span>
            </ion-button>

            <RouterLink class="login-link reveal" style="--i: 9" to="/login">
              <ion-icon :icon="logInOutline" aria-hidden="true" />
              <span>Sudah punya akun? Masuk</span>
            </RouterLink>
          </ion-card-content>
        </ion-card>

        <footer class="register-footer reveal reveal--fade" style="--i: 10">
          <strong>PoliLand Kairagi</strong>
          <span>Solusi Investasi Tanah Masa Depan</span>
        </footer>
      </main>
    </ion-content>
  </ion-page>
</template>

<style scoped>
/* =========================================================
   REGISTER: satu layar. Maskot menghilang lebih dulu di
   layar pendek; semua tombol satu baris.
   ========================================================= */

.register-content {
  --background: #f7f3ea;
  --overflow: auto; /* cadangan untuk layar sangat pendek */
}

.register-shell {
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
  background: #f7f3ea;
}

.register-shell::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: auto 0 0;
  height: 150px;
  pointer-events: none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 240' preserveAspectRatio='none'%3E%3Cpath fill='%23e8dfc7' d='M0 18 C120 44 185 102 310 124 C435 151 510 149 620 113 C730 77 810 34 900 16 L900 240 L0 240Z'/%3E%3Cpath fill='%23f8f5ee' d='M0 0 C115 36 190 95 310 112 C425 132 520 139 630 102 C740 66 820 25 900 0 L900 75 C800 103 732 146 620 174 C500 205 418 190 300 166 C170 140 100 82 0 60Z'/%3E%3Cpath fill='%23aab39a' d='M0 83 C105 107 187 164 310 181 C425 199 520 211 630 174 C750 134 820 91 900 74 L900 240 L0 240Z'/%3E%3Cpath fill='%238e9d80' d='M0 130 C115 151 187 202 310 215 C430 231 520 235 635 205 C744 176 822 131 900 116 L900 240 L0 240Z'/%3E%3C/svg%3E") center bottom / 100% 100% no-repeat;
}

/* ---------- Animasi masuk (selaras dengan login) ---------- */
.register-shell .reveal {
  animation: reveal-up 520ms var(--ease-out) backwards;
  animation-delay: calc(var(--i, 0) * 55ms);
}

.register-shell .reveal--fade {
  animation-name: reveal-fade;
  animation-duration: 420ms;
}

.register-shell .reveal--pop {
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
  .register-shell .reveal {
    animation: none;
  }
}

/* ---------- Topbar ---------- */
.register-topbar {
  position: relative;
  z-index: 3;
  width: min(100%, 480px);
  min-height: 52px;
  display: flex;
  align-items: center;
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
.register-visual {
  position: relative;
  z-index: 1;
  width: min(100%, 480px);
  flex: 1 1 130px;
  min-height: 0;
  max-height: 230px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  background: transparent !important;
}

.register-visual :deep(.mascot-canvas) {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent !important;
}

.register-visual :deep(canvas) {
  width: 100%;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
  background: transparent !important;
}

/* ---------- Kartu ---------- */
.register-card {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  width: min(100%, 480px);
  flex: 0 0 auto;
  margin: 0;
  border: 1.5px solid rgb(196 190 177 / 85%);
  border-radius: 24px;
  background: rgb(255 253 248 / 97%);
  box-shadow: 0 8px 24px rgb(54 49 36 / 15%);
  overflow: visible;
}

ion-card-header {
  flex-direction: column; /* Ionic default column-reverse membalik urutan judul */
  padding: 12px 16px 2px;
  text-align: center;
}

ion-card-title {
  color: #a07f33;
  font-size: clamp(20px, 5.4vw, 24px);
  line-height: 1.15;
  font-weight: 800;
  white-space: nowrap;
}

.title-ornament {
  display: block;
  width: 56px;
  height: 3px;
  margin: 8px auto 4px;
  border-radius: 2px;
  background: #c4a052;
}

ion-card-content {
  padding: 4px 16px 14px;
}

/* ---------- Form ---------- */
.register-form {
  display: grid;
  gap: 12px;
}

.register-form :deep(.app-field) {
  gap: 5px;
}

.register-form :deep(.app-field__label) {
  font-size: 13px;
  line-height: 1.25;
}

.register-form :deep(.app-field__control) {
  min-height: 46px;
}

.register-form :deep(.app-field__input) {
  min-height: 40px;
}

.register-form :deep(.app-field__input::part(native)) {
  min-height: 40px;
}

.register-form :deep(input) {
  font-size: 16px; /* cegah iOS zoom saat fokus */
}

.password-hint {
  margin: -4px 2px 0;
  color: #5f6858;
  font-size: 12px;
  line-height: 1.3;
  white-space: nowrap;
}

.password-hint--valid {
  color: #3b6b49;
}

.submit-button {
  --background: #8a6a24;
  --background-activated: #6f551c;
  --background-hover: #7a5d1f;
  --color: #fff;
  --border-radius: 12px;
  --box-shadow: 0 4px 12px rgb(138 106 36 / 24%);
  margin: 2px 0 0;
  min-height: 48px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .02em;
  white-space: nowrap;
}

/* ---------- Pemisah + Google + Masuk ---------- */
.separator {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
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

.google-label .google-logo {
  display: block;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
}

.login-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  min-height: 48px;
  margin-top: 12px;
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

.login-link ion-icon {
  font-size: 20px;
  flex-shrink: 0;
}

@media (hover: hover) and (pointer: fine) {
  .login-link:hover {
    background: #f6e6bd;
  }
}

.login-link:active {
  background: #f1dca8;
  transform: scale(.98);
}

.login-link:focus-visible {
  outline: 2px solid #8a6a24;
  outline-offset: 2px;
}

/* ---------- Footer ---------- */
.register-footer {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 8px 2px;
  text-align: center;
}

.register-footer strong {
  color: #2f3b2b;
  font-size: 13px;
  font-weight: 700;
}

.register-footer span {
  color: #3f4a3a;
  font-size: 12px;
}

/* ---------- Responsif ---------- */
@media (min-width: 700px) {
  .register-shell {
    padding-left: 24px;
    padding-right: 24px;
  }

  .register-visual {
    flex-basis: 200px;
    max-height: 300px;
  }
}

/* Form register panjang (5 kolom): buang yang dekoratif lebih awal. */
@media (max-height: 840px) {
  .register-footer {
    display: none;
  }
}

@media (max-height: 760px) {
  .register-visual {
    display: none;
  }

  .register-topbar {
    min-height: 48px;
  }
}

@media (max-height: 700px) {
  .title-ornament {
    display: none;
  }

  .register-form {
    gap: 8px;
  }
}
</style>
