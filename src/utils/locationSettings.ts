export interface NearbyPlace { icon: string; name: string; time: string }
export interface LocationSettings { lat: number; lng: number; zoom: number; places: NearbyPlace[] }

/** Key baris di tabel `contacts` yang menyimpan pengaturan Lokasi sebagai JSON. */
export const LOCATION_SETTINGS_KEY = 'location_settings'

export const DEFAULT_LOCATION_SETTINGS: LocationSettings = {
  lat: 1.5107731,
  lng: 124.8848806,
  zoom: 17,
  places: [
    { icon: 'school', name: 'Politeknik Negeri Manado (Polimdo)', time: '± 5 menit' },
    { icon: 'airport', name: 'Bandara Sam Ratulangi', time: '± 15 menit' },
    { icon: 'road', name: 'Jl. Politeknik Permai & Akses Utama', time: '± 3 menit' },
    { icon: 'shop', name: 'Pusat Perbelanjaan & Minimarket Lokal', time: '± 5 menit' },
    { icon: 'city', name: 'Pusat Kota Manado', time: '± 20 menit' },
  ],
}

export function normalizeLocationSettings(raw: unknown): LocationSettings {
  const fallback = DEFAULT_LOCATION_SETTINGS
  let data: any = raw
  if (typeof data === 'string') {
    try { data = JSON.parse(data) } catch { return structuredClone(fallback) }
  }
  if (!data || typeof data !== 'object') return structuredClone(fallback)
  const lat = Number(data.lat)
  const lng = Number(data.lng)
  const zoom = Number(data.zoom)
  const places: NearbyPlace[] = Array.isArray(data.places)
    ? data.places
        .map((place: any) => ({ icon: String(place?.icon ?? 'city'), name: String(place?.name ?? '').trim(), time: String(place?.time ?? '').trim() }))
        .filter((place: NearbyPlace) => place.name)
    : fallback.places
  return {
    lat: Number.isFinite(lat) && Math.abs(lat) <= 90 ? lat : fallback.lat,
    lng: Number.isFinite(lng) && Math.abs(lng) <= 180 ? lng : fallback.lng,
    zoom: Number.isFinite(zoom) ? Math.min(20, Math.max(10, Math.round(zoom))) : fallback.zoom,
    places,
  }
}

export const mapEmbedUrl = (s: LocationSettings) => `https://maps.google.com/maps?q=${s.lat},${s.lng}&t=k&z=${s.zoom}&output=embed`
export const mapOpenUrl = (s: LocationSettings) => `https://www.google.com/maps?q=${s.lat},${s.lng}`
