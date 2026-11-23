<template>
  <MarketingPageLayout title="Lainnya" tab-variant="head" :refreshable="false">
    <Reveal :order="1">
      <section class="mk-intro">
        <p>Kepala Bagian · Departemen Marketing</p>
        <h1>{{ profile?.full_name || 'Kepala Bagian' }}</h1>
      </section>
    </Reveal>

    <Reveal :order="2">
      <nav class="mk-card mk-menu" aria-label="Menu Kepala Bagian Marketing">
        <button v-for="item in items" :key="item.path" type="button" @click="router.push(item.path)">
          <span><strong>{{ item.label }}</strong><small>{{ item.hint }}</small></span>
          <span aria-hidden="true">›</span>
        </button>
      </nav>
    </Reveal>

    <Reveal :order="3">
      <section class="mk-card mk-scope">
        <strong>Batas kewenangan</strong>
        <p>Kepala Bagian Marketing dapat memantau seluruh tim, mengelola perkembangan klien, dan memberi arahan. Konfirmasi SPK, verifikasi pembayaran, perubahan nominal atau jadwal resmi, dan refund tetap menjadi kewenangan Admin.</p>
      </section>
    </Reveal>

    <button type="button" class="mk-btn mk-btn--ghost mk-logout" :disabled="loggingOut" @click="logout">
      {{ loggingOut ? 'Keluar…' : 'Keluar dari akun' }}
    </button>
    <p v-if="logoutError" class="mk-danger-text" role="alert">{{ logoutError }}</p>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
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
  { path: '/kepala-marketing/spk', label: 'Pengajuan klien (SPK)', hint: 'Status SPK seluruh tim Marketing' },
  { path: '/kepala-marketing/pembayaran', label: 'Pembayaran & cicilan', hint: 'Verifikasi, jatuh tempo, keterlambatan' },
  { path: '/kepala-marketing/komisi', label: 'Komisi tim', hint: 'Komisi menunggu, disetujui, dibayarkan' },
  { path: '/kepala-marketing/laporan?tab=regions', label: 'Analisis asal konsumen', hint: 'Klien & pembeli per wilayah' },
  { path: '/kepala-marketing/laporan?tab=performance', label: 'Performa Marketing', hint: 'Ranking dan metrik per anggota' },
  { path: '/kepala-marketing/clients/new', label: 'Tambah klien', hint: 'Tugaskan ke anggota tim Marketing' },
  { path: '/kepala-marketing/siteplan', label: 'Siteplan kaveling', hint: 'Lihat status kaveling (baca saja)' },
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
.mk-menu button:focus-visible { outline: 3px solid var(--poliland-gold); outline-offset: -3px; }
.mk-menu strong { display: block; font-size: 14px; }
.mk-menu small { display: block; margin-top: 2px; color: var(--text-secondary); font-size: 12px; }
.mk-scope p { margin: 6px 0 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary); }
.mk-logout { width: 100%; }
</style>
