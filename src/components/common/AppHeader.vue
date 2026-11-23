<template>
  <!-- Seluruh halaman aplikasi (semua role) memakai satu header yang sama. -->
  <GlobalMobileHeader v-if="variant !== 'default' || profile" />

  <!-- Situs publik, belum login: merek + tombol masuk. -->
  <ion-header v-else class="app-header" :translucent="false">
    <ion-toolbar>
      <div class="header-content">
        <div class="brand">
          <div class="brand-logo-wrapper">
            <img src="@/assets/icons/icons.png" alt="Logo PoliLand" class="brand-logo-img" />
          </div>
          <div class="brand-text">
            <strong>PoliLand</strong>
            <span>Kairagi</span>
          </div>
        </div>

        <AppButton class="submit-button" expand="block" color="primary" @click="ionRouter.push('/login')">
          <span>MASUK</span>
        </AppButton>
      </div>
    </ion-toolbar>
  </ion-header>
</template>

<script setup lang="ts">
import { IonHeader, IonToolbar, useIonRouter } from '@ionic/vue'

import GlobalMobileHeader from '@/components/header/GlobalMobileHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'

/**
 * Pintu masuk header lama dipertahankan agar semua halaman tidak perlu
 * diubah satu per satu. Props di bawah hanya untuk kompatibilitas:
 * judul halaman dan tombol kembali KINI berada di area konten
 * (PageHeader / PageBackButton), bukan di header.
 */
withDefaults(
  defineProps<{
    variant?: 'default' | 'marketing' | 'admin' | 'client'
    title?: string
    showBack?: boolean
    backRoute?: string
    backLabel?: string
  }>(),
  { variant: 'default', title: 'PoliLand Kairagi', showBack: false },
)

const ionRouter = useIonRouter()
const { profile } = useCurrentUser()
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  box-shadow: 0 1px 8px rgb(45 45 45 / 5%);
}

.app-header ion-toolbar {
  --background: var(--surface-muted);
  --min-height: 68px;
  --border-width: 0 0 1px 0;
  --border-color: var(--border-default);
  padding: 0 12px;
}

.header-content {
  display: flex;
  height: 68px;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo-wrapper {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--radius-control);
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
</style>
