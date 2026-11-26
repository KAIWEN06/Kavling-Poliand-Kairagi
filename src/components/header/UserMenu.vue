<template>
  <ion-modal :enter-animation="sheetModalEnterAnimation" :leave-animation="sheetModalLeaveAnimation"
    class="user-menu-sheet"
    :is-open="open"
    :initial-breakpoint="1"
    :breakpoints="[0, 1]"
    handle-behavior="cycle"
    @did-dismiss="emit('close')"
  >
    <section class="user-menu" aria-label="Menu pengguna">
      <header class="user-menu__identity">
        <UserAvatar :name="displayName" :src="profile?.avatarUrl" :size="64" />
        <div class="user-menu__text">
          <strong>{{ displayName }}</strong>
          <span v-if="profile?.email" class="user-menu__email">{{ profile.email }}</span>
          <span v-if="roleLabel" class="user-menu__role">{{ roleLabel }}</span>
        </div>
      </header>

      <nav class="user-menu__list" aria-label="Aksi akun">
        <button type="button" class="user-menu__item" @click="go('/profil')">
          <ion-icon :icon="personOutline" aria-hidden="true" />
          <span>Profil Saya</span>
          <ion-icon :icon="chevronForwardOutline" class="user-menu__chevron" aria-hidden="true" />
        </button>
        <button type="button" class="user-menu__item" @click="go('/pengaturan')">
          <ion-icon :icon="settingsOutline" aria-hidden="true" />
          <span>Pengaturan</span>
          <ion-icon :icon="chevronForwardOutline" class="user-menu__chevron" aria-hidden="true" />
        </button>
        <button type="button" class="user-menu__item user-menu__item--danger" :disabled="loggingOut" @click="confirmLogout">
          <ion-icon :icon="logOutOutline" aria-hidden="true" />
          <span>{{ loggingOut ? 'Keluar...' : 'Keluar' }}</span>
        </button>
      </nav>
    </section>
  </ion-modal>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { sheetModalEnterAnimation, sheetModalLeaveAnimation } from '@/utils/modalAnimation'
import { ref } from 'vue'
import { IonIcon, IonModal, useIonRouter } from '@ionic/vue'
import { chevronForwardOutline, logOutOutline, personOutline, settingsOutline } from 'ionicons/icons'

import UserAvatar from '@/components/header/UserAvatar.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { authService } from '@/services/auth/authService'

const { confirm } = useConfirm()

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const ionRouter = useIonRouter()
const { profile, displayName, roleLabel } = useCurrentUser()
const loggingOut = ref(false)

function go(path: string) {
  emit('close')
  ionRouter.push(path)
}

async function confirmLogout() {
  const ok = await confirm({ title: 'Keluar dari akun?', message: 'Anda perlu masuk kembali untuk mengakses aplikasi.', confirmText: 'Keluar', tone: 'error' })
  if (!ok) return
  await logout()
}

async function logout() {
  loggingOut.value = true
  try {
    await authService.logout()
  } catch (error) {
    // Sesi lokal tetap harus dibersihkan walau jaringan gagal.
    console.error('[Logout] Gagal keluar di server:', error)
  } finally {
    loggingOut.value = false
    emit('close')
    ionRouter.replace('/login')
  }
}
</script>

<style scoped>
.user-menu-sheet {
  --border-radius: 24px 24px 0 0;
  --background: var(--surface-primary, #fff);
  --height: auto;
}

.user-menu {
  display: grid;
  gap: 8px;
  padding: 20px 16px calc(16px + var(--safe-bottom));
}

.user-menu__identity {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 4px 16px;
  border-bottom: 1px solid var(--border-default, #eae7e0);
}

.user-menu__text {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.user-menu__text strong {
  overflow: hidden;
  color: var(--text-primary, #252525);
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu__email {
  overflow: hidden;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu__role {
  justify-self: start;
  margin-top: 2px;
  padding: 2px 10px;
  border-radius: 999px;
  color: var(--poliland-green, #355a2c);
  background: color-mix(in srgb, var(--poliland-green, #355a2c) 12%, transparent);
  font-size: 11px;
  font-weight: 700;
}

.user-menu__list {
  display: grid;
  gap: 2px;
  padding-top: 8px;
}

.user-menu__item {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 14px;
  padding: 0 12px;
  border: 0;
  border-radius: 14px;
  color: var(--text-primary, #252525);
  background: transparent;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.user-menu__item:active {
  background: var(--surface-muted, #f5f3ee);
}

@media (hover: hover) and (pointer: fine) {
  .user-menu__item:hover {
    background: var(--surface-muted, #f5f3ee);
  }
}

.user-menu__item:focus-visible {
  outline: 2px solid var(--poliland-green, #355a2c);
  outline-offset: -2px;
}

.user-menu__item ion-icon {
  font-size: 22px;
}

.user-menu__chevron {
  margin-left: auto;
  color: var(--text-secondary, #717178);
  font-size: 18px !important;
}

.user-menu__item--danger {
  color: var(--status-danger, #d94b45);
}
</style>
