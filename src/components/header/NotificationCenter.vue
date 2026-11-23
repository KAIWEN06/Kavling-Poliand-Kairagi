<template>
  <ion-modal :enter-animation="sheetModalEnterAnimation" :leave-animation="sheetModalLeaveAnimation"
    class="notif-sheet"
    :is-open="open"
    :initial-breakpoint="0.85"
    :breakpoints="[0, 0.85, 1]"
    @did-dismiss="emit('close')"
  >
    <section class="notif" aria-label="Pusat notifikasi">
      <header class="notif__head">
        <div>
          <h2>Notifikasi</h2>
          <p v-if="unread" class="notif__sub">{{ unread }} belum dibaca</p>
          <p v-else class="notif__sub">Semua sudah dibaca</p>
        </div>
        <button type="button" class="notif__markall" :disabled="!unread" @click="markAllRead">
          <ion-icon :icon="checkmarkDoneOutline" aria-hidden="true" />
          Tandai semua dibaca
        </button>
      </header>

      <div class="notif__body">
        <p v-if="loading && !items.length" class="notif__state" role="status">Memuat notifikasi...</p>
        <div v-else-if="error && !items.length" class="notif__state">
          <p>{{ error }}</p>
          <button type="button" class="notif__retry" @click="reload">Coba lagi</button>
        </div>

        <div v-else-if="!items.length" class="notif__empty">
          <span class="notif__empty-icon"><ion-icon :icon="notificationsOffOutline" aria-hidden="true" /></span>
          <strong>Belum ada notifikasi</strong>
          <p>Kabar terbaru tentang aktivitas Anda di PoliLand Kairagi akan muncul di sini.</p>
        </div>

        <ul v-else class="notif__list">
          <li v-for="n in items" :key="n.id">
            <button
              type="button"
              class="notif__item"
              :class="{ 'notif__item--unread': !n.read_at }"
              @click="open_(n)"
            >
              <span class="notif__icon" :class="`notif__icon--${n.category}`">
                <ion-icon :icon="iconFor(n.category)" aria-hidden="true" />
              </span>
              <span class="notif__content">
                <span class="notif__title-row">
                  <strong>{{ n.title }}</strong>
                  <span v-if="n.priority === 'high' && !n.read_at" class="notif__priority">Penting</span>
                </span>
                <span v-if="n.body" class="notif__text">{{ n.body }}</span>
                <span class="notif__time">{{ formatRelativeTime(n.created_at) }}</span>
              </span>
              <span v-if="!n.read_at" class="notif__dot" aria-label="Belum dibaca" />
            </button>
          </li>
        </ul>
      </div>
    </section>
  </ion-modal>
</template>

<script setup lang="ts">
import { sheetModalEnterAnimation, sheetModalLeaveAnimation } from '@/utils/modalAnimation'
import { IonIcon, IonModal, useIonRouter } from '@ionic/vue'
import {
  alarmOutline,
  calendarOutline,
  cashOutline,
  checkmarkDoneOutline,
  documentTextOutline,
  homeOutline,
  informationCircleOutline,
  notificationsOffOutline,
  personAddOutline,
  walletOutline,
} from 'ionicons/icons'

import { useCurrentUser } from '@/composables/useCurrentUser'
import { useNotifications } from '@/composables/useNotifications'
import {
  formatRelativeTime,
  resolveNotificationRoute,
  type AppNotification,
  type NotificationCategory,
} from '@/services/notification/notificationService'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const ionRouter = useIonRouter()
const { profile } = useCurrentUser()
const { items, unread, loading, error, reload, markRead, markAllRead } = useNotifications()

const ICONS: Record<NotificationCategory, string> = {
  spk: documentTextOutline,
  payment: cashOutline,
  client: personAddOutline,
  transaction: homeOutline,
  commission: walletOutline,
  reminder: alarmOutline,
  survey: calendarOutline,
  system: informationCircleOutline,
}

function iconFor(category: NotificationCategory) {
  return ICONS[category] ?? informationCircleOutline
}

async function open_(n: AppNotification) {
  void markRead(n.id)
  const target = resolveNotificationRoute(profile.value?.role ?? null, n)
  if (!target) return
  emit('close')
  ionRouter.push(target)
}
</script>

<style scoped>
.notif-sheet {
  --border-radius: 24px 24px 0 0;
  --background: var(--surface-primary, #fff);
}

.notif {
  display: flex;
  height: 100%;
  flex-direction: column;
  padding-top: 16px;
}

.notif__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 18px 12px;
  border-bottom: 1px solid var(--border-default, #eae7e0);
}

.notif__head h2 {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 20px;
  font-weight: 800;
}

.notif__sub {
  margin: 2px 0 0;
  color: var(--text-secondary, #717178);
  font-size: 12px;
}

.notif__markall {
  display: inline-flex;
  min-height: 36px;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  color: var(--poliland-green, #355a2c);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.notif__markall:disabled {
  opacity: 0.4;
  cursor: default;
}

.notif__markall ion-icon {
  font-size: 18px;
}

.notif__body {
  flex: 1;
  overflow-y: auto;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  overscroll-behavior: contain;
}

.notif__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.notif__item {
  position: relative;
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  border: 0;
  border-bottom: 1px solid var(--border-default, #eae7e0);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.notif__item--unread {
  background: color-mix(in srgb, var(--poliland-green, #355a2c) 6%, transparent);
}

.notif__item:active {
  background: var(--surface-muted, #f5f3ee);
}

.notif__item:focus-visible {
  outline: 2px solid var(--poliland-green, #355a2c);
  outline-offset: -2px;
}

.notif__icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 12px;
  color: var(--poliland-green, #355a2c);
  background: color-mix(in srgb, var(--poliland-green, #355a2c) 12%, transparent);
  font-size: 20px;
}

.notif__icon--payment,
.notif__icon--commission {
  color: var(--poliland-gold-text, #966a12);
  background: color-mix(in srgb, var(--poliland-gold-text, #966a12) 14%, transparent);
}

.notif__icon--reminder {
  color: var(--status-danger, #d94b45);
  background: color-mix(in srgb, var(--status-danger, #d94b45) 12%, transparent);
}

.notif__content {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 3px;
}

.notif__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notif__title-row strong {
  color: var(--text-primary, #252525);
  font-size: 14px;
  line-height: 1.3;
}

.notif__priority {
  flex: 0 0 auto;
  padding: 1px 7px;
  border-radius: 999px;
  color: var(--status-danger, #d94b45);
  background: color-mix(in srgb, var(--status-danger, #d94b45) 12%, transparent);
  font-size: 10px;
  font-weight: 700;
}

.notif__text {
  display: -webkit-box;
  overflow: hidden;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.notif__time {
  color: var(--text-secondary, #717178);
  font-size: 11px;
}

.notif__dot {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--status-danger, #d94b45);
}

.notif__state {
  display: grid;
  justify-items: center;
  gap: 10px;
  margin: 0;
  padding: 40px 24px;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  text-align: center;
}

.notif__retry {
  min-height: 40px;
  padding: 0 18px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 12px;
  color: var(--poliland-green, #355a2c);
  background: transparent;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.notif__empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 48px 32px;
  text-align: center;
}

.notif__empty-icon {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border-radius: 50%;
  color: var(--poliland-green, #355a2c);
  background: color-mix(in srgb, var(--poliland-green, #355a2c) 10%, transparent);
  font-size: 34px;
}

.notif__empty strong {
  color: var(--text-primary, #252525);
  font-size: 16px;
}

.notif__empty p {
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  line-height: 1.5;
}
</style>
