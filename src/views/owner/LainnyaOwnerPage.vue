<template>
  <MarketingPageLayout title="Lainnya" tab-variant="owner" :refreshable="false">
    <Reveal v-for="(group, index) in GROUPS" :key="group.title" :order="index + 1">
      <section class="mk-section">
        <div class="mk-section-head"><div><h2>{{ group.title }}</h2></div></div>
        <nav class="mk-card ow-menu" :aria-label="group.title">
          <button v-for="item in group.items" :key="item.path" type="button" @click="router.push(item.path)">
            <span><strong>{{ item.label }}</strong><small>{{ item.hint }}</small></span>
            <span aria-hidden="true">›</span>
          </button>
        </nav>
      </section>
    </Reveal>

    <button type="button" class="mk-btn mk-btn--ghost ow-logout" :disabled="loggingOut" @click="logout">
      {{ loggingOut ? 'Keluar…' : 'Keluar' }}
    </button>
    <AppNotice v-if="logoutError" tone="error">
      {{ logoutError }}
    </AppNotice>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useIonRouter } from '@ionic/vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { useConfirm } from '@/composables/useConfirm'
import { authService } from '@/services/auth/authService'

const router = useIonRouter()
const { confirm } = useConfirm()
const loggingOut = ref(false)
const logoutError = ref('')

// Owner hanya memantau; hak aksesnya diatur di router/access.ts.
const GROUPS = [
  {
    title: 'Data',
    items: [
      { path: '/owner/data/pembeli', label: 'Data pembeli', hint: 'Siapa membeli kaveling yang mana' },
    ],
  },
  {
    title: 'Akun',
    items: [
      { path: '/admin/akses-tim', label: 'Akses tim', hint: 'Akun Pemilik dan Admin' },
      { path: '/akun', label: 'Profil saya', hint: 'Foto, nama, dan kontak' },
      { path: '/pengaturan', label: 'Pengaturan', hint: 'Preferensi aplikasi' },
    ],
  },
]

async function logout() {
  if (!(await confirm({ title: 'Keluar dari akun?', message: 'Anda perlu masuk lagi untuk membuka panel pemilik.', confirmText: 'Keluar' }))) return
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
.ow-menu { padding: 0; overflow: hidden; }
.ow-menu button { width: 100%; min-height: 60px; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; border: 0; border-top: 1px solid var(--border-default); background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; touch-action: manipulation; }
.ow-menu button:first-child { border-top: 0; }
.ow-menu button:active { background: var(--surface-muted); }
.ow-menu button:focus-visible { outline: 3px solid var(--poliland-gold); outline-offset: -3px; }
.ow-menu strong { display: block; font-size: var(--text-md); }
.ow-menu small { display: block; margin-top: 2px; color: var(--text-secondary); font-size: var(--text-xs); }
.ow-logout { width: 100%; }
</style>
