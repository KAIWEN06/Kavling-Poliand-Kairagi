import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './leafletMap.css'

/** Pin merah yang dipakai di pemilih lokasi (Admin) dan peta publik, supaya tampilannya sama. */
export const pinIcon = L.divIcon({ className: 'picker-pin', html: '<span></span>', iconSize: [30, 42], iconAnchor: [15, 40] })

/** Lapisan dasar peta: satelit (Esri + label) atau peta jalan (OpenStreetMap). */
export function baseLayers(satellite: boolean): L.TileLayer[] {
  if (satellite) {
    return [
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles © Esri' }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
    ]
  }
  return [L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' })]
}

export { L }
