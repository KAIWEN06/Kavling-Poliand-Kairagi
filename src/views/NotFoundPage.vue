<template>
  <ion-page class="notfound-page">
    <ion-content :fullscreen="true" class="notfound-content">
      <div class="notfound-container">
        
        <!-- Ilustrasi Gambar 404 -->
        <div class="illustration-wrapper">
          <img 
            src="@/assets/illustrations/NotFound.webp" 
            alt="Halaman Tidak Ditemukan" 
            class="notfound-img"
          />
        </div>

        <!-- Teks Utama -->
        <div class="text-wrapper">
          <h1>Oops! Halaman Tidak Ditemukan</h1>
          <p>
            Sepertinya halaman yang Anda cari tidak tersedia, telah dipindahkan, atau alamat URL yang Anda masukkan salah.
          </p>
        </div>

        <!-- Tombol Aksi Kembali ke Beranda -->
        <div class="action-wrapper">
          <ion-button 
            expand="block" 
            class="back-button"
            @click="goToHome"
          >
            Kembali ke Beranda
          </ion-button>
        </div>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonButton } from '@ionic/vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const goToHome = () => {
  router.push('/')
}
</script>

<style scoped>
.notfound-page {
  --background: #0B132B;
}

.notfound-content {
  --background: #0B132B;
}

.notfound-container {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px 20px;
  max-width: 600px;
  margin: 0 auto;
}

.illustration-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.notfound-img {
  width: 100%;
  max-width: 280px;
  height: auto;
  object-fit: contain;
}

.text-wrapper {
  margin-top: 12px;
  margin-bottom: 24px;
}

.text-wrapper h1 {
  margin: 0 0 10px 0;
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.3px;
  line-height: 1.25;
}

.text-wrapper p {
  margin: 0 auto;
  max-width: 340px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.6;
}

.action-wrapper {
  width: 100%;
  max-width: 280px;
}

.back-button {
  --background: #00A86B;
  --background-hover: #00925d;
  --background-activated: #007d50;
  --color: #ffffff;
  --border-radius: 12px;
  --box-shadow: 0 10px 20px rgba(0, 168, 107, 0.25);
  font-size: 13px;
  font-weight: 700;
  height: 48px;
  margin: 0;
  text-transform: none;
}
</style>