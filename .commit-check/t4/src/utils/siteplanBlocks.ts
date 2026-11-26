import type { SiteplanLot } from '@/services/siteplanService'
import { getLotId, normalizeLotStatus } from '@/utils/siteplan'

/**
 * Blok A-L pada denah: kavling yang bersisian, dipisahkan jalan.
 * Batasnya dari geometri LOTS_WITH_ID.svg, namanya dari pengelola PoliLand.
 * Bila SVG berubah, perbarui daftar ini dan kolom lots.block_id di database
 * (lihat migrasi 202611300008_lot_blocks_a_to_l.sql).
 */
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `LOT_${String(from + i).padStart(3, '0')}`)

export const PHYSICAL_BLOCKS: Array<{ code: string; lotIds: string[] }> = [
  { code: 'A', lotIds: range(1, 3) },
  { code: 'B', lotIds: range(4, 11) },
  { code: 'C', lotIds: ['LOT_012', 'LOT_12A', ...range(14, 19)] },
  { code: 'D', lotIds: range(20, 25) },
  { code: 'E', lotIds: range(26, 45) },
  { code: 'F', lotIds: range(46, 50) },
  { code: 'G', lotIds: range(51, 60) },
  { code: 'H', lotIds: range(61, 69) },
  { code: 'I', lotIds: range(70, 77) },
  { code: 'J', lotIds: range(78, 85) },
  { code: 'K', lotIds: range(86, 93) },
  { code: 'L', lotIds: range(94, 97) },
]

export interface SiteplanBlock {
  key: string
  /** "Blok A" */
  name: string
  /** Huruf blok untuk penanda di peta. */
  shortLabel: string
  lotIds: string[]
  total: number
  available: number
}

export function buildSiteplanBlocks(lots: SiteplanLot[]): SiteplanBlock[] {
  const byId = new Map(lots.map((lot) => [getLotId(lot), lot]))

  return PHYSICAL_BLOCKS.flatMap(({ code, lotIds }) => {
    const present = lotIds.filter((id) => byId.has(id))
    if (!present.length) return []
    return [{
      key: `blok-${code}`,
      name: `Blok ${code}`,
      shortLabel: code,
      lotIds: present,
      total: present.length,
      available: present.filter((id) => normalizeLotStatus(byId.get(id)?.status) === 'available').length,
    }]
  })
}

export function findBlockOfLot(blocks: SiteplanBlock[], lot: SiteplanLot | null): SiteplanBlock | null {
  if (!lot) return null
  const id = getLotId(lot)
  return blocks.find((block) => block.lotIds.includes(id)) ?? null
}
