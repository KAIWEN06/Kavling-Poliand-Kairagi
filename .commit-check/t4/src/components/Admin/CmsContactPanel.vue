<template>
  <section class="cms-panel" :class="{ embedded }" aria-labelledby="contact-title">
    <header v-if="!embedded" class="panel-head">
      <div>
        <h2 id="contact-title">Kontak</h2>
        <p>Dipakai di bagian Hubungi Kami, halaman Kontak, tombol WhatsApp, dan tombol telepon.</p>
      </div>
      <button class="btn btn-primary" type="button" :disabled="saving || loading" @click="save">
        {{ saving ? 'Menyimpan…' : 'Simpan kontak' }}
      </button>
    </header>

    <p v-if="loading" class="state" role="status">Memuat data kontak…</p>
    <template v-else>
      <div class="fields">
        <label class="field wide">Alamat lokasi
          <textarea v-model="form.address" rows="2" maxlength="200" placeholder="Kairagi, Kota Manado"></textarea>
        </label>
        <label class="field">Nomor WhatsApp
          <input v-model="form.whatsapp" type="tel" inputmode="tel" maxlength="20" placeholder="08123456789">
          <span class="hint">{{ whatsappHint }}</span>
        </label>
        <label class="field">Nomor telepon
          <input v-model="form.phone" type="tel" inputmode="tel" maxlength="20" placeholder="0431 000000">
        </label>
        <label class="field">Email
          <input v-model="form.email" type="email" maxlength="80" placeholder="nama@domain.id">
        </label>
        <label class="field">Jam kerja yang ditampilkan
          <input v-model="form.operational_hours" maxlength="40" placeholder="08:00 - 17:00 WITA">
          <span class="hint">Hanya teks. Jadwal survei diatur di tab Jam Operasional.</span>
        </label>
      </div>

      <h3 class="group-title">Media sosial</h3>
      <div class="fields">
        <label v-for="social in SOCIALS" :key="social.key" class="field wide">{{ social.label }}
          <input v-model="form[social.key]" type="url" inputmode="url" maxlength="200" :placeholder="social.placeholder">
          <span v-if="socialProblem(social.key)" class="hint error" role="alert">{{ socialProblem(social.key) }}</span>
        </label>
      </div>
      <p class="hint note">Kolom yang dikosongkan tidak ditampilkan di halaman Kontak.</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { contactsService } from '@/services/contactService'

defineProps<{ embedded?: boolean }>()
const emit = defineEmits<{ notify: [message: string, type?: 'success' | 'error']; saved: [] }>()

type FieldKey = 'address' | 'whatsapp' | 'phone' | 'email' | 'operational_hours' | 'instagram' | 'facebook' | 'tiktok'
const FIELD_LABELS: Record<FieldKey, { label: string; icon: string | null }> = {
  address: { label: 'Alamat Lokasi', icon: null },
  whatsapp: { label: 'Nomor WhatsApp', icon: 'logo-whatsapp' },
  phone: { label: 'Nomor Telepon', icon: 'call' },
  email: { label: 'Email Resmi', icon: 'mail' },
  operational_hours: { label: 'Jam Operasional', icon: null },
  instagram: { label: 'Instagram', icon: 'logo-instagram' },
  facebook: { label: 'Facebook', icon: 'logo-facebook' },
  tiktok: { label: 'TikTok', icon: 'logo-tiktok' },
}
const SOCIALS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://www.instagram.com/akun-anda' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://www.facebook.com/halaman-anda' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://www.tiktok.com/@akun-anda' },
] as const

const loading = ref(true)
const saving = ref(false)
const form = reactive<Record<FieldKey, string>>({ address: '', whatsapp: '', phone: '', email: '', operational_hours: '', instagram: '', facebook: '', tiktok: '' })

const whatsappHint = computed(() => {
  const digits = form.whatsapp.replace(/\D/g, '')
  if (!digits) return 'Kosong: tombol WhatsApp tidak aktif sampai nomor diisi.'
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits
  return `Tombol akan membuka wa.me/${normalized}`
})

function isHttpUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' } catch { return false }
}
function socialProblem(key: FieldKey) {
  const value = form[key].trim()
  return value && !isHttpUrl(value) ? 'Isi dengan tautan lengkap yang diawali https://' : ''
}

async function load() {
  try {
    const rows = await contactsService.getAll()
    ;(Object.keys(form) as FieldKey[]).forEach((key) => {
      form[key] = rows.find((row) => row.key === key)?.value ?? ''
    })
  } catch (error) {
    emit('notify', error instanceof Error ? error.message : 'Data kontak gagal dimuat.', 'error')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<boolean> {
  const invalid = SOCIALS.find((social) => socialProblem(social.key))
  if (invalid) { emit('notify', `Tautan ${invalid.label} tidak valid.`, 'error'); return false }
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) { emit('notify', 'Format email tidak valid.', 'error'); return false }
  saving.value = true
  try {
    await contactsService.saveMany((Object.keys(FIELD_LABELS) as FieldKey[]).map((key) => ({
      key,
      label: FIELD_LABELS[key].label,
      value: form[key],
      ...(FIELD_LABELS[key].icon ? { icon: FIELD_LABELS[key].icon } : {}),
    })))
    emit('notify', 'Kontak tersimpan dan langsung tampil di situs web.', 'success')
    emit('saved')
    return true
  } catch (error) {
    emit('notify', error instanceof Error ? error.message : 'Kontak gagal disimpan.', 'error')
    return false
  } finally {
    saving.value = false
  }
}

defineExpose({ save, saving, loading })
onMounted(load)
</script>

<style scoped src="./cmsPanel.css"></style>
<style scoped>
.embedded { padding: 0; border: 0; background: transparent; }
.group-title { margin: 26px 0 12px; padding-top: 20px; border-top: 1px solid var(--border-default); font-size: 16px; font-weight: 800; }
.hint.error { color: var(--status-danger); font-weight: 700; }
.note { margin: 14px 0 0; }
</style>
