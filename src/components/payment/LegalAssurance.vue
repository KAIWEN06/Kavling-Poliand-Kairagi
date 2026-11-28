<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { documentTextOutline, homeOutline, shieldCheckmarkOutline } from 'ionicons/icons'

// Berlaku sama untuk semua kavling. Bila ada kavling yang statusnya berbeda,
// pindahkan data ini ke tabel lots.
const FACTS = [
  { icon: shieldCheckmarkOutline, text: 'SHM telah Pecah Per Unit Kavling' },
  { icon: homeOutline, text: 'Peruntukan Lokasi Untuk Pemukiman' },
  { icon: documentTextOutline, text: 'Gratis SHM atas nama pembeli' },
]
</script>

<template>
  <section class="legal" aria-label="Legalitas kavling">
    <h3>Legalitas</h3>
    <ul>
      <li v-for="fact in FACTS" :key="fact.text">
        <span class="legal__icon" aria-hidden="true"><ion-icon :icon="fact.icon" /></span>
        <span>{{ fact.text }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.legal {
  padding: 12px 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  text-align: left;
}

.legal h3 {
  margin: 0 0 8px;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
}

.legal ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.legal li {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  font-size: 13px;
  line-height: 1.45;
}

.legal__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--status-success-bg, #eef5ec);
  color: var(--poliland-green, #355a2c);
  font-size: 16px;
}
</style>
