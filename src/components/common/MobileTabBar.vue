<template>
  <div
    v-show="!detailOpen && !keyboardVisible && !modalVisible"
    class="mobile-footer"
  >

    <div class="bottom-nav">

      <!-- =========================
           ADMIN
           ========================= -->

      <template v-if="variant === 'admin' || route.path.startsWith('/admin/')">

        <button
          type="button"
          :class="['nav-item', { active: isActive('/beranda-admin') }]"
          @click="goTo('/beranda-admin')"
        >
          <span class="icon-wrap"><ion-icon :icon="homeOutline" /></span>
          <span class="nav-label">Beranda</span>
        </button>

        <button
          type="button"
          :class="['nav-item', { active: isActive('/admin/kavling') }]"
          @click="goTo('/admin/kavling')"
        >
          <span class="icon-wrap"><ion-icon :icon="gridOutline" /></span>
          <span class="nav-label">Kavling</span>
        </button>

        <button
          type="button"
          :class="['nav-item', { active: isActive('/admin/pembeli') }]"
          @click="goTo('/admin/pembeli')"
        >
          <span class="icon-wrap"><ion-icon :icon="personOutline" /></span>
          <span class="nav-label">Pembeli</span>
        </button>

        <button
          type="button"
          :class="['nav-item', { active: isActive('/admin/keuangan') }]"
          @click="goTo('/admin/keuangan')"
        >
          <span class="icon-wrap"><ion-icon :icon="walletOutline" /></span>
          <span class="nav-label">Keuangan</span>
        </button>

        <button
          type="button"
          :class="['nav-item', { active: isActive('/admin/lainnya') }]"
          @click="goTo('/admin/lainnya')"
        >
          <span class="icon-wrap"><ion-icon :icon="menuOutline" /></span>
          <span class="nav-label">Lainnya</span>
        </button>

      </template>

      <!-- CLIENT -->
<template v-else-if="variant === 'client' || route.path.startsWith('/client/')">
  <button
    type="button"
    :class="['nav-item', { active: isActive('/beranda-client') }]"
    @click="goTo('/beranda-client')"
  >
    <span class="icon-wrap"><ion-icon :icon="homeOutline" /></span>
    <span class="nav-label">Beranda</span>
  </button>

  <button
    type="button"
    :class="['nav-item', { active: isActive('/client/kavling') }]"
    @click="goTo('/client/kavling')"
  >
    <span class="icon-wrap"><ion-icon :icon="gridOutline" /></span>
    <span class="nav-label">Kavling</span>
  </button>

  <button
    type="button"
    :class="['nav-item', { active: isActive('/client/pembayaran') }]"
    @click="goTo('/client/pembayaran')"
  >
    <span class="icon-wrap"><ion-icon :icon="documentTextOutline" /></span>
    <span class="nav-label">Pembayaran</span>
  </button>

  <button
    type="button"
    :class="['nav-item', { active: isActive('/client/dokumen') }]"
    @click="goTo('/client/dokumen')"
  >
    <span class="icon-wrap"><ion-icon :icon="documentsOutline" /></span>
    <span class="nav-label">Dokumen</span>
  </button>

  <button
    type="button"
    :class="['nav-item', { active: isActive('/client/akun') }]"
    @click="goTo('/client/akun')"
  >
    <span class="icon-wrap"><ion-icon :icon="personOutline" /></span>
    <span class="nav-label">Akun</span>
  </button>
</template>

      <!-- =========================
          MARKETING
        ========================= -->

      <template v-else-if="variant === 'marketing'">

        <!-- BERANDA -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/beranda-marketing') }
          ]"
          @click="goTo('/beranda-marketing')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="homeOutline" />
          </span>

          <span class="nav-label">
            Beranda
          </span>
        </button>


        <!-- KAVLING -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/kavling') }
          ]"
          @click="goTo('/kavling')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="gridOutline" />
          </span>

          <span class="nav-label">
            Kavling
          </span>
        </button>


        <!-- CALON PEMBELI -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/marketing/clients') }
          ]"
          @click="goTo('/marketing/clients')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="personOutline" />
          </span>

          <span class="nav-label">
            Calon Pembeli
          </span>
        </button>


        <!-- TINDAK LANJUT -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/marketing/tindak-lanjut') }
          ]"
          @click="goTo('/marketing/tindak-lanjut')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="checkmarkDoneOutline" />
          </span>

          <span class="nav-label">
            Tindak Lanjut
          </span>
        </button>


        <!-- LAINNYA -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/marketing/more') }
          ]"
          @click="goTo('/marketing/more')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="menuOutline" />
          </span>

          <span class="nav-label">
            Lainnya
          </span>
        </button>

      </template>


      <!-- =========================
           PUBLIC
           ========================= -->

      <template v-else>

        <!-- HOME -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/home') }
          ]"
          @click="goTo('/home')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="homeOutline" />
          </span>

          <span class="nav-label">
            Home
          </span>
        </button>


        <!-- SITEPLAN -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/siteplan') }
          ]"
          @click="goTo('/siteplan')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="mapOutline" />
          </span>

          <span class="nav-label">
            Siteplan
          </span>
        </button>


        <!-- PROGRESS -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/progress') }
          ]"
          @click="goTo('/progress')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="constructOutline" />
          </span>

          <span class="nav-label">
            Progress
          </span>
        </button>


        <!-- GALLERY -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/gallery') }
          ]"
          @click="goTo('/gallery')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="imagesOutline" />
          </span>

          <span class="nav-label">
            Gallery
          </span>
        </button>


        <!-- CONTACT -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/contact') }
          ]"
          @click="goTo('/contact')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="callOutline" />
          </span>

          <span class="nav-label">
            Kontak
          </span>
        </button>

      </template>

    </div>

  </div>
</template>


<script setup lang="ts">
import {
  IonIcon,
  useIonRouter,
} from '@ionic/vue'
import { Keyboard } from '@capacitor/keyboard'
import type { PluginListenerHandle } from '@capacitor/core'

import {
  homeOutline,
  mapOutline,
  constructOutline,
  imagesOutline,
  callOutline,
  gridOutline,
  documentTextOutline,
  documentsOutline,
  personOutline,
  checkmarkDoneOutline,
  menuOutline,
  walletOutline,
} from 'ionicons/icons'

import { useRoute } from 'vue-router'
import {
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'


withDefaults(
  defineProps<{
    variant?: 'public' | 'marketing' | 'admin' | 'client'
  }>(),
  {
    variant: 'public',
  },
)

const detailOpen = ref(false)
const keyboardVisible = ref(false)
const modalVisible = ref(false)
let keyboardListeners: PluginListenerHandle[] = []
let focusRecoveryTimer: number | undefined

function isTextEntry(element: EventTarget | null) {
  return element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLElement && element.isContentEditable)
}

function handleInputFocus(event: FocusEvent) {
  if (isTextEntry(event.target)) {
    keyboardVisible.value = true
  }
}

function handleInputBlur() {
  window.clearTimeout(focusRecoveryTimer)
  focusRecoveryTimer = window.setTimeout(() => {
    if (!isTextEntry(document.activeElement)) {
      keyboardVisible.value = false
    }
  }, 250)
}

function handleModalMode(event: Event) {
  const customEvent = event as CustomEvent<{ active?: boolean }>
  modalVisible.value = customEvent.detail?.active === true
}

function handleDetailMode(event: Event) {
  const customEvent = event as CustomEvent<{ active?: boolean }>
  detailOpen.value = customEvent.detail?.active === true
}

onMounted(async () => {
  window.addEventListener('poliland-detail-mode', handleDetailMode)
  window.addEventListener('poliland-modal-mode', handleModalMode)
  document.addEventListener('focusin', handleInputFocus)
  document.addEventListener('focusout', handleInputBlur)

  try {
    keyboardListeners = await Promise.all([
      Keyboard.addListener('keyboardWillShow', () => {
        keyboardVisible.value = true
      }),
      Keyboard.addListener('keyboardWillHide', () => {
        keyboardVisible.value = false
      }),
    ])
  } catch {
    // Browser fallback is handled through focusin/focusout above.
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('poliland-detail-mode', handleDetailMode)
  window.removeEventListener('poliland-modal-mode', handleModalMode)
  document.removeEventListener('focusin', handleInputFocus)
  document.removeEventListener('focusout', handleInputBlur)
  window.clearTimeout(focusRecoveryTimer)
  keyboardListeners.forEach((listener) => listener.remove())
})


const ionRouter = useIonRouter()
const route = useRoute()


/* =====================================================
   NAVIGATION
   ===================================================== */

function goTo(path: string) {
  if (route.path === path) {
    return
  }

  ionRouter.replace(path)
}


/* =====================================================
   ACTIVE TAB
   ===================================================== */

function isActive(path: string) {

  if (path === '/beranda-marketing') {
    return route.path === '/beranda-marketing' ||
      route.path === '/marketing'
  }

  if (path === '/marketing/more') {
    return route.path === '/marketing/more' ||
      route.path === '/marketing/lainnya'
  }

  if (path === '/home') {
    return route.path === '/home' || route.path === '/'
  }

  return route.path.startsWith(path)
}
</script>


<style scoped>

.mobile-footer {
  --tab-bar-height: 74px;

  position: fixed;

  left: 0;

  right: 0;

  bottom: 0;

  z-index: 9999;

  background: transparent;

  box-shadow: none;

  padding:
    0
    12px
    calc(8px + env(safe-area-inset-bottom));

  transform: none !important;

  transition:
    opacity 0.2s ease;
}


.bottom-nav {
  position: relative;

  display: grid;

  grid-template-columns:
    repeat(5, 1fr);

  align-items: stretch;

  min-height: var(--tab-bar-height);

  padding: 6px;

  background: var(--surface-primary);

  border: 1px solid var(--border-default);

  border-radius: var(--radius-card);

  box-shadow: 0 -2px 12px rgba(37, 37, 37, 0.08);
}

.nav-item {
  position: relative;

  z-index: 2;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  min-width: 0;

  height: 58px;

  gap: 2px;

  border: 0;

  background: transparent;

  color: var(--text-secondary);

  font-family: var(--font-primary);

  font-size: var(--font-size-xs);

  font-weight: 600;

  letter-spacing: 0.05px;

  padding: 0;

  cursor: pointer;

  -webkit-tap-highlight-color: transparent;

  transition:
    color 260ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    transform 260ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}

.nav-item:focus-visible {
  outline: 3px solid var(--poliland-green);
  outline-offset: -3px;
  border-radius: var(--radius-control);
}


.icon-wrap {
  position: relative;

  display: flex;

  align-items: center;

  justify-content: center;

  width: 38px;

  height: 38px;

  border-radius: 50%;

  transition:
    width 320ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    height 320ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    transform 320ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    background 320ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    box-shadow 320ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}


.nav-item ion-icon {
  font-size: 21px;

  transition:
    transform 300ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    color 260ms ease,

    filter 260ms ease;
}


.nav-label {
  line-height: 1;

  white-space: nowrap;

  transform: translateY(0);

  transition:
    transform 300ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    opacity 220ms ease,

    color 260ms ease;
}


/* =====================================================
   ACTIVE
   ===================================================== */

.nav-item.active {
  color: var(--poliland-green);
}


.nav-item.active .icon-wrap {
  width: 38px;

  height: 38px;

  transform: none;

  background: var(--status-success-bg);

  box-shadow: none;
}


.nav-item.active ion-icon {
  color: var(--poliland-green);

  font-size: 22px;

  transform: scale(1.03);

}


.nav-item.active .nav-label {
  transform: none;

  color: var(--poliland-green);

  font-weight: 700;
}


.nav-item.active::after {
  content: '';

  position: absolute;

  left: 50%;

  bottom: 1px;

  width: 4px;

  height: 4px;

  border-radius: 50%;

  background: var(--poliland-green);

  transform:
    translateX(-50%)
    scale(1);

  animation:
    active-dot-in
    320ms
    cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}


.nav-item:active {
  transform: scale(0.94);
}


.nav-item:active .icon-wrap {
  transition-duration: 120ms;
}


.nav-item.active:active .icon-wrap {
  transform: scale(0.96);
}


@keyframes active-dot-in {

  0% {
    opacity: 0;

    transform:
      translateX(-50%)
      scale(0);
  }

  70% {
    opacity: 1;

    transform:
      translateX(-50%)
      scale(1.25);
  }

  100% {
    opacity: 1;

    transform:
      translateX(-50%)
      scale(1);
  }

}

</style>
