<template>
  <ion-page class="mk-more-page">
    <AppHeader variant="marketing" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="true">
      <main class="more-shell">
        <PageHeader title="Lainnya" />
        <Reveal :order="1">
          <section class="quick-grid" aria-label="Menu pemasaran">
            <button v-for="action in actions" :key="action.label" type="button" class="quick-card" :class="`quick-card--${action.tone}`" @click="router.push(action.route)">
              <span class="quick-icon"><ion-icon :icon="action.icon" aria-hidden="true" /></span>
              <strong>{{ action.label }}</strong>
            </button>
          </section>
        </Reveal>
      </main>
    </ion-content>

    <MobileTabBar variant="marketing" />
  </ion-page>
</template>

<script setup lang="ts">
import PageHeader from '@/components/ui/PageHeader.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { documentTextOutline, personOutline, walletOutline, cashOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'

type QuickAction = { label: string; icon: string; tone: 'green' | 'gold' | 'neutral'; route: string }
const router = useRouter()
const actions: QuickAction[] = [
  { label: 'Status SPK', icon: documentTextOutline, tone: 'gold', route: '/marketing/pengajuan' },
  { label: 'Pembayaran', icon: walletOutline, tone: 'green', route: '/marketing/pembayaran' },
  { label: 'Komisi', icon: cashOutline, tone: 'gold', route: '/marketing/komisi' },
  { label: 'Profil saya', icon: personOutline, tone: 'neutral', route: '/akun' },
]
</script>

<style scoped>
.mk-more-page { color: var(--text-primary); font-family: var(--font-primary); }
.more-shell { min-height: 100%; padding: 22px 16px calc(112px + env(safe-area-inset-bottom)); background: var(--app-background); }
.quick-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.quick-card { position: relative; display: flex; min-height: 142px; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 14px 13px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); color: var(--text-primary); font: inherit; text-align: left; cursor: pointer; }
@media (hover: hover) and (pointer: fine) {
  .quick-card:hover { border-color: var(--poliland-green); }

}.quick-card:active { transform: scale(0.97); }
.quick-card { touch-action: manipulation; transition: transform var(--dur-fast) var(--ease-out); }
.quick-card:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.quick-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-secondary); font-size: 20px; }
.quick-card strong { font-size: 13px; line-height: 1.3; }
.quick-card--green .quick-icon { background: var(--status-success-bg); color: var(--poliland-green); }
.quick-card--gold .quick-icon { background: var(--poliland-gold-soft); color: var(--poliland-gold-text); }
@media (max-width: 520px) { .quick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .quick-card { min-height: 128px; } }
@media (max-width: 340px) { .quick-grid { gap: 8px; } .quick-card { padding: 12px 10px; } .quick-card strong { font-size: 12px; } }
</style>
