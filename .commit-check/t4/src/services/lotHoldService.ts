import { supabase } from '@/services/config/supabase'

/**
 * Kavling yang sedang ditahan pengajuan SPK aktif.
 * Key: lot id. Value: batas waktu penahanan (ISO) selama Booking Fee belum
 * dibayar, atau null bila bukti bayar sudah ada dan menunggu keputusan Admin.
 */
export type HeldLots = Map<number, string | null>

/** Hanya peringatan: bila gagal dimuat, guard database tetap menolak kavling yang ditahan. */
export async function getLotsHeldBySpk(): Promise<HeldLots> {
  const { data, error } = await supabase.rpc('get_lots_held_by_spk')
  if (error) throw error

  return new Map(
    ((data ?? []) as Array<{ lot_id: number | string; holds_until: string | null }>)
      .map(row => [Number(row.lot_id), row.holds_until ?? null]),
  )
}

export async function getLotsHeldBySpkSafe(): Promise<HeldLots> {
  try {
    return await getLotsHeldBySpk()
  } catch (error) {
    console.warn('[Lot Hold] Daftar kavling yang ditahan gagal dimuat:', error)
    return new Map()
  }
}

export function lotHoldNote(held: HeldLots, lotId: number): string {
  if (!held.has(lotId)) return ''
  const until = held.get(lotId)
  if (!until) return 'Sedang diproses · menunggu keputusan Admin'
  const time = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(until))
  return `Sedang diproses · bisa tersedia lagi setelah ${time}`
}
