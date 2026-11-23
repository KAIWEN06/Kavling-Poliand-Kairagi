<template>
  <section class="hero-section" :class="{ 'hero-section--plain': !hero.image_url }">
    <img v-if="hero.image_url" :src="hero.image_url" alt="PoliLand Kairagi" class="hero-image" />
    <div class="hero-overlay"></div>

    <div v-if="isAdmin" class="hero-admin">
      <AdminEditButton label="Edit hero" @click="editOpen = true" />
    </div>

    <div class="hero-content">
      <template v-if="loading">
        <Skeleton width="78%" height="34px" border-radius="8px" />
        <Skeleton width="92%" height="14px" border-radius="6px" class="hero-skel" />
        <Skeleton width="70%" height="14px" border-radius="6px" class="hero-skel" />
      </template>
      <template v-else-if="hero.title">
        <h1>{{ hero.title }}</h1>
        <p v-if="hero.subtitle" class="hero-subtitle">{{ hero.subtitle }}</p>
        <p v-if="hero.description">{{ hero.description }}</p>
      </template>
      <h1 v-else class="hero-empty">PoliLand Kairagi</h1>
      <p v-if="!loading && !hero.title && isAdmin" class="hero-hint">Hero belum diisi. Tekan “Edit hero” untuk menambahkan judul dan gambar.</p>

      <div class="hero-actions">
        <ion-button class="primary-button" @click="$emit('goToSiteplan')">
          Lihat Denah Kavling
          <ion-icon slot="end" :icon="arrowForwardOutline" />
        </ion-button>

        <!-- LOADING -->
        <div v-if="loading" class="contact-skeleton">
          <Skeleton width="105px" height="44px" border-radius="10px" />
        </div>

        <!-- DATA SELESAI -->
        <ion-button v-else-if="showCta" class="outline-button" fill="outline" :disabled="ctaDisabled" @click="handleCta">
          {{ hero.cta_text || 'Hubungi Kami' }}
        </ion-button>
      </div>
    </div>

    <CmsPanelModal v-model="editOpen" title="Edit hero" panel="home" section="hero" @saved="loadHeroData" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonButton, IonIcon } from '@ionic/vue'
import { arrowForwardOutline } from 'ionicons/icons'
import Skeleton from '@/components/ui/Skeleton.vue'
import { contactsService } from '@/services/contactService'
import { cmsService, type CmsHero } from '@/services/cmsService'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import { toWaNumber } from '@/utils/homeContent'

defineEmits(['goToSiteplan'])

const loading = ref(true)
const whatsappNumber = ref('')
const editOpen = ref(false)
const { isAdmin } = useCmsAdmin()
const hero = ref<CmsHero>({ title: '', subtitle: '', description: '', image_url: null, cta_text: 'Hubungi Kami', cta_url: 'whatsapp', is_active: true })

const router = useRouter()
const ctaTarget = computed(() => (hero.value.cta_url || '').trim())
const ctaIsWhatsapp = computed(() => !ctaTarget.value || ctaTarget.value === 'whatsapp')
const ctaDisabled = computed(() => ctaIsWhatsapp.value && !whatsappNumber.value)
/** Tombol WhatsApp disembunyikan dari pengunjung bila nomor belum diisi; Admin tetap melihatnya (nonaktif) sebagai pengingat. */
const showCta = computed(() => !ctaDisabled.value || isAdmin.value)

/** Tombol ajakan mengikuti pilihan Admin: WhatsApp, halaman dalam aplikasi, atau tautan luar. */
const handleCta = () => {
  const target = ctaTarget.value
  if (ctaIsWhatsapp.value) return contactWhatsapp()
  if (target.startsWith('/')) return void router.push(target)
  if (/^https?:\/\//i.test(target)) window.open(target, '_blank', 'noopener')
}

const cleanWhatsapp = () => toWaNumber(whatsappNumber.value)

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
    const [savedHero, contacts] = await Promise.all([cmsService.getHero(), contactsService.getAll()])
    hero.value = savedHero ?? { title: '', subtitle: '', description: '', image_url: null, cta_text: 'Hubungi Kami', cta_url: 'whatsapp', is_active: true }
    const whatsapp = contacts?.find((item: { key: string; value?: string }) => item.key === 'whatsapp')
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

.hero-section--plain { background: linear-gradient(160deg, #2b4824 0%, #1f3519 100%); }
.hero-admin { position: absolute; z-index: 3; top: 14px; right: 14px; }
.hero-skel { margin-top: 14px; }
.hero-empty { opacity: .9; }
.hero-content p.hero-hint { margin-top: 12px; color: #f4d69a; font-size: 12px; }

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

.hero-content p.hero-subtitle {
  margin: 10px 0 0;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
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
