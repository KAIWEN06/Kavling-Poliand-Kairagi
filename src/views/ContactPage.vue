<template>
  <ion-page>
    <ion-content class="contact-content">
      <ContactSkeleton v-if="isLoading" />

      <div v-else class="contact-page">
        <section class="contact-hero">
          <div class="hero-copy">
            <h1>Hubungi<br />Marketing Kami.</h1>

            <p>
              Punya pertanyaan tentang kavling, harga, lokasi, atau ingin
              melihat kawasan secara langsung? Tim marketing kami siap membantu.
            </p>
          </div>

          <div class="hero-decoration">
            <div class="decoration-circle circle-one"></div>
            <div class="decoration-circle circle-two"></div>
            <ion-icon :icon="callOutline" />
          </div>
        </section>

        <section class="contact-section">
          <div class="section-heading">
            <span class="section-label">TERHUBUNG DENGAN KAMI</span>
            <h2>Pilih cara yang paling nyaman</h2>
          </div>

          <div class="contact-list">
            <a
              v-for="item in contactItems"
              :key="item.title"
              :href="item.href"
              class="contact-card"
              :class="item.variant"
            >
              <div class="contact-icon">
                <ion-icon :icon="item.icon" />
              </div>

              <div class="contact-info">
                <span>{{ item.label }}</span>
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
              </div>

              <div class="contact-arrow">
                <ion-icon :icon="arrowForwardOutline" />
              </div>
            </a>
          </div>
        </section>

        <section class="social-section">
          <div class="section-heading">
            <span class="section-label">IKUTI PERJALANAN KAMI</span>
            <h2>PoliLand di Media Sosial</h2>
          </div>

          <div class="social-grid">
            <a
              v-for="social in socialItems"
              :key="social.name"
              :href="social.href"
              target="_blank"
              rel="noopener noreferrer"
              class="social-card"
              :class="social.variant"
            >
              <div class="social-icon">
                <ion-icon :icon="social.icon" />
              </div>

              <div class="social-info">
                <span>{{ social.platform }}</span>
                <h3>{{ social.name }}</h3>
                <p>{{ social.description }}</p>
              </div>

              <ion-icon
                class="social-arrow"
                :icon="arrowForwardOutline"
              />
            </a>
          </div>
        </section>

        <section class="location-card">
          <div class="location-icon">
            <ion-icon :icon="locationOutline" />
          </div>

          <div>
            <span class="section-label">LOKASI</span>
            <h2>PoliLand Kairagi</h2>
            <p>
              Kunjungi kawasan PoliLand Kairagi untuk melihat langsung kondisi
              lokasi dan pilihan kavling yang tersedia.
            </p>
          </div>

          <AppButton class="location-button" type="button">
            Hubungi Kami
            <ion-icon :icon="arrowForwardOutline" />
          </AppButton>
        </section>

        <!--
          Extra bottom breathing room.
          TabBar is global/fixed in MainLayout, so this is intentionally
          smaller than the TabBar reservation itself.
        -->
        <div class="page-bottom-space" aria-hidden="true"></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/vue'
import AppButton from '@/components/ui/AppButton.vue'
import ContactSkeleton from '@/components/ui/skeletons/ContactSkeleton.vue'

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

const isLoading = ref(false)

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

const socialItems: SocialItem[] = [
  {
    platform: 'INSTAGRAM',
    name: '@polilandkairagi',
    description: 'Foto, informasi, dan update terbaru.',
    href: 'https://instagram.com/',
    icon: logoInstagram,
    variant: 'instagram',
  },
  {
    platform: 'FACEBOOK',
    name: 'PoliLand Kairagi',
    description: 'Informasi kawasan dan aktivitas PoliLand.',
    href: 'https://facebook.com/',
    icon: logoFacebook,
    variant: 'facebook',
  },
  {
    platform: 'TIKTOK',
    name: '@polilandkairagi',
    description: 'Video singkat dan cerita dari kawasan.',
    href: 'https://tiktok.com/',
    icon: logoTiktok,
    variant: 'tiktok',
  },
]

const contactItems: ContactItem[] = [
  {
    label: 'WHATSAPP',
    title: 'Chat dengan Marketing',
    description: 'Tanyakan informasi kavling secara langsung.',
    href: 'https://wa.me/',
    icon: logoWhatsapp,
    variant: 'whatsapp',
  },
  {
    label: 'TELEPON',
    title: 'Hubungi Kami',
    description: 'Berbicara langsung dengan tim marketing.',
    href: 'tel:+620000000000',
    icon: callOutline,
    variant: 'phone',
  },
]

const handleRefresh = () => {
  isLoading.value = true
}

window.addEventListener('poliland:refresh', handleRefresh)
onBeforeUnmount(() => {
  window.removeEventListener('poliland:refresh', handleRefresh)
})
</script>

<style scoped>
.contact-content {
--background: var(--gallery-background);
  --padding-bottom: calc(110px + env(safe-area-inset-bottom));
}

.contact-page {
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: 18px 18px 0;
}

.contact-hero {
  position: relative;
  min-height: 285px;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 30px 25px;
  border-radius: 25px;
  background:
    linear-gradient(
      115deg,
      rgba(26, 26, 26, 0.99),
      rgba(45, 45, 45, 0.97) 55%,
      rgba(85, 107, 47, 0.94)
    );
  box-shadow: 0 15px 38px rgba(26, 26, 26, 0.12);
}

.hero-copy {
  position: relative;
  z-index: 2;
  max-width: 590px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  margin-bottom: 15px;
  border: 1px solid rgba(244, 227, 178, 0.32);
  border-radius: 999px;
  color: #f4e3b2;
  background: rgba(255, 255, 255, 0.06);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.eyebrow ion-icon {
  font-size: 15px;
}

.contact-hero h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(30px, 8vw, 46px);
  line-height: 1.03;
  font-weight: 850;
  letter-spacing: -0.045em;
}

.contact-hero p {
  max-width: 520px;
  margin: 15px 0 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  line-height: 1.65;
}

.hero-decoration {
  position: absolute;
  right: -70px;
  bottom: -85px;
  width: 300px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(244, 227, 178, 0.22);
}

.hero-decoration > ion-icon {
  position: relative;
  z-index: 2;
  font-size: 82px;
}

.decoration-circle {
  position: absolute;
  border: 1px solid rgba(244, 227, 178, 0.17);
  border-radius: 50%;
}

.circle-one {
  width: 215px;
  height: 215px;
}

.circle-two {
  width: 305px;
  height: 305px;
}

.contact-section {
  padding: 28px 2px 8px;
}

.section-heading {
  margin-bottom: 15px;
}

.section-label {
  display: block;
  color: #b8860b;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.14em;
}

.section-heading h2 {
  margin: 5px 0 0;
  color: #1a1a1a;
  font-size: 21px;
  line-height: 1.18;
  font-weight: 850;
  letter-spacing: -0.025em;
}

.contact-list {
  display: grid;
  gap: 11px;
}

.contact-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  min-height: 90px;
  padding: 14px;
  border: 1px solid #e5e5e5;
  border-radius: 19px;
  color: inherit;
  background: #ffffff;
  text-decoration: none;
  box-shadow: 0 5px 18px rgba(26, 26, 26, 0.055);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.contact-card:active {
  transform: scale(0.985);
}

.contact-icon {
  width: 50px;
  height: 50px;
  flex: 0 0 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
}

.contact-icon ion-icon {
  font-size: 24px;
}

.contact-card.whatsapp .contact-icon {
  color: #556b2f;
  background: rgba(85, 107, 47, 0.11);
}

.contact-card.phone .contact-icon {
  color: #b8860b;
  background: rgba(184, 134, 11, 0.11);
}

.contact-info {
  min-width: 0;
  flex: 1;
}

.contact-info > span {
  color: #6b6b6b;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.contact-info h3 {
  margin: 3px 0 3px;
  color: #1a1a1a;
  font-size: 15px;
  font-weight: 850;
}

.contact-info p {
  margin: 0;
  color: #6b6b6b;
  font-size: 11px;
  line-height: 1.45;
}

.contact-arrow {
  width: 31px;
  height: 31px;
  flex: 0 0 31px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #556b2f;
  background: #f1f3eb;
}

.contact-arrow ion-icon {
  font-size: 16px;
}

.social-section {
  padding: 22px 2px 8px;
}

.social-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.social-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 78px;
  padding: 12px 13px;
  border: 1px solid #e5e5e5;
  border-radius: 17px;
  color: inherit;
  background: #ffffff;
  text-decoration: none;
  box-shadow: 0 5px 18px rgba(26, 26, 26, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.social-card:active {
  transform: scale(0.985);
}

.social-icon {
  width: 45px;
  height: 45px;
  flex: 0 0 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
}

.social-icon ion-icon {
  font-size: 22px;
}

.social-card.instagram .social-icon {
  color: #b8860b;
  background: #f4ead0;
}

.social-card.facebook .social-icon {
  color: #556b2f;
  background: #e9eee1;
}

.social-card.tiktok .social-icon {
  color: #2d2d2d;
  background: #eeeeeb;
}

.social-info {
  min-width: 0;
  flex: 1;
}

.social-info span {
  display: block;
  color: #b8860b;
  font-size: 8px;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.social-info h3 {
  margin: 3px 0 2px;
  overflow: hidden;
  color: #1a1a1a;
  font-size: 14px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.social-info p {
  margin: 0;
  color: #6b6b6b;
  font-size: 10px;
  line-height: 1.4;
}

.social-arrow {
  flex: 0 0 auto;
  color: #8ca072;
  font-size: 17px;
}

.location-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 15px;
  margin-top: 18px;
  padding: 20px;
  border: 1px solid rgba(85, 107, 47, 0.16);
  border-radius: 21px;
  background: linear-gradient(135deg, #ffffff, #f4f0e5);
}

.location-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  color: #556b2f;
  background: rgba(85, 107, 47, 0.1);
}

.location-icon ion-icon {
  font-size: 25px;
}

.location-card h2 {
  margin: 4px 0 4px;
  color: #1a1a1a;
  font-size: 17px;
  font-weight: 850;
}

.location-card p {
  max-width: 500px;
  margin: 0;
  color: #6b6b6b;
  font-size: 11px;
  line-height: 1.55;
}

.page-bottom-space {
  /*
    MainLayout already reserves the actual TabBar footprint.
    This additional space is only the visual breathing room between
    the final card and the top edge of the floating TabBar.
  */
  height: 20px;
}

@media (min-width: 700px) {
  .contact-page {
    padding: 28px 28px 0;
  }

  .contact-hero {
    min-height: 330px;
    padding: 42px;
  }

  .contact-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .social-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .contact-card {
    min-height: 105px;
    padding: 17px;
  }
}

@media (min-width: 1024px) {
  .contact-page {
    padding-top: 34px;
  }

  .contact-hero {
    min-height: 350px;
  }

  .location-card {
    padding: 24px;
  }
}

@media (max-width: 560px) {
  .contact-page {
    padding-inline: 14px;
  }

  .contact-hero {
    min-height: 300px;
    padding: 27px 22px;
    border-radius: 23px;
  }

  .hero-decoration {
    right: -105px;
    bottom: -80px;
  }

  .location-card {
    grid-template-columns: auto 1fr;
  }

  .location-button {
    grid-column: 1 / -1;
    width: 100%;
    justify-content: center;
  }
}
</style>
