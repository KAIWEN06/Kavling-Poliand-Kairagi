<template>
  <ion-page class="pl-admin">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content class="more-content" :fullscreen="false">
      <div class="more">
        <main class="more__body">
          <h1 class="sr-only">Menu admin lainnya</h1>
          <section v-for="group in groups" :key="group.title" class="group">
            <div class="group__head">
              <SectionHeader :title="group.title" />
            </div>
            <HomeMenu :play="menuPlay" :items="group.items" :label="`Menu ${group.title.toLowerCase()}`" @select="open" />
          </section>
        </main>

        <!-- Penutup yang sama dengan Beranda Admin. -->
        <footer class="more__footer" aria-hidden="true">
          <SceneBackdrop class="more__scene" height="100%" :sway="false" />
        </footer>
      </div>
    </ion-content>

    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { IonContent, IonPage } from '@ionic/vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import HomeMenu from '@/components/home/HomeMenu.vue'
import type { MenuIllustrationName } from '@/components/home/MenuIllustration.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'

type MenuAction = { id: MenuIllustrationName; label: string; gold?: boolean; route: string; query?: Record<string, string> }

const groups: { title: string; items: MenuAction[] }[] = [
  {
    title: 'Penjualan',
    items: [
      { id: 'spk', label: 'SPK', gold: true, route: '/admin/spk' },
      { id: 'pembayaran', label: 'Pembayaran', route: '/admin/keuangan' },
      { id: 'survei', label: 'Survei', gold: true, route: '/admin/survei' },
      { id: 'klien', label: 'Tambah klien', route: '/admin/pembeli', query: { action: 'tambah' } },
    ],
  },
  {
    title: 'Kaveling dan situs',
    items: [
      { id: 'denah', label: 'Denah', route: '/admin/siteplan' },
      { id: 'konten', label: 'Konten', gold: true, route: '/admin/konten' },
      { id: 'ulasan', label: 'Ulasan', route: '/admin/ulasan' },
      { id: 'minat', label: 'Minat pembeli', gold: true, route: '/admin/minat-pembeli' },
    ],
  },
  {
    title: 'Pengelolaan',
    items: [
      { id: 'tim', label: 'Akses tim', route: '/admin/akses-tim' },
      { id: 'gabung', label: 'Data ganda', gold: true, route: '/admin/gabung-data' },
    ],
  },
]

const router = useRouter()
const menuPlay = ref(false)
let menuFrame = 0

function open(id: MenuIllustrationName) {
  const action = groups.flatMap((group) => group.items).find((item) => item.id === id)
  if (!action) return
  // nt membuat halaman tujuan yang masih tersimpan di tumpukan Ionic membuka ulang formulirnya.
  void router.push({
    path: action.route,
    query: action.query && { ...action.query, nt: String(Date.now()) },
  })
}

onMounted(() => {
  // Satu frame setelah tampil, agar menu punya keadaan awal untuk dianimasikan.
  menuFrame = requestAnimationFrame(() => {
    menuFrame = requestAnimationFrame(() => { menuPlay.value = true })
  })
})
onBeforeUnmount(() => cancelAnimationFrame(menuFrame))
</script>

<style scoped>
.more-content {
  --background: var(--surface-primary);
  --padding-bottom: 0px;
}

/* Footer selalu di dasar layar, juga saat isinya pendek. */
.more { display: flex; min-height: 100%; flex-direction: column; font-family: var(--font-ui); }
.more__body { width: min(100%, var(--container-max)); margin-inline: auto; padding-top: 4px; }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

.group__head { padding: 20px 20px 0; }
.group__head :deep(.sec-head) { margin-bottom: 0; }

.more__footer {
  position: relative;
  flex-shrink: 0;
  height: calc(210px + var(--safe-bottom));
  margin-top: auto;
  overflow: hidden;
  /* Putih memudar ke krem agar footer menyambung tanpa garis batas. */
  background: linear-gradient(180deg, var(--surface-primary) 0%, var(--pl-paper) 55%);
}
.more__scene :deep(.sun) {
  top: 0;
  right: -90px;
  width: 260px;
  height: 200px;
  background: radial-gradient(closest-side, rgba(244, 214, 154, 0.7), rgba(244, 214, 154, 0));
}
</style>
