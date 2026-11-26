import { supabase } from '@/services/config/supabase'

const TABLE = 'client_favorite_lots'

export interface FavoriteLot {
  id: number
  lotNumber: string
  blockName: string
  area: number | null
  dimension: string
  /** Harga yang berlaku: promo bila lebih murah, selain itu harga tunai. */
  price: number | null
  status: string
}

/** True bila tabelnya belum ada (migrasi 202611300013 belum diterapkan). */
export function isFavoritesUnavailable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === '42P01' || code === 'PGRST205'
}

export const favoriteService = {
  /** ID kavling favorit, yang terbaru disimpan lebih dulu. RLS membatasi ke akun sendiri. */
  async listIds(): Promise<number[]> {
    const { data, error } = await supabase.from(TABLE).select('lot_id').order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row: any) => Number(row.lot_id))
  },

  async add(lotId: number) {
    const { error } = await supabase.from(TABLE).insert({ lot_id: lotId })
    // 23505: sudah tersimpan, misalnya dari perangkat lain.
    if (error && error.code !== '23505') throw error
  },

  async remove(lotId: number) {
    const { error } = await supabase.from(TABLE).delete().eq('lot_id', lotId)
    if (error) throw error
  },

  /** null bila fiturnya belum ada (migrasi 202611300015 belum diterapkan). */
  async getAlertsEnabled(): Promise<boolean | null> {
    const { data, error } = await supabase.from('notification_preferences').select('favorite_alerts').maybeSingle()
    if (error) {
      if (isFavoritesUnavailable(error)) return null
      throw error
    }
    return Boolean(data?.favorite_alerts)
  },

  async setAlertsEnabled(enabled: boolean) {
    const { error } = await supabase.rpc('set_favorite_alerts', { p_enabled: enabled })
    if (error) throw error
  },

  async getLots(ids: number[]): Promise<FavoriteLot[]> {
    if (!ids.length) return []
    const { data, error } = await supabase
      .from('lots')
      .select('id, lot_number, area, dimension, cash_price, promo_price, status, blocks(name, code)')
      .in('id', ids)
    if (error) throw error

    const byId = new Map<number, FavoriteLot>()
    for (const row of (data ?? []) as any[]) {
      const cash = Number(row.cash_price) || 0
      const promo = Number(row.promo_price) || 0
      const block = Array.isArray(row.blocks) ? row.blocks[0] : row.blocks
      byId.set(Number(row.id), {
        id: Number(row.id),
        lotNumber: row.lot_number || String(row.id),
        blockName: block?.name || block?.code || '',
        area: Number(row.area) || null,
        dimension: row.dimension || '',
        price: (promo > 0 && (!cash || promo < cash) ? promo : cash) || null,
        status: String(row.status || ''),
      })
    }
    return ids.flatMap((id) => byId.get(id) ?? [])
  },
}
