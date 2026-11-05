<template>
  <section class="cta-section">
    <div class="cta-card">
      <div class="cta-content">

        <h2>
          Siap Memiliki<br />
          Kavling Impian?
        </h2>

        <p>
          Hubungi tim kami sekarang dan dapatkan informasi lengkap.
        </p>

        <ion-button
          class="whatsapp-button"
          @click="handleWhatsapp"
        >
          <ion-icon
            slot="start"
            :icon="logoWhatsapp"
          />

          Hubungi via WhatsApp
        </ion-button>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonIcon
} from '@ionic/vue'

import {
  logoWhatsapp
} from 'ionicons/icons'

const emit = defineEmits<{
  contactWhatsapp: []
}>()

const handleWhatsapp = () => {
  emit('contactWhatsapp')
}
</script>

<style scoped>

/* =========================================================
   CTA SECTION
========================================================= */

.cta-section {
  display: block;

  width: 100%;

  margin: 0;
  padding: 18px 10px 0;

  box-sizing: border-box;

  background: #FAFAF7;
}

/* =========================================================
   CTA CARD
========================================================= */

.cta-card {
  display: block;

  width: 100%;

  margin: 0;

  box-sizing: border-box;

  border-radius: 18px;

  overflow: hidden;

  background:
    linear-gradient(
      135deg,
      #556B2F,
      #3F5222
    );

  box-shadow:
    0 10px 25px
    rgba(85, 107, 47, 0.2);

  border:
    1px solid
    rgba(140, 160, 114, 0.2);
}

/* =========================================================
   CONTENT
========================================================= */

.cta-content {
  width: 100%;

  box-sizing: border-box;

  padding: 28px 20px;

  text-align: center;

  color: #FFFFFF;
}

/* =========================================================
   TITLE
========================================================= */

.cta-content h2 {
  margin: 0;

  color: #FFFFFF;

  font-size: 23px;

  line-height: 1.15;

  font-weight: 850;

  letter-spacing: -0.3px;
}

/* =========================================================
   DESCRIPTION
========================================================= */

.cta-content p {
  max-width: 280px;

  margin: 12px auto 18px;

  color: #FAFAF7;

  opacity: 0.9;

  font-size: 10px;

  line-height: 1.5;
}

/* =========================================================
   WHATSAPP
========================================================= */

.whatsapp-button {
  --background: #2E7D32;
  --background-hover: #236327;

  --color: #FFFFFF;

  --border-radius: 999px;

  min-height: 42px;

  margin: 0;

  padding: 0 4px;

  font-size: 10px;

  font-weight: 800;

  text-transform: uppercase;

  box-shadow:
    0 4px 12px
    rgba(46, 125, 50, 0.3);
}

</style>