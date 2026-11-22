<template>
  <ion-header
    class="app-header"
    :translucent="false"
  >

    <ion-toolbar>
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
  <div class="client-header-stack">
    <div class="marketing-header">
      <div class="marketing-title">
        <img
          src="@/assets/icons/icons.png"
          alt=""
          aria-hidden="true"
          class="marketing-brand-mark"
        />
        <span>{{ title }}</span>
      </div>

      <div class="client-notification-wrap">
        <button
          type="button"
          class="notification-button client-notification-button"
          aria-label="Notifikasi SPK"
          :aria-expanded="showClientNotifications"
          @click="toggleClientNotifications($event)"
        >
          <ion-icon :icon="notificationsOutline" aria-hidden="true" />
          <span v-if="rejectionNotifications.length" class="notification-count">
            {{ rejectionNotifications.length > 9 ? '9+' : rejectionNotifications.length }}
          </span>
        </button>

        <ion-popover
          v-if="showClientNotifications"
          :is-open="showClientNotifications"
          :event="notificationEvent"
          class="client-notification-popover"
          :show-backdrop="false"
          @did-dismiss="showClientNotifications = false"
        >
          <section class="client-notification-panel" aria-label="Notifikasi SPK ditolak">
            <header>
              <strong>Notifikasi</strong>
              <span v-if="rejectionNotifications.length">{{ rejectionNotifications.length }}</span>
            </header>
            <p v-if="notificationLoading" class="client-notification-empty" role="status">
              Memuat notifikasi...
            </p>
            <p v-else-if="!rejectionNotifications.length" class="client-notification-empty">
              Belum ada catatan penolakan SPK.
            </p>
            <article
              v-for="notification in rejectionNotifications"
              :key="notification.id"
              class="client-notification-item"
            >
              <strong>SPK {{ notification.spkNumber }} ditolak</strong>
              <span v-if="notification.refundStatus === 'Pending Refund'">
                Booking Fee Rp{{ Number(notification.refundAmount || 0).toLocaleString('id-ID') }} sedang diproses pengembalian.
              </span>
              <span v-else-if="notification.refundStatus === 'Refunded'">
                Pengembalian Booking Fee telah dicatat.
              </span>
              <button type="button" @click="openRejectedSpk(notification.id)">
                Lihat detail
              </button>
            </article>
          </section>
        </ion-popover>
      </div>
    </div>

    <div v-if="showBack" class="client-subnav">
      <button type="button" @click="goBack">
        <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
        <span>{{ backLabel }}</span>
      </button>
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

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import { getClientSpks } from '@/services/clientSpkService'


const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'marketing' | 'admin' | 'client'
    title?: string
    showBack?: boolean
    backRoute?: string
    backLabel?: string
  }>(),
  {
    variant: 'default',
    title: 'PoliLand Kairagi',
    showBack: true,
    backLabel: 'Kembali',
  },
)

const ionRouter = useIonRouter()

const isAuthenticated = ref(false)

const loading = ref(false)
const showClientNotifications = ref(false)
const notificationEvent = ref<Event>()
const notificationLoading = ref(false)
const rejectedSpks = ref<Awaited<ReturnType<typeof getClientSpks>>>([])
let notificationRefreshTimer: number | undefined

const rejectionNotifications = computed(() => rejectedSpks.value
  .filter((record) => record.status === 'Rejected')
  .map((record) => ({
    id: record.id,
    spkNumber: record.spkNumber,
    refundStatus: record.bookingFeeRefund?.status ?? null,
    refundAmount: record.bookingFeeRefund?.amount ?? null,
  })),
)

async function loadClientNotifications() {
  if (props.variant !== 'client') return
  notificationLoading.value = true
  try {
    rejectedSpks.value = await getClientSpks()
  } catch (error) {
    console.error('[Client Header] Gagal memuat notifikasi SPK:', error)
  } finally {
    notificationLoading.value = false
  }
}

function toggleClientNotifications(event: Event) {
  notificationEvent.value = event
  showClientNotifications.value = !showClientNotifications.value
  if (showClientNotifications.value) void loadClientNotifications()
}

function openRejectedSpk(id: number) {
  showClientNotifications.value = false
  ionRouter.push(`/client/dokumen?spk_id=${id}`)
}

onMounted(() => {
  if (props.variant === 'client') {
    void loadClientNotifications()
    notificationRefreshTimer = window.setInterval(() => {
      void loadClientNotifications()
    }, 30_000)
  }
})

onBeforeUnmount(() => {
  if (notificationRefreshTimer !== undefined) {
    window.clearInterval(notificationRefreshTimer)
  }
})


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
  position: relative;
  height: 68px;

  display: flex;

  align-items: center;

  gap: 14px;
}

.client-header-stack {
  width: 100%;
}

.client-subnav {
  display: flex;
  min-height: 54px;
  align-items: center;
  padding: 0 18px;
  border-top: 1px solid var(--border-default, #eae7e0);
  background: var(--surface-muted, #f5f3ee);
}

.client-subnav button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  color: var(--text-primary, #252525);
  background: transparent;
  font: inherit;
  font-size: 17px;
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
}

.client-subnav ion-icon {
  font-size: 28px;
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

.client-notification-wrap {
  position: relative;
  flex: 0 0 auto;
}

.client-notification-button {
  color: var(--poliland-green, #355a2c);
}

.notification-count {
  position: absolute;
  top: 1px;
  right: 0;
  display: grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  padding: 0 4px;
  border: 2px solid var(--surface-muted, #f5f3ee);
  border-radius: 999px;
  color: #fff;
  background: var(--status-danger, #d94b45);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
}

.client-notification-panel {
  display: grid;
  width: 100%;
  max-height: 100%;
  overflow: auto;
  padding: 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 18px;
  background: var(--surface-primary, #fff);
  box-shadow: 0 12px 32px rgb(0 0 0 / 16%);
}

:global(ion-popover.client-notification-popover) {
  --width: min(360px, calc(100vw - 28px));
  --max-height: min(65vh, 480px);
  --backdrop-opacity: 0;
}

.client-notification-panel > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 2px 10px;
  border-bottom: 1px solid var(--border-default, #eae7e0);
  color: var(--text-primary, #252525);
  font-size: 15px;
}

.client-notification-panel > header span {
  color: var(--text-secondary, #717178);
  font-size: 12px;
}

.client-notification-empty {
  margin: 0;
  padding: 16px 6px 8px;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  text-align: center;
}

.client-notification-item {
  display: grid;
  gap: 7px;
  padding: 12px 2px;
  border-bottom: 1px solid var(--border-default, #eae7e0);
}

.client-notification-item:last-child {
  border-bottom: 0;
}

.client-notification-item > strong {
  color: var(--text-primary, #252525);
  font-size: 13px;
}

.client-notification-item p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.client-notification-item button {
  justify-self: start;
  padding: 0;
  border: 0;
  color: var(--poliland-green, #355a2c);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
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
