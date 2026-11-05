<template>
  <section class="hero-section">
    <img src="@/assets/images/hero4.jpg" alt="PoliLand Kairagi" class="hero-image" />
    <div class="hero-overlay"></div>

    <div class="hero-content">
      <h1>Investasi Tanah<br />Masa Depan Anda</h1>
      <p>Miliki kavling strategis di kawasan berkembang dengan legalitas jelas, akses jalan yang baik, dan prospek investasi jangka panjang.</p>

      <div class="hero-actions">
        <ion-button class="primary-button" @click="$emit('goToSiteplan')">
          Lihat Siteplan
          <ion-icon slot="end" :icon="arrowForwardOutline" />
        </ion-button>

        <!-- LOADING -->
        <div v-if="loading" class="contact-skeleton">
          <Skeleton width="105px" height="44px" border-radius="10px" />
        </div>

        <!-- DATA SELESAI -->
        <ion-button v-else class="outline-button" fill="outline" :disabled="!whatsappNumber" @click="contactWhatsapp">
          Hubungi Kami
        </ion-button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IonButton, IonIcon } from '@ionic/vue'
import { arrowForwardOutline } from 'ionicons/icons'
import Skeleton from '@/components/ui/Skeleton.vue'
import { contactService } from '@/services/contactService'

defineEmits(['goToSiteplan'])

const loading = ref(true)
const whatsappNumber = ref('')

const cleanWhatsapp = () => whatsappNumber.value.replace(/\D/g, '')

const contactWhatsapp = () => {
  const number = cleanWhatsapp()
  if (!number) {
    console.warn('Nomor WhatsApp tidak tersedia')
    return
  }
  window.open(`https://wa.me/${number}`, '_system')
}

const loadHeroData = async () => {
  try {
    loading.value = true
    const contacts = await contactService.getContacts()
    const whatsapp = contacts?.find(item => item.key === 'whatsapp')
    whatsappNumber.value = whatsapp?.value || ''
  } catch (error) {
    console.error('Gagal mengambil data Hero:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadHeroData()
})
</script>

<style scoped>
.hero-section {
  position: relative;
  min-height: 430px;
  overflow: visible;
}

/* BACKGROUND */
.hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(45,45,45,.78) 0%, rgba(45,45,45,.60) 48%, rgba(45,45,45,.90) 100%);
}

/* HERO CONTENT */
.hero-content {
  position: relative;
  z-index: 2;
  padding: 100px 22px 70px;
  color: #fff;
}

.hero-label {
  display: block;
  margin-bottom: 16px;
  color: #8CA072;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2px;
}

.hero-content h1 {
  margin: 0;
  color: #fff;
  font-size: 32px;
  line-height: 1.08;
  font-weight: 850;
  letter-spacing: -.8px;
}

.hero-content p {
  margin: 18px 0 0;
  max-width: 350px;
  color: #FAF7D7;
  font-size: 13px;
  line-height: 1.65;
}

/* BUTTONS */
.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 26px;
  align-items: center;
}

.hero-actions ion-button {
  margin: 0;
  min-height: 44px;
  --border-radius: 10px;
  font-size: 11px;
  font-weight: 800;
}

.primary-button {
  --background: #556B2F;
  --background-hover: #4A7C59;
  --color: #fff;
  --border-radius: 10px;
  font-weight: 800;
}

.outline-button {
  --border-color: rgba(249,245,236,.75);
  --color: #fff;
  --border-radius: 10px;
  font-weight: 800;
}

/* SKELETON */
.contact-skeleton {
  width: 105px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* SMALL SCREEN */
@media (max-width: 360px) {
  .hero-content {
    padding-left: 20px;
    padding-right: 20px;
  }

  .hero-content h1 {
    font-size: 30px;
  }

  .hero-content p {
    font-size: 12px;
  }

  .hero-actions ion-button {
    font-size: 10px;
  }

  .contact-skeleton {
    width: 100px;
  }
}
</style>