<script setup lang="ts">
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
  loading.value = true

  try {
    await authService.sendPasswordReset(email.value.trim())

    sent.value = true
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Email reset belum dapat dikirim. Coba lagi nanti.'

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

        <!-- =========================
             MASCOT
             ========================= -->
        <section
          class="auth-visual"
          aria-label="Maskot PoliLand"
        >
          <MascotCanvas ref="mascotRef" />
        </section>

        <!-- =========================
             FORGOT PASSWORD CARD
             ========================= -->
        <ion-card class="auth-card">

          <ion-card-header>
   
            <ion-card-title>
              Lupa Password?
            </ion-card-title>

            <p class="subtitle">
              Masukkan email akunmu untuk menerima tautan
              reset password PoliLand Kairagi.
            </p>
          </ion-card-header>

          <ion-card-content>

            <!-- Success message -->
            <ion-text
              v-if="sent"
              color="success"
            >
              <p
                class="message success-message"
                role="status"
              >
                Jika email tersebut terdaftar, tautan reset
                password akan dikirim. Periksa inbox dan folder spam.
              </p>
            </ion-text>

            <!-- Error message -->
            <ion-text
              v-if="errorMessage"
              color="danger"
            >
              <p
                class="message"
                role="alert"
              >
                {{ errorMessage }}
              </p>
            </ion-text>

            <form
              class="auth-form"
              @submit.prevent="sendResetLink"
            >

              <!-- Email -->
              <AppInput
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

              <!-- Submit -->
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
                  Kirim tautan reset
                </span>
              </AppButton>

                     <button
            class="back-home-button"
            type="button"
            @click="router.push('/login')"
          >
            <ion-icon
              :icon="arrowBackOutline"
              aria-hidden="true"
            />
            <span>kembali ke login</span>
          </button>

            </form>

          </ion-card-content>
        </ion-card>

        <!-- =========================
             BOTTOM WAVES
             ========================= -->
        <div
          class="bottom-waves"
          aria-hidden="true"
        >
          <div class="wave wave-back"></div>
          <div class="wave wave-middle"></div>
          <div class="wave wave-front"></div>
        </div>

      </main>
    </ion-content>
  </ion-page>
</template>

<style scoped>
/* =========================
   PAGE
   ========================= */

.auth-content {
  --background: #faf7f2;
}

/* =========================
   MAIN LAYOUT
   ========================= */

.auth-shell {
  position: relative;
  isolation: isolate;

  box-sizing: border-box;

  width: 100%;
  height: 100%;
  min-height: 100%;

  display: grid;

  grid-template-rows:
    minmax(130px, 26dvh)
    minmax(0, 1fr);

  align-items: stretch;
  justify-items: center;

  gap: 0;

  padding:
    max(6px, env(safe-area-inset-top))
    14px
    max(6px, env(safe-area-inset-bottom));

  overflow: hidden;

  background:
    radial-gradient(
      ellipse at 50% 0%,
      rgb(231 222 202 / 72%) 0%,
      rgb(250 247 242 / 0%) 48%
    ),
    linear-gradient(
      180deg,
      #f7f4ec 0%,
      #faf7f2 56%,
      #f3ead9 100%
    );
}

/* =========================
   MASCOT
   ========================= */

.auth-visual {
  position: relative;
  z-index: 2;

  width: min(100%, 440px);

  min-height: 0;
  height: 100%;

  display: flex;

  justify-content: center;
  align-items: center;

  margin: 0 auto;

  overflow: visible;
}

/* =========================
   CARD
   ========================= */

.auth-card {
  position: relative;
  z-index: 3;

  box-sizing: border-box;

  width: min(100%, 440px);
  height: 100%;

  min-height: 0;

  margin: 0;

  border: 1px solid rgb(217 210 196 / 62%);
  border-radius: 24px;

  background: rgb(255 255 255 / 94%);

  box-shadow:
    0 12px 32px rgb(42 77 57 / 9%);

  overflow-y: auto;
  overflow-x: hidden;

  overscroll-behavior: contain;

  scrollbar-width: none;
}

.auth-card::-webkit-scrollbar {
  display: none;
}

/* =========================
   HEADER
   ========================= */

ion-card-header {
  padding: 10px 16px 2px;
}

.back-link {
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

.back-link span:first-child {
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

.back-link:focus-visible {
  outline: 2px solid #8ca072;

  outline-offset: 3px;

  border-radius: 6px;
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

  line-height: 1.4;
}

/* =========================
   CONTENT
   ========================= */

ion-card-content {
  padding: 4px 16px 12px;
}

.message {
  margin: 0 0 6px;

  font-size: 11px;

  line-height: 1.4;
}

.success-message {
  color: #39704f;
}

/* =========================
   FORM
   ========================= */

.auth-form {
  display: grid;

  gap: 10px;

  margin-top: 8px;
}

/* =========================
   APP BUTTON
   ========================= */

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
  font-size: 24px;
  flex-shrink: 0;
} 

.submit-button {
  --background: #2e6a50;
  --background-activated: #24563f;
  --background-hover: #285e47;

  --color: #ffffff;

  --border-radius: 10px;

  --box-shadow:
    0 4px 12px rgb(46 106 80 / 16%);

  margin: 2px 0 0;

  min-height: 44px;

  font-size: 14px;

  font-weight: 700;

  letter-spacing: .01em;
}

/* =========================
   BOTTOM WAVES
   ========================= */

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

  border-radius:
    50% 50% 0 0 /
    70% 70% 0 0;
}

/* Layer belakang */
.wave-back {
  bottom: -112px;

  background: #dedfca;

  transform:
    rotate(-7deg)
    translateX(-5%);
}

/* Layer tengah */
.wave-middle {
  bottom: -122px;

  background: #b2bea4;

  transform:
    rotate(7deg)
    translateX(5%);
}

/* Layer depan */
.wave-front {
  bottom: -134px;

  background: #91a282;

  transform:
    rotate(-5deg)
    translateX(-3%);
}

/* =========================
   RESPONSIVE
   ========================= */

@media (max-width: 380px) {
  .auth-shell {
    grid-template-rows:
      minmax(120px, 24dvh)
      minmax(0, 1fr);

    padding-inline: 12px;
  }

  ion-card-header {
    padding: 9px 14px 2px;
  }

  ion-card-content {
    padding: 4px 14px 12px;
  }

  ion-card-title {
    font-size: 21px;
  }

  .subtitle {
    font-size: 11.5px;
  }
}
</style>