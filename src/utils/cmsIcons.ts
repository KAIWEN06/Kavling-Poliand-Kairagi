import {
  airplaneOutline,
  businessOutline,
  busOutline,
  cashOutline,
  carOutline,
  constructOutline,
  documentTextOutline,
  flashOutline,
  heartOutline,
  homeOutline,
  keyOutline,
  leafOutline,
  locationOutline,
  peopleOutline,
  ribbonOutline,
  medkitOutline,
  restaurantOutline,
  schoolOutline,
  shieldCheckmarkOutline,
  storefrontOutline,
  waterOutline,
} from 'ionicons/icons'

/**
 * Daftar ikon yang boleh dipilih Admin untuk bagian "Keunggulan" di Beranda.
 * Database hanya menyimpan `key` (teks), halaman publik menerjemahkannya ke ikon.
 */
export const CMS_ICON_OPTIONS = [
  { key: 'leaf', label: 'Daun / lingkungan', icon: leafOutline },
  { key: 'home', label: 'Rumah / hunian', icon: homeOutline },
  { key: 'shield', label: 'Perisai / legalitas', icon: shieldCheckmarkOutline },
  { key: 'location', label: 'Lokasi', icon: locationOutline },
  { key: 'cash', label: 'Harga / pembayaran', icon: cashOutline },
  { key: 'key', label: 'Kunci / serah terima', icon: keyOutline },
  { key: 'document', label: 'Dokumen / sertifikat', icon: documentTextOutline },
  { key: 'road', label: 'Akses jalan', icon: carOutline },
  { key: 'water', label: 'Air bersih', icon: waterOutline },
  { key: 'power', label: 'Listrik', icon: flashOutline },
  { key: 'build', label: 'Pembangunan', icon: constructOutline },
  { key: 'school', label: 'Pendidikan', icon: schoolOutline },
  { key: 'people', label: 'Komunitas', icon: peopleOutline },
  { key: 'care', label: 'Layanan / kepedulian', icon: heartOutline },
  { key: 'award', label: 'Penghargaan', icon: ribbonOutline },
] as const

const ICON_BY_KEY = new Map<string, string>(CMS_ICON_OPTIONS.map((option) => [option.key, option.icon]))

/** Terjemahkan key ikon dari database menjadi ikon Ionicons. Key tak dikenal jatuh ke ikon daun. */
export function resolveCmsIcon(key: string | null | undefined): string {
  return ICON_BY_KEY.get(String(key ?? '').trim().toLowerCase()) ?? leafOutline
}

/** Ikon untuk daftar "Tempat terdekat" di bagian Lokasi. */
export const PLACE_ICON_OPTIONS = [
  { key: 'school', label: 'Kampus / sekolah', icon: schoolOutline },
  { key: 'airport', label: 'Bandara', icon: airplaneOutline },
  { key: 'road', label: 'Jalan / akses', icon: businessOutline },
  { key: 'shop', label: 'Pusat belanja', icon: storefrontOutline },
  { key: 'city', label: 'Pusat kota', icon: locationOutline },
  { key: 'health', label: 'Rumah sakit / klinik', icon: medkitOutline },
  { key: 'food', label: 'Kuliner', icon: restaurantOutline },
  { key: 'transit', label: 'Terminal / transportasi', icon: busOutline },
] as const

const PLACE_ICON_BY_KEY = new Map<string, string>(PLACE_ICON_OPTIONS.map((option) => [option.key, option.icon]))

export function resolvePlaceIcon(key: string | null | undefined): string {
  return PLACE_ICON_BY_KEY.get(String(key ?? '').trim().toLowerCase()) ?? locationOutline
}
