<template>
  <!-- Dekoratif: nama menu sudah ada sebagai teks di bawah ikon. -->
  <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <!-- Denah: peta lipat berpetak dengan satu petak terpilih -->
    <template v-if="name === 'denah'">
      <path d="M5 12 L17 8 V37 L5 41 Z" fill="#7FA06C" />
      <path d="M17 8 L31 12 V41 L17 37 Z" fill="#A3BA8B" />
      <path d="M31 12 L43 8 V37 L31 41 Z" fill="#5C8D4E" />
      <path d="M5 23 L17 19 L31 23 L43 19 M5 32 L17 28 L31 32 L43 28" fill="none" stroke="#F9F5EC" stroke-width="1.4" />
      <path d="M17 19.8 L24 21.8 V30 L17 28 Z" fill="#F4D69A" />
    </template>

    <!-- Lokasi: pin emas di atas petak tanah -->
    <template v-else-if="name === 'lokasi'">
      <path d="M24 29 L44 36 L24 44 L4 36 Z" fill="#A3BA8B" />
      <path d="M14 32.5 L34 40 M34 32.5 L14 40" fill="none" stroke="#F9F5EC" stroke-width="1.4" />
      <ellipse cx="24" cy="35" rx="6" ry="2.2" fill="#2B4824" opacity="0.35" />
      <path d="M24 4 C16.8 4 12 9.2 12 15.6 C12 23.4 24 35 24 35 C24 35 36 23.4 36 15.6 C36 9.2 31.2 4 24 4 Z" fill="#CBA044" />
      <path d="M24 4 C31.2 4 36 9.2 36 15.6 C36 23.4 24 35 24 35 Z" fill="#B0872F" />
      <circle cx="24" cy="15.5" r="5" fill="#FFF7E4" />
    </template>

    <!-- Progres: helm proyek -->
    <template v-else-if="name === 'progres'">
      <path d="M8 31 C8 19.5 15 12 24 12 C33 12 40 19.5 40 31 Z" fill="#CBA044" />
      <path d="M24 12 C33 12 40 19.5 40 31 H24 Z" fill="#B0872F" />
      <rect x="20" y="8" width="8" height="19" rx="3" fill="#F4D69A" />
      <rect x="4" y="30" width="40" height="6" rx="3" fill="#355A2C" />
      <path d="M10 41 H38" stroke="#A3BA8B" stroke-width="3" stroke-linecap="round" />
    </template>

    <!-- Galeri: dua foto bertumpuk -->
    <template v-else-if="name === 'galeri'">
      <rect x="12" y="7" width="31" height="26" rx="4" fill="#F4D69A" transform="rotate(8 27.5 20)" />
      <rect x="5" y="14" width="34" height="28" rx="5" fill="#355A2C" />
      <rect x="8.5" y="17.5" width="27" height="21" rx="2.5" fill="#E3EEDB" />
      <circle cx="28.5" cy="23.5" r="3.4" fill="#CBA044" />
      <path d="M8.5 36 L18 25 L25 33 L29 29.5 L35.5 36 C35.5 37.4 34.4 38.5 33 38.5 H11 C9.6 38.5 8.5 37.4 8.5 36 Z" fill="#5C8D4E" />
    </template>

    <!-- Ulasan: balon bicara dengan bintang -->
    <template v-else-if="name === 'ulasan'">
      <path d="M10 8 H38 C41.3 8 44 10.7 44 14 V30 C44 33.3 41.3 36 38 36 H22 L12 43 V36 H10 C6.7 36 4 33.3 4 30 V14 C4 10.7 6.7 8 10 8 Z" fill="#5C8D4E" />
      <path d="M24 13 L27 19.2 L33.8 20.1 L28.9 24.8 L30.1 31.6 L24 28.4 L17.9 31.6 L19.1 24.8 L14.2 20.1 L21 19.2 Z" fill="#F4D69A" />
    </template>

    <!-- Tentang: kantor pengelola dan pohon -->
    <template v-else-if="name === 'tentang'">
      <circle cx="37" cy="26" r="8" fill="#7FA06C" />
      <rect x="35.8" y="30" width="2.4" height="12" fill="#805708" />
      <rect x="9" y="20" width="22" height="22" fill="#F4D69A" />
      <path d="M5 22 L20 8 L35 22 Z" fill="#355A2C" />
      <rect x="16.5" y="30" width="7" height="12" rx="1" fill="#805708" />
      <path d="M12 25 H17 V29 H12 Z M23 25 H28 V29 H23 Z" fill="#FFFFFF" />
      <path d="M4 42 H45" stroke="#2B4824" stroke-width="2.4" stroke-linecap="round" />
    </template>

    <!-- Kontak: gagang telepon dan gelombang suara -->
    <template v-else-if="name === 'kontak'">
      <circle cx="22" cy="26" r="18" fill="#E3EEDB" />
      <path d="M14.5 11 L20 10 L23.5 19 L19.5 22 C21.4 26.4 24.4 29.4 28.6 31.4 L31.6 27.4 L40 31 L39 36.6 C38.6 38.8 36.8 40.2 34.6 40 C21.6 38.8 12.2 29.4 11 16 C10.8 13.6 12.2 11.4 14.5 11 Z" fill="#355A2C" />
      <path d="M29 12 C33.6 13 37 16.4 38 21 M30 5 C37.8 6.2 43.8 12.2 45 20" fill="none" stroke="#CBA044" stroke-width="3" stroke-linecap="round" />
    </template>

    <!-- Tambah klien: orang dengan tanda tambah -->
    <template v-else-if="name === 'klien'">
      <circle cx="20" cy="15" r="9" fill="#F4D69A" />
      <path d="M4 42 C4 32.6 11.2 27 20 27 C28.8 27 36 32.6 36 42 Z" fill="#5C8D4E" />
      <path d="M20 27 C28.8 27 36 32.6 36 42 H20 Z" fill="#355A2C" />
      <circle cx="36" cy="17" r="9" fill="#CBA044" />
      <path d="M36 12.5 V21.5 M31.5 17 H40.5" stroke="#FFF7E4" stroke-width="2.8" stroke-linecap="round" />
    </template>

    <!-- Pembayaran: dompet dengan uang menyembul -->
    <template v-else-if="name === 'pembayaran'">
      <rect x="10" y="7" width="28" height="18" rx="3" fill="#A3BA8B" />
      <circle cx="24" cy="15" r="4" fill="#E3EEDB" />
      <rect x="5" y="15" width="38" height="27" rx="6" fill="#355A2C" />
      <path d="M29 23 H43 V34 H29 C25.9 34 23.5 31.5 23.5 28.5 C23.5 25.5 25.9 23 29 23 Z" fill="#CBA044" />
      <circle cx="30" cy="28.5" r="2.6" fill="#FFF7E4" />
    </template>

    <!-- SPK: lembar surat dengan cap -->
    <template v-else-if="name === 'spk'">
      <path d="M10 5 H29 L38 14 V40 C38 41.7 36.7 43 35 43 H10 C8.3 43 7 41.7 7 40 V8 C7 6.3 8.3 5 10 5 Z" fill="#5C8D4E" />
      <path d="M29 5 L38 14 H29 Z" fill="#A3BA8B" />
      <path d="M13 18 H30 M13 24 H30 M13 30 H22" stroke="#F9F5EC" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="34" cy="34" r="9" fill="#CBA044" />
      <path d="M30 34 L33 37 L38.5 31" fill="none" stroke="#FFF7E4" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
    </template>

    <!-- Survei: kalender dengan satu tanggal terpilih -->
    <template v-else-if="name === 'survei'">
      <rect x="6" y="10" width="36" height="33" rx="6" fill="#E3EEDB" />
      <path d="M12 10 H36 C39.3 10 42 12.7 42 16 V20 H6 V16 C6 12.7 8.7 10 12 10 Z" fill="#355A2C" />
      <path d="M15 6 V14 M33 6 V14" stroke="#CBA044" stroke-width="3.4" stroke-linecap="round" />
      <path d="M12 25 H18 V30 H12 Z M21 25 H27 V30 H21 Z M30 25 H36 V30 H30 Z M12 33 H18 V38 H12 Z M21 33 H27 V38 H21 Z" fill="#7FA06C" />
      <rect x="29" y="32" width="8" height="7" rx="1.5" fill="#CBA044" />
    </template>

    <!-- Konten: halaman situs dengan pensil -->
    <template v-else-if="name === 'konten'">
      <rect x="4" y="9" width="34" height="31" rx="5" fill="#355A2C" />
      <rect x="7.5" y="17" width="27" height="19.5" rx="2" fill="#E3EEDB" />
      <path d="M9.5 13 H10.5 M15 13 H16" stroke="#F4D69A" stroke-width="3" stroke-linecap="round" />
      <path d="M12 23 H27 M12 29 H21" stroke="#5C8D4E" stroke-width="2.6" stroke-linecap="round" />
      <path d="M39 19 L45 25 L31 39 L23.5 40.5 L25 33 Z" fill="#CBA044" />
      <path d="M45 25 L31 39 L28 36 L42 22 Z" fill="#B0872F" />
    </template>

    <!-- Tim: dua orang berdampingan -->
    <template v-else-if="name === 'tim'">
      <circle cx="32" cy="16" r="7" fill="#F4D69A" />
      <path d="M22 40 C22 31.7 26.5 26.5 33 26.5 C39.5 26.5 44 31.7 44 40 Z" fill="#CBA044" />
      <circle cx="17" cy="17" r="8.5" fill="#7FA06C" />
      <path d="M3 42 C3 33 9 28 17 28 C25 28 31 33 31 42 Z" fill="#355A2C" />
    </template>

    <!-- Favorit: penanda dengan hati -->
    <template v-else-if="name === 'favorit'">
      <path d="M10 6 H38 V43 L24 34 L10 43 Z" fill="#5C8D4E" />
      <path d="M24 6 H38 V43 L24 34 Z" fill="#355A2C" />
      <path d="M24 27 C14 21 15.5 12.5 20.5 12.5 C22.4 12.5 23.5 13.7 24 14.8 C24.5 13.7 25.6 12.5 27.5 12.5 C32.5 12.5 34 21 24 27 Z" fill="#F4D69A" />
    </template>

    <!-- Akun: satu orang di dalam lingkaran -->
    <template v-else-if="name === 'akun'">
      <circle cx="24" cy="24" r="20" fill="#F4D69A" />
      <circle cx="24" cy="19" r="8" fill="#CBA044" />
      <path d="M10 38.3 C12 31.8 17.4 29 24 29 C30.6 29 36 31.8 38 38.3 C34.4 42 29.4 44 24 44 C18.6 44 13.6 42 10 38.3 Z" fill="#355A2C" />
    </template>

    <!-- Minat pembeli: diagram batang -->
    <template v-else-if="name === 'minat'">
      <rect x="7" y="27" width="9" height="14" rx="2" fill="#A3BA8B" />
      <rect x="19.5" y="18" width="9" height="23" rx="2" fill="#5C8D4E" />
      <rect x="32" y="8" width="9" height="33" rx="2" fill="#CBA044" />
      <path d="M4 42 H44" stroke="#2B4824" stroke-width="2.4" stroke-linecap="round" />
    </template>

    <!-- Data ganda: dua lembar data yang disatukan -->
    <template v-else-if="name === 'gabung'">
      <rect x="5" y="6" width="25" height="29" rx="5" fill="#A3BA8B" />
      <rect x="18" y="14" width="25" height="29" rx="5" fill="#355A2C" />
      <path d="M24 24 H37 M24 31 H33" stroke="#F9F5EC" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="14" cy="36" r="8" fill="#CBA044" />
      <path d="M10 36 H18 M15 33 L18 36 L15 39" fill="none" stroke="#FFF7E4" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    </template>

    <!-- WhatsApp: balon obrolan dengan tiga titik -->
    <template v-else>
      <path d="M24 5 C13 5 4.5 13 4.5 23 C4.5 26.6 5.6 29.9 7.6 32.7 L5 43 L16 40.2 C18.5 41.2 21.2 41.8 24 41.8 C35 41.8 43.5 33.4 43.5 23.4 C43.5 13.4 35 5 24 5 Z" fill="#1F7A46" />
      <circle cx="15.5" cy="23.5" r="3" fill="#FFFFFF" />
      <circle cx="24" cy="23.5" r="3" fill="#FFFFFF" />
      <circle cx="32.5" cy="23.5" r="3" fill="#FFFFFF" />
    </template>
  </svg>
</template>

<script setup lang="ts">
export type MenuIllustrationName =
  | 'denah' | 'lokasi' | 'progres' | 'galeri' | 'ulasan' | 'tentang' | 'kontak' | 'whatsapp'
  | 'klien' | 'pembayaran' | 'spk' | 'survei' | 'konten' | 'tim' | 'minat' | 'gabung' | 'favorit' | 'akun'

defineProps<{ name: MenuIllustrationName }>()
</script>

<style scoped>
svg { display: block; width: 100%; height: 100%; }
</style>
