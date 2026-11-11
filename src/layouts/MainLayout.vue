<template>
  <ion-page class="main-layout">
    <!-- Mascot pull to refresh -->
    <MascotPullRefresh />

    <!-- Header umum: disembunyikan pada halaman Admin dan client -->
    <AppHeader v-if="!isRolePage" />

    <!-- Konten halaman -->
    <div
      class="content-container"
      :class="{ 'role-page-content': isRolePage }"
    >
      <ion-router-outlet />
    </div>

    <!-- Tab bar umum: disembunyikan pada halaman Admin dan client -->
    <div
      v-if="!isRolePage"
      class="tabbar-overlay"
      :class="{
        'search-mode-hidden': isSearchActive,
        'detail-mode-hidden': isDetailOpen,
      }"
    >
      <MobileTabBar />
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { IonPage, IonRouterOutlet } from '@ionic/vue'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import MascotPullRefresh from '@/components/common/MascotPullRefresh.vue'

const route = useRoute()

const isSearchActive = ref(false)
const isDetailOpen = ref(false)

/*
 * Halaman Admin dan client memiliki header serta tab bar sendiri.
 * Pastikan path di bawah cocok dengan route yang terdaftar di router.
 */
const isRolePage = computed(() => {
  const path = route.path

  return (
    path.startsWith('/admin') ||
    path.startsWith('/client') ||
    path === '/beranda-admin' ||
    path === '/berandaclient'
  )
})

function handleSearchMode(event: Event) {
  const customEvent = event as CustomEvent<{ active?: boolean }>
  isSearchActive.value = customEvent.detail?.active === true
}

function handleDetailMode(event: Event) {
  const customEvent = event as CustomEvent<{ active?: boolean }>
  isDetailOpen.value = customEvent.detail?.active === true
}

onMounted(() => {
  window.addEventListener('poliland-search-mode', handleSearchMode)
  window.addEventListener('poliland-detail-mode', handleDetailMode)
})

onBeforeUnmount(() => {
  window.removeEventListener('poliland-search-mode', handleSearchMode)
  window.removeEventListener('poliland-detail-mode', handleDetailMode)
})
</script>

<style scoped>
/* Layout utama */
.main-layout {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* Area konten, dengan ruang untuk header umum */
.content-container {
  position: absolute;
  top: 68px;
  right: 0;
  bottom: 0;
  left: 0;
  width: auto;
  height: auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* Halaman role memakai header sendiri */
.content-container.role-page-content {
  top: 0;
}

/* Router outlet memenuhi area konten */
.content-container :deep(ion-router-outlet) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Tab bar umum */
.tabbar-overlay {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10000;
  width: 100%;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  pointer-events: none;
}

.tabbar-overlay :deep(*) {
  pointer-events: auto;
}

/* Sembunyikan tab bar pada mode pencarian atau detail */
.tabbar-overlay.search-mode-hidden,
.tabbar-overlay.detail-mode-hidden {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

.tabbar-overlay.search-mode-hidden :deep(*),
.tabbar-overlay.detail-mode-hidden :deep(*) {
  pointer-events: none;
}

@media (max-width: 480px) {
  .content-container {
    top: 68px;
  }

  .content-container.role-page-content {
    top: 0;
  }
}
</style>