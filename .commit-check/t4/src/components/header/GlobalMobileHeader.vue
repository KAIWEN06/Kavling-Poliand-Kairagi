<template>
  <ion-header class="gmh app-header" :translucent="false">
    <ion-toolbar>
      <div class="gmh__row">
        <button
          type="button"
          class="gmh__user"
          aria-label="Buka halaman akun"
          @click="ionRouter.push('/akun')"
        >
          <UserAvatar :name="displayName" :src="profile?.avatarUrl" :size="40" />
          <span class="gmh__text">
            <span class="gmh__greeting">Halo,</span>
            <strong class="gmh__name">{{ profile ? firstName : '...' }}</strong>
          </span>
        </button>

        <button
          type="button"
          class="gmh__bell"
          :aria-label="unread ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'"
          aria-haspopup="dialog"
          :aria-expanded="notifOpen"
          @click="notifOpen = true"
        >
          <ion-icon :icon="notificationsOutline" aria-hidden="true" />
          <span v-if="unread" class="gmh__badge" aria-hidden="true">{{ badgeLabel }}</span>
        </button>
      </div>
    </ion-toolbar>

    <NotificationCenter :open="notifOpen" @close="notifOpen = false" />
  </ion-header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonHeader, IonIcon, IonToolbar, useIonRouter } from '@ionic/vue'
import { notificationsOutline } from 'ionicons/icons'

import NotificationCenter from '@/components/header/NotificationCenter.vue'
import UserAvatar from '@/components/header/UserAvatar.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useNotifications } from '@/composables/useNotifications'

const ionRouter = useIonRouter()
const notifOpen = ref(false)

const { profile, displayName, firstName } = useCurrentUser()
const { unread, badgeLabel } = useNotifications()
</script>

<style scoped>
.gmh {
  position: sticky;
  top: 0;
  z-index: 20;
  box-shadow: 0 1px 8px rgb(45 45 45 / 5%);
}

.gmh ion-toolbar {
  --background: var(--surface-muted, #f5f3ee);
  --min-height: 60px;
  --border-width: 0 0 1px 0;
  --border-color: var(--border-default, #eae7e0);
  padding: 0 12px;
}

.gmh__row {
  display: flex;
  height: 60px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.gmh__user {
  display: flex;
  min-width: 0;
  min-height: 48px;
  align-items: center;
  gap: 10px;
  padding: 0 8px 0 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.gmh__user:focus-visible,
.gmh__bell:focus-visible {
  outline: 2px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

.gmh__text {
  display: grid;
  min-width: 0;
  line-height: 1.2;
}

.gmh__greeting {
  color: var(--text-secondary, #717178);
  font-size: 11px;
  font-weight: 600;
}

.gmh__name {
  overflow: hidden;
  max-width: 52vw;
  color: var(--text-primary, #252525);
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.2px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gmh__bell {
  position: relative;
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--poliland-green, #355a2c);
  background: transparent;
  cursor: pointer;
}

.gmh__bell ion-icon {
  font-size: 26px;
}

.gmh__badge {
  position: absolute;
  top: 3px;
  right: 1px;
  display: grid;
  min-width: 19px;
  height: 19px;
  place-items: center;
  padding: 0 5px;
  border: 2px solid var(--surface-muted, #f5f3ee);
  border-radius: 999px;
  color: #fff;
  background: var(--status-danger, #d94b45);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}
</style>
