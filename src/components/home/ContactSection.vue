<template>
  <section class="section contact-section">
    <!-- Header Bagian & Tombol Admin Edit -->
    <div class="section-heading">
      <div>
        <h2>Hubungi Kami</h2>
        <span class="heading-line"></span>
      </div>
      <ion-button v-if="isAdmin" class="btn-primary-custom" @click="handleOpenModal">
        <ion-icon slot="start" :icon="settingsOutline"></ion-icon>
        Edit Kontak
      </ion-button>
    </div>

    <!-- Grid Informasi Kontak -->
    <div class="contact-grid">
      <!-- SKELETON -->
      <template v-if="loading">
        <div
          v-for="item in 4"
          :key="`contact-skeleton-${item}`"
          class="contact-card contact-card-skeleton"
        >
          <Skeleton
            width="33px"
            height="33px"
            variant="default"
            border-radius="9px"
          />

          <div class="contact-text-wrap">
            <Skeleton
              :width="item === 1 ? '78px' : item === 2 ? '105px' : item === 3 ? '82px' : '96px'"
              height="9px"
              border-radius="4px"
            />

            <Skeleton
              :width="item === 1 ? '88%' : item === 2 ? '72%' : item === 3 ? '80%' : '76%'"
              height="8px"
              border-radius="4px"
            />
          </div>
        </div>
      </template>

      <!-- DATA ASLI -->
      <template v-else>
        <!-- Alamat -->
        <div class="contact-card">
          <div class="contact-icon stone-bg">
            <ion-icon :icon="locationOutline" />
          </div>
          <div class="contact-text-wrap">
            <strong>Alamat Lokasi</strong>
            <span>{{ addressText }}</span>
          </div>
        </div>

        <!-- Telepon & WhatsApp -->
        <div class="contact-card clickable" @click="openWhatsApp">
          <div class="contact-icon success-bg">
            <ion-icon :icon="logoWhatsapp" />
          </div>
          <div class="contact-text-wrap">
            <strong>Telepon / WhatsApp</strong>
            <span>{{ phoneText }}</span>
          </div>
        </div>

        <!-- Email -->
        <div class="contact-card">
          <div class="contact-icon info-bg">
            <ion-icon :icon="mailOutline" />
          </div>
          <div class="contact-text-wrap">
            <strong>Email Resmi</strong>
            <span>{{ emailText }}</span>
          </div>
        </div>

        <!-- Jam Operasional -->
        <div class="contact-card">
          <div class="contact-icon warning-bg">
            <ion-icon :icon="timeOutline" />
          </div>
          <div class="contact-text-wrap">
            <strong>Jam Operasional</strong>
            <span>{{ operationalHoursText }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Modal Form Edit Kontak untuk Admin -->
    <ion-modal :is-open="isModalOpen" @didDismiss="isModalOpen = false">
      <ion-header>
        <ion-toolbar class="modal-toolbar">
          <ion-title class="modal-title-custom">Edit Informasi Kontak</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="isModalOpen = false" color="medium">
              <ion-icon :icon="closeOutline" size="large"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding modal-content-custom">
        <div v-if="message.text" :class="['alert-box', message.type]">
          {{ message.text }}
        </div>

        <form @submit.prevent="handleSave" class="modal-form">
          <div class="form-group">
            <label class="form-label">Alamat Lokasi</label>
            <ion-textarea :rows="2" v-model="formData.address" class="custom-input"></ion-textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Nomor Telepon</label>
            <ion-input 
              type="text" 
              v-model="formData.phone" 
              class="custom-input"
            ></ion-input>
          </div>

          <div class="form-group">
            <label class="form-label">Nomor WhatsApp (Format: 628xxx)</label>
            <ion-input 
              type="text" 
              v-model="formData.whatsapp" 
              class="custom-input"
            ></ion-input>
          </div>

          <div class="form-group">
            <label class="form-label">Email Resmi</label>
            <ion-input 
              type="email" 
              v-model="formData.email" 
              class="custom-input"
            ></ion-input>
          </div>

          <div class="form-group">
            <label class="form-label">Jam Operasional (Dari - Sampai)</label>
            <div class="time-picker-grid">
              <input 
                type="time" 
                required
                v-model="startTime"
                class="native-time-input"
              />
              <input 
                type="time" 
                required
                v-model="closeTime"
                class="native-time-input"
              />
            </div>
            <span class="helper-text">Pilih rentang waktu operasional kantor.</span>
          </div>

          <div class="modal-actions">
            <ion-button type="button" fill="clear" color="medium" @click="isModalOpen = false">
              Batal
            </ion-button>
            <ion-button type="submit" class="btn-primary-custom" :disabled="saving">
              <ion-spinner v-if="saving" name="crescent"></ion-spinner>
              <span v-else>Simpan Perubahan</span>
            </ion-button>
          </div>
        </form>
      </ion-content>
    </ion-modal>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { 
  IonContent, IonButton, IonIcon, IonSpinner, IonModal, 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonInput, IonTextarea 
} from '@ionic/vue'

import Skeleton from '@/components/ui/Skeleton.vue'
import { 
  locationOutline, logoWhatsapp, mailOutline, timeOutline, 
  settingsOutline, closeOutline 
} from 'ionicons/icons'
import { supabase } from '@/services/config/supabase'
import { contactService, ContactItem } from '@/services/contactService'

const contacts = ref<ContactItem[]>([])
const isAdmin = ref(false)
const loading = ref(true)
const isModalOpen = ref(false)
const saving = ref(false)
const message = reactive({ text: '', type: '' })

const formData = reactive({
  address: '',
  phone: '',
  email: '',
  operational_hours: '',
  whatsapp: ''
})

const startTime = ref('08:00')
const closeTime = ref('17:00')

onMounted(async () => {
  await checkAdminRole()
  await loadContacts()
})

async function checkAdminRole() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile && (profile.role === 'admin' || profile.role === 'superadmin')) {
        isAdmin.value = true
      }
    }
  } catch (err) {
    console.error('Gagal memeriksa peran admin:', err)
  }
}

const loadContacts = async () => {
  try {
    loading.value = true
    contacts.value = await contactService.getContacts()
  } catch (error) {
    console.error('Gagal mengambil data kontak:', error)
  } finally {
    loading.value = false
  }
}

const addressText = computed(() => {
  const item = contacts.value.find(c => c.key === 'address' || c.key === 'alamat')
  return item?.value || 'Kairagi, Kota Manado'
})

const phoneText = computed(() => {
  const item = contacts.value.find(c => c.key === 'phone' || c.key === 'telepon')
  return item?.value || 'Hubungi Kami'
})

const emailText = computed(() => {
  const item = contacts.value.find(c => c.key === 'email')
  return item?.value || 'info@poliland.id'
})

const operationalHoursText = computed(() => {
  const item = contacts.value.find(c => c.key === 'operational_hours')
  return item?.value || '08:00 - 17:00 WITA'
})

const whatsappNumber = computed(() => {
  const item = contacts.value.find(c => c.key === 'whatsapp')
  return item?.value || '6281234567890'
})

const openWhatsApp = () => {
  const cleanWhatsapp = whatsappNumber.value.replace(/\D/g, '')
  window.open(`https://wa.me/${cleanWhatsapp}`, '_blank')
}

const handleOpenModal = () => {
  const currentOpHours = operationalHoursText.value
  const timeMatch = currentOpHours.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/)
  if (timeMatch) {
    startTime.value = timeMatch[1]
    closeTime.value = timeMatch[2]
  }

  formData.address = addressText.value
  formData.phone = phoneText.value
  formData.email = emailText.value
  formData.whatsapp = whatsappNumber.value
  formData.operational_hours = currentOpHours

  isModalOpen.value = true
  message.text = ''
}

const handleSave = async () => {
  saving.value = true
  message.text = ''

  try {
    const finalOperationalHours = `${startTime.value} - ${closeTime.value} WITA`
    
    const labelMap: Record<string, string> = {
      address: 'Alamat Lokasi',
      phone: 'Nomor Telepon',
      email: 'Email Resmi',
      operational_hours: 'Jam Operasional',
      whatsapp: 'Nomor WhatsApp'
    }

    const updatedData = {
      ...formData,
      operational_hours: finalOperationalHours
    }

    for (const [key, value] of Object.entries(updatedData)) {
      await contactService.upsertContact({
        key,
        label: labelMap[key] || key,
        value: value || ''
      })
    }

    message.text = 'Informasi kontak berhasil diperbarui!'
    message.type = 'success'
    
    await loadContacts()

    setTimeout(() => {
      isModalOpen.value = false
    }, 1000)
  } catch (err: any) {
    console.error(err)
    message.text = 'Gagal menyimpan: ' + err.message
    message.type = 'error'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.section { padding: 30px 16px 0; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 17px; }
.section-heading h2 { margin: 0; color: #1A1A1A; font-size: 20px; line-height: 1.2; font-weight: 800; letter-spacing: -0.3px; }
.heading-line { display: block; width: 34px; height: 3px; margin-top: 7px; background: #8CA072; border-radius: 999px; }

.btn-primary-custom {
  --background: #B8860B;
  --background-hover: #9e7309;
  --color: #FFFFFF;
  --border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: none;
  box-shadow: 0 4px 12px rgba(184, 134, 11, 0.2);
  height: 34px;
  margin: 0;
}

.contact-section { padding-top: 38px; }
.contact-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.contact-card { display: flex; align-items: center; gap: 9px; min-height: 70px; padding: 11px; border: 1px solid #E5E5E5; border-radius: 11px; background: #FFFFFF; text-align: left; width: 100%; }

.contact-card-skeleton {
  pointer-events: none;
}

.contact-card-skeleton .contact-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.contact-card.clickable { cursor: pointer; transition: border-color 0.2s ease; }
.contact-card.clickable:hover { border-color: #8CA072; }

.contact-icon { width: 33px; height: 33px; flex: 0 0 33px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.contact-icon.success-bg { background: #ECFDF5; color: #2E7D32; }
.contact-icon.info-bg { background: #F2F6FEB2; color: #2F6FEB; }
.contact-icon.stone-bg { background: #D9D3C433; color: #556B2F; }
.contact-icon.warning-bg { background: #FFFBEB; color: #F2A900; }

.contact-text-wrap { min-width: 0; flex: 1; }
.contact-card strong { display: block; color: #2D2D2D; font-size: 9px; font-weight: 800; }
.contact-card span { display: block; margin-top: 3px; overflow: hidden; color: #6B6B6B; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }

/* Modal Custom Styling */
.modal-toolbar { --background: #FFFFFF; --border-color: #E5E5E5; }
.modal-title-custom { font-size: 14px; font-weight: 700; color: #1A1A1A; }
.modal-content-custom { --background: #FFFFFF; }

.modal-form { display: flex; flex-direction: column; gap: 14px; padding-top: 8px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-label { font-size: 11px; font-weight: 600; color: #2D2D2D; }

.custom-input {
  --background: #FAFAF7;
  --border-radius: 8px;
  --padding-start: 10px;
  --padding-end: 10px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 11px;
}

.time-picker-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.native-time-input {
  width: 100%;
  padding: 8px 10px;
  font-size: 11px;
  background: #FAFAF7;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  color: #2D2D2D;
  outline: none;
}

.helper-text { font-size: 9px; color: #A7A7A7; margin-top: 2px; }

.alert-box { padding: 8px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; margin-bottom: 6px; }
.alert-box.success { background: #ECFDF5; color: #2E7D32; border: 1px solid #2E7D3233; }
.alert-box.error { background: #FEF2F2; color: #D32F2F; border: 1px solid #D32F2F33; }

.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; border-top: 1px solid #E5E5E5; padding-top: 14px; }
</style>