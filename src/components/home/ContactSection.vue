<template>
  <section class="section contact-section">
    <SectionHeader title="Hubungi kami">
      <AdminEditButton v-if="isAdmin" label="Ubah kontak" @click="editOpen = true" />
    </SectionHeader>

    <div class="contact-grid">
      <template v-if="loading">
        <div v-for="item in 4" :key="`contact-skeleton-${item}`" class="contact-card contact-card-skeleton">
          <Skeleton width="44px" height="44px" variant="default" border-radius="14px" />
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
          <div class="contact-icon" :class="card.tone"><ion-icon :icon="card.icon" aria-hidden="true" /></div>
          <div class="contact-text-wrap">
            <strong>{{ card.label }}</strong>
            <span>{{ card.value || 'Belum diisi' }}</span>
          </div>
        </component>
      </template>
    </div>

    <p v-if="!loading && !cards.length" class="empty-hint">Informasi kontak akan segera ditambahkan.</p>

    <div v-if="!loading" class="contact-actions">
      <a
        v-if="whatsappHref"
        class="action action--primary"
        :href="whatsappHref"
        target="_blank"
        rel="noopener noreferrer"
      >
        <ion-icon :icon="logoWhatsapp" aria-hidden="true" />
        Hubungi lewat WhatsApp
      </a>
      <a v-if="phoneHref" class="action action--outline" :href="phoneHref">
        <ion-icon :icon="callOutline" aria-hidden="true" />
        Telepon
      </a>
      <button
        class="action action--outline"
        :class="{ 'action--wide': !phoneHref }"
        type="button"
        @click="router.push('/contact')"
      >
        Semua kontak
        <ion-icon :icon="arrowForwardOutline" aria-hidden="true" />
      </button>
    </div>

    <CmsPanelModal v-model="editOpen" title="Ubah kontak" panel="contact" @saved="loadContacts" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IonIcon } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { arrowForwardOutline, callOutline, locationOutline, logoWhatsapp, mailOutline, timeOutline } from 'ionicons/icons'
import Skeleton from '@/components/ui/Skeleton.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
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

const router = useRouter()

/** Tombol aksi memakai nomor dari Kontak yang diatur Admin; tombol disembunyikan bila nomornya kosong. */
const whatsappHref = computed(() => {
  const number = toWaNumber(valueOf('whatsapp'))
  return number ? `https://wa.me/${number}` : ''
})
const phoneHref = computed(() => {
  const digits = valueOf('phone', 'telepon').replace(/[^\d+]/g, '')
  return digits ? `tel:${digits}` : ''
})

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
.section { padding: 36px 20px 0; }
.contact-section { padding-top: 40px; }
.contact-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
.contact-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 72px;
  padding: 14px 16px;
  box-sizing: border-box;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-sm);
  color: inherit;
  text-align: left;
  text-decoration: none;
}
.contact-card.missing { border-style: dashed; background: transparent; box-shadow: none; }
.contact-card-skeleton { pointer-events: none; }
.contact-card-skeleton .contact-text-wrap { display: flex; flex-direction: column; gap: 6px; }
.contact-card.clickable { cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; transition: transform var(--dur-base) var(--ease-spring); }
.contact-card.clickable:active { transform: scale(0.97); }
.contact-card.clickable:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }
.contact-icon { display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; border-radius: 14px; font-size: 22px; background: var(--green-100, #e8eee4); color: var(--poliland-green, #355a2c); }
.contact-icon.warning-bg { background: var(--gold-50, #fbf4e4); color: var(--poliland-gold-text, #805708); }

.contact-text-wrap { min-width: 0; flex: 1; }
.contact-card strong { display: block; color: var(--text-secondary, #5f5f66); font-size: 12px; font-weight: 800; letter-spacing: 0.04em; }
.contact-card span { display: block; margin-top: 3px; color: var(--text-primary, #252525); font-size: 15px; font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.contact-card.missing span { color: var(--text-secondary, #5f5f66); font-style: italic; font-weight: 500; }

.empty-hint { margin: 0; padding: 16px; border: 1px dashed var(--border-strong, #d5d0c4); border-radius: var(--radius-card, 16px); color: var(--text-secondary, #5f5f66); font-size: 14px; line-height: 1.5; }

/* Tombol aksi */
.contact-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
.action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 18px;
  border: 1.5px solid transparent;
  border-radius: 14px;
  font: 800 15px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  text-decoration: none;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}
.action ion-icon { font-size: 20px; }
.action:active { transform: scale(0.97); }
.action:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 3px; }
.action--primary {
  grid-column: 1 / -1;
  background: linear-gradient(155deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  color: #fff;
  box-shadow: 0 12px 26px -12px rgba(31, 53, 25, 0.8);
}
.action--primary ion-icon { color: var(--poliland-gold-soft, #f4d69a); font-size: 22px; }
.action--outline { border-color: var(--poliland-green, #355a2c); background: var(--surface-primary, #fff); color: var(--poliland-green, #355a2c); }
.action--wide { grid-column: 1 / -1; }
.action--outline ion-icon { transition: transform var(--dur-base) var(--ease-spring); }
.action--outline:active ion-icon { transform: translateX(3px); }

@media (prefers-reduced-motion: reduce) {
  .action:active,
  .action--outline:active ion-icon { transform: none; }
}

@media (min-width: 640px) {
  .contact-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (prefers-reduced-motion: reduce) {
  .contact-card.clickable:active { transform: none; }
}
</style>
