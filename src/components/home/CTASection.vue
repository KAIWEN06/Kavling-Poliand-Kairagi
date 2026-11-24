<template>
  <section v-if="ctaTitle || isAdmin" class="cta-section">
    <div class="cta-card">
      <SceneBackdrop class="cta-scene" height="58%" />
      <div class="cta-content">
        <h2>{{ ctaTitle || 'Judul ajakan belum diisi' }}</h2>
        <p v-if="ctaText">{{ ctaText }}</p>

        <button
          v-if="hasWhatsapp || isAdmin"
          class="cta-btn"
          type="button"
          :disabled="!hasWhatsapp"
          @click="handleWhatsapp"
        >
          <ion-icon :icon="logoWhatsapp" aria-hidden="true" />
          Hubungi via WhatsApp
        </button>

        <div v-if="isAdmin" class="cta-admin">
          <AdminEditButton label="Edit ajakan" @click="editOpen = true" />
        </div>
      </div>
    </div>

    <CmsPanelModal v-model="editOpen" title="Edit ajakan" panel="home" section="cta" @saved="load" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { contactsService } from '@/services/contactService'
import { HOME_KEYS, toWaNumber } from '@/utils/homeContent'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import { IonIcon } from '@ionic/vue'

import {
  logoWhatsapp
} from 'ionicons/icons'

const ctaTitle = ref('')
const ctaText = ref('')
const hasWhatsapp = ref(false)
const editOpen = ref(false)
const { isAdmin } = useCmsAdmin()

/** Judul & teks ajakan dikelola Admin; tombol WhatsApp hanya aktif bila nomor Kontak sudah diisi. */
async function load() {
  try {
    const rows = await contactsService.getAll()
    const valueOf = (key: string) => rows.find((row) => row.key === key)?.value?.trim() || ''
    ctaTitle.value = valueOf(HOME_KEYS.ctaTitle)
    ctaText.value = valueOf(HOME_KEYS.ctaText)
    hasWhatsapp.value = !!toWaNumber(valueOf('whatsapp'))
  } catch (error) {
    console.error('Gagal mengambil teks ajakan:', error)
  }
}
onMounted(load)

const emit = defineEmits<{
  contactWhatsapp: []
}>()

const handleWhatsapp = () => {
  emit('contactWhatsapp')
}
</script>

<style scoped>
.cta-section { display: block; width: 100%; margin: 0; padding: 36px 16px 0; box-sizing: border-box; }

.cta-card {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(90% 80% at 100% 0%, rgba(244, 214, 154, 0.26) 0%, rgba(244, 214, 154, 0) 60%),
    linear-gradient(155deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  box-shadow: var(--shadow-md);
  color: #fff;
}
.cta-scene { z-index: 0; }
.cta-content { position: relative; z-index: 2; padding: 36px 24px 96px; }

.cta-content h2 {
  margin: 0;
  color: #fff;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(28px, 7.6vw, 34px);
  line-height: 1.1;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.cta-content p { max-width: 34ch; margin: 12px 0 22px; color: rgba(244, 241, 232, 0.92); font-size: 15px; line-height: 1.6; }

.cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 24px;
  border: 0;
  border-radius: 14px;
  background: var(--poliland-gold, #cba044);
  color: var(--ink, #1b1f1a);
  font: 800 15px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  box-shadow: 0 12px 26px -10px rgba(203, 160, 68, 0.85);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}
.cta-btn ion-icon { font-size: 22px; }
.cta-btn:active { transform: scale(0.97); }
.cta-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.cta-btn:disabled { opacity: 0.55; box-shadow: none; cursor: not-allowed; }

.cta-admin { display: flex; margin-top: 14px; }

@media (prefers-reduced-motion: reduce) {
  .cta-btn:active { transform: none; }
}
</style>
