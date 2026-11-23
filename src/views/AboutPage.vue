<template>
  <ion-page>
    <ion-content class="about-content">
      <div class="about-page">
        <!-- HERO -->
        <section class="about-hero">
          <button class="back-btn" type="button" aria-label="Kembali" @click="goBack">
            <ion-icon :icon="arrowBackOutline" />
            Kembali
          </button>
          <span class="eyebrow">TENTANG POLILAND</span>
          <h1>Membangun masa depan,<br />satu kavling demi kavling.</h1>
          <p>
            PoliLand Kairagi adalah kawasan kavling di Manado yang dikembangkan
            untuk hunian dan investasi jangka panjang dengan legalitas yang jelas.
          </p>
        </section>

        <!-- PROFIL -->
        <section class="block">
          <h2>Profil Kami</h2>
          <span class="heading-line"></span>
          <p>
            Kami hadir untuk memberikan solusi kepemilikan tanah yang aman,
            nyaman, dan menguntungkan. Setiap kavling disiapkan dengan batas yang
            jelas, akses jalan yang baik, serta informasi yang terbuka sehingga
            calon pembeli dapat mengambil keputusan dengan tenang.
          </p>
          <p>
            Berlokasi di kawasan Kairagi yang terus berkembang, dekat dengan
            Politeknik Negeri Manado, pusat perbelanjaan, dan akses utama menuju
            pusat kota.
          </p>
        </section>

        <!-- ANGKA -->
        <section class="stats">
          <div v-for="stat in stats" :key="stat.label" class="stat">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </div>
        </section>

        <!-- VIDEO -->
        <section class="block">
          <h2>Video Profil</h2>
          <span class="heading-line"></span>
          <div class="video-box">
            <video
              :src="videoUrl"
              :poster="poster"
              controls
              playsinline
              preload="metadata"
            />
          </div>
        </section>

        <!-- VISI MISI -->
        <section class="block">
          <h2>Visi & Misi</h2>
          <span class="heading-line"></span>
          <div class="card">
            <h3>Visi</h3>
            <p>
              Menjadi pengembang kawasan kavling terpercaya di Sulawesi Utara
              yang memberikan nilai tumbuh bagi setiap pemilik lahan.
            </p>
          </div>
          <div class="card">
            <h3>Misi</h3>
            <ul>
              <li v-for="item in missions" :key="item">
                <ion-icon :icon="checkmarkCircleOutline" />
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>
        </section>

        <!-- NILAI -->
        <section class="block">
          <h2>Nilai Kami</h2>
          <span class="heading-line"></span>
          <div class="values">
            <article v-for="value in values" :key="value.title" class="value">
              <div class="value-icon"><ion-icon :icon="value.icon" /></div>
              <div>
                <h3>{{ value.title }}</h3>
                <p>{{ value.text }}</p>
              </div>
            </article>
          </div>
        </section>

        <!-- CTA -->
        <section class="cta">
          <h2>Ingin tahu lebih lanjut?</h2>
          <p>Tim kami siap menjawab pertanyaan Anda dan mengantar melihat kawasan secara langsung.</p>
          <ion-button class="cta-btn" @click="contactWhatsapp">
            <ion-icon slot="start" :icon="logoWhatsapp" />
            Hubungi via WhatsApp
          </ion-button>
        </section>

        <div class="bottom-space" aria-hidden="true"></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/vue'
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  logoWhatsapp,
  shieldCheckmarkOutline,
  eyeOutline,
  peopleOutline,
  trendingUpOutline,
} from 'ionicons/icons'
import { useRouter } from 'vue-router'
import poster from '@/assets/images/hero2.jpg'

const router = useRouter()

// Video contoh. Ganti dengan video profil asli bila sudah tersedia.
const videoUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

const stats = [
  { value: 'SHM', label: 'Legalitas' },
  { value: '100%', label: 'Akses Jalan' },
  { value: 'Manado', label: 'Lokasi' },
]

const missions = [
  'Menyediakan kavling dengan legalitas yang jelas dan aman.',
  'Membangun infrastruktur dan akses jalan yang memadai.',
  'Menjaga transparansi harga, progres, dan informasi kepada pembeli.',
  'Memberikan pelayanan yang ramah, cepat, dan profesional.',
]

const values = [
  { icon: shieldCheckmarkOutline, title: 'Terpercaya', text: 'Legalitas dan proses jual beli yang jelas serta terdokumentasi.' },
  { icon: eyeOutline, title: 'Transparan', text: 'Informasi harga dan perkembangan pembangunan dapat dipantau kapan saja.' },
  { icon: trendingUpOutline, title: 'Bernilai Investasi', text: 'Kawasan strategis dengan prospek kenaikan nilai jangka panjang.' },
  { icon: peopleOutline, title: 'Melayani Sepenuh Hati', text: 'Tim kami mendampingi Anda dari survei hingga serah terima.' },
]

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/home')
}

const contactWhatsapp = () => {
  window.open('https://wa.me/6281234567890', '_blank')
}
</script>

<style scoped>
.about-content { --background: #FAFAF7; }
.about-page { padding-bottom: calc(110px + env(safe-area-inset-bottom)); }

.about-hero { padding: 20px 16px 28px; background: linear-gradient(160deg, #556B2F, #3f5022); color: #fff; }
.back-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 0; margin-bottom: 14px; border: 0; background: transparent; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
.eyebrow { display: block; margin-bottom: 8px; font-size: 10px; font-weight: 800; letter-spacing: 1px; opacity: 0.85; }
.about-hero h1 { margin: 0 0 10px; font-size: 24px; line-height: 1.25; font-weight: 800; letter-spacing: -0.4px; }
.about-hero p { margin: 0; font-size: 13px; line-height: 1.65; opacity: 0.92; }

.block { padding: 26px 16px 0; }
.block h2 { margin: 0; color: #1A1A1A; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
.heading-line { display: block; width: 34px; height: 3px; margin: 7px 0 14px; background: #556B2F; border-radius: 999px; }
.block > p { margin: 0 0 10px; color: #475569; font-size: 13px; line-height: 1.7; }

.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 22px 16px 0; padding: 14px 8px; background: #fff; border-radius: 14px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.07); }
.stat { display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
.stat strong { color: #556B2F; font-size: 18px; font-weight: 800; }
.stat span { color: #64748b; font-size: 11px; font-weight: 600; }

.video-box { aspect-ratio: 16 / 9; overflow: hidden; border-radius: 14px; background: #000; box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12); }
.video-box video { width: 100%; height: 100%; object-fit: cover; }

.card { padding: 14px; margin-bottom: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; }
.card h3 { margin: 0 0 6px; color: #556B2F; font-size: 14px; font-weight: 800; }
.card p { margin: 0; color: #475569; font-size: 13px; line-height: 1.65; }
.card ul { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; }
.card li { display: flex; align-items: flex-start; gap: 8px; color: #334155; font-size: 13px; line-height: 1.55; }
.card li ion-icon { flex: 0 0 auto; margin-top: 2px; color: #556B2F; font-size: 16px; }

.values { display: flex; flex-direction: column; gap: 10px; }
.value { display: flex; gap: 12px; padding: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; }
.value-icon { display: flex; flex: 0 0 40px; align-items: center; justify-content: center; width: 40px; height: 40px; background: #f4f7f0; color: #556B2F; border-radius: 12px; font-size: 20px; }
.value h3 { margin: 0 0 3px; color: #1A1A1A; font-size: 14px; font-weight: 800; }
.value p { margin: 0; color: #64748b; font-size: 12px; line-height: 1.55; }

.cta { margin: 28px 16px 0; padding: 22px 18px; text-align: center; background: #556B2F; color: #fff; border-radius: 18px; }
.cta h2 { margin: 0 0 6px; font-size: 18px; font-weight: 800; }
.cta p { margin: 0 0 14px; font-size: 12px; line-height: 1.6; opacity: 0.92; }
.cta-btn { --background: #25D366; --color: #fff; --border-radius: 10px; font-weight: 700; }

.bottom-space { height: 20px; }

@media (min-width: 768px) {
  .about-page { max-width: 720px; margin: 0 auto; }
}
</style>
