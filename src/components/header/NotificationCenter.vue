<template>
  <AppModal
    :model-value="open"
    title="Notifikasi"
    aria-label="Pusat notifikasi"
    variant="bottom-sheet"
    :show-footer="false"
    :show-divider="false"
    max-height="88dvh"
    @update:model-value="(v: boolean) => { if (!v) emit('close') }"
  >
    <section class="notif">
      <header class="notif__head">
        <p class="notif__sub">{{ unread ? `${unread} belum dibaca` : 'Semua sudah dibaca' }}</p>
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

        <StatusIllustration
          v-else-if="!items.length"
          variant="empty-data"
          size="sm"
          title="Belum ada notifikasi"
          description="Kabar terbaru tentang aktivitas Anda di PoliLand Kairagi akan muncul di sini."
        />

        <ul v-else class="notif__list">
          <li v-for="n in items" :key="n.id">
            <button
              type="button"
              class="notif__item"
              :class="{ 'notif__item--unread': !n.read_at }"
              @click="open_(n)"
            >
              <span class="notif__icon" :class="`nt-tone--${toneFor(n)}`">
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
  </AppModal>
</template>

<script setup lang="ts">
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { IonIcon, useIonRouter } from '@ionic/vue'
import {
  alarmOutline,
  calendarOutline,
  cashOutline,
  checkmarkDoneOutline,
  documentTextOutline,
  homeOutline,
  informationCircleOutline,
  personAddOutline,
  walletOutline,
} from 'ionicons/icons'

import type { ToastTone } from '@/composables/useToast'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useNotifications } from '@/composables/useNotifications'
import {
  formatRelativeTime,
  resolveNotificationRoute,
  withTapStamp,
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

/* Warna ikon memakai nada yang sama dengan toast dan pesan (theme/notify.css). */
function toneFor(n: AppNotification): ToastTone {
  if (n.priority === 'high' || n.category === 'reminder') return 'warning'
  if (n.category === 'payment' || n.category === 'commission') return 'success'
  return 'info'
}

async function open_(n: AppNotification) {
  void markRead(n.id)
  const target = resolveNotificationRoute(profile.value?.role ?? null, n)
  if (!target) return
  emit('close')
  ionRouter.push(withTapStamp(target))
}
</script>

<style scoped>
/* Isi penuh lebar: batalkan padding bawaan badan AppModal. */
.notif {
  margin: -14px -16px -18px;
}

.notif__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px 8px 18px;
  border-bottom: 1px solid var(--border-default, #eae7e0);
}

.notif__sub {
  margin: 0;
  color: var(--text-secondary, #5f5f66);
  font-size: 12px;
}

.notif__markall {
  display: inline-flex;
  min-height: 44px;
  touch-action: manipulation;
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
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
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
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
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
  border-radius: 50%;
  color: var(--nt-title);
  background: var(--nt-bg);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--nt-solid) 30%, transparent);
  font-size: 20px;
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
