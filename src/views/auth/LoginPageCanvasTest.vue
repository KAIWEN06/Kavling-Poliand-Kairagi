<script setup lang="ts">

import { computed, ref } from 'vue'

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

} from '@ionic/vue'

import { authService } from '@/services/auth/authService'

import MascotCanvas from '@/components/auth/MascotCanvas.vue'

import { logoGoogle } from 'ionicons/icons'






const route = useRoute()

const router = useRouter()




const email = ref('')

const password = ref('')

const showPassword = ref(false)

const loading = ref(false)

const googleLoading = ref(false)

const errorMessage = ref('')



const queryError = computed(() => {

  if (route.query.error === 'role_missing') {

    return 'Akun berhasil masuk, tetapi role belum terdaftar. Hubungi administrator PoliLand.'

  }

  if (route.query.error === 'role_lookup_failed') {

    return 'Role akun tidak dapat diperiksa. Coba lagi atau hubungi administrator.'

  }

  return ''

})



async function submitLogin() {

  if (loading.value || googleLoading.value) return




  errorMessage.value = ''

  loading.value = true



  try {

    let result

    try {

      result = await authService.login(email.value.trim(), password.value)

    } catch (error) {

      errorMessage.value =

        error instanceof Error

          ? error.message

          : 'Login gagal. Periksa email dan password.'


      return

    }



    const userId = result.user?.id

    if (!userId) {

      errorMessage.value = 'ID pengguna tidak ditemukan.'

      return

    }



    let role

    try {

      role = await authService.getUserRole(userId)

    } catch {

      errorMessage.value =

        'Login berhasil, tetapi role akun gagal diperiksa. Hubungi administrator PoliLand.'

      return

    }



    const destination = authService.getRoleHomePath(role)

    if (!destination) {

      errorMessage.value =

        'Login berhasil, tetapi role akun belum terdaftar. Hubungi administrator.'

      return

    }



    await router.replace(destination)

  } finally {

    loading.value = false

  }

}



async function loginWithGoogle() {

  if (loading.value || googleLoading.value) return




  errorMessage.value = ''

  googleLoading.value = true



  try {

    await authService.signInWithGoogle()

  } catch (error) {

    errorMessage.value =

      error instanceof Error

        ? error.message

        : 'Login Google gagal dimulai.'

    googleLoading.value = false

  }

}



function togglePassword() {

  showPassword.value = !showPassword.value


}

</script>



<template>

  <ion-page>

    <ion-content class="auth-content" :fullscreen="true">

      <main class="auth-shell">

        <section class="auth-visual" aria-label="Maskot PoliLand">

          <MascotCanvas />

        </section>



        <ion-card class="auth-card">

          <ion-card-header>
              <RouterLink class="home-link" to="/home" aria-label="Kembali ke halaman utama">
                <span aria-hidden="true">←</span>
                <span>Halaman utama</span>
              </RouterLink>

            <ion-card-title>Selamat Datang</ion-card-title>

            <p class="subtitle">

              Masuk ke akun PoliLand Kairagi.

            </p>

          </ion-card-header>



          <ion-card-content>

            <ion-text v-if="queryError" color="danger">

              <p class="message">{{ queryError }}</p>

            </ion-text>

            <ion-text v-if="errorMessage" color="danger">

              <p class="message" role="alert">{{ errorMessage }}</p>

            </ion-text>



            <form class="auth-form" @submit.prevent="submitLogin">

              <ion-input

                v-model="email"

                type="email"

                label="Email"

                label-placement="stacked"

                placeholder="nama@email.com"

                autocomplete="email"

                required

              />



              <ion-input

                v-model="password"

                :type="showPassword ? 'text' : 'password'"

                label="Password"

                label-placement="stacked"

                placeholder="Masukkan password"

                autocomplete="current-password"

                required

              />



              <div class="password-tools">

                <button

                  class="text-button"

                  type="button"

                  @mousedown.prevent

                  @click="togglePassword"

                >

                  {{ showPassword ? 'Sembunyikan' : 'Tampilkan' }} password

                </button>

                <RouterLink to="/forgot-password">

                  Lupa password?

                </RouterLink>

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



            <ion-button

              expand="block"

              fill="outline"

              class="google-button"

              :disabled="loading || googleLoading"

              @click="loginWithGoogle"

            >

              <ion-spinner v-if="googleLoading" name="crescent" />

              <span v-else class="google-label"><ion-icon :icon="logoGoogle" aria-hidden="true" />Masuk dengan Google</span>

            </ion-button>

          </ion-card-content>

        </ion-card>

      </main>

    </ion-content>

  </ion-page>

</template>



<style scoped>

.auth-content {

  --background: #faf7f2;

}



.auth-shell {

  position: relative;

  isolation: isolate;

  box-sizing: border-box;

  width: 100%;

  height: 100%;

  min-height: 100%;

  display: grid;

  /* Beri porsi lebih besar untuk maskot di atas */

  grid-template-rows: minmax(130px, 26dvh) minmax(0, 1fr);

  align-items: stretch;

  justify-items: center;

  gap: 0;

  padding: max(6px, env(safe-area-inset-top)) 14px max(6px, env(safe-area-inset-bottom));

  overflow: hidden;

  background:

    radial-gradient(ellipse at 50% 0%, rgb(231 222 202 / 72%) 0%, rgb(250 247 242 / 0%) 48%),

    linear-gradient(180deg, #f7f4ec 0%, #faf7f2 56%, #f3ead9 100%);

}



.auth-shell::before,

.auth-shell::after {

  content: '';

  position: absolute;

  z-index: -1;

  bottom: -24px;

  width: 118px;

  height: 190px;

  pointer-events: none;

  filter: blur(13px);

  opacity: .46;

  border-radius: 70% 12% 70% 12%;

  background:

    radial-gradient(ellipse at 28% 24%, #879b58 0 13%, transparent 14%),

    radial-gradient(ellipse at 66% 38%, #476f42 0 17%, transparent 18%),

    radial-gradient(ellipse at 34% 58%, #a2ad67 0 18%, transparent 19%),

    radial-gradient(ellipse at 72% 72%, #527d49 0 16%, transparent 17%);

}



.auth-shell::before {

  left: -42px;

  transform: rotate(-20deg);

}



.auth-shell::after {

  right: -44px;

  transform: scaleX(-1) rotate(-18deg);

}



.auth-visual {

  position: relative;

  z-index: 1;

  width: min(100%, 440px);

  min-height: 0;

  height: 100%;

  display: flex;

  justify-content: center;

  align-items: center;

  margin: 0 auto;

  overflow: visible;

}



.auth-card {

  position: relative;

  z-index: 2;

  box-sizing: border-box;

  width: min(100%, 440px);

  height: 100%;

  min-height: 0;

  margin: 0;

  border: 1px solid rgb(217 210 196 / 62%);

  border-radius: 24px;

  background: rgb(255 255 255 / 94%);

  box-shadow: 0 12px 32px rgb(42 77 57 / 9%);

  overflow-y: auto;

  overflow-x: hidden;

  overscroll-behavior: contain;

  scrollbar-width: none;

}


.auth-card::-webkit-scrollbar {

  display: none;

}
ion-card-header {
  padding: 10px 16px 2px;
}

.home-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  margin: 0 0 9px;
  color: #496347;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 650;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.home-link span:first-child {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid #d9d2c4;
  border-radius: 50%;
  background: #faf7f2;
  font-size: 17px;
  line-height: 1;
}

.home-link:focus-visible {
  outline: 2px solid #8ca072;
  outline-offset: 3px;
  border-radius: 6px;
}

ion-card-content {

  padding: 4px 16px 12px;

}

.eyebrow {

  margin: 0 0 2px;

  color: #556b2f;

  font-size: 9px;

  font-weight: 800;

  letter-spacing: .16em;

}



ion-card-title {

  color: #1a2824;

  font-size: clamp(20px, 4.5vw, 24px);

  line-height: 1.1;

  font-weight: 800;

  letter-spacing: -.035em;

}



.subtitle {

  margin: 3px 0 0;

  color: #6b706d;

  font-size: 12px;

  line-height: 1.3;

}



.message {

  margin: 0 0 6px;

  font-size: 11px;

  line-height: 1.3;

}

.auth-form {

  display: grid;

  gap: 6px;

  margin-top: 8px;

}

ion-input {

  --background: #faf7f2;

  --color: #1a2824;

  --placeholder-color: #777b7d;

  --placeholder-opacity: 1;

  --highlight-color-focused: #556b2f;

  --padding-start: 12px;

  --padding-end: 10px;

  min-height: 40px;

  border: 1px solid #d9d2c4;

  border-radius: 10px;

  font-size: 13px;

}



ion-input.has-focus {

  border-color: #8ca072;

  box-shadow: 0 0 0 3px rgb(140 160 114 / 16%);

}



.password-tools {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 12px;

  margin-top: -2px;

  font-size: 11px;

}



.password-tools a {

  color: #2e4d3a;

  text-decoration: none;

  font-weight: 600;

}



.text-button {

  padding: 4px 0;

  background: none;

  color: #6b706d;

  font: inherit;

  cursor: pointer;

}



.submit-button {

  --background: #2e6a50;

  --background-activated: #24563f;

  --background-hover: #285e47;

  --color: #ffffff;

  --border-radius: 10px;

  --box-shadow: 0 4px 12px rgb(46 106 80 / 16%);

  margin: 2px 0 0;

  min-height: 38px;

  font-size: 14px;

  font-weight: 700;

  letter-spacing: .01em;

}



.separator {

  display: flex;

  align-items: center;

  gap: 10px;

  margin: 6px 0;

  color: #777b7d;

  font-size: 11px;

}



.separator::before,

.separator::after {

  content: '';

  height: 1px;

  flex: 1;

  background: #d9d2c4;

}



.google-button {

  --color: #1a2824;

  --border-color: #d3cec5;

  --border-width: 1px;

  --border-radius: 10px;

  --background: #ffffff;

  --background-activated: #f4f1eb;

  min-height: 38px;

  font-size: 12px;

  font-weight: 600;

}



.google-label {

  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 8px;

}



.google-label ion-icon {

  font-size: 16px;

  color: #4285f4;

}

</style>