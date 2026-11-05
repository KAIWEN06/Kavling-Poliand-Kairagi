<script setup lang="ts">

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

} from '@ionic/vue'

import { authService } from '@/services/auth/authService'

import AppInput from '@/components/ui/AppInput.vue'

import { logoGoogle, arrowBackOutline, personAddOutline, mailOutline, lockClosedOutline } from 'ionicons/icons'

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

// Loading visual untuk initial page load dan Pull-to-Refresh.
// Tidak bergantung pada request auth/Supabase agar tidak pernah stuck.
const isPageLoading = ref(true)
const isRefreshing = ref(false)
const REFRESH_DURATION = 1800
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const errorMessage = ref('')



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

    return 'Akun berhasil masuk, tetapi role belum terdaftar. Hubungi administrator PoliLand.'

  }

  if (route.query.error === 'role_lookup_failed') {

    return 'Role akun tidak dapat diperiksa. Coba lagi atau hubungi administrator.'

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

      void mascotRef.value?.playError()

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

  mascotRef.value?.stopIntro()



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

</script>

<template>
  <ion-page>
    <ion-content class="auth-content" :fullscreen="true">
      <main class="auth-shell">
        <div class="auth-topbar">
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

        <section class="auth-visual" aria-label="Maskot PoliLand">
          <MascotCanvas ref="mascotRef" />
        </section>

        <ion-card class="auth-card">
          <ion-card-header>
            <ion-card-title>SELAMAT DATANG</ion-card-title>
            <span class="title-ornament" aria-hidden="true"></span>
            <p class="subtitle">Masuk untuk mengakses aplikasi<br class="desktop-break" /> PoliLand Kairagi</p>
          </ion-card-header>

          <ion-card-content>
            <ion-text v-if="queryError" color="danger">
              <p class="message">{{ queryError }}</p>
            </ion-text>
            <ion-text v-if="errorMessage" color="danger">
              <p class="message" role="alert">{{ errorMessage }}</p>
            </ion-text>

            <form class="auth-form" @submit.prevent="submitLogin">
                <AppInput
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
                  v-model="password"
                  input-id="login-password"
                  label="Password"
                  placeholder="Masukkan password"
                  type="password"
                  autocomplete="current-password"
                  :icon="lockClosedOutline"
                  required
                  @focus="mascotRef?.setPasswordFocus(true, showPassword)"
                  @blur="mascotRef?.setPasswordFocus(false, showPassword)"
                  @visibility-change="togglePasswordVisibility"
                />
              <div>
                
              </div>

              <div class="password-tools password-tools--right">
                <RouterLink to="/forgot-password">Lupa Password?</RouterLink>
              </div>
              
              <AppButton
                class="submit-button"
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

            <div class="separator"><span>atau</span></div>

            <ion-button
              expand="block"
              fill="outline"
              class="google-button"
              :disabled="loading || googleLoading"
              @click="loginWithGoogle"
            > 
              <ion-spinner v-if="googleLoading" name="crescent" />
              <span v-else class="google-label">
                <img class="google-logo-image" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAAA8CAYAAADFXvyQAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAABYBSURBVHhetZvbkx3Ffcc/v+455+xFK2lXWl3RDRkQIBsKYTB2YWxsY5dddlyxy1V5clWekjf/EXl2VR6SOFVOqlK5PcTlpGLKF0wMjjECDBgcEAZkSayEkEDSarXXc850//Lw656Zc/askHHy2xqdmZ6env59f/fukcSoCoqIAKCqqNbXI0mBxm1VxYlLt+x5ABFBELtu9BcEFbVxhkkVqueqRnulSHr5wHCQ5zo8nkCMEUGGHxi8rN6wnhzoiO5/GInI9QGu+VxHA80DoIKg6df6VUcS6rq/hHCTeRE7VEBFq2PdnNMjJvbU0JT8dWmD2yOlkDm6HjWByBzkNsljbqBx/1+U3l8BNJI5boC5UZRFuwFlQUAeP4FCEnH1eOr3QeaQ6A94FAY0aCPagNFhsxwA+Ea0pqIB9bFf3QjhbDwDTWg6bohutF8iiTGqqNhrh1VdhxjXmh8hPTOCMngb3c80EkNNT2XNSlSdpTloPm9o5NAjaG5oBh1J81PzQZkGBN7guwao0ZkbAOh69PsApAPib/iZ7IvS+bADNVDsWY12bl3qZ9RJdd2cdsXbKIAy6Onk/U3sfWjY1IavNySRNJt0xAgh2m+M6+wm97RnK3RNOzQimp+LTS43pOvcMkodXM5JLPOomRuw6TS7AZQb16OiXpZAFYLTkUmyKWl+WbQjM9gEqOG4B4AiPbvBkUUwiqTBs6jlanVakEhHRLEapBFD51vr8ahohBsdoGxSFViVKaVDUptzdogYaKGPlF0oe6ChftY5cD6r1IBkNQligIaFOXS7mnueToyx5ic5sCZYTWZHXaeTEaE7z1fryecJa0zM+dQvSz1CDNDroqtLsLZm570ulF0o+6jz0O4grQ60Oki7Y9ftMWi1EOcr0KNz9SzzP2LXqoMJ8qBQG/MdAAgzl+sClEoEG6IGqCm5psmZ6toEpPIXadSilTRETTNWl2HxKvHtM8S5k8RLF9GFq8TlJQMplKh3BsjYJLJpM37rNH77DtzeAzC7B5maRjrj4Iuai6yVCSBrV8TC3EiNzzwYQDRULYfBRMMPD2hN894QyFVz5X+wUiEGJEbUOShaNlrZQ98+RXz5WeLLzxFOvk547yKxu0ZURZO2iXP2Xo0QDXAvghvv4HfuxN15N/6jDyG3H0NmdqKawB+Ogvm80vB8mUsOktSbAA1RBmK4qGwCVJMBUFFGH2NGY3aaKVoB4s289MzrxGeeoPz1M4S3ThEXr0G/NFCdoN5D4cGb6RijCiEi/RIp+0gZzKrGOrjZHbgjR/H3fRI59knYsr0y5QF/JKmIHpDxjQIkVOqHDDK/IUD2U92rAE4hO/+KE9Oga1eIv3qS8Mx/E0+9SZy/RFjrEtUANB/lwDsDyHlw2aEngMqA9HrQL5EYjbl2Czc1hezZhzt6D+7Bz+MOHoGJTdVsszZV2lP9pISyMX/RGJPyD6AwCFAeJIf2DE7OaLM3SgKptVkqYIjmmLW3ir59hvLZnxN+8Ri8PYeudS3Ip/EUy9BExMzKe/DOTC0DFCOUwcDpl0hMYds7pPBIZwy3dTvu9rvxDz2Cu/1u2LrN5pqXZprmlc6HATKj3ogqAEb3GjCrhmZVzeZ4UrvA2jLx5Kv0H/9Pej/4HuG1V4mrq0QRojTWf1wO35YNq+SX5TCeOoqg1ZGWMJwQi4IojnjlGuHXzxN/91t0acFMPPmd5tyH/WxFCk6xv+EbSspVNJcchq5KvfaSJyzUztAQyajUjBD6xFOvUv70P+j/8PvoW2egaBsjScMkS9AlzUEgmjlpjEgw50xMgKUay2XNagAaBWK7he7eD7O7kbGJisscODKfIyk1jyw1Bh9aP4CBN9xWK4xJyo4K2Atz9H787/QffxQuv4eMtQgEAyYokrJWcclMEAiK9gMxKupbxM4k2h4nuhYxChqiPeccDjHTyeYjEKe34r/8dYoHPgOzu0EcWq1UprkNibSi1FjnQY0ew0lURalpwF5Tc8YrR5ksIRGIy9dY/ce/IjzxI/Tdd0zS2WeQfJqYWYkToija6iB791Pccgf+5tuQ2V1IZ8JesnKN8vxp+m+8QnzjNdyFCzhxiPeod5Yg7txN+0vfoPPZryFTW8xkk3nF7NDTXMUmbnwnbczcjwQIRijO8P0hEtMbJKcFSZ20t8baE4/S/bd/grO/g9BHiRDBqWlOhjg6h05MwOFb6Rz7BMWRu3A79yKbplLylzLvskTXVojzlyjnTlI+/xTlb55Hrl5GYoBde/Cf+Czjf/RNZHZ3I2O3qBoTECJ51kmwyU1kwTMaoKQPTYDeBxwSQEb1g1p2KS+cZvU73ya+9DJ0l1EXIZZVoidR0RjQooXu3Iu/637aD3yK1uEjuG07kHanMWJmJ1EI6MoS8fwZei8dp//ck7CySHH0GO3P/THFkXtsOtlHYQBlC2k0V9oEGwHEEBCj2q5Dlakk81MBXZ2nfONJut/5S+LcVbSMpj0arOYKAcpA9B5uOkTxsU/TeeiLdG67E2m1LWMOwX7V5lRlbYL5G+dxXoiXzrP2zM9gdZnWh45SHL0X9R1LB1JEBKq1IwMiYXc9gDSqmk/J+U1aJrgOQHmAZh5RDaoRUjkQl88Q3/hn4pM/pHdihfKSQFcNHA1I2SP2SuLeQ7Q+9UXGP/dVWodvq8cPpYGYoqamlCq9EBXLkcQL3jnCwhXTyrFJ6HQI/YBoKmucOegcPMyUUu7ZAMtu1Uy7irkGEJpRbLQ1H6rC5NB1blMEwhLSexPHr2gf69O+z+NuUmLbJiyuwEUlTm2h9eAjjH/uq7QPfqgChEorU2QSh4qztCAdljja3ASl2DKN37oNNzaWoltWEYtcBrDURbZVhxUfaY12gB83SkM2oiZINdVAGYkd5TysnkDL19H2Eq0jgfEHhPYdESa6aOghoaBz/8OMf/yzFLv3EUNp4OTyRMQyaO9RKYiuIIonOm/a41wCJ88jACUQEac4n9aUyNlrXThbITs4/dRlgJzmXMW0tnJaVHVJQ3Py70Am2rRZTVlvQMtLxNXTUK6gRLTdw+3v07kPxu6LyK5V4r7ttD/2Kfzeg3WEqphIOYLYopk60yIpHM6nwzmck+xe0gw1rU6aQK2fWH7lBOcF76WqfzN+1D8N3qpiNUkh9Rj2Lc3r+n6uemsSktTjCnrt58Tz34X54+A2GbNOLCu+0qc87dCxL9B++M9xOw5CURgAVZlhyaKtASj9Ei4vR66sRMpo1mDyE7yAF8UTEBMtITpKFdJCQnY7FaDOGGFmUpiecLSzfIZ5GgAodbgRgEaZmxBN9cvL6PyPDKClk+AmAYc6wPWR0Ee7M8jst3B7Pw+dLfbirCXODtLiliosdyPPnery9KmSpb7VX4Ix3BJoeaVAcShRoR8c/SiU2aWJAeOdASoihFJ54LDj3kMF2zflPG6IpxiiDjA7BNAANWqX0QAFVDz0zqOXvk985++R7mVUxlCys+2DlEh7H+7AXyATH0FlLPkc03mXfEvlXIGFlcD3nl/hH473uLxiYzkRChHaHlouUkjSYoV+EMpgAMWkbiLgASeCeKHsKd+43/O1j7Y4vNOjqvhmsQ3ZSTeazHpG0qhN/nzdfERjDy2XIawmUDS5EkFwQEF046ifQMWb1FyOuY3Dgns1vaJwtIqCwhW0KGjjaYuzwxe0fUHLtey+K2g5T8t52t7T9o62S4cXOt7RLhzdEtb6tU/Vij87UrE6hMgGCjQIg9FIbdMA2gMt7eMDh60rSbQDbPHd+TyPakIGTH6PnStWtrg8+cbyhnVJvkqkuq4wTsITFCeKc4pzUDhzSr3S0QtJUzVbSU0jq/kROPyeFC3kSkxaoXYuae8rO3PFpp64yX812YwVq9kKnzhIwGh+k6otuKVfzdeYYGwPrGYrpYwIwlpQuuVgXtecgTOJNFoAdNCMMg2bV0XV2Ou1Sav+mZ2YPmlJ2iTYlDJIWfINW887xEXyCaIO8CiOqI6II6oQqQ8bUpPVJpAkaZGAE0XE6rKYwckoNtgYrUEfiBqjigdppSraAFFRq8NyP43EWJqO5Gg1AuAmOQSCWEYclBiUEJWQyroQ7Isyq90CHtuvz3wLg0B5lPGWMpZ2n2rRJ0210IJFkMafpFXDddRoGr5r1+kV0oZiEnwH6KPJtJJskQhlr0evt2TMmD4RiQmkWnsyOYFNbc+eLcKBaeXQTODmmcihGeVgPrYrh7Yrh2cj+7cpk2OWRUHWohooAO8i0xOwZayZbDZIq0X7hrMdMqGk5DAgYXOcuaek1MDyII+Wl9D5R4kX/xZWTiJ+Eo2KU0tbV0LBxXKWsOfP2LvnC3Ta0ylzBiceLynMg60mqtLtw9ylyIl3Av2g+Gw+ztEqpNr8aDkz2/PXlMdfCbx+zpyvcwaQF7F0wAlelD95oMUX7y7YPuVSv1zQJt40LXdUzK8DqKF4iYlh6WZ1lGwucQW99jPihb+BhV8ifgqJgqNgMbR4baXDU4ubKWYe5CtH/5Q9mw/gxKECThy+YfmqSoxKiBDU9hicZNUn5UxZfy0grJZw4kLgu0+u8ZvTqV9KUbyz3EmBmYnINx9s8/CdBRNty7r9UGK8zgeNMh01KxxqHT5PoCkgY9DaDZ39qNh6sRYt3upP8OP5LfzrlWme6k1yfP4Mr159ncVyEec8DgPHSoxUk6U/i0ZmpmjE/mz5NC/xZKe81lPOX1bOXnaIuCrcg+UGitAPkV3Tjm2bHe0i20niIXUllySDrSNoCIO6cQjOtOwg4qDYhozfimtvp1+0ObGyiR9d3czji1Oc6k2wUnqurC3z7PkXeWvhLGUszbQa4EQsyuSoR4IlEM05x0jQaGaYptAPytzlyAtnIgurgvOWpGZShJCq+UOzjtkpM09lmD+jdRr0Qam2TMu4pJiGsTtYah3h1ZXNPD4/xdOLk8z12/TUIThUldfeO8mz51/g1MJp+tqvxrPEreG4hQqkZns2BxHLh85d6fP8mS4vvR2ISetMcYQojoDQj8KmceHmHZ7pydqJ1PjUZ67284nyWgkAdS1kz4yAeAMSt4myfZgLcozHLk/zy8UJ3um1CVpnz+IcC91rPHv+RX5x9jinrp5mNaxW74kpR4nJ1MRRJZO2zVOlT/TKknOXFzh+ap6n31rm4kqJL6JpT1p9jDhKNZAO7fQc2O6Y7AzxlC5zymrK1UgW7EfT7Wzc9jvgv4fG1QrM/AZPcNuZ9/fw0tJ2LsU2IUcmIHqr3l3L8c7KBX5x9jg/Of1fvHHlTRZ6C/S0l0zM1ElSkemdUDhnh9hG5mpY5fSlt3nstVf48eunefPqIrT7QDBGDaWsf4y34djBgj3TjnbRdBSmkdldIZI+4sz1jvUx/iT5gvSo9W94+IzfCNIEU4iRi4sX+fbTf82L868SY4+OONQrFGLLrs6bMFQZkw77Jm7i/r3HuGfvXeye3M24G6ul6RxOUn+BXih5b2Wel8+f4Gcnn+PEe4ssrB5Ew1Gk3Ifrj+G0IMSCoEI/QsvB7bsc33qkxS07YKwwC2ra0UAxngGqyHoPApHIAErYZEVJ9zStAtaDK6qRXgw8e/YF/u7X/8LZxTm8A+cFCkUKXy9tpHLNR8+4n2B2YjsHtuzn5pmD7N+yh9mJbUwU4yjKUneJ80sX+d38HG9cOc3p+Tnm15ZZ67eIvd3QP4L0P4z0boI4TgiefhQiyp5p4ev3FHzlI57Jjtq2dTXfNP/G6sT6BbOkAQOqM0SmcYMpk2ZnJRngtAUhwsLqIj/47WP89PQTnFs6R6vtcYWAtyXRDKoGta2hCIW0GPMdJluTTHUmmepsYqzogETWwhpLvWUWekss9pdZ7vaIpaCxgDCJhp3QvxXp3U3oHyD0x+gHmJ2KPHiL5+v3tti31b6sScpY8ZBr04xI9X1QE6IBgOzmAN0YQKZBueHM/FkeO/kEvzx3nAvdi7hC8EWB+BRLVW0vvlT7RlNzXWVZb+EdReERb3VdxPIfVQhBoHR2aIEyToyzaP82YvcuwtoeZjoT3Heg4JGjLY7u9bTSskfmKHFRCav6XQ9Q8jsfCKDk8HMblqOAEFU5efkU/z33NE+ff46L3XfBC75I2ZhGKAcBkvwSZ/HWFSBFvZ1j4CixjFAKWnpQR3Se6Dv04xakdwfbwr18dNd+Pn3LZj68r0XLg5OYAEoSTTNeD1BIACXVMlvMLA6SYh8+mgPHYEqli6ToNIhlnel68QQCcwvneOrcczx59ineXXsP9TEVxxHKiIb8eYuNC2lxoBD7yMyDeHu/pjIkBk0ACRodwQuhJYRWwTZ/Mw9Of56H993JrbNbaRcWzZxEnEmgPnIUbwi52nrOAA2bVzPCZRvN2lbHuI1J1QASLG9Rgfm1BV688D88+uZPOLV8mpIuDohWcKXtYak0SJyB4ryBZCuUCcS0xBHL9JG+KqWUUMCOTTv58uEv8dCej7NrbBavPn0UCo6YlD2DUe/S/N8A1Ix0qWeGrKlFmvbdSMkexhfd2OPs4gV+8fZxnr/wAucW5+j2V3EV9wlUNSfuncN7Z9qU1yZUiRrSmlCgH0qiKjPjM3xkx1E+c+CT3LntDiaKTTjSh5yGuf3XhWGA0uU6gPJ0GNKKZscmGLl9PUCprbbWCkhN2qTJzp04+rHk0uo8b12b45VLJ3jl3VeZuzrHcn+ZoAFEcDir8L2ncL5a/AcgRqLa5yxOHNOdGW6ZuZUP7zjKkZkPsXvTDjYVE0T1qJqGuCpqrdd+0/I6rOn7AWSMjgJjFOVRh/qltWOTttqqophPMm2BlbDGu8vvcmrhDCfnT/H2tXeYX7vCUrnEWrlGP9h/PfDOtnrEOVquxYQfY6qYZLI9ydaxrezfsp+DWw6yZ9MuNren8M4+z4vRoeqqjROjQT6Byr/aXbu/LlG8HkBVnjBMSh29NgQI24JOGuZy5Z5uRiLd0GW+u8C7y5e4snaF+e4VrnavsdJbI2i0YCYO5zwTxThbO5vZ1plmc2czW8a2sG1ihjHfSVlsXo82cMjGawFwUOBDAA1Y0TBAZG3JDzXMydqHe98AQFWT5s61wsVUl6d6y9ZvxACLXVbLNbplj6D22Vw2uXbRZrKYYMx3MDiUEEtCtG0lSWCav7TfPO/rATTMXBXmBxpzzdV0WGn5ITOoVUGb+6Rp5dmlSRum+a2DrzL/YT4k38tBIfsDJw5H3mkdeHyAggaimoaaBthCnTMmqjlUuVUGqDHX5v/dyP0/wHpQetG62WYxNBRlHfQNEkmdTbb2l9YUxSNpC8i8lgF5PTIosqbYhnElQGwueftoeObWNloA6wHKof73paHBR4/QBMXOHOZIk/HUYFUAZkpLsM1l2HwnaWCtcTZa/ZbGSPlkePgNaL2J5YeSqaw3sfU0oP5VBtzom8cYEpKVIY3MPf8KtbgbVLHa4HaYR8XyuGEXU/GRAs9GStDk0XxevoEVgYx87cZU+5dm43rMa4EZKPX8ss7YWFLtpafzxvgJzg01qRotPzdqasMXSQlG8aGq/C9Vin7Swm51EQAAAABJRU5ErkJggg==" alt="" aria-hidden="true" />
                Masuk dengan Google
              </span>
            </ion-button>

            <RouterLink class="register-link" to="/register">
              <span class="register-icon" aria-hidden="true">
                <ion-icon :icon="personAddOutline" />
              </span>
              <span class="register-copy">
                <small>Belum punya akun?</small>
                <strong>Daftar sekarang</strong>
              </span>
              <span class="register-arrow" aria-hidden="true">›</span>
            </RouterLink>
          </ion-card-content>
        </ion-card>

        <footer class="auth-footer">
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
                  <Skeleton width="100%" height="58px" border-radius="15px" />
                  <Skeleton width="100%" height="58px" border-radius="15px" />
                  <div class="login-skeleton-forgot">
                    <Skeleton width="105px" height="12px" border-radius="6px" />
                  </div>
                  <Skeleton width="100%" height="44px" border-radius="10px" />
                </div>

                <div class="login-skeleton-separator">
                  <Skeleton width="100%" height="1px" border-radius="1px" />
                  <Skeleton width="24px" height="10px" border-radius="5px" />
                  <Skeleton width="100%" height="1px" border-radius="1px" />
                </div>

                <Skeleton width="100%" height="58px" border-radius="15px" />

                <div class="login-skeleton-register">
                  <Skeleton
                    width="44px"
                    height="44px"
                    border-radius="14px"
                  />
                  <div class="login-skeleton-register-copy">
                    <Skeleton width="105px" height="11px" border-radius="5px" />
                    <Skeleton width="125px" height="14px" border-radius="6px" />
                  </div>
                  <Skeleton width="12px" height="25px" border-radius="5px" />
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
.auth-content {
  --background: #f8f5ee;
  --overflow: auto;
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
  gap: 0;
  box-sizing: border-box;
  padding: max(0px, env(safe-area-inset-top)) 14px max(70px, env(safe-area-inset-bottom));
  overflow-x: hidden;
  overflow-y: visible;
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
  height: 220px;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20900%20240%22%20preserveAspectRatio%3D%22none%22%3E%3Cpath%20fill%3D%22%23e8dfc7%22%20d%3D%22M0%2018%20C120%2044%20185%20102%20310%20124%20C435%20151%20510%20149%20620%20113%20C730%2077%20810%2034%20900%2016%20L900%20240%20L0%20240Z%22%2F%3E%3Cpath%20fill%3D%22%23f8f5ee%22%20d%3D%22M0%200%20C115%2036%20190%2095%20310%20112%20C425%20132%20520%20139%20630%20102%20C740%2066%20820%2025%20900%200%20L900%2075%20C800%20103%20732%20146%20620%20174%20C500%20205%20418%20190%20300%20166%20C170%20140%20100%2082%200%2060Z%22%2F%3E%3Cpath%20fill%3D%22%23aab39a%22%20d%3D%22M0%2083%20C105%20107%20187%20164%20310%20181%20C425%20199%20520%20211%20630%20174%20C750%20134%20820%2091%20900%2074%20L900%20240%20L0%20240Z%22%2F%3E%3Cpath%20fill%3D%22%238e9d80%22%20d%3D%22M0%20130%20C115%20151%20187%20202%20310%20215%20C430%20231%20520%20235%20635%20205%20C744%20176%20822%20131%20900%20116%20L900%20240%20L0%20240Z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: 100% 100%;
}

.auth-topbar {
  position: relative;
  z-index: 3;
  width: min(100%, 520px);
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 0 auto;
  padding: 4px 2px 2px;
  box-sizing: border-box;
}
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
.auth-visual {
  position: relative;
  z-index: 1;
  width: min(100%, 520px);
  min-height: clamp(170px, 27dvh, 300px);
  height: clamp(170px, 27dvh, 300px);
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
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

.auth-card {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  width: min(100%, 520px);
  min-height: 0;
  flex: 0 0 auto;
  margin: 0 auto 0;
  border: 1.5px solid rgb(196 190 177 / 85%);
  border-radius: 28px;
  background: rgb(255 253 248 / 96%);
  box-shadow: 0 8px 24px rgb(54 49 36 / 15%);
  overflow: visible;
}

ion-card-header {
  padding: 22px 20px 8px;
  text-align: center;
}
ion-card-title {
  color: #b9964e;
  font-size: clamp(21px, 5vw, 27px);
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: .005em;
}
.title-ornament {
  display: block;
  width: 76px;
  height: 4px;
  margin: 22px auto 25px;
  background: #c4a052;
}
.subtitle {
  margin: 0;
  color: #77806f;
  font-size: clamp(14px, 3.6vw, 18px);
  line-height: 1.45;
  font-weight: 600;
}
ion-card-content { padding: 8px 20px 20px; }
.message { margin: 0 0 8px; font-size: 12px; line-height: 1.35; }

.auth-form {
  display: grid;
  gap: 14px;
  margin-top: 10px;
}
ion-input {
  --background: #fff;
  --color: #77806f;
  --placeholder-color: #929292;
  --placeholder-opacity: 1;
  --highlight-color-focused: #c3a052;
  --padding-start: 14px;
  --padding-end: 12px;
  min-height: 58px;
  border: 1.5px solid #c9c9c9;
  border-radius: 15px;
  font-size: 15px;
}

ion-input input:-webkit-autofill,
ion-input input:-webkit-autofill:hover,
ion-input input:-webkit-autofill:focus,
ion-input input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px #fff inset !important;
  -webkit-text-fill-color: #77806f !important;
  background-clip: text !important;
}

ion-input::part(native) {
  background-color: transparent !important;
}

ion-input.has-focus {
  border-color: #c3a052;
  box-shadow: 0 0 0 3px rgb(195 160 82 / 14%);
}
.password-field {
  position: relative;
  isolation: isolate;
  width: 100%;
  min-width: 0;
}
.password-field .password-ion-input {
  position: relative;
  z-index: 1;
  --padding-end: 52px;
  width: 100%;
}
.password-visibility-button {
  position: absolute;
  z-index: 10;
  top: 50%;
  right: 7px;
  transform: translateY(-50%);
  width: 38px;
  height: 40px;
  flex: 0 0 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border: 1px solid #d5d6d2;
  border-radius: 11px;
  padding: 0;
  color: #454b46;
  background: #f0f1ee;
  box-shadow: 0 1px 3px rgb(35 40 35 / 12%);
  font-size: 23px;
  line-height: 1;
  cursor: pointer;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
}
.password-visibility-button ion-icon {
  display: block;
  width: 23px;
  height: 23px;
  min-width: 23px;
  color: inherit;
  pointer-events: none;
}
.password-visibility-button:focus { outline: none; }
.password-visibility-button:focus-visible {
  outline: 2px solid #c3a052;
  outline-offset: 1px;
}
.password-tools--right {
  justify-content: flex-end;
}
.password-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin: -2px 2px 4px;
  color: #b18e45;
  font-size: 13px;
  font-weight: 650;
}
.password-tools a {
  color: #b18e45;
  text-decoration: none;
  white-space: nowrap;
}
.submit-button {
  --background: #b18e45;
  --background-activated: #967638;
  --background-hover: #a27f3e;

  --color: #ffffff;

  --border-radius: 10px;

  --box-shadow:
    0 4px 12px rgb(177 142 69 / 20%);

  margin: 2px 0 0;

  min-height: 44px;

  font-size: 14px;

  font-weight: 700;

  letter-spacing: .01em;
}

.separator {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 13px;
  color: #8c8c8c;
  font-size: 13px;
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
  --border-radius: 15px;
  --background: #fff;
  --background-activated: #f8f4eb;
  min-height: 58px;
  font-size: 15px;
  font-weight: 650;
}
.google-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.google-logo-image {
  display: block;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  object-fit: contain;
}

.register-link {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  box-sizing: border-box;
  margin-top: 18px;
  padding: 12px 14px;
  border: 1px solid #ead9b1;
  border-radius: 16px;
  background: #fbf1d9;
  color: #262724;
  text-decoration: none;
}
.register-icon {
  display: flex;
  flex: 0 0 54px;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #eac66b;
  color: #604a20;
}
.register-icon ion-icon { font-size: 20px; }
.register-copy { display: flex; flex: 1; flex-direction: column; gap: 3px; }
.register-copy small { color: #7f7d72; font-size: 13px; }
.register-copy strong { font-size: 16px; line-height: 1.2; }
.register-arrow { font-size: 34px; line-height: 1; font-weight: 300; }



.auth-footer {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-sizing: border-box;
  width: 100%;
  flex: 0 0 auto;
  padding: 14px 8px 10px;
  margin: 0;
  text-align: center;
  font-size: 12px;
  line-height: 1.35;
  margin-top: 10px; /* Atau gunakan -8px jika ingin dinaikkan lebih tinggi lagi mendekati card */
  padding: 12px 8px 30px;
}

.auth-footer strong {
  display: block;
  margin: 0;
  color: #43523f;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 700;
}

.auth-footer span {
  display: block;
  margin: 0;
  color: #5f6858;
  font-size: 12px;
  line-height: 1.35;
}



/* =========================================================
   LOGIN SKELETON
   Menggunakan komponen ui/Skeleton.vue yang sudah ada.
   ========================================================= */

.login-skeleton-overlay {
  position: absolute;
  inset: 0;
  z-index: 9999;
  overflow-y: auto;
  overflow-x: hidden;
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
  padding: max(0px, env(safe-area-inset-top)) 14px max(70px, env(safe-area-inset-bottom));
  background-color: #f7f3ea;
}

.login-skeleton-topbar {
  width: min(100%, 520px);
  min-height: 60px;
  display: flex;
  align-items: center;
  padding: 4px 2px 2px;
  box-sizing: border-box;
}

.login-skeleton-visual {
  width: min(100%, 520px);
  height: clamp(170px, 27dvh, 300px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.login-skeleton-visual :deep(.skeleton) {
  opacity: .72;
}

.login-skeleton-card {
  box-sizing: border-box;
  width: min(100%, 520px);
  padding: 22px 20px 20px;
  border: 1.5px solid rgb(196 190 177 / 85%);
  border-radius: 28px;
  background: rgb(255 253 248 / 96%);
  box-shadow: 0 8px 24px rgb(54 49 36 / 15%);
}

.login-skeleton-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.login-skeleton-form {
  display: grid;
  gap: 14px;
  margin-top: 25px;
}

.login-skeleton-forgot {
  display: flex;
  justify-content: flex-end;
  margin: -2px 2px 4px;
}

.login-skeleton-separator {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  margin: 16px 0 13px;
}

.login-skeleton-register {
  display: flex;
  align-items: center;
  gap: 13px;
  box-sizing: border-box;
  width: 100%;
  margin-top: 18px;
  padding: 12px 14px;
  border: 1px solid #ead9b1;
  border-radius: 16px;
  background: #fbf1d9;
}

.login-skeleton-register-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.login-skeleton-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 14px 8px 30px;
  margin-top: 10px;
}

.login-skeleton-fade-enter-active,
.login-skeleton-fade-leave-active {
  transition: opacity .25s ease;
}

.login-skeleton-fade-enter-from,
.login-skeleton-fade-leave-to {
  opacity: 0;
}

@media (min-width: 700px) {
  .login-skeleton-shell {
    padding: 18px 24px max(22px, env(safe-area-inset-bottom));
  }

  .login-skeleton-visual {
    width: min(100%, 580px);
    height: clamp(240px, 34dvh, 380px);
  }
}

@media (max-height: 760px) {
  .login-skeleton-shell {
    padding-top: max(0px, env(safe-area-inset-top));
    padding-bottom: max(24px, env(safe-area-inset-bottom));
  }

  .login-skeleton-topbar {
    min-height: 48px;
  }

  .login-skeleton-visual {
    height: clamp(130px, 22dvh, 210px);
  }

  .login-skeleton-card {
    padding-top: 14px;
  }

  .login-skeleton-form {
    gap: 9px;
    margin-top: 18px;
  }

  .login-skeleton-card > .login-skeleton-separator {
    margin-top: 12px;
  }
}

@media (min-width: 700px) {
  .auth-shell {
    min-height: 100%;
    padding: 18px 24px max(22px, env(safe-area-inset-bottom));
  }
  .auth-card { max-height: none; }
  .auth-visual {
    width: min(100%, 580px);
    min-height: clamp(240px, 34dvh, 380px);
    height: clamp(240px, 34dvh, 380px);
  }
}

@media (max-height: 760px) {
  .auth-shell {
    padding-top: max(0px, env(safe-area-inset-top));
    padding-bottom: max(24px, env(safe-area-inset-bottom));
  }
  .auth-topbar { min-height: 48px; }
  .auth-visual {
    min-height: clamp(130px, 22dvh, 210px);
    height: clamp(130px, 22dvh, 210px);
  }
  .auth-card { min-height: max-content; }
  ion-card-header { padding-top: 14px; }
  .title-ornament { margin: 12px auto 14px; }
  .auth-form { gap: 9px; }
  ion-input { min-height: 50px; }
  .submit-button, .google-button { min-height: 50px; }
  .register-link { margin-top: 12px; }
  .auth-footer { padding-top: 14px; padding-bottom: 8px; }
}
</style>
