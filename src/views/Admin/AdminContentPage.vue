<template>
  <ion-page class="cms-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />
    <ion-content :fullscreen="true">
      <main class="cms-shell">
        <Reveal :order="1">
          <header class="cms-intro">
            <h1>Kelola konten website</h1>
            <p>Ubah isi halaman yang dilihat calon pembeli sebelum login. Perubahan langsung tampil setelah disimpan.</p>
          </header>
        </Reveal>

        <nav class="cms-tabs" aria-label="Bagian konten">
          <div class="tab-group" role="tablist" aria-label="Halaman publik">
            <button v-for="tab in publicTabs" :id="`tab-${tab.key}`" :key="tab.key" type="button" role="tab" class="cms-tab" :class="{ active: current === tab.key }" :aria-selected="current === tab.key" aria-controls="cms-view" @click="selectTab(tab.key)">{{ tab.label }}</button>
          </div>
          <span class="tab-divider" aria-hidden="true"></span>
          <div class="tab-group" role="tablist" aria-label="Operasional">
            <button v-for="tab in opsTabs" :id="`tab-${tab.key}`" :key="tab.key" type="button" role="tab" class="cms-tab" :class="{ active: current === tab.key }" :aria-selected="current === tab.key" aria-controls="cms-view" @click="selectTab(tab.key)">{{ tab.label }}</button>
          </div>
        </nav>

        <Reveal :order="2">
          <div class="cms-context">
            <span>{{ currentTab.where }}</span>
            <button v-if="currentTab.path" class="link-btn" type="button" @click="viewPublic">Lihat di website</button>
          </div>
        </Reveal>

        <p v-if="notice" class="notice" :class="noticeType" :role="noticeType === 'error' ? 'alert' : 'status'">{{ notice }}</p>

        <div id="cms-view" role="tabpanel" :aria-labelledby="`tab-${current}`">
          <CmsHomePanel v-if="current === 'home'" @notify="showNotice" />
          <CmsLocationPanel v-else-if="current === 'location'" @notify="showNotice" />
          <CmsContactPanel v-else-if="current === 'contact'" @notify="showNotice" />

          <section v-else-if="current === 'hours'" class="panel hours-panel">
            <div class="panel-heading">
              <div>
                <h2>Jam Operasional</h2>
                <p>Atur hari dan rentang waktu yang dapat dipilih klien untuk meminta survei lokasi. Zona waktu WITA (Asia/Makassar).</p>
              </div>
              <button class="primary" type="button" :disabled="hoursSaving || hoursLoading" @click="saveHours">{{ hoursSaving ? 'Menyimpan…' : 'Simpan jam operasional' }}</button>
            </div>
            <p v-if="hoursLoading" class="hours-loading" role="status">Memuat jam operasional…</p>
            <template v-else>
              <div class="hours-list">
                <article v-for="day in DAY_OPTIONS" :key="day.key" class="hours-row">
                  <div class="hours-day"><strong>{{ day.label }}</strong><span>{{ operatingHours.days[day.key].closed ? 'Libur' : 'Buka' }}</span></div>
                  <label class="closed-toggle"><input v-model="operatingHours.days[day.key].closed" type="checkbox"> Tutup</label>
                  <div class="hours-time-fields">
                    <label>Mulai<input v-model="operatingHours.days[day.key].open" type="time" :disabled="operatingHours.days[day.key].closed"></label>
                    <span class="time-separator">sampai</span>
                    <label>Selesai<input v-model="operatingHours.days[day.key].close" type="time" :disabled="operatingHours.days[day.key].closed"></label>
                  </div>
                </article>
              </div>
              <p class="hours-help">Klien hanya melihat slot pada hari yang dibuka. Slot dibuat setiap 1 jam dan tetap perlu dikonfirmasi Admin.</p>
            </template>
          </section>

          <CmsCrudPanel v-else :key="current" :type="current" @notify="showNotice" />
        </div>
      </main>
    </ion-content>
    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import Reveal from '@/components/ui/Reveal.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import CmsCrudPanel from '@/components/Admin/CmsCrudPanel.vue'
import CmsHomePanel from '@/components/Admin/CmsHomePanel.vue'
import CmsContactPanel from '@/components/Admin/CmsContactPanel.vue'
import CmsLocationPanel from '@/components/Admin/CmsLocationPanel.vue'
import { contactsService, DAY_OPTIONS, createDefaultOperatingHours, type OperatingHoursConfig } from '@/services/contactService'

type CmsTab = 'home' | 'location' | 'gallery' | 'progress' | 'faq' | 'contact' | 'hours'
type TabDef = { key: CmsTab; label: string; where: string; path: string | null }

const route = useRoute()
const router = useRouter()

/** `where` menjelaskan halaman publik yang terpengaruh; `path` dipakai tombol "Lihat di website". */
const TAB_DEFS: TabDef[] = [
  { key: 'home', label: 'Beranda', where: 'Tampil di Beranda: hero, keunggulan, dan ajakan di bagian bawah.', path: '/home' },
  { key: 'location', label: 'Lokasi', where: 'Tampil di bagian Lokasi & Denah Kavling pada Beranda: peta dan tempat terdekat.', path: '/home' },
  { key: 'gallery', label: 'Galeri', where: 'Tampil di halaman Galeri dan pratinjau galeri di Beranda.', path: '/gallery' },
  { key: 'progress', label: 'Kemajuan', where: 'Tampil di halaman Kemajuan dan bagian Kemajuan di Beranda.', path: '/progress' },
  { key: 'faq', label: 'FAQ', where: 'Tampil di bagian FAQ pada Beranda.', path: '/home' },
  { key: 'contact', label: 'Kontak', where: 'Tampil di bagian Hubungi Kami, halaman Kontak, dan semua tombol WhatsApp.', path: '/contact' },
  { key: 'hours', label: 'Jam Operasional', where: 'Menentukan slot survei lokasi yang bisa dipilih klien setelah login.', path: null },
]
const publicTabs = TAB_DEFS.filter((tab) => ['home', 'location', 'gallery', 'progress', 'faq', 'contact'].includes(tab.key))
const opsTabs = TAB_DEFS.filter((tab) => ['hours'].includes(tab.key))

const current = ref<CmsTab>('home')
const currentTab = computed(() => TAB_DEFS.find((tab) => tab.key === current.value) ?? TAB_DEFS[0])

const notice = ref('')
const noticeType = ref<'success' | 'error'>('success')
let noticeTimer: number | undefined
function showNotice(message: string, type: 'success' | 'error' | string = 'success') {
  notice.value = message
  noticeType.value = type === 'error' ? 'error' : 'success'
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => { notice.value = '' }, type === 'error' ? 6000 : 3500)
}
onBeforeUnmount(() => window.clearTimeout(noticeTimer))

function selectTab(key: CmsTab) {
  current.value = key
  notice.value = ''
  const query: Record<string, string> = { tab: key }
  void router.replace({ query })
}

function viewPublic() {
  if (currentTab.value.path) void router.push(currentTab.value.path)
}

/** Buka tab sesuai ?tab=<tab>. */
function applyRouteQuery() {
  const { tab } = route.query
  current.value = TAB_DEFS.some((def) => def.key === tab) ? (tab as CmsTab) : 'home'
}
watch(() => route.query.tab, applyRouteQuery)
onIonViewWillEnter(applyRouteQuery)

watch(current, (tab) => {
  if (tab === 'hours') void loadHours()
})

/* ---------- Jam operasional ---------- */
const operatingHours = ref<OperatingHoursConfig>(createDefaultOperatingHours())
const hoursLoading = ref(false)
const hoursSaving = ref(false)

async function loadHours() {
  hoursLoading.value = true
  try {
    operatingHours.value = await contactsService.getOperatingHours()
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Jam operasional gagal dimuat.', 'error')
  } finally {
    hoursLoading.value = false
  }
}

async function saveHours() {
  for (const day of DAY_OPTIONS) {
    const item = operatingHours.value.days[day.key]
    if (!item.closed && (!item.open || !item.close || item.open >= item.close)) {
      return showNotice(`Jam operasional ${day.label} tidak valid. Jam mulai harus lebih awal dari jam selesai.`, 'error')
    }
  }
  hoursSaving.value = true
  try {
    await contactsService.saveOperatingHours(operatingHours.value)
    showNotice('Jam operasional berhasil disimpan.')
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Jam operasional gagal disimpan.', 'error')
  } finally {
    hoursSaving.value = false
  }
}

onMounted(() => {
  applyRouteQuery()
  if (current.value === 'hours') void loadHours()
})
</script>

<style scoped>
.cms-page { color: var(--text-primary); }
.cms-shell { min-height: 100%; max-width: 1100px; margin: auto; padding: 20px 16px calc(112px + env(safe-area-inset-bottom)); background: var(--app-background); }
.cms-intro { margin-bottom: 16px; }
.cms-intro h1 { margin: 0; font-size: clamp(22px, 5.5vw, 30px); font-weight: 800; letter-spacing: -.01em; }
.cms-intro p { margin: 6px 0 0; max-width: 62ch; color: var(--text-secondary); font-size: 13px; line-height: 1.55; }

.cms-tabs { display: flex; align-items: center; gap: 10px; overflow-x: auto; margin: 0 -16px; padding: 4px 16px 8px; scrollbar-width: thin; }
.tab-group { display: flex; gap: 6px; }
.tab-divider { flex: none; inline-size: 1px; block-size: 24px; background: var(--border-default); }
.cms-tab { flex: none; min-height: 44px; padding: 0 14px; border: 1px solid var(--border-default); border-radius: 99px; background: var(--surface-primary); color: var(--text-secondary); font: inherit; font-size: 13px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.cms-tab.active { border-color: var(--poliland-green); background: var(--poliland-green); color: #fff; }
.cms-tab:focus-visible, .link-btn:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }

.cms-context { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 4px 0 14px; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.link-btn { flex: none; min-height: 44px; padding: 0 4px; border: 0; background: transparent; color: var(--poliland-green); font: inherit; font-size: 12px; font-weight: 800; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }

.notice { position: sticky; top: 8px; z-index: 5; margin: 0 0 14px; padding: 12px 14px; border-radius: var(--radius-control); font-size: 13px; line-height: 1.5; box-shadow: 0 2px 10px rgba(37, 37, 37, .08); }
.notice.success { background: var(--status-success-bg); color: var(--poliland-green); }
.notice.error { background: #fff0ef; color: var(--status-danger); }

.panel { padding: 18px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.panel h2 { margin: 0; font-size: 20px; }
.panel p { margin: 5px 0 18px; color: var(--text-secondary); font-size: 13px; }
.primary, .secondary, .danger { min-height: 44px; padding: 0 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); font: inherit; font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.primary { background: var(--poliland-green); border-color: var(--poliland-green); color: #fff; }
.secondary { background: var(--surface-muted); color: var(--text-primary); }
.danger { background: transparent; color: var(--status-danger); border-color: color-mix(in srgb, var(--status-danger) 35%, var(--border-default)); }
.primary:disabled, .danger:disabled { cursor: not-allowed; opacity: .55; }
input, textarea { inline-size: 100%; box-sizing: border-box; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 13px; }
input:focus-visible, textarea:focus-visible { outline: 3px solid color-mix(in srgb, var(--poliland-green) 25%, transparent); border-color: var(--poliland-green); }




.hours-loading { padding: 30px 12px; text-align: center; color: var(--text-secondary); font-size: 13px; }
.hours-list { display: grid; gap: 10px; }
.hours-row { display: grid; grid-template-columns: 120px 90px minmax(0, 1fr); align-items: center; gap: 14px; padding: 13px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-secondary, var(--surface-muted)); }
.hours-day { display: grid; gap: 3px; }
.hours-day strong { font-size: 13px; }
.hours-day span { font-size: 11px; color: var(--text-secondary); }
.closed-toggle { display: flex; align-items: center; gap: 6px; min-height: 44px; font-size: 12px; color: var(--text-secondary); }
.closed-toggle input { inline-size: 18px; block-size: 18px; padding: 0; accent-color: var(--poliland-green); }
.hours-time-fields { display: flex; align-items: end; gap: 10px; }
.hours-time-fields label { display: grid; gap: 5px; flex: 1; font-size: 11px; font-weight: 700; color: var(--text-secondary); }
.hours-time-fields input { min-width: 0; }
.hours-time-fields input:disabled { opacity: .45; }
.time-separator { padding-bottom: 12px; font-size: 11px; color: var(--text-secondary); }
.hours-help { margin: 14px 0 0 !important; font-size: 11px !important; line-height: 1.6; }

@media (max-width: 680px) {
  .cms-context { align-items: flex-start; flex-direction: column; gap: 0; }
  .panel { padding: 14px; }
  .panel-heading { align-items: stretch; flex-direction: column; }
  .hours-row { grid-template-columns: 1fr auto; gap: 10px; }
  .hours-time-fields { grid-column: 1 / -1; }
  .hours-day { grid-column: 1; }
  .closed-toggle { grid-column: 2; grid-row: 1; }
}
</style>
