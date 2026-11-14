<template>
  <ion-page class="admin-more-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="true">
      <main class="more-shell">


        <section class="quick-grid" aria-label="Aksi cepat admin">
          <button v-for="action in actions" :key="action.label" type="button" class="quick-card" :class="`quick-card--${action.tone}`" :disabled="!action.route" @click="handleAction(action)">
            <span class="quick-icon"><ion-icon :icon="action.icon" aria-hidden="true" /></span>
            <strong>{{ action.label }}</strong>
            <small v-if="!action.route">Segera hadir</small>
          </button>
        </section>

        <p v-if="message" class="more-message" role="status">{{ message }}</p>
      </main>
    </ion-content>

    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { documentTextOutline, gridOutline, mapOutline, peopleOutline, settingsOutline, walletOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'

type QuickAction = { label: string; icon: string; tone: 'green' | 'gold' | 'neutral'; route?: string }
const router = useRouter()
const message = ref('')
const actions: QuickAction[] = [
  { label: 'Siteplan 2D', icon: mapOutline, tone: 'green', route: '/admin/kavling' },
  { label: 'Tambah client', icon: peopleOutline, tone: 'neutral', route: '/admin/pembeli' },
  { label: 'Pembayaran', icon: walletOutline, tone: 'gold', route: '/admin/keuangan' },
  { label: 'Kelola konten', icon: gridOutline, tone: 'neutral' },
  { label: 'Akses tim', icon: settingsOutline, tone: 'green', route: '/admin/akses-tim' },
  { label: 'SPK', icon: documentTextOutline, tone: 'gold', route: '/admin/spk' },
]

async function handleAction(action: QuickAction) {
  if (action.route) {
    await router.push(action.route)

    if (action.label === 'Tambah client') {
      const deadline = Date.now() + 10000
      while (Date.now() < deadline) {
        const addButton = document.querySelector<HTMLButtonElement>('button[aria-label="Tambah calon pembeli"]')
        if (
          router.currentRoute.value.path === action.route &&
          addButton?.getClientRects().length &&
          getComputedStyle(addButton).visibility !== 'hidden'
        ) {
          addButton.click()
          break
        }
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      }
    }
    return
  }
  message.value = `${action.label} akan tersedia pada tahap berikutnya.`
  window.setTimeout(() => { message.value = '' }, 2800)
}
</script>

<style scoped>
.admin-more-page { color: var(--text-primary); font-family: var(--font-primary); }
.more-shell { min-height: 100%; padding: 22px 16px calc(112px + env(safe-area-inset-bottom)); background: var(--app-background); }
.more-header { margin-bottom: 18px; }.more-kicker { margin: 0 0 4px; color: var(--poliland-green); font-size: 11px; font-weight: var(--font-weight-bold); letter-spacing: .08em; text-transform: uppercase; }.more-header h1 { margin: 0; font-size: clamp(23px, 7vw, 32px); letter-spacing: -.03em; }.more-header p:last-child { margin: 7px 0 0; color: var(--text-secondary); font-size: 13px; line-height: 1.5; }
.quick-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }.quick-card { position: relative; display: flex; min-height: 142px; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 14px 13px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); color: var(--text-primary); font: inherit; text-align: left; cursor: pointer; }.quick-card:hover:not(:disabled) { border-color: var(--poliland-green); }.quick-card:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }.quick-card:disabled { cursor: default; opacity: .72; }.quick-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-secondary); font-size: 20px; }.quick-card strong { font-size: 13px; line-height: 1.3; }.quick-card small { color: var(--text-secondary); font-size: 10px; }.quick-card--green .quick-icon { background: var(--status-success-bg); color: var(--poliland-green); }.quick-card--gold .quick-icon { background: var(--poliland-gold-soft); color: var(--poliland-gold-text); }.more-message { margin: 16px 0 0; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-secondary); font-size: 12px; text-align: center; }
@media (max-width: 520px) { .quick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.quick-card { min-height: 128px; } }
@media (max-width: 340px) { .quick-grid { gap: 8px; }.quick-card { padding: 12px 10px; }.quick-card strong { font-size: 12px; } }
</style>
