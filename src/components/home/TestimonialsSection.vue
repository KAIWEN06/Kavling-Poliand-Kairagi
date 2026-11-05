<template>
  <section class="testimonials-section">
    <div class="section-heading">
      <div>
        <h2>Testimoni</h2>
        <span class="heading-line"></span>
      </div>

      <span class="testimonial-count">
        {{ testimonials.length }} cerita
      </span>
    </div>

    <div class="testimonials-intro">
      <p>
        Pengalaman calon pembeli dan pelanggan saat mencari kavling
        di PoliLand Kairagi.
      </p>
    </div>

    <div class="testimonials-scroll">
      <article
        v-for="testimonial in testimonials"
        :key="testimonial.id"
        class="testimonial-card"
      >
        <div class="testimonial-top">
          <div class="avatar" :aria-label="`Foto ${testimonial.name}`">
            {{ testimonial.initial }}
          </div>

          <div class="person-info">
            <h3>{{ testimonial.name }}</h3>
            <span>{{ testimonial.role }}</span>
          </div>

          <div class="stars" :aria-label="`${testimonial.rating} dari 5 bintang`">
            <ion-icon
              v-for="index in 5"
              :key="index"
              :icon="index <= testimonial.rating ? star : starOutline"
              class="star-icon"
            />
          </div>
        </div>

        <div class="quote-mark">“</div>

        <p class="testimonial-text">
          {{ testimonial.message }}
        </p>

        <div class="testimonial-footer">
          <span class="lot-tag" v-if="testimonial.lot">
            {{ testimonial.lot }}
          </span>
          <span class="verified" v-if="testimonial.verified">
            ✓ Pembeli terverifikasi
          </span>
        </div>
      </article>
    </div>

    <div class="testimonial-note">
      <span class="note-dot"></span>
      Testimoni ditampilkan sebagai pengalaman nyata pelanggan.
    </div>
  </section>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { star, starOutline } from 'ionicons/icons'

interface Testimonial {
  id: number
  name: string
  role: string
  initial: string
  rating: number
  message: string
  lot?: string
  verified?: boolean
}

/**
 * Contoh data.
 * Ganti isi array ini dengan data testimoni dari database/Supabase
 * ketika fitur testimoni sudah tersedia.
 */
const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Andi Pratama',
    role: 'Calon Pembeli',
    initial: 'A',
    rating: 5,
    message:
      'Informasi kavlingnya mudah dipahami. Saya juga terbantu dengan siteplan karena bisa melihat posisi kavling sebelum menghubungi marketing.',
    lot: 'Blok A - 01',
  },
  {
    id: 2,
    name: 'Maria Lumenta',
    role: 'Pembeli',
    initial: 'M',
    rating: 5,
    message:
      'Saya suka karena detail ukuran, harga, dan status kavling bisa dilihat dengan cepat. Jadi lebih mudah menentukan pilihan.',
    lot: 'Blok B - 05',
  },
  {
    id: 3,
    name: 'Rico Sondakh',
    role: 'Calon Pembeli',
    initial: 'R',
    rating: 4,
    message:
      'Siteplan interaktifnya sangat membantu. Saya bisa melihat beberapa lokasi kavling terlebih dahulu sebelum datang ke lokasi.',
    lot: 'Blok A - 12',
  },
  {
    id: 4,
    name: 'Cindy Waworuntu',
    role: 'Pembeli',
    initial: 'C',
    rating: 5,
    message:
      'Tampilannya sederhana dan informasi yang saya cari tidak sulit ditemukan. Saya terutama terbantu dengan informasi lokasi dan harga.',
    lot: 'Blok C - 03',
  },
  {
    id: 5,
    name: 'Kevin Tumiwa',
    role: 'Calon Pembeli',
    initial: 'K',
    rating: 5,
    message:
      'Saya awalnya hanya ingin melihat-lihat pilihan kavling. Setelah melihat siteplan dan detailnya, saya jadi lebih mudah membandingkan lokasi.',
    lot: 'Blok B - 08',
  },
  {
    id: 6,
    name: 'Daniel Roring',
    role: 'Pembeli',
    initial: 'D',
    rating: 4,
    message:
      'Informasi progress dan kondisi kavling membuat saya lebih yakin untuk mencari tahu lebih lanjut. Respons marketing juga cukup membantu.',
    lot: 'Blok C - 07',
  },
]
</script>

<style scoped>
.testimonials-section {
  width: 100%;
  padding: 28px 16px 8px;
  box-sizing: border-box;
  background: #fafaf7;
  overflow: hidden;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.section-heading h2 {
  margin: 0;
  color: #1a1a1a;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.3px;
}

.heading-line {
  display: block;
  width: 34px;
  height: 3px;
  margin-top: 7px;
  background: #556b2f;
  border-radius: 999px;
}

.testimonial-count {
  color: #6b6b6b;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.testimonials-intro {
  margin-bottom: 14px;
}

.testimonials-intro p {
  max-width: 330px;
  margin: 0;
  color: #6b6b6b;
  font-size: 12px;
  line-height: 1.55;
}

.testimonials-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  margin: 0 -16px;
  padding: 2px 16px 10px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.testimonials-scroll::-webkit-scrollbar {
  display: none;
}

.testimonial-card {
  flex: 0 0 calc(88vw - 16px);
  max-width: 360px;
  min-height: 205px;
  padding: 16px;
  box-sizing: border-box;
  scroll-snap-align: start;

  background: #ffffff;
  border: 1px solid #e5e5e0;
  border-radius: 18px;
  box-shadow: 0 5px 18px rgba(26, 26, 26, 0.06);
}

.testimonial-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  place-items: center;

  border-radius: 50%;
  background: linear-gradient(135deg, #2e4d2d, #8ca072);
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
}

.person-info {
  min-width: 0;
  flex: 1;
}

.person-info h3 {
  margin: 0 0 2px;
  color: #1a1a1a;
  font-size: 13px;
  font-weight: 800;
}

.person-info span {
  color: #7a7a7a;
  font-size: 10px;
}

.stars {
  display: flex;
  gap: 1px;
  color: #b8860b;
}

.star-icon {
  font-size: 13px;
}

.quote-mark {
  height: 18px;
  margin-top: 10px;
  color: #b8860b;
  font-family: Georgia, serif;
  font-size: 34px;
  line-height: 24px;
  font-weight: 700;
}

.testimonial-text {
  min-height: 68px;
  margin: 2px 0 14px;
  color: #333333;
  font-size: 12px;
  line-height: 1.65;
}

.testimonial-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 11px;
  border-top: 1px solid #eeeeea;
}

.lot-tag {
  padding: 5px 8px;
  border-radius: 999px;
  background: #f9f5ec;
  color: #556b2f;
  font-size: 9px;
  font-weight: 800;
}

.verified {
  color: #2e7d32;
  font-size: 9px;
  font-weight: 700;
}

.testimonial-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  color: #8a8a8a;
  font-size: 9px;
  line-height: 1.4;
}

.note-dot {
  width: 5px;
  height: 5px;
  flex: 0 0 5px;
  border-radius: 50%;
  background: #8ca072;
}

@media (min-width: 768px) {
  .testimonials-section {
    padding-left: 24px;
    padding-right: 24px;
  }

  .testimonials-scroll {
    margin-left: 0;
    margin-right: 0;
    padding-left: 0;
    padding-right: 0;
  }

  .testimonial-card {
    flex-basis: 320px;
  }
}
</style>
