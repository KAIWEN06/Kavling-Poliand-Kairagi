<template>
  <section class="section contact-section">
    <div class="section-heading">
      <div>
        <h2>Hubungi Kami</h2>
        <span class="heading-line"></span>
      </div>
      <AdminEditButton v-if="isAdmin" label="Edit kontak" @click="editOpen = true" />
    </div>

    <div class="contact-grid">
      <template v-if="loading">
        <div v-for="item in 4" :key="`contact-skeleton-${item}`" class="contact-card contact-card-skeleton">
          <Skeleton width="36px" height="36px" variant="default" border-radius="10px" />
          <div class="contact-text-wrap">
            <Skeleton width="70%" height="10px" border-radius="4px" />
            <Skeleton width="90%" height="9px" border-radius="4px" />
          </div>
        </div>
      </template>

      <template v-else>
        <component
          :is="card.href ? 'a' : 'div'"
          v-for="card in cards"
          :key="card.key"
          class="contact-card"
          :class="{ clickable: !!card.href, missing: !card.value }"
          :href="card.href || undefined"
          :target="card.external ? '_blank' : undefined"
          :rel="card.external ? 'noopener noreferrer' : undefined"
        >
          <div class="contact-icon" :class="card.tone"><ion-icon :icon="card.icon" /></div>
          <div class="contact-text-wrap">
            <strong>{{ card.label }}</strong>
            <span>{{ card.value || 'Belum diisi' }}</span>
          </div>
        </component>
      </template>
    </div>

    <p v-if="!loading && !cards.length" class="empty-hint">Informasi kontak akan segera ditambahkan.</p>

    <CmsPanelModal v-model="editOpen" title="Edit kontak" panel="contact" @saved="loadContacts" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IonIcon } from '@ionic/vue'
import { locationOutline, logoWhatsapp, mailOutline, timeOutline } from 'ionicons/icons'
import Skeleton from '@/components/ui/Skeleton.vue'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'
import { contactsService, type ContactRecord } from '@/services/contactService'
import { toWaNumber } from '@/utils/homeContent'
import { useCmsAdmin } from '@/composables/useCmsAdmin'

const contacts = ref<ContactRecord[]>([])
const loading = ref(true)
const editOpen = ref(false)
const { isAdmin } = useCmsAdmin()

const valueOf = (...keys: string[]) => contacts.value.find((row) => keys.includes(row.key))?.value?.trim() || ''

/** Semua isi kartu berasal dari database. Kartu yang datanya kosong disembunyikan dari pengunjung, tetapi tetap tampil bagi Admin sebagai pengingat. */
const cards = computed(() => {
  const whatsapp = toWaNumber(valueOf('whatsapp'))
  const phone = valueOf('phone', 'telepon')
  const email = valueOf('email')
  const all = [
    { key: 'address', label: 'Alamat Lokasi', value: valueOf('address', 'alamat'), icon: locationOutline, tone: 'stone-bg', href: '', external: false },
    { key: 'phone', label: 'Telepon / WhatsApp', value: phone || valueOf('whatsapp'), icon: logoWhatsapp, tone: 'success-bg', href: whatsapp ? `https://wa.me/${whatsapp}` : '', external: true },
    { key: 'email', label: 'Email Resmi', value: email, icon: mailOutline, tone: 'info-bg', href: email ? `mailto:${email}` : '', external: false },
    { key: 'hours', label: 'Jam Operasional', value: valueOf('operational_hours'), icon: timeOutline, tone: 'warning-bg', href: '', external: false },
  ]
  return isAdmin.value ? all : all.filter((card) => card.value)
})

async function loadContacts() {
  try {
    loading.value = true
    contacts.value = await contactsService.getAll()
  } catch (error) {
    console.error('Gagal mengambil data kontak:', error)
  } finally {
    loading.value = false
  }
}

onMounted(loadContacts)
</script>

<style scoped>
.section { padding: 30px 16px 0; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 17px; }
.section-heading h2 { margin: 0; color: #1A1A1A; font-size: 20px; line-height: 1.2; font-weight: 800; letter-spacing: -0.3px; }
.heading-line { display: block; width: 34px; height: 3px; margin-top: 7px; background: #8CA072; border-radius: 999px; }

.contact-section { padding-top: 38px; }
.contact-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.contact-card { display: flex; align-items: center; gap: 10px; min-height: 72px; padding: 12px; border: 1px solid #E5E5E5; border-radius: 12px; background: #FFFFFF; color: inherit; text-align: left; text-decoration: none; width: 100%; box-sizing: border-box; }
.contact-card.missing { border-style: dashed; background: transparent; }
.contact-card-skeleton { pointer-events: none; }
.contact-card-skeleton .contact-text-wrap { display: flex; flex-direction: column; gap: 6px; }
.contact-card.clickable { cursor: pointer; transition: border-color var(--dur-fast) var(--ease-out); }
.contact-card.clickable:focus-visible { outline: 3px solid #556B2F; outline-offset: 2px; }
@media (hover: hover) and (pointer: fine) {
  .contact-card.clickable:hover { border-color: #8CA072; }
}
.contact-icon { width: 36px; height: 36px; flex: 0 0 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.contact-icon.success-bg { background: #ECFDF5; color: #2E7D32; }
.contact-icon.info-bg { background: #E8EFFC; color: #1D4FB8; }
.contact-icon.stone-bg { background: #E8EEE4; color: #355A2C; }
.contact-icon.warning-bg { background: #FBF0D8; color: #805708; }

.contact-text-wrap { min-width: 0; flex: 1; }
.contact-card strong { display: block; color: #2D2D2D; font-size: 11px; font-weight: 800; }
.contact-card span { display: block; margin-top: 3px; color: #6B6B6B; font-size: 11px; line-height: 1.4; overflow-wrap: anywhere; }
.contact-card.missing span { color: #8A8A90; font-style: italic; }

.empty-hint { margin: 0; padding: 16px; border: 1px dashed #d5d0c4; border-radius: 12px; color: #6b6b6b; font-size: 12px; line-height: 1.5; }

@media (max-width: 359px) {
  .contact-grid { grid-template-columns: 1fr; }
}
</style>
