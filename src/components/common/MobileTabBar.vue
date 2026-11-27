<template>
  <div
    v-show="!detailOpen && !keyboardVisible && !modalVisible"
    class="mobile-footer"
  >

    <div class="bottom-nav">

      <!-- =========================
           ADMIN
           ========================= -->

      <!-- Owner memakai tabnya sendiri, juga saat membuka halaman Admin. -->
      <template v-if="isOwner">

        <button
          v-for="tab in ownerTabs"
          :key="tab.path"
          type="button"
          :class="['nav-item', { active: isActive(tab.path) }]"
          :aria-current="isActive(tab.path) ? 'page' : undefined"
          @click="goTo(tab.path)"
        >
          <span class="icon-wrap">
            <ion-icon :icon="tab.icon" />
          </span>
          <span class="nav-label">{{ tab.label }}</span>
        </button>

      </template>

      <template v-else-if="variant === 'admin' || route.path.startsWith('/admin/')">

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
          <span class="nav-label">Kaveling</span>
        </button>

        <button
          type="button"
          :class="['nav-item', { active: isActive('/admin/pembeli') }]"
          @click="goTo('/admin/pembeli')"
        >
          <span class="icon-wrap"><ion-icon :icon="peopleOutline" /></span>
          <span class="nav-label">Klien</span>
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
    <span class="nav-label">Kaveling</span>
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
    <span class="nav-label">SPK</span>
  </button>

  <button
    type="button"
    :class="['nav-item', { active: isActive('/akun') }]"
    @click="goTo('/akun')"
  >
    <span class="icon-wrap"><ion-icon :icon="personOutline" /></span>
    <span class="nav-label">Akun</span>
  </button>
</template>

      <!-- =========================
          MARKETING
        ========================= -->

      <!-- KEPALA BAGIAN MARKETING -->
      <template v-else-if="variant === 'head'">
        <button
          v-for="item in headTabs"
          :key="item.path"
          type="button"
          :class="['nav-item', { active: isActive(item.path) }]"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          @click="goTo(item.path)"
        >
          <span class="icon-wrap"><ion-icon :icon="item.icon" aria-hidden="true" /></span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </template>

      <template v-else-if="variant === 'marketing'">
        <button
          v-for="item in marketingTabs"
          :key="item.path"
          type="button"
          :class="['nav-item', { active: isActive(item.path) }]"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          @click="goTo(item.path)"
        >
          <span class="icon-wrap"><ion-icon :icon="item.icon" aria-hidden="true" /></span>
          <span class="nav-label">{{ item.label }}</span>
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
            Beranda
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
            Denah
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
            Progres
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
            Galeri
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
  peopleOutline,
  pulseOutline,
  barChartOutline,
} from 'ionicons/icons'

const headTabs = [
  { path: '/beranda-kepala-marketing', label: 'Beranda', icon: homeOutline },
  { path: '/kepala-marketing/clients', label: 'Klien', icon: peopleOutline },
  { path: '/kepala-marketing/perkembangan', label: 'Progres', icon: pulseOutline },
  { path: '/kepala-marketing/laporan', label: 'Laporan', icon: barChartOutline },
  { path: '/kepala-marketing/lainnya', label: 'Lainnya', icon: menuOutline },
]

const ownerTabs = [
  { path: '/beranda-owner', label: 'Beranda', icon: homeOutline },
  { path: '/owner/kavling', label: 'Kaveling', icon: gridOutline },
  { path: '/owner/penjualan', label: 'Penjualan', icon: barChartOutline },
  { path: '/owner/lainnya', label: 'Lainnya', icon: menuOutline },
]

const marketingTabs = [
  { path: '/beranda-marketing', label: 'Beranda', icon: homeOutline },
  { path: '/kavling', label: 'Kaveling', icon: gridOutline },
  { path: '/marketing/clients', label: 'Klien', icon: peopleOutline },
  { path: '/marketing/tindak-lanjut', label: 'Tindak lanjut', icon: checkmarkDoneOutline },
  { path: '/marketing/more', label: 'Lainnya', icon: menuOutline },
]

/* Tab Marketing menyala untuk rutenya sendiri, anak rutenya, dan halaman turunan di bawah. */
const TAB_CHILDREN: Record<string, string[]> = {
  '/beranda-marketing': [],
  '/kavling': ['/marketing/siteplan', '/marketing/spk'],
  '/marketing/clients': [],
  '/marketing/tindak-lanjut': [],
  '/marketing/more': [
    '/marketing/lainnya', '/marketing/pengajuan', '/marketing/pembayaran',
    '/marketing/komisi', '/akun', '/pengaturan',
  ],
  '/beranda-owner': [],
  '/owner/kavling': ['/owner/siteplan'],
  '/owner/penjualan': [],
  '/owner/lainnya': ['/owner/data', '/admin', '/akun', '/pengaturan'],
  '/beranda-kepala-marketing': [],
  '/kepala-marketing/clients': [],
  '/kepala-marketing/perkembangan': [],
  '/kepala-marketing/laporan': [],
  '/kepala-marketing/lainnya': [
    '/kepala-marketing/spk', '/kepala-marketing/pembayaran', '/kepala-marketing/komisi',
    '/kepala-marketing/siteplan', '/akun', '/pengaturan',
  ],
}

import { useRoute } from 'vue-router'
import { readIdentity } from '@/services/auth/lastIdentity'
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'


const props = withDefaults(
  defineProps<{
    variant?: 'public' | 'marketing' | 'admin' | 'client' | 'head' | 'owner'
  }>(),
  {
    variant: 'public',
  },
)

const isOwner = computed(() =>
  props.variant === 'owner' ||
  (props.variant === 'admin' && Boolean(route.path) && readIdentity()?.role === 'owner'),
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

/* Beranda adalah dasar riwayat; tab lain ditumpuk agar Back kembali ke halaman sebelumnya. */
const HOME_TABS = new Set([
  '/home',
  '/beranda-admin',
  '/beranda-owner',
  '/beranda-marketing',
  '/beranda-kepala-marketing',
  '/beranda-client',
])

function goTo(path: string) {
  if (route.path === path) {
    return
  }

  if (HOME_TABS.has(path)) {
    ionRouter.replace(path)
  } else {
    ionRouter.push(path)
  }
}


/* =====================================================
   ACTIVE TAB
   ===================================================== */

function isActive(path: string) {

  const children = TAB_CHILDREN[path]
  if (children) {
    return [path, ...children].some(
      (base) => route.path === base || route.path.startsWith(`${base}/`),
    )
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
    calc(8px + var(--safe-bottom));

  transform: none !important;

  transition:
    opacity 0.2s ease;
}


.bottom-nav {
  position: relative;

  display: grid;

  /* min-content: label terpanjang (mis. "Tindak lanjut") mendapat ruang penuh
     tanpa terpotong elipsis; sisa ruang tetap dibagi rata. */
  grid-auto-flow: column;

  grid-auto-columns: minmax(min-content, 1fr);

  align-items: stretch;

  min-height: var(--tab-bar-height);

  padding: 6px 4px;

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

  font-size: 11px;

  font-weight: 600;

  letter-spacing: 0;

  padding: 0 2px;

  cursor: pointer;

  -webkit-tap-highlight-color: transparent;

  transition:
    color 260ms var(--ease-out),

    transform 260ms var(--ease-out);
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
    width var(--dur-base) var(--ease-out),

    height var(--dur-base) var(--ease-out),

    transform var(--dur-base) var(--ease-out),

    background var(--dur-base) var(--ease-out),

    box-shadow var(--dur-base) var(--ease-out);
}


.nav-item ion-icon {
  font-size: 21px;

  transition:
    transform 300ms var(--ease-out),

    color 260ms ease,

    filter 260ms ease;
}


.nav-label {
  line-height: 1;

  max-width: 100%;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  transform: translateY(0);

  transition:
    transform 300ms var(--ease-out),

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
    var(--dur-base)
    var(--ease-out);
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


/* =====================================================
   DESKTOP / TABLET LANDSCAPE (>= 1024px): sidebar kiri
   Item, rute, dan logika aktif tetap sama dengan bottom nav.
   ===================================================== */

@media (min-width: 1024px) {
  .mobile-footer {
    top: 0;
    right: auto;
    width: var(--sidebar-w);
    padding: 0;
    z-index: var(--z-nav);
  }

  .bottom-nav {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-1);
    height: 100%;
    padding: var(--space-6) var(--space-3) calc(var(--space-6) + var(--safe-bottom));
    border: 0;
    border-right: 1px solid var(--border-default);
    border-radius: 0;
    background: var(--surface-primary);
    box-shadow: none;
  }

  .bottom-nav::before {
    content: 'PoliLand';
    padding: 0 var(--space-3) var(--space-6);
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--green-700);
  }

  .nav-item {
    flex-direction: row;
    justify-content: flex-start;
    gap: var(--space-3);
    height: 44px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--text-md);
  }

  @media (hover: hover) and (pointer: fine) {
  .nav-item:hover {
      background: var(--surface-muted);
    }
}

  .nav-item.active {
    background: var(--green-100);
  }

  .nav-item .icon-wrap,
  .nav-item.active .icon-wrap {
    width: 28px;
    height: 28px;
    background: transparent;
  }

  .nav-item ion-icon,
  .nav-item.active ion-icon {
    font-size: 20px;
    transform: none;
  }

  /* Penanda aktif: batang di tepi kiri, bukan titik bawah */
  .nav-item.active::after {
    left: 0;
    bottom: auto;
    top: 10px;
    width: 3px;
    height: 24px;
    border-radius: var(--radius-pill);
    transform: none;
    animation: none;
  }
}

@keyframes active-dot-in {

  0% {
    opacity: 0;

    transform:
      translateX(-50%)
      scale(0.6);
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
