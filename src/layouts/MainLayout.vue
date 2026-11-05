<template>
  <ion-page class="main-layout">

    <!-- =================================================
         MASCOT PULL TO REFRESH
         BERADA DI ATAS APP HEADER
         ================================================= -->
    <MascotPullRefresh />

    <!-- =================================================
         HEADER
         ================================================= -->
    <AppHeader />

    <!-- =================================================
         CONTENT
         ================================================= -->
    <div class="content-container">

      <ion-router-outlet />

    </div>

    <!-- =================================================
         TAB BAR
         ================================================= -->
    <div
      class="tabbar-overlay"
      :class="{ 'search-mode-hidden': isSearchActive }"
    >

      <MobileTabBar />

    </div>

  </ion-page>
</template>

<script setup lang="ts">

import {
  IonPage,
  IonRouterOutlet
} from '@ionic/vue'

import {
  ref,
  onMounted,
  onBeforeUnmount
} from 'vue'

import AppHeader
  from '@/components/common/AppHeader.vue'

import MobileTabBar
  from '@/components/common/MobileTabBar.vue'

import MascotPullRefresh
  from '@/components/common/MascotPullRefresh.vue'

const isSearchActive = ref(false)

function handleSearchMode(event: Event) {
  const customEvent = event as CustomEvent<{ active?: boolean }>
  isSearchActive.value = customEvent.detail?.active === true
}

onMounted(() => {
  window.addEventListener(
    'poliland-search-mode',
    handleSearchMode
  )
})

onBeforeUnmount(() => {
  window.removeEventListener(
    'poliland-search-mode',
    handleSearchMode
  )
})

</script>

<style scoped>

/* =====================================================
   MAIN LAYOUT
   ===================================================== */

.main-layout {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  /* Mencegah layout ikut ter-resize paksa oleh virtual keyboard */
  position: fixed;
  inset: 0;
}


/* =====================================================
   CONTENT
   ===================================================== */

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


/* =====================================================
   ROUTER OUTLET
   ===================================================== */

.content-container :deep(ion-router-outlet) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}


/* =====================================================
   TAB BAR
   ===================================================== */

.tabbar-overlay {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  z-index: 10000;
  pointer-events: none;
}

/* =====================================================
   TAB BAR INTERACTION
   ===================================================== */

.tabbar-overlay :deep(*) {
  pointer-events: auto;
}

/* Search mode: sembunyikan Tabbar sepenuhnya. */
.tabbar-overlay.search-mode-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.tabbar-overlay.search-mode-hidden :deep(*) {
  pointer-events: none;
}

/* =====================================================
   SAFE AREA
   ===================================================== */

@supports (
  padding-bottom:
  env(safe-area-inset-bottom)
) {

  .tabbar-overlay {

    padding-bottom:
      env(safe-area-inset-bottom);

  }

}


/* =====================================================
   MOBILE
   ===================================================== */

@media (max-width: 480px) {

  .content-container {

    top: 68px;

  }

}

</style>