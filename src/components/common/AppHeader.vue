<template>
  <ion-header
    class="app-header"
    :translucent="false"
  >

    <ion-toolbar :class="{ 'owner-toolbar': variant === 'owner', 'owner-toolbar-with-back': variant === 'owner' && (showBack || backLabel !== 'Kembali') }">

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

      <template v-if="variant === 'owner'">
        <div class="owner-header-stack">
          <div class="owner-main-header">
            <div class="owner-brand">
              <img src="@/assets/icons/icons.png" alt="" aria-hidden="true" />
              <div><strong>PoliLand</strong><span>Kairagi</span></div>
            </div>
            <button
              type="button"
              class="owner-notification"
              :aria-label="ownerHasNotification ? 'Aktivitas terbaru, ada aktivitas baru' : 'Aktivitas terbaru'"
              @click="goNotifications"
            >
              <ion-icon :icon="notificationsOutline" />
              <span v-if="ownerHasNotification" class="notification-dot"></span>
            </button>
            <button type="button" class="owner-avatar" aria-label="Profil Owner" @click="goOwnerProfile">
              <img v-if="ownerAvatarUrl" :src="ownerAvatarUrl" alt="" />
              <ion-icon v-else :icon="personCircleOutline" aria-hidden="true" />
            </button>
          </div>
          <div v-if="showBack || backLabel !== 'Kembali'" class="owner-subnav">
            <button v-if="showBack" type="button" @click="goBack">
              <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
              <span>{{ backLabel }}</span>
            </button>
            <span v-else class="owner-page-title">{{ backLabel }}</span>
          </div>
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
  personCircleOutline,
} from 'ionicons/icons'

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import { getClientSpks } from '@/services/clientSpkService'
import { authService } from '@/services/auth/authService'
import { supabase } from '@/services/config/supabase'


const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'marketing' | 'admin' | 'client' | 'owner'
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
const ownerAvatarUrl = ref('')
const ownerHasNotification = ref(false)
const ownerNotificationStorageKey = ref('')
let notificationRefreshTimer: number | undefined
let ownerNotificationRefreshTimer: number | undefined

const rejectionNotifications = computed(() => rejectedSpks.value
  .filter((record) => record.status === 'Rejected' && record.rejectionReason?.trim())
  .map((record) => ({
    id: record.id,
    spkNumber: record.spkNumber,
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

async function loadOwnerNotifications(userId: string) {
  const storageKey = `owner-lot-activity-seen:${userId}`
  ownerNotificationStorageKey.value = storageKey

  try {
    const { data, error } = await supabase
      .from('lot_transactions')
      .select('status, created_at, updated_at, booking_date, sold_date')
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const lastSeen = localStorage.getItem(storageKey)
    if (!lastSeen) {
      const latestActivityTime = (data ?? []).reduce((latest, transaction) => {
        const activityDate = transaction.updated_at
          || transaction.sold_date
          || transaction.booking_date
          || transaction.created_at
        const activityTime = activityDate ? new Date(activityDate).getTime() : 0
        return Number.isFinite(activityTime) ? Math.max(latest, activityTime) : latest
      }, 0)
      localStorage.setItem(
        storageKey,
        new Date(latestActivityTime || Date.now()).toISOString(),
      )
      ownerHasNotification.value = false
      return
    }

    const lastSeenTime = new Date(lastSeen).getTime()
    ownerHasNotification.value = (data ?? []).some((transaction) => {
      const status = String(transaction.status ?? '').toLocaleLowerCase('id-ID')
      const isBooking = status.includes('book') || status.includes('reserv')
      const isSold = status === 'sold' || status === 'terjual'
      if (!isBooking && !isSold) return false

      const activityDate = transaction.updated_at
        || transaction.sold_date
        || transaction.booking_date
        || transaction.created_at
      if (!activityDate) return false

      const activityTime = new Date(activityDate).getTime()
      return Number.isFinite(activityTime) && activityTime > lastSeenTime
    })
  } catch (error) {
    console.error('[Owner Header] Gagal memuat aktivitas baru:', error)
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
  if (props.variant === 'owner') {
    void authService.getCurrentUser().then((user) => {
      const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
      ownerAvatarUrl.value = typeof avatar === 'string' ? avatar : ''
      if (user) {
        void loadOwnerNotifications(user.id)
        ownerNotificationRefreshTimer = window.setInterval(() => {
          void loadOwnerNotifications(user.id)
        }, 30_000)
      }
    }).catch((error) => {
      console.error('[Owner Header] Gagal memuat profil:', error)
    })
  }
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
  if (ownerNotificationRefreshTimer !== undefined) {
    window.clearInterval(ownerNotificationRefreshTimer)
  }
})


/* =====================================================
   NAVIGATION
   ===================================================== */

function goLogin() {
  ionRouter.push('/login')
}


function goNotifications() {
  if (props.variant === 'owner') {
    const storageKey = ownerNotificationStorageKey.value
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, new Date().toISOString())
        ownerHasNotification.value = false
      } catch (error) {
        console.error('[Owner Header] Gagal memperbarui status aktivitas:', error)
      }
    }
    ionRouter.push('/beranda-owner#activity')
    return
  }
  ionRouter.push('/notifications')
}

function goOwnerProfile() {
  ionRouter.push('/owner/profil')
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

.app-header ion-toolbar.owner-toolbar {
  --min-height: 68px;
  padding: 0;
}

.app-header ion-toolbar.owner-toolbar-with-back {
  --min-height: 116px;
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

.owner-header-stack {
  width: 100%;
  background: #fff;
}

.owner-main-header {
  display: flex;
  height: 68px;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-default, #eae7e0);
  background: #fff;
}

.owner-brand {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 9px;
}

.owner-brand img {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  object-fit: contain;
}

.owner-brand div {
  display: grid;
  line-height: 1.05;
}

.owner-brand strong {
  color: #c0a15e;
  font-size: 20px;
  font-weight: 800;
}

.owner-brand span {
  color: #6b6b6b;
  font-size: 14px;
}

.owner-notification {
  position: relative;
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  color: #303030;
  background: transparent;
  font-size: 28px;
  cursor: pointer;
}

.owner-notification .notification-dot {
  top: 5px;
  right: 3px;
  border-color: #fff;
}

.owner-avatar {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
  font-size: 30px;
  cursor: pointer;
}

.owner-avatar img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.owner-subnav {
  display: flex;
  min-height: 48px;
  align-items: center;
  padding: 0 18px;
  border-bottom: 1px solid var(--border-default, #eae7e0);
  background: #fff;
}

.owner-subnav button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  color: #10213a;
  background: transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.owner-subnav ion-icon { font-size: 24px; }

.owner-page-title {
  color: #10213a;
  font-size: 16px;
  font-weight: 700;
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
