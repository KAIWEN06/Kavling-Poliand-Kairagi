<template>
  <ion-header
    class="app-header"
    :translucent="false"
  >

    <ion-toolbar>

      <!-- =================================================
           MARKETING HEADER
           ================================================= -->

      <template v-if="variant === 'marketing' || variant === 'admin'">

        <div class="marketing-header">

          <!-- BACK -->
          <button
            v-if="showBack"
            type="button"
            class="back-button"
            aria-label="Kembali"
            @click="goBack"
          >
            <ion-icon :icon="arrowBackOutline" />
          </button>


          <!-- TITLE -->
          <div class="marketing-title">
            <template v-if="variant === 'admin'">
              <img
                src="@/assets/icons/icons.png"
                alt=""
                aria-hidden="true"
                class="marketing-brand-mark"
              />
              <span>{{ title }}</span>
            </template>
            <template v-else>
              {{ title }}
            </template>
          </div>

          
          <!-- NOTIFICATION -->
          <button
            v-if="variant === 'marketing'"
            type="button"
            class="notification-button"
            aria-label="Notifikasi"
            @click="goNotifications"
          >
            <ion-icon :icon="notificationsOutline" />

            <span class="notification-dot"></span>
          </button>

        </div>

      </template>

      <!-- CLIENT HEADER -->
<template v-if="variant === 'client'">
  <div class="marketing-header">
    <button
      v-if="showBack"
      type="button"
      class="back-button"
      aria-label="Kembali"
      @click="goBack"
    >
      <ion-icon :icon="arrowBackOutline" />
    </button>

    <div class="marketing-title">
      <img
        src="@/assets/icons/icons.png"
        alt=""
        aria-hidden="true"
        class="marketing-brand-mark"
      />
      <span>{{ title }}</span>
    </div>
  </div>
</template>


      <!-- =================================================
           DEFAULT HEADER
           ================================================= -->

      <template v-if="variant === 'default'">

        <div class="header-content">

          <div class="brand">

            <div class="brand-logo-wrapper">

              <img
                src="@/assets/icons/icons.png"
                alt="Logo PoliLand"
                class="brand-logo-img"
              />

            </div>


            <div class="brand-text">

              <strong>
                PoliLand
              </strong>

              <span>
                Kairagi
              </span>

            </div>

          </div>


          <div class="header-actions">

            <AppButton
              v-if="!isAuthenticated"
              class="submit-button"
              type="submit"
              expand="block"
              :disabled="loading"
              color="primary"
              @click="goLogin"
            >

              <IonSpinner
                v-if="loading"
                name="crescent"
              />

              <span v-else>
                MASUK
              </span>

            </AppButton>


            <ion-button
              v-else
              class="default-notification-button"
              fill="clear"
              aria-label="Notifikasi"
              @click="goNotifications"
            >
              <ion-icon :icon="notificationsOutline" />
            </ion-button>

          </div>

        </div>

      </template>

    </ion-toolbar>

  </ion-header>
</template>


<script setup lang="ts">
import {
  IonHeader,
  IonToolbar,
  IonButton,
  IonIcon,
  IonSpinner,
  useIonRouter,
} from '@ionic/vue'

import {
  arrowBackOutline,
  notificationsOutline,
} from 'ionicons/icons'

import { ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'


const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'marketing' | 'admin' | 'client'
    title?: string
    showBack?: boolean
    backRoute?: string
  }>(),
  {
    variant: 'default',
    title: 'PoliLand Kairagi',
    showBack: true,
  },
)

const ionRouter = useIonRouter()

const isAuthenticated = ref(false)

const loading = ref(false)


/* =====================================================
   NAVIGATION
   ===================================================== */

function goLogin() {
  ionRouter.push('/login')
}


function goNotifications() {
  ionRouter.push('/notifications')
}


function goBack() {
  if (props.backRoute) {
    ionRouter.replace(props.backRoute)
    return
  }

  ionRouter.back()
}

</script>


<style scoped>

.app-header {
  box-shadow:
    0 1px 8px
    rgba(45, 45, 45, 0.05);

  z-index: 20;

  position: sticky;

  top: 0;
}


/* =====================================================
   TOOLBAR
   ===================================================== */

.app-header ion-toolbar {
  --background: var(--surface-muted);

  --min-height: 68px;

  --border-width:
    0 0 1px 0;

  --border-color: var(--border-default);

  padding:
    0
    12px;
}


/* =====================================================
   MARKETING HEADER
   ===================================================== */

.marketing-header {
  height: 68px;

  display: flex;

  align-items: center;

  gap: 14px;
}


.back-button {
  width: 44px;

  height: 44px;

  display: flex;

  align-items: center;

  justify-content: center;

  flex-shrink: 0;

  padding: 0;

  border: 0;

  background: transparent;

  color: var(--text-primary);

  cursor: pointer;
}


.back-button ion-icon {
  font-size: 31px;
}


.marketing-title {
  flex: 1;

  color: #303030;

  font-size: 24px;

  line-height: 1;

  font-weight: 800;

  letter-spacing: -0.5px;
}

.marketing-title:has(.marketing-brand-mark) {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
}

.marketing-brand-mark {
  width: 34px;
  height: 34px;
  object-fit: contain;
}


.notification-button {
  position: relative;

  width: 44px;

  height: 44px;

  display: flex;

  align-items: center;

  justify-content: center;

  flex-shrink: 0;

  padding: 0;

  border: 0;

  background: transparent;

  color: var(--text-primary);

  cursor: pointer;
}


.notification-button ion-icon {
  font-size: 30px;
}


.notification-dot {
  position: absolute;

  top: 7px;

  right: 4px;

  width: 10px;

  height: 10px;

  border-radius: 50%;

  background: var(--status-danger);

  border: 2px solid var(--surface-muted);
}


/* =====================================================
   DEFAULT HEADER
   ===================================================== */

.header-content {
  height: 68px;

  display: flex;

  align-items: center;

  justify-content: space-between;
}


.brand {
  display: flex;

  align-items: center;

  gap: 12px;
}


.brand-logo-wrapper {
  width: 40px;

  height: 40px;

  border-radius: var(--radius-control);

  overflow: hidden;

  display: flex;

  align-items: center;

  justify-content: center;

  background: transparent;
}


.brand-logo-img {
  width: 100%;

  height: 100%;

  object-fit: contain;
}


.brand-text {
  display: flex;

  flex-direction: column;

  justify-content: center;

  line-height: 1.15;
}


.brand-text strong {
  color: var(--text-primary);

  font-size: 16px;

  font-weight: var(--font-weight-extrabold);

  letter-spacing: -0.2px;
}


.brand-text span {
  margin-top: 2px;

  color: var(--text-secondary);

  font-size: 11px;

  font-weight: 600;

  letter-spacing: 0.3px;
}


.header-actions {
  display: flex;

  align-items: center;

  gap: 4px;
}


.default-notification-button {
  --color: var(--text-primary);

  --padding-start: 8px;

  --padding-end: 8px;

  font-size: 21px;
}


ion-title {
  font-weight: var(--font-weight-extrabold);

  letter-spacing: 0.03em;
}

</style>