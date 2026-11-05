<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonInput, IonButton, IonText, IonSpinner, IonIcon,
} from '@ionic/vue'
import {
  arrowBackOutline, personOutline, callOutline, mailOutline, lockClosedOutline,
  eyeOutline, eyeOffOutline, personAddOutline, chevronForwardOutline,
} from 'ionicons/icons'
import MascotCanvas from '@/components/auth/MascotCanvas.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { supabase } from '@/services/config/supabase'

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
const phone = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const googleLoading = ref(false)
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

async function togglePassword(which: 'password' | 'confirm') {
  if (which === 'password') {
    showPassword.value = !showPassword.value
    await mascotRef.value?.setPasswordVisible(showPassword.value)
  } else {
    showConfirmPassword.value = !showConfirmPassword.value
    await mascotRef.value?.setPasswordVisible(showConfirmPassword.value)
  }
}

async function submitRegistration() {
  if (loading.value || googleLoading.value) return
  errorMessage.value = ''
  successMessage.value = ''

  if (fullName.value.trim().length < 2) {
    errorMessage.value = 'Masukkan nama lengkap yang valid.'
    return
  }
  if (phone.value.replace(/\D/g, '').length < 8) {
    errorMessage.value = 'Masukkan nomor telepon yang valid.'
    return
  }
  if (!passwordIsValid.value) {
    errorMessage.value = 'Password minimal 8 karakter dan harus mengandung huruf, angka, serta simbol.'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi password tidak sama.'
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
          phone: phone.value.trim(),
        },
      },
    })
    if (error) throw error

    if (data.session) {
      successMessage.value = 'Akun berhasil dibuat. Silakan masuk ke PoliLand.'
      window.setTimeout(() => { void router.replace('/login') }, 900)
    } else {
      successMessage.value = 'Pendaftaran berhasil. Periksa email untuk konfirmasi akun, lalu masuk.'
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Pendaftaran gagal. Silakan coba lagi.'
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Pendaftaran dengan Google gagal dimulai.'
    googleLoading.value = false
    void mascotRef.value?.playError()
  }
}
</script>

<template>
  <ion-page>
    <ion-content class="register-content" :fullscreen="true">
      <main class="register-shell">
        <div class="register-topbar">
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

        <section class="register-visual" aria-label="Animasi maskot PoliLand">
          <MascotCanvas ref="mascotRef" />
        </section>

        <ion-card class="register-card">
          <ion-card-header>
            <ion-card-title>Buat Akun</ion-card-title>
            <span class="title-ornament" aria-hidden="true"></span>
          </ion-card-header>

          <ion-card-content>
            <ion-text v-if="errorMessage" color="danger"><p class="message" role="alert">{{ errorMessage }}</p></ion-text>
            <ion-text v-if="successMessage" color="success"><p class="message success-message" role="status">{{ successMessage }}</p></ion-text>

            <form class="register-form" @submit.prevent="submitRegistration">
              <div class="input-wrap">
                <AppInput
                  v-model="fullName"
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

              <div class="input-wrap">
                <AppInput
                  v-model="phone"
                  input-id="phone-number"
                  label="Nomor Telepon"
                  placeholder="Contoh 0823 4735 8236"
                  type="tel"
                  autocomplete="tel"
                  :icon="callOutline"
                  required
                  @focus="mascotRef?.setEmailFocus(true)"
                  @blur="mascotRef?.setEmailFocus(false)"
                />
              </div>
              <div class="input-wrap">
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
              <div class="input-wrap password-wrap">
              <AppInput
                v-model="password"
                input-id="register-password"
                label="Password"
                placeholder="Masukan Password"
                type="password"
                autocomplete="new-password"
                :icon="lockClosedOutline"
                required
                @focus="mascotRef?.setPasswordFocus(true, showPassword)"
                @blur="mascotRef?.setPasswordFocus(false, showPassword)"
                @visibility-change="onPasswordVisibilityChange"
              />
              </div>
              <p class="password-hint" :class="{ 'password-hint--valid': passwordIsValid }">Minimal 8 karakter dengan kombinasi huruf, angka, dan simbol</p>

              <div class="input-wrap password-wrap">
              <AppInput
                v-model="confirmPassword"
                input-id="confirm-password"
                label="Konfirmasi Password"
                placeholder="Masukan kembali Password"
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

                class="submit-button"

                type="submit"

                expand="block"

                :disabled="loading || googleLoading"

              >

                <ion-spinner v-if="loading" name="crescent" />

                <span v-else>Masuk</span>

              </ion-button>
            </form>

            <div class="separator"><span>atau</span></div>
            <ion-button class="google-button" type="button" expand="block" fill="outline" :disabled="loading || googleLoading" @click="registerWithGoogle">
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

            <RouterLink class="login-link" to="/login">
              <span class="login-icon"><ion-icon :icon="personOutline" aria-hidden="true" /></span>
              <span class="login-copy"><small>Sudah punya akun?</small><strong>Masuk sekarang</strong></span>
              <ion-icon class="login-arrow" :icon="chevronForwardOutline" aria-hidden="true" />
            </RouterLink>
          </ion-card-content>
        </ion-card>

        <footer class="register-footer">
          <strong>PoliLand Kairagi</strong>
          <span>Solusi Investasi Tanah Masa Depan</span>
        </footer>
      </main>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.register-content { --background: #f8f5ee; --overflow: auto; }
.register-shell { position: relative; isolation: isolate; box-sizing: border-box; width: 100%; min-height: 122%; display: flex; flex-direction: column; align-items: center; padding: max(0px, env(safe-area-inset-top)) 14px max(28px, env(safe-area-inset-bottom)); overflow-x: hidden; background: #f7f3ea; }
.register-shell::before { content: ''; position: absolute; z-index: -1; inset: auto 0 0; height: 190px; pointer-events: none; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 240' preserveAspectRatio='none'%3E%3Cpath fill='%23e8dfc7' d='M0 18 C120 44 185 102 310 124 C435 151 510 149 620 113 C730 77 810 34 900 16 L900 240 L0 240Z'/%3E%3Cpath fill='%23f8f5ee' d='M0 0 C115 36 190 95 310 112 C425 132 520 139 630 102 C740 66 820 25 900 0 L900 75 C800 103 732 146 620 174 C500 205 418 190 300 166 C170 140 100 82 0 60Z'/%3E%3Cpath fill='%23aab39a' d='M0 83 C105 107 187 164 310 181 C425 199 520 211 630 174 C750 134 820 91 900 74 L900 240 L0 240Z'/%3E%3Cpath fill='%238e9d80' d='M0 130 C115 151 187 202 310 215 C430 231 520 235 635 205 C744 176 822 131 900 116 L900 240 L0 240Z'/%3E%3C/svg%3E") center bottom / 100% 100% no-repeat; }
.register-topbar { position: relative; z-index: 3; width: min(100%, 520px); min-height: 60px; display: flex; align-items: center; margin: 0 auto; padding: 3px 2px; box-sizing: border-box; }
.back-home-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  min-height: 42px;
  padding: 0 18px;

  border: 1.5px solid #77806f;
  border-radius: 30px;

  background: transparent;

  color: #77806f;

  font-family: inherit;
  font-size: 13px;
  font-weight: 700;

  cursor: pointer;

  transition:
    background-color .2s ease,
    color .2s ease,
    border-color .2s ease,
    transform .15s ease;
}

.back-home-button:hover {
  background: #B8860B;
  color: #FFFFFF;
}

.back-home-button:active {
  background: #A2770A;
  border-color: #A2770A;
  color: #FFFFFF;

  transform: scale(.98);
}

.back-home-button:focus-visible {
  outline: 2px solid #77806f;
  outline-offset: 1px;
}

.back-home-button ion-icon {
  font-size: 10px;
  flex-shrink: 0;
}
.register-visual { position: relative; z-index: 1; width: min(100%, 520px); height: clamp(150px, 24dvh, 250px); min-height: 150px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; margin: 0 auto; overflow: visible; background: transparent !important; }
.register-visual :deep(.mascot-canvas) { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: transparent !important; }
.register-visual :deep(canvas) { width: 100%; height: 100%; max-height: 100%; object-fit: contain; background: transparent !important; }
.register-card { position: relative; z-index: 2; box-sizing: border-box; width: min(100%, 520px); flex: 0 0 auto; margin: 0 auto; border: 1.5px solid rgb(196 190 177 / 85%); border-radius: 24px; background: rgb(255 253 248 / 97%); box-shadow: 0 8px 24px rgb(54 49 36 / 15%); overflow: visible; }
ion-card-header { padding: 14px 18px 5px; text-align: center; }
ion-card-title { color: #b9964e; font-size: clamp(21px, 5vw, 26px); line-height: 1.15; font-weight: 800; }
.title-ornament { display: block; width: 66px; height: 3px; margin: 10px auto 6px; background: #c4a052; }
ion-card-content { padding: 6px 14px 14px; }
.message { margin: 0 0 8px; font-size: 12px; line-height: 1.35; }
.success-message { color: #3d775c; }
.register-form { display: grid; gap: 4px; }
.field-label { margin: 1px 3px 0; color: #252722; font-size: 12px; line-height: 1.2; font-weight: 550; }
.input-wrap > ion-icon { flex: 0 0 16px; width: 16px; height: 16px; color: #898b85; }
.input-wrap ion-input { --background: transparent; --color: #41443e; --placeholder-color: #999; --placeholder-opacity: 1; --padding-start: 0; --padding-end: 0; --padding-top: 7px; --padding-bottom: 7px; min-height: 36px; flex: 1; min-width: 0; font-size: 12px; }
.input-wrap:focus-within { border-color: #c3a052; box-shadow: 0 0 0 2px rgb(195 160 82 / 12%); }
.password-wrap { padding-right: 42px; }
.eye-button { position: absolute; z-index: 4; top: 50%; right: 5px; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #dedbd3; border-radius: 8px; background: #f3f2ee; color: #777b74; padding: 0; -webkit-tap-highlight-color: transparent; }
.eye-button ion-icon { width: 19px; height: 19px; pointer-events: none; }
.password-hint { margin: -1px 3px 1px; color: #777; font-size: 9px; line-height: 1.3; }
.password-hint--valid { color: #4b7c59; }
.create-button { --background: linear-gradient(100deg, #c4a052 0%, #d0ad5d 100%); --background-activated: #b08d43; --color: #fff; --border-radius: 11px; --box-shadow: 0 3px 5px rgb(100 76 26 / 16%); margin: 7px 0 0; min-height: 44px; font-size: 16px; font-weight: 750; }
.separator { display: flex; align-items: center; gap: 10px; margin: 10px 0; color: #8c8c8c; font-size: 11px; }
.separator::before, .separator::after { content: ''; height: 1px; flex: 1; background: #dedbd5; }
.google-button { --color: #444; --border-color: #cecece; --border-width: 1px; --border-radius: 11px; --background: #fff; margin: 0; min-height: 43px; font-size: 13px; font-weight: 650; }
.google-label { display: inline-flex; align-items: center; justify-content: center; gap: 9px; }
.google-label .google-logo { display: block; flex: 0 0 21px; width: 21px; height: 21px; }
.login-link { display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box; margin-top: 10px; padding: 8px 10px; border: 1px solid #ead9b1; border-radius: 13px; background: #fbf1d9; color: #262724; text-decoration: none; }
.login-icon { display: flex; flex: 0 0 38px; width: 38px; height: 38px; align-items: center; justify-content: center; border-radius: 11px; background: #eac66b; color: #604a20; }
.login-icon ion-icon { width: 21px; height: 21px; }
.login-copy { display: flex; flex: 1; flex-direction: column; gap: 2px; }
.login-copy small { color: #7f7d72; font-size: 11px; }
.login-copy strong { font-size: 14px; line-height: 1.2; }
.login-arrow { width: 18px; height: 18px; color: #36372f; }
.register-footer { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 3px; width: 100%; box-sizing: border-box; padding: 10px 8px 18px; text-align: center; font-size: 11px; line-height: 1.35; }
.register-footer strong { color: #43523f; font-size: 12px; font-weight: 700; }
.register-footer span { color: #5f6858; font-size: 10px; }
@media (min-width: 700px) { .register-shell { padding: 18px 24px max(22px, env(safe-area-inset-bottom)); } .register-visual { width: min(100%, 580px); height: clamp(220px, 30dvh, 340px); } }
@media (max-height: 760px) { .register-topbar { min-height: 34px; } .register-visual { height: clamp(115px, 19dvh, 170px); min-height: 115px; } ion-card-header { padding-top: 10px; } .title-ornament { margin: 7px auto 4px; } ion-card-content { padding: 5px 12px 10px; } .register-form { gap: 3px; } .input-wrap { min-height: 36px; } .input-wrap ion-input { min-height: 32px; } .create-button, .google-button { min-height: 39px; } .separator { margin: 7px 0; } .login-link { margin-top: 8px; padding: 6px 9px; } .login-icon { width: 34px; height: 34px; flex-basis: 34px; } .register-footer { padding-top: 8px; padding-bottom: 12px; } }
</style>
