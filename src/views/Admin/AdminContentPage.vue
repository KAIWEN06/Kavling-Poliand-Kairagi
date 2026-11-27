<template>
  <ion-page class="cms-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />
    <ion-content :fullscreen="true">
      <main class="cms-shell">
        <Reveal :order="1">
          <header class="cms-intro">
            <h1>Kelola konten halaman publik</h1>
            <p>Ubah isi halaman yang dilihat calon pembeli sebelum masuk. Perubahan langsung tampil setelah disimpan.</p>
          </header>
        </Reveal>

        <div class="cms-layout" :class="{ 'has-detail': !!shownTab }">
          <nav class="cms-nav" aria-label="Bagian konten">
            <section v-for="group in GROUPS" :key="group.label" class="nav-group">
              <h2>{{ group.label }}</h2>
              <ul>
                <li v-for="tab in group.tabs" :key="tab.key">
                  <button class="nav-card" :class="{ active: shownTab === tab.key }" type="button" :aria-current="shownTab === tab.key ? 'page' : undefined" @click="selectTab(tab.key)">
                    <span class="nav-icon" aria-hidden="true"><ion-icon :icon="tab.icon" /></span>
                    <span class="nav-text">
                      <strong>{{ tab.label }}</strong>
                      <small>{{ tab.summary }}</small>
                    </span>
                    <span v-if="countOf(tab.key) !== null" class="nav-count" :aria-label="`${countOf(tab.key)} data`">{{ countOf(tab.key) }}</span>
                    <ion-icon class="nav-chevron" :icon="chevronForwardOutline" aria-hidden="true" />
                  </button>
                </li>
              </ul>
            </section>
          </nav>

          <section v-if="currentTab" id="cms-view" class="cms-detail" :aria-labelledby="`detail-${currentTab.key}`">
            <div class="detail-bar">
              <button class="bar-btn back" type="button" @click="showOverview">
                <ion-icon :icon="arrowBackOutline" aria-hidden="true" /> Semua bagian
              </button>
              <button v-if="currentTab.path" class="bar-btn site" type="button" @click="viewPublic">
                Lihat halaman <ion-icon :icon="openOutline" aria-hidden="true" />
              </button>
            </div>
            <p :id="`detail-${currentTab.key}`" class="where">{{ currentTab.where }}</p>

            <CmsHomePanel v-if="currentTab.key === 'home'" @notify="showNotice" />
            <CmsLocationPanel v-else-if="currentTab.key === 'location'" @notify="showNotice" />
            <CmsContactPanel v-else-if="currentTab.key === 'contact'" @notify="showNotice" />
            <CmsHoursPanel v-else-if="currentTab.key === 'hours'" @notify="showNotice" />
            <CmsCrudPanel v-else :key="currentTab.key" :type="currentTab.key as CmsItemType" @notify="showNotice" />
          </section>
        </div>
      </main>
    </ion-content>
    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { IonContent, IonIcon, IonPage, onIonViewWillEnter } from '@ionic/vue'
import {
  arrowBackOutline, callOutline, chevronForwardOutline, constructOutline, helpCircleOutline,
  homeOutline, imagesOutline, locationOutline, openOutline, timeOutline,
} from 'ionicons/icons'
import { useRoute, useRouter } from 'vue-router'
import Reveal from '@/components/ui/Reveal.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import CmsCrudPanel from '@/components/Admin/CmsCrudPanel.vue'
import CmsHomePanel from '@/components/Admin/CmsHomePanel.vue'
import CmsContactPanel from '@/components/Admin/CmsContactPanel.vue'
import CmsLocationPanel from '@/components/Admin/CmsLocationPanel.vue'
import CmsHoursPanel from '@/components/Admin/CmsHoursPanel.vue'
import type { CmsItemType } from '@/components/Admin/CmsItemFormModal.vue'
import { cmsService } from '@/services/cmsService'
import { useToast } from '@/composables/useToast'

type CmsTab = 'home' | 'location' | 'gallery' | 'progress' | 'faq' | 'contact' | 'hours'
type TabDef = { key: CmsTab; label: string; summary: string; where: string; path: string | null; icon: string }

const route = useRoute()
const router = useRouter()
const toast = useToast()

/** `where` menjelaskan halaman publik yang terpengaruh; `path` dipakai tombol "Lihat di situs web". */
const TABS: Record<CmsTab, TabDef> = {
  home: { key: 'home', label: 'Beranda', summary: 'Sampul, sorotan, keunggulan, tentang kami, ajakan', where: 'Tampil di halaman Beranda.', path: '/home', icon: homeOutline },
  location: { key: 'location', label: 'Lokasi', summary: 'Titik peta dan tempat terdekat', where: 'Tampil di bagian Lokasi & Denah Kavling pada Beranda.', path: '/home', icon: locationOutline },
  gallery: { key: 'gallery', label: 'Galeri', summary: 'Foto kawasan dan fasilitas', where: 'Tampil di halaman Galeri dan pratinjau galeri di Beranda.', path: '/gallery', icon: imagesOutline },
  progress: { key: 'progress', label: 'Kemajuan', summary: 'Update perkembangan pembangunan', where: 'Tampil di halaman Kemajuan dan bagian Kemajuan di Beranda.', path: '/progress', icon: constructOutline },
  faq: { key: 'faq', label: 'FAQ', summary: 'Pertanyaan yang sering diajukan', where: 'Tampil di bagian FAQ pada Beranda.', path: '/home', icon: helpCircleOutline },
  contact: { key: 'contact', label: 'Kontak', summary: 'Alamat, WhatsApp, email, media sosial', where: 'Tampil di bagian Hubungi Kami, halaman Kontak, dan semua tombol WhatsApp.', path: '/contact', icon: callOutline },
  hours: { key: 'hours', label: 'Jam Operasional', summary: 'Hari dan jam survei lokasi', where: 'Menentukan sesi survei lokasi yang bisa dipilih klien setelah masuk.', path: null, icon: timeOutline },
}
const GROUPS: { label: string; tabs: TabDef[] }[] = [
  { label: 'Halaman publik', tabs: [TABS.home, TABS.location, TABS.gallery, TABS.progress, TABS.faq, TABS.contact] },
  { label: 'Operasional', tabs: [TABS.hours] },
]

/* Layar lebar menampilkan daftar dan editor berdampingan; layar sempit bergantian. */
const wide = ref(false)
let mql: MediaQueryList | null = null
const syncWide = () => { wide.value = !!mql?.matches }

const current = ref<CmsTab | null>(null)
const shownTab = computed<CmsTab | null>(() => current.value ?? (wide.value ? 'home' : null))
const currentTab = computed(() => (shownTab.value ? TABS[shownTab.value] : null))

const counts = ref<Awaited<ReturnType<typeof cmsService.getCounts>> | null>(null)
function countOf(key: CmsTab): number | null {
  if (!counts.value) return null
  if (key === 'gallery') return counts.value.gallery
  if (key === 'progress') return counts.value.progress
  if (key === 'faq') return counts.value.faq
  return null
}
async function loadCounts() {
  try { counts.value = await cmsService.getCounts() } catch { counts.value = null }
}

function showNotice(message: string, type: 'success' | 'error' | string = 'success') {
  if (type === 'error') toast.error(message)
  else { toast.success(message); void loadCounts() }
}

function selectTab(key: CmsTab) {
  current.value = key
  void router.push({ path: '/admin/konten', query: { tab: key } })
}

function showOverview() {
  current.value = null
  void router.push({ path: '/admin/konten' })
}

function viewPublic() {
  const tab = currentTab.value
  if (tab?.path) void router.push({ path: tab.path, query: { from: 'cms', tab: tab.key } })
}

/** Sinkronkan bagian yang terbuka dengan ?tab=. Abaikan perubahan rute saat halaman ini sedang di latar belakang. */
function applyRouteQuery() {
  if (route.path !== '/admin/konten') return
  const tab = route.query.tab
  current.value = typeof tab === 'string' && tab in TABS ? (tab as CmsTab) : null
}
watch(() => route.query.tab, applyRouteQuery)
onIonViewWillEnter(() => { applyRouteQuery(); void loadCounts() })

onMounted(() => {
  mql = window.matchMedia('(min-width: 960px)')
  syncWide()
  mql.addEventListener('change', syncWide)
  applyRouteQuery()
  void loadCounts()
})
onBeforeUnmount(() => mql?.removeEventListener('change', syncWide))

useRealtimeRefresh(['gallery', 'progress', 'faqs', 'contacts', 'home_features'], loadCounts)

</script>

<style scoped>
.cms-page { color: var(--text-primary); }
.cms-shell { min-height: 100%; max-width: 1180px; margin: auto; padding: 20px 16px calc(112px + var(--safe-bottom)); background: var(--app-background); }
.cms-intro { margin-bottom: 18px; }
.cms-intro h1 { margin: 0; font-size: clamp(22px, 5.5vw, 30px); font-weight: 800; letter-spacing: -.01em; }
.cms-intro p { margin: 6px 0 0; max-width: 62ch; color: var(--text-secondary); font-size: 13px; line-height: 1.55; }

/* Mobile: daftar bagian ATAU editor, tidak keduanya. */
.cms-layout { display: block; }
.cms-layout.has-detail .cms-nav { display: none; }
.cms-layout:not(.has-detail) .cms-detail { display: none; }

.nav-group + .nav-group { margin-top: 22px; }
.nav-group h2 { margin: 0 0 10px; color: var(--text-secondary); font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.nav-group ul { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }

.nav-card { display: flex; align-items: center; gap: 12px; inline-size: 100%; min-height: 64px; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); color: inherit; font: inherit; text-align: left; cursor: pointer; transition: border-color .15s ease, background-color .15s ease; }
.nav-card:active { background: var(--surface-muted); }
.nav-card:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.nav-card.active { border-color: var(--poliland-green); background: var(--status-success-bg); }
.nav-icon { flex: none; display: grid; place-items: center; inline-size: 40px; block-size: 40px; border-radius: 12px; background: var(--status-success-bg); color: var(--poliland-green); font-size: 20px; }
.nav-card.active .nav-icon { background: var(--poliland-green); color: #fff; }
.nav-text { flex: 1; min-width: 0; display: grid; gap: 2px; }
.nav-text strong { font-size: 14px; font-weight: 800; }
.nav-text small { color: var(--text-secondary); font-size: 12px; line-height: 1.4; }
.nav-count { flex: none; min-inline-size: 26px; padding: 2px 8px; border-radius: 99px; background: var(--surface-muted); color: var(--text-secondary); font-size: 12px; font-weight: 800; text-align: center; }
.nav-chevron { flex: none; color: var(--text-tertiary, var(--text-secondary)); font-size: 18px; }

.detail-bar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.bar-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 10px; border: 0; border-radius: var(--radius-control); background: transparent; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
.bar-btn:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.bar-btn.back { margin-inline-start: -10px; color: var(--text-primary); }
.bar-btn.site { color: var(--poliland-green); }
.bar-btn ion-icon { font-size: 18px; }
.where { margin: 0 0 14px; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }

/* Layar lebar: daftar di kiri, editor di kanan. */
@media (min-width: 960px) {
  .cms-layout { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 24px; align-items: start; }
  .cms-layout.has-detail .cms-nav { display: block; }
  .cms-layout:not(.has-detail) .cms-detail { display: block; }
  .cms-nav { position: sticky; top: 16px; }
  .bar-btn.back { display: none; }
  .detail-bar { justify-content: flex-end; }
  .nav-chevron { display: none; }
}

@media (prefers-reduced-motion: reduce) { .nav-card { transition: none; } }
</style>
