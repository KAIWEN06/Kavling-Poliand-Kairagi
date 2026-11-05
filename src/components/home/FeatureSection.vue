<template>
  <section class="section">
    <div class="section-heading">
      <div>
        <h2>Kenapa Memilih PoliLand?</h2>
        <span class="heading-line"></span>
      </div>
      <button class="see-all">
        Lihat Semua
        <ion-icon :icon="chevronForwardOutline" />
      </button>
    </div>

    <div class="horizontal-scroll">
      <article v-for="feature in features" :key="feature.title" class="feature-card">
        <div class="feature-icon" :class="feature.color">
          <ion-icon :icon="feature.icon" />
        </div>
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.description }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { chevronForwardOutline } from 'ionicons/icons'
import { features } from '@/data/homeData'
</script>

<style scoped>
.section { padding: 30px 16px 0; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 17px; }
.section-heading h2 { margin: 0; color: #2D2D2D; font-size: 20px; line-height: 1.2; font-weight: 800; letter-spacing: -0.3px; }
.heading-line { display: block; width: 34px; height: 3px; margin-top: 7px; background: #556B2F; border-radius: 999px; }
.see-all { display: flex; align-items: center; gap: 3px; padding: 0; border: 0; background: transparent; color: #556B2F; font-size: 10px; font-weight: 700; white-space: nowrap; }
.see-all ion-icon { font-size: 14px; }
.horizontal-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; margin-right: -16px; padding-right: 16px; scrollbar-width: none; }
.horizontal-scroll::-webkit-scrollbar { display: none; }
.feature-card { flex: 0 0 190px; min-height: 165px; padding: 16px; background: #FFFFFF; border: 1px solid #EDE0D6; border-radius: 13px; box-shadow: 0 4px 14px rgba(45, 45, 45, 0.035); }
.feature-icon { width: 38px; height: 38px; margin-bottom: 12px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 19px; }

/* Warna kelas ikon disesuaikan dengan palet Poliland Kairagi (Olive, Forest, Gold/Warning) */
.feature-icon.green { color: #556B2F; background: #E6ECDF; }
.feature-icon.blue { color: #4A7C59; background: #E8EFE9; }
.feature-icon.yellow { color: #B38F27; background: #FDF8EC; }

.feature-card h3 { margin: 0 0 7px; color: #2D2D2D; font-size: 13px; font-weight: 800; }
.feature-card p { margin: 0; color: #686868; font-size: 10px; line-height: 1.55; }
</style>