<template>
  <MarketingPageLayout title="Lainnya" tab-variant="head" :refreshable="false">
    <Reveal v-for="(group, index) in groups" :key="group.title" :order="index + 1">
      <section class="mk-section" :aria-label="group.title">
        <div class="mk-section-head"><div><h2>{{ group.title }}</h2></div></div>
        <nav class="mk-card mk-menu">
          <button v-for="item in group.items" :key="item.path" type="button" @click="router.push(item.path)">
            <span class="mk-menu__icon" aria-hidden="true"><ion-icon :icon="item.icon" /></span>
            <span class="mk-menu__text"><strong>{{ item.label }}</strong><small>{{ item.hint }}</small></span>
            <ion-icon class="mk-menu__chevron" :icon="chevronForwardOutline" aria-hidden="true" />
          </button>
        </nav>
      </section>
    </Reveal>

    <Reveal :order="groups.length + 1">
      <section class="mk-card mk-scope">
        <strong>Akun ini untuk memantau</strong>
        <p>Data klien dicatat pemasar atau Admin, dan Anda bisa memberi arahan dari detail klien. SPK, pembayaran, jadwal, dan pengembalian dana ditangani Admin.</p>
      </section>
    </Reveal>

    <button type="button" class="mk-btn mk-btn--ghost mk-logout" :disabled="loggingOut" @click="logout">
      {{ loggingOut ? 'Keluar…' : 'Keluar' }}
    </button>
    <AppNotice v-if="logoutError" tone="error">
      {{ logoutError }}
    </AppNotice>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { ref } from 'vue'
import { IonIcon, useIonRouter } from '@ionic/vue'
import {
  cardOutline,
  cashOutline,
  chevronForwardOutline,
  documentTextOutline,
  locationOutline,
  mapOutline,
  trophyOutline,
} from 'ionicons/icons'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import { authService } from '@/services/auth/authService'

const router = useIonRouter()
const loggingOut = ref(false)
const logoutError = ref('')

const groups = [
  {
    title: 'Transaksi',
    items: [
      { path: '/kepala-marketing/spk', label: 'Status SPK', hint: 'Menunggu, disetujui, atau ditolak', icon: documentTextOutline },
      { path: '/kepala-marketing/pembayaran', label: 'Pembayaran', hint: 'Jatuh tempo dan keterlambatan', icon: cardOutline },
      { path: '/kepala-marketing/komisi', label: 'Komisi', hint: 'Per anggota tim', icon: cashOutline },
    ],
  },
  {
    title: 'Pantauan',
    items: [
      { path: '/kepala-marketing/laporan?tab=regions', label: 'Asal konsumen', hint: 'Per wilayah dan jalur masuk', icon: locationOutline },
      { path: '/kepala-marketing/laporan?tab=performance', label: 'Performa', hint: 'Peringkat anggota tim', icon: trophyOutline },
      { path: '/kepala-marketing/siteplan', label: 'Denah', hint: 'Status kaveling', icon: mapOutline },
    ],
  },
]

async function logout() {
  loggingOut.value = true
  logoutError.value = ''
  try {
    await authService.logout()
    router.replace('/login')
  } catch (cause) {
    logoutError.value = cause instanceof Error ? cause.message : 'Gagal keluar. Coba lagi.'
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped>
.mk-menu { padding: 0; overflow: hidden; }
.mk-menu button { width: 100%; min-height: 68px; display: grid; grid-template-columns: 44px minmax(0, 1fr) 18px; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 0; border-top: 1px solid var(--border-default); background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
.mk-menu button:first-child { border-top: 0; }
.mk-menu button:active { background: var(--surface-muted); }
.mk-menu button:focus-visible { outline: 3px solid var(--poliland-gold); outline-offset: -3px; }
@media (hover: hover) and (pointer: fine) {
  .mk-menu button:hover { background: var(--surface-muted); }
}
.mk-menu__icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: var(--radius-sm); background: var(--surface-muted); color: var(--poliland-green); font-size: 22px; }
.mk-menu__text { min-width: 0; }
.mk-menu__text strong { display: block; font-size: var(--text-md); }
.mk-menu__text small { display: block; margin-top: 2px; color: var(--text-secondary); font-size: var(--text-xs); }
.mk-menu__chevron { color: var(--text-secondary); font-size: 18px; }
.mk-scope p { margin: 6px 0 0; font-size: var(--text-sm); line-height: 1.5; color: var(--text-secondary); }
.mk-logout { width: 100%; }
</style>
