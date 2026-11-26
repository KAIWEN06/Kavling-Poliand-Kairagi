<template>
  <MarketingPageLayout title="Lainnya" :subtitle="profile?.full_name" tab-variant="head" :refreshable="false">
    <Reveal :order="2">
      <nav class="mk-card mk-menu" aria-label="Menu Kepala Bagian Pemasaran">
        <button v-for="item in items" :key="item.path" type="button" @click="router.push(item.path)">
          <span><strong>{{ item.label }}</strong><small>{{ item.hint }}</small></span>
          <span aria-hidden="true">›</span>
        </button>
      </nav>
    </Reveal>

    <Reveal :order="3">
      <section class="mk-card mk-scope">
        <strong>Ditangani Admin</strong>
        <p>Konfirmasi SPK, verifikasi pembayaran, perubahan nominal atau jadwal, dan pengembalian dana.</p>
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
import { onMounted, ref } from 'vue'
import { useIonRouter } from '@ionic/vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import { authService } from '@/services/auth/authService'
import { getStaffProfile, type StaffProfile } from '@/services/marketing/marketingCrmService'

const router = useIonRouter()
const profile = ref<StaffProfile | null>(null)
const loggingOut = ref(false)
const logoutError = ref('')

const items = [
  { path: '/kepala-marketing/spk', label: 'Status SPK', hint: 'Pengajuan klien tim' },
  { path: '/kepala-marketing/pembayaran', label: 'Pembayaran', hint: 'Jatuh tempo dan keterlambatan' },
  { path: '/kepala-marketing/komisi', label: 'Komisi', hint: 'Per anggota tim' },
  { path: '/kepala-marketing/laporan?tab=regions', label: 'Asal konsumen', hint: 'Per wilayah' },
  { path: '/kepala-marketing/laporan?tab=performance', label: 'Performa', hint: 'Peringkat anggota tim' },
  { path: '/kepala-marketing/clients/new', label: 'Tambah klien', hint: 'Pilih penanggung jawab' },
  { path: '/kepala-marketing/siteplan', label: 'Denah', hint: 'Status kaveling' },
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

onMounted(async () => {
  try { profile.value = await getStaffProfile() } catch { /* nama opsional */ }
})
</script>

<style scoped>
.mk-menu { padding: 0; overflow: hidden; }
.mk-menu button { width: 100%; min-height: 60px; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; border: 0; border-top: 1px solid var(--border-default); background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.mk-menu button:first-child { border-top: 0; }
.mk-menu button:active { background: var(--surface-muted); }
.mk-menu button:focus-visible { outline: 3px solid var(--poliland-gold); outline-offset: -3px; }
.mk-menu strong { display: block; font-size: 14px; }
.mk-menu small { display: block; margin-top: 2px; color: var(--text-secondary); font-size: 12px; }
.mk-scope p { margin: 6px 0 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary); }
.mk-logout { width: 100%; }
</style>
