<template>
  <ion-page>
    <ion-content class="contact-content">
      <div class="contact-page pl-surface">
        <!-- HERO: adegan Welcome, bukit terdepan krem agar mengalir ke isi -->
        <section class="contact-hero">
          <SceneBackdrop class="hero-scene" height="54%" breathe sparkle solid-front="#F9F5EC" />

          <div class="hero-copy">
            <h1 aria-label="Hubungi marketing kami.">
              <span v-for="(line, i) in heroLines" :key="line" class="hero-line" aria-hidden="true">
                <motion.span
                  class="hero-line-inner"
                  :initial="reduced ? false : { y: '110%' }"
                  :animate="{ y: '0%' }"
                  :transition="{ duration: 0.75, delay: 0.25 + i * 0.12, ease: MOTION_EASE_OUT }"
                >{{ line }}</motion.span>
              </span>
            </h1>
            <motion.p
              class="hero-sub"
              :initial="reduced ? false : { opacity: 0, y: 10 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.6, delay: 0.55, ease: MOTION_EASE_OUT }"
            >Tanya harga, lokasi, atau jadwal kunjungan.</motion.p>
            <motion.div
              v-if="isAdmin"
              class="hero-admin"
              :initial="reduced ? false : { opacity: 0, y: 10 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.7, ease: MOTION_EASE_OUT }"
            >
              <AdminEditButton label="Edit kontak" @click="editOpen = true" />
            </motion.div>
          </div>
        </section>

        <!-- CARA MENGHUBUNGI -->
        <section class="block">
          <SectionHeader title="Pilih cara yang nyaman" />

          <div v-if="isLoading" class="contact-list" aria-hidden="true">
            <div v-for="i in 2" :key="`sk-${i}`" class="contact-card is-skeleton">
              <Skeleton width="52px" height="52px" border-radius="16px" />
              <div class="contact-info">
                <Skeleton width="70px" height="10px" border-radius="5px" />
                <Skeleton width="150px" height="16px" border-radius="6px" />
              </div>
            </div>
          </div>

          <div v-else-if="loadError" class="contact-state contact-state-error" role="alert">
            Informasi kontak belum dapat dimuat. Muat ulang halaman ini.
          </div>

          <div v-else-if="contactItems.length === 0" class="contact-state">
            Informasi kontak belum tersedia.
          </div>

          <div v-else class="contact-list">
            <a
              v-for="(item, index) in contactItems"
              :key="item.title"
              :href="item.href"
              class="contact-card"
              :class="[item.variant, { 'is-primary': index === 0 }]"
              :style="{ '--i': Math.min(index, 6) }"
            >
              <span class="contact-icon"><ion-icon :icon="item.icon" aria-hidden="true" /></span>
              <span class="contact-info">
                <span class="contact-label">{{ item.label }}</span>
                <strong>{{ item.title }}</strong>
                <span class="contact-desc">{{ item.description }}</span>
              </span>
              <span class="contact-arrow"><ion-icon :icon="arrowForwardOutline" aria-hidden="true" /></span>
            </a>
          </div>
        </section>

        <!-- MEDIA SOSIAL -->
        <section v-if="socialItems.length" class="block">
          <SectionHeader title="Media sosial" />
          <ul class="social-list">
            <li v-for="(social, i) in socialItems" :key="social.name">
              <ScrollReveal :delay="Math.min(i, 5) * 70">
                <a :href="social.href" target="_blank" rel="noopener noreferrer" class="social-card">
                  <span class="social-icon"><ion-icon :icon="social.icon" aria-hidden="true" /></span>
                  <span class="social-info">
                    <span class="contact-label">{{ social.platform }}</span>
                    <strong>{{ social.name }}</strong>
                  </span>
                  <ion-icon class="social-arrow" :icon="arrowForwardOutline" aria-hidden="true" />
                </a>
              </ScrollReveal>
            </li>
          </ul>
        </section>

        <!-- LOKASI: panel hijau seperti CTA di Tentang -->
        <ScrollReveal variant="scale">
          <section class="location">
            <SceneBackdrop class="location-scene" height="58%" />
            <div class="location-body">
              <span class="location-pin"><ion-icon :icon="locationOutline" aria-hidden="true" /></span>
              <h2>PoliLand Kairagi</h2>
              <p>{{ locationAddress || 'Alamat lokasi belum tersedia.' }}</p>
              <a
                v-if="locationHref"
                class="location-btn"
                :href="locationHref"
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka peta
                <ion-icon :icon="arrowForwardOutline" aria-hidden="true" />
              </a>
            </div>
          </section>
        </ScrollReveal>

        <div class="page-bottom-space" aria-hidden="true"></div>
      </div>
      <CmsPanelModal v-model="editOpen" title="Edit kontak" panel="contact" @saved="loadContacts(true)" />
      <CmsBackBar />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/vue'
import { motion } from 'motion-v'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import ScrollReveal from '@/components/ui/ScrollReveal.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { MOTION_EASE_OUT } from '@/utils/motionTokens'
import { contactsService } from '@/services/contactService'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsBackBar from '@/components/Admin/CmsBackBar.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'
import { useCmsAdmin } from '@/composables/useCmsAdmin'

import {
  arrowForwardOutline,
  callOutline,
  chatbubbleEllipsesOutline,
  locationOutline,
  logoWhatsapp,
  logoInstagram,
  logoFacebook,
  logoTiktok,
} from 'ionicons/icons'

const reduced = useReducedMotion()
const heroLines = ['Hubungi', 'marketing kami.']
const isLoading = ref(true)
const editOpen = ref(false)
const { isAdmin } = useCmsAdmin()
const loadError = ref(false)

interface ContactRecord {
  key: string
  value: string
}

const contacts = ref<ContactRecord[]>([])

interface ContactItem {
  label: string
  title: string
  description: string
  href: string
  icon: typeof callOutline
  variant: string
}

interface SocialItem {
  platform: string
  name: string
  description: string
  href: string
  icon: typeof logoWhatsapp
  variant: string
}

function findContact(...keys: string[]) {
  return contacts.value.find((item) =>
    keys.includes(item.key.trim().toLowerCase()),
  )?.value.trim() || ''
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
}

function validHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

const whatsapp = computed(() => findContact('whatsapp', 'whatsapp_number'))
const phone = computed(() => findContact('phone', 'telephone', 'telepon'))
const email = computed(() => findContact('email'))
const locationAddress = computed(() => findContact('address', 'alamat'))
const locationMap = computed(() => findContact('maps_url', 'map_url', 'location_url'))

const locationHref = computed(() => {
  const mapUrl = validHttpUrl(locationMap.value)
  if (mapUrl) return mapUrl
  return locationAddress.value
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress.value)}`
    : ''
})

const contactItems = computed<ContactItem[]>(() => {
  const items: ContactItem[] = []
  const whatsappDigits = normalizePhone(whatsapp.value)
  const phoneDigits = phone.value.replace(/[^\d+]/g, '')

  if (whatsappDigits) {
    items.push({
      label: 'WHATSAPP',
      title: whatsapp.value,
      description: 'Tanyakan informasi kaveling secara langsung.',
      href: `https://wa.me/${whatsappDigits}`,
      icon: logoWhatsapp,
      variant: 'whatsapp',
    })
  }
  if (phoneDigits) {
    items.push({
      label: 'TELEPON',
      title: phone.value,
      description: 'Berbicara langsung dengan tim marketing.',
      href: `tel:${phoneDigits}`,
      icon: callOutline,
      variant: 'phone',
    })
  }
  if (email.value) {
    items.push({
      label: 'EMAIL',
      title: email.value,
      description: 'Kirim pertanyaan atau permintaan informasi.',
      href: `mailto:${email.value}`,
      icon: chatbubbleEllipsesOutline,
      variant: 'email',
    })
  }
  return items
})

const socialItems = computed<SocialItem[]>(() => {
  const items: SocialItem[] = []
  const socialDefinitions = [
    { key: ['instagram', 'instagram_url'], platform: 'INSTAGRAM', icon: logoInstagram, variant: 'instagram', description: 'Foto, informasi, dan update terbaru.' },
    { key: ['facebook', 'facebook_url'], platform: 'FACEBOOK', icon: logoFacebook, variant: 'facebook', description: 'Informasi kawasan dan aktivitas PoliLand.' },
    { key: ['tiktok', 'tiktok_url'], platform: 'TIKTOK', icon: logoTiktok, variant: 'tiktok', description: 'Video singkat dan cerita dari kawasan.' },
  ]

  socialDefinitions.forEach((social) => {
    const value = findContact(...social.key)
    const href = validHttpUrl(value)
    if (href) {
      items.push({
        platform: social.platform,
        name: value.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
        description: social.description,
        href,
        icon: social.icon,
        variant: social.variant,
      })
    }
  })
  return items
})

async function loadContacts(silent = false) {
  // Skeleton hanya saat belum ada data; pull-to-refresh mempertahankan kontak yang sudah tampil.
  if (!silent || contacts.value.length === 0) isLoading.value = true
  loadError.value = false
  try {
    contacts.value = await contactsService.getAll()
  } catch {
    if (!silent) contacts.value = []
    loadError.value = contacts.value.length === 0
  } finally {
    isLoading.value = false
  }
}

const handleRefresh = () => {
  void loadContacts(true).finally(() => {
    window.dispatchEvent(new CustomEvent('poliland:refresh-complete'))
  })
}

onMounted(() => loadContacts())
window.addEventListener('poliland:refresh', handleRefresh)
onBeforeUnmount(() => {
  window.removeEventListener('poliland:refresh', handleRefresh)
})
</script>

<style scoped>
.contact-content { --background: var(--pl-paper, #f9f5ec); }
.contact-page { padding-bottom: calc(110px + env(safe-area-inset-bottom)); }

/* ---------- Hero ---------- */
.contact-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: clamp(420px, 66dvh, 540px);
  padding: calc(env(safe-area-inset-top, 0px) + 24px) 24px 0;
  overflow: hidden;
  background:
    radial-gradient(110% 60% at 100% 0%, rgba(244, 214, 154, 0.26) 0%, rgba(244, 214, 154, 0) 62%),
    linear-gradient(165deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  color: #fff;
}
.hero-scene { z-index: 1; }
.hero-copy { position: relative; z-index: 3; padding-bottom: 150px; }

.eyebrow {
  display: block;
  margin-bottom: 14px;
  color: var(--poliland-gold-soft, #f4d69a);
  font: 800 11px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.contact-hero h1 {
  margin: 0;
  color: #fff;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(40px, 11.5vw, 58px);
  line-height: 1.04;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.hero-line { display: block; overflow: hidden; padding-bottom: 0.08em; }
.hero-line-inner { display: block; will-change: transform; }
.hero-sub {
  max-width: 30ch;
  margin: 14px 0 0;
  color: rgba(244, 241, 232, 0.92);
  font-size: 16px;
  line-height: 1.55;
}
.hero-admin { margin-top: 16px; }

/* ---------- Isi ---------- */
.block { padding: 8px 20px 0; }
.block + .block { margin-top: 20px; }

/* Kartu kontak */
.contact-list { display: grid; gap: 12px; }

.contact-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 96px;
  padding: 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-sm);
  color: inherit;
  text-decoration: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  animation: card-in 560ms var(--ease-spring) backwards;
  animation-delay: calc(var(--i, 0) * 70ms);
  transition: transform var(--dur-base) var(--ease-spring), box-shadow var(--dur-base) var(--ease-out);
}
.contact-card.is-skeleton { animation: none; pointer-events: none; }
.contact-card:active { transform: scale(0.97); }
.contact-card:focus-visible,
.social-card:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 3px; }

.contact-icon {
  display: grid;
  place-items: center;
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: var(--green-100, #e8eee4);
  color: var(--poliland-green, #355a2c);
  font-size: 26px;
}
.contact-card.phone .contact-icon { background: var(--gold-50, #fbf4e4); color: var(--poliland-gold-text, #805708); }

.contact-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.contact-label {
  color: var(--poliland-gold-text, #805708);
  font: 800 11px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0.12em;
}
.contact-info strong,
.social-info strong {
  overflow: hidden;
  color: var(--text-primary, #252525);
  font-size: 17px;
  line-height: 1.25;
  font-weight: 800;
  text-overflow: ellipsis;
}
.contact-desc { color: var(--text-secondary, #5f5f66); font-size: 13px; line-height: 1.45; }

.contact-arrow {
  display: grid;
  place-items: center;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--green-100, #e8eee4);
  color: var(--poliland-green, #355a2c);
  font-size: 18px;
  transition: transform var(--dur-base) var(--ease-spring);
}
.contact-card:active .contact-arrow { transform: translateX(3px); }

/* Kartu utama: hijau hutan dengan cahaya emas */
.contact-card.is-primary {
  min-height: 118px;
  border-color: transparent;
  background:
    radial-gradient(90% 120% at 100% 0%, rgba(244, 214, 154, 0.24) 0%, rgba(244, 214, 154, 0) 60%),
    linear-gradient(150deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  box-shadow: var(--shadow-md);
}
.contact-card.is-primary .contact-icon { background: rgba(244, 214, 154, 0.18); color: var(--poliland-gold-soft, #f4d69a); }
.contact-card.is-primary .contact-label { color: var(--poliland-gold-soft, #f4d69a); }
.contact-card.is-primary .contact-info strong { color: #fff; font-size: 19px; }
.contact-card.is-primary .contact-desc { color: rgba(244, 241, 232, 0.9); }
.contact-card.is-primary .contact-arrow { background: var(--poliland-gold, #cba044); color: var(--ink, #1b1f1a); }

.contact-state {
  margin: 0;
  padding: 18px;
  border: 1px dashed var(--border-strong, #d5d0c4);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  color: var(--text-secondary, #5f5f66);
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
}
.contact-state-error { border-color: var(--status-danger); color: var(--status-danger); }

/* Sosial */
.social-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.social-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 72px;
  padding: 12px 16px 12px 12px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-sm);
  color: inherit;
  text-decoration: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}
.social-card:active { transform: scale(0.97); }
.social-icon {
  display: grid;
  place-items: center;
  flex: 0 0 46px;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--green-100, #e8eee4);
  color: var(--poliland-green, #355a2c);
  font-size: 23px;
}
.social-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
.social-info strong { font-size: 15px; white-space: nowrap; }
.social-arrow { flex: 0 0 auto; color: var(--poliland-green, #355a2c); font-size: 18px; transition: transform var(--dur-base) var(--ease-spring); }
.social-card:active .social-arrow { transform: translateX(3px); }

/* ---------- Lokasi ---------- */
.location {
  position: relative;
  margin: 32px 16px 0;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(90% 80% at 100% 0%, rgba(244, 214, 154, 0.26) 0%, rgba(244, 214, 154, 0) 60%),
    linear-gradient(155deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  box-shadow: var(--shadow-md);
  color: #fff;
}
.location-scene { z-index: 0; }
.location-body { position: relative; z-index: 2; padding: 28px 24px 96px; }
.location-pin {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  border-radius: 15px;
  background: rgba(244, 214, 154, 0.18);
  color: var(--poliland-gold-soft, #f4d69a);
  font-size: 25px;
}
.location h2 {
  margin: 0;
  color: #fff;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(28px, 7.6vw, 34px);
  line-height: 1.1;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.location p {
  max-width: 34ch;
  margin: 12px 0 22px;
  color: rgba(244, 241, 232, 0.92);
  font-size: 15px;
  line-height: 1.6;
}
.location-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 24px;
  border-radius: 14px;
  background: var(--poliland-gold, #cba044);
  color: var(--ink, #1b1f1a);
  font: 800 15px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  text-decoration: none;
  box-shadow: 0 12px 26px -10px rgba(203, 160, 68, 0.85);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}
.location-btn ion-icon { font-size: 20px; }
.location-btn:active { transform: scale(0.97); }
.location-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }

.page-bottom-space { height: 20px; }

@keyframes card-in { from { opacity: 0; translate: 0 22px; scale: 0.97; } }

@media (min-width: 700px) {
  .contact-page { max-width: 760px; margin: 0 auto; }
  .contact-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .contact-card.is-primary { grid-column: 1 / -1; }
}

@media (prefers-reduced-motion: reduce) {
  .contact-card { animation: none; }
  .contact-card:active,
  .social-card:active,
  .location-btn:active { transform: none; }
  .contact-card:active .contact-arrow,
  .social-card:active .social-arrow { transform: none; }
}
</style>
