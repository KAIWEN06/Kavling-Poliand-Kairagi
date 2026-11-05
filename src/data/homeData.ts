import {
  locationOutline,
  shieldCheckmarkOutline,
  navigateOutline,
  ribbonOutline,
} from 'ionicons/icons'

import hero1 from '@/assets/images/hero.jpg'
import hero2 from '@/assets/images/hero2.jpg'
import hero3 from '@/assets/images/hero3.jpg'
import hero4 from '@/assets/images/hero4.jpg'
import hero5 from '@/assets/images/hero5.jpg'

export const features = [
  {
    title: 'Lokasi Strategis',
    description: 'Berlokasi di kawasan berkembang dengan akses mudah ke pusat kota dan fasilitas umum.',
    icon: locationOutline,
    color: 'green',
  },
  {
    title: 'Legalitas SHM',
    description: 'Setiap kavling memiliki sertifikat Hak Milik (SHM) yang aman dan terpercaya.',
    icon: shieldCheckmarkOutline,
    color: 'blue',
  },
  {
    title: 'Akses Mudah',
    description: 'Jalan lebar, lingkungan nyaman, dan infrastruktur yang terus berkembang.',
    icon: navigateOutline,
    color: 'yellow',
  },
  {
    title: 'Investasi Menguntungkan',
    description: 'Nilai tanah terus meningkat seiring perkembangan kawasan.',
    icon: ribbonOutline,
    color: 'green',
  },
]

export const galleryImages = [hero1, hero2, hero3, hero4, hero5]

export const previewLots = [
  { number: 1, status: 'available' },
  { number: 2, status: 'available' },
  { number: 3, status: 'available' },
  { number: 4, status: 'booking' },
  { number: 5, status: 'sold' },
  { number: 6, status: 'sold' },
  { number: 7, status: 'available' },
  { number: 8, status: 'available' },
  { number: 9, status: 'available' },
  { number: 10, status: 'available' },
  { number: 11, status: 'sold' },
  { number: 12, status: 'sold' },
]

export const progressItems = [
  {
    title: 'Pematangan Lahan',
    date: '12 Jan 2024',
    description: 'Persiapan lahan dan pembersihan area.',
    image: hero1,
    status: 'completed',
    statusText: 'Selesai',
  },
  {
    title: 'Jalan Utama',
    date: '28 Feb 2024',
    description: 'Pembangunan akses jalan utama.',
    image: hero2,
    status: 'completed',
    statusText: 'Selesai',
  },
  {
    title: 'Drainase',
    date: '15 Mar 2024',
    description: 'Pembangunan sistem drainase.',
    image: hero3,
    status: 'completed',
    statusText: 'Selesai',
  },
  {
    title: 'Taman & Fasilitas',
    date: '2 Apr 2024',
    description: 'Pembangunan fasilitas kawasan.',
    image: hero4,
    status: 'progress',
    statusText: 'Dalam Proses',
  },
]

export const faqsData = [
  {
    question: 'Apakah legalitas sudah bersertifikat?',
    answer: 'Informasi legalitas dapat dikonfirmasi langsung kepada tim PoliLand Kairagi.',
  },
  {
    question: 'Berapa harga kavling di PoliLand Kairagi?',
    answer: 'Harga mengikuti tipe dan lokasi kavling. Silakan hubungi marketing untuk informasi terbaru.',
  },
  {
    question: 'Apakah bisa KPR?',
    answer: 'Informasi metode pembayaran dapat dikonfirmasi kepada tim marketing.',
  },
  {
    question: 'Kapan serah terima kavling?',
    answer: 'Jadwal serah terima mengikuti perkembangan pembangunan kawasan.',
  },
]