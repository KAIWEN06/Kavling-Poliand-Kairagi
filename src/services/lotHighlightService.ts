import { supabase } from '@/services/config/supabase'

const TABLE = 'lot_highlights'

export interface LotHighlight {
  id: number
  lotId: number
  facility: string
  distanceM: number
}

export function formatDistance(meters: number): string {
  return meters < 1000
    ? `${meters} m`
    : `${(meters / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km`
}

/** True bila tabelnya belum ada (migrasi 202611300014 belum diterapkan). */
export function isHighlightsUnavailable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === '42P01' || code === 'PGRST205'
}

const toHighlight = (row: any): LotHighlight => ({
  id: Number(row.id),
  lotId: Number(row.lot_id),
  facility: String(row.facility),
  distanceM: Number(row.distance_m),
})

export const lotHighlightService = {
  /** Terdekat lebih dulu. Tanpa lotId: semua kavling. */
  async list(lotId?: number): Promise<LotHighlight[]> {
    let query = supabase.from(TABLE).select('id, lot_id, facility, distance_m').order('distance_m', { ascending: true })
    if (lotId !== undefined) query = query.eq('lot_id', lotId)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(toHighlight)
  },

  async add(input: { lotId: number; facility: string; distanceM: number }) {
    const { error } = await supabase
      .from(TABLE)
      .insert({ lot_id: input.lotId, facility: input.facility.trim(), distance_m: input.distanceM })
    if (error) throw error
  },

  async remove(id: number) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
  },
}
