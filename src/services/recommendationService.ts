import { supabase } from '@/services/config/supabase'

export type SeedKind = 'favorite' | 'viewed' | 'owned' | 'similar'
export type MatchTrait = 'price' | 'area' | 'facility' | 'block'

export interface LotMatch {
  lotId: number
  /** Nomor kavling acuan yang membuat hasil ini muncul. */
  seedLotNumber: string
  seedKind: SeedKind
  traits: MatchTrait[]
}

export interface RecommendationSettings {
  viewHistory: boolean
  matchAlerts: boolean
}

/** True bila fungsi atau kolomnya belum ada (migrasi 202611300020 belum diterapkan). */
export function isRecommendationUnavailable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'PGRST202' || code === 'PGRST204' || code === 'PGRST205' || code === '42703' || code === '42P01'
}

const SEED_SUFFIX: Record<SeedKind, string> = {
  favorite: ' yang Anda simpan',
  viewed: ' yang Anda lihat',
  owned: ' pilihan Anda',
  similar: '',
}

/** Satu kalimat pendek yang menjelaskan kenapa sebuah kavling ditampilkan. */
export function matchReason({ traits, seedKind, seedLotNumber }: LotMatch): string {
  const similar = seedKind === 'similar'
  const seed = `kavling ${seedLotNumber}${SEED_SUFFIX[seedKind]}`
  const price = traits.includes('price')
  const area = traits.includes('area')

  if (price || area) {
    const what = price && area ? 'Harga dan luas' : price ? 'Harga' : 'Luas'
    return similar ? `${what} mirip` : `${what} mirip ${seed}`
  }
  if (traits.includes('facility')) {
    return similar ? 'Dekat fasilitas yang sama' : `Fasilitas dekatnya sama dengan ${seed}`
  }
  return similar ? 'Satu blok' : `Satu blok dengan ${seed}`
}

const toMatch = (row: any, kind?: SeedKind): LotMatch => ({
  lotId: Number(row.lot_id),
  seedLotNumber: String(row.seed_lot_number ?? ''),
  seedKind: kind ?? (row.seed_kind as SeedKind),
  traits: (row.traits ?? []) as MatchTrait[],
})

let trackingDisabled = false

/** Tidak pernah melempar error dan tidak ditunggu: pencatatan tidak boleh mengganggu pembeli. */
export function recordLotView(lotId: number | string | null | undefined) {
  const id = Number(lotId)
  if (trackingDisabled || !Number.isSafeInteger(id) || id <= 0) return
  void (async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    const { error } = await supabase.rpc('log_lot_view', { p_lot_id: id })
    if (error && isRecommendationUnavailable(error)) trackingDisabled = true
  })().catch(() => undefined)
}

export const recommendationService = {
  async forMe(limit = 6): Promise<LotMatch[]> {
    const { data, error } = await supabase.rpc('get_my_recommendations', { p_limit: limit })
    if (error) throw error
    return ((data ?? []) as any[]).map((row) => toMatch(row))
  },

  async similarTo(lotId: number, limit = 4): Promise<LotMatch[]> {
    const { data, error } = await supabase.rpc('get_similar_lots', { p_lot_id: lotId, p_limit: limit })
    if (error) throw error
    return ((data ?? []) as any[]).map((row) => toMatch(row, 'similar'))
  },

  /** null bila fiturnya belum ada di database. */
  async getSettings(): Promise<RecommendationSettings | null> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('view_history, match_alerts')
      .maybeSingle()
    if (error) {
      if (isRecommendationUnavailable(error)) return null
      throw error
    }
    return { viewHistory: data?.view_history ?? true, matchAlerts: data?.match_alerts ?? false }
  },

  /** Hanya nilai yang diisi yang diubah. */
  async saveSettings(patch: Partial<RecommendationSettings>) {
    const { error } = await supabase.rpc('set_recommendation_settings', {
      p_view_history: patch.viewHistory ?? null,
      p_match_alerts: patch.matchAlerts ?? null,
    })
    if (error) throw error
  },

  async clearHistory() {
    const { error } = await supabase.rpc('clear_my_lot_views')
    if (error) throw error
  },
}
