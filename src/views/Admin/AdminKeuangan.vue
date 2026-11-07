<template>
  <ion-page>
    <AppHeader variant="admin" title="Keuangan" :show-back="false" />

    <ion-content class="finance-content" :fullscreen="false">
      <main class="finance-shell">
        <header>
          <p class="finance-kicker">Administrasi keuangan</p>
          <h1>Transaksi kavling</h1>
        </header>

        <section class="finance-empty" aria-labelledby="finance-empty-title">
          <div class="finance-icon" aria-hidden="true">
            <IonIcon :icon="walletOutline" />
          </div>
          <h2 id="finance-empty-title">Belum ada transaksi</h2>
          <p>Data pembayaran dan pencatatan keuangan akan tampil di sini saat sudah tersedia.</p>
        </section>
      </main>
    </ion-content>

    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { walletOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
</script>

<style scoped>
.finance-content {
  --background: var(--app-background);
}

.finance-shell {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 22px 16px calc(104px + env(safe-area-inset-bottom));
  color: var(--text-primary);
  font-family: var(--font-primary);
}

.finance-kicker {
  margin: 0 0 4px;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.finance-shell h1 {
  margin: 0;
  font-size: clamp(27px, 7vw, 36px);
  letter-spacing: -0.035em;
}

.finance-empty {
  margin-top: 24px;
  min-height: 280px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 24px;
  text-align: center;
}

.finance-icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: var(--status-success-bg);
  color: var(--poliland-green);
  font-size: 24px;
}

.finance-empty h2 {
  margin: 18px 0 8px;
  font-size: 20px;
}

.finance-empty p {
  max-width: 420px;
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.55;
}
</style>
