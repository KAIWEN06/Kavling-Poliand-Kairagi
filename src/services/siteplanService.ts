import { supabase } from './config/supabase'

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

export type SiteplanLot = {
  id?: string | number
  polygon_id?: string
  lot_number?: string
  block_id?: string | number

  dimension?: string
  area?: number

  cash_price?: number
  promo_price?: number

  status?: string
  payment_type?: string

  customer_id?: string | number

  blocks?: {
    id?: string | number
    name?: string
    code?: string
  } | null

  customers?: {
    id?: string | number
    user_id?: string | null
    full_name?: string
  } | null

  [key: string]: any
}

export type LotInstallment = {
  id: string | number
  monthly_payment: number

  payment_plans:
    | {
        id?: string | number
        plan_name?: string
        months?: number
        margin_percent?: number | string | null
      }
    | {
        id?: string | number
        plan_name?: string
        months?: number
        margin_percent?: number | string | null
      }[]
    | null
}

/*
|--------------------------------------------------------------------------
| CACHE
|--------------------------------------------------------------------------
|
| Data lots disimpan di memory selama aplikasi masih berjalan.
|
| Tujuannya:
|
| Home
|   ↓
| getLots()
|   ↓
| Supabase
|
| Siteplan
|   ↓
| getLots()
|   ↓
| menggunakan cache
|
| Jadi tidak request ulang ke Supabase.
|
*/

let lotsCache: SiteplanLot[] | null = null

/*
|--------------------------------------------------------------------------
| REQUEST CACHE
|--------------------------------------------------------------------------
|
| Kalau Home dan Siteplan meminta data pada waktu yang hampir bersamaan,
| kita tidak ingin membuat dua request Supabase.
|
| Keduanya akan menggunakan Promise yang sama.
|
*/

let lotsRequest: Promise<SiteplanLot[]> | null = null

/*
|--------------------------------------------------------------------------
| CACHE TIMESTAMP
|--------------------------------------------------------------------------
*/

let lotsCacheTime = 0

/*
|--------------------------------------------------------------------------
| CACHE DURATION
|--------------------------------------------------------------------------
|
| Data dianggap fresh selama 5 menit.
|
| Selama 5 menit:
|
| getLots()
|     ↓
| cache
|
| Setelah 5 menit:
|
| getLots()
|     ↓
| Supabase
|
*/

const LOTS_CACHE_DURATION = 5 * 60 * 1000

/*
|--------------------------------------------------------------------------
| FETCH LOTS FROM SUPABASE
|--------------------------------------------------------------------------
|
| Fungsi ini hanya bertugas mengambil data dari Supabase.
|
*/

async function fetchLotsFromSupabase(): Promise<SiteplanLot[]> {
  // RPC mengosongkan data pembeli kecuali untuk admin dan pemilik kavling.
  const { data, error } = await supabase.rpc('get_siteplan_lots')

  if (error) {
    throw error
  }

  return (data || []) as SiteplanLot[]
}

/*
|--------------------------------------------------------------------------
| GET LOTS
|--------------------------------------------------------------------------
|
| Fungsi utama yang digunakan oleh useSiteplan().
|
*/

export async function getLots(
  options: {
    forceRefresh?: boolean
  } = {}
): Promise<SiteplanLot[]> {
  const now = Date.now()

  /*
  |--------------------------------------------------------------------------
  | FORCE REFRESH
  |--------------------------------------------------------------------------
  |
  | Digunakan ketika Admin/user memang meminta data terbaru.
  |
  */

  if (options.forceRefresh) {
    clearLotsCache()
  }

  /*
  |--------------------------------------------------------------------------
  | RETURN CACHE
  |--------------------------------------------------------------------------
  |
  | Jika data masih fresh, langsung gunakan cache.
  |
  */

  if (
    lotsCache !== null &&
    now - lotsCacheTime < LOTS_CACHE_DURATION
  ) {
    return lotsCache
  }

  /*
  |--------------------------------------------------------------------------
  | RETURN EXISTING REQUEST
  |--------------------------------------------------------------------------
  |
  | Kalau request sedang berjalan, jangan membuat request kedua.
  |
  */

  if (lotsRequest) {
    return lotsRequest
  }

  /*
  |--------------------------------------------------------------------------
  | CREATE REQUEST
  |--------------------------------------------------------------------------
  */

  lotsRequest = fetchLotsFromSupabase()
    .then((data) => {
      /*
      |--------------------------------------------------------------------------
      | SAVE CACHE
      |--------------------------------------------------------------------------
      */

      lotsCache = data
      lotsCacheTime = Date.now()

      return data
    })
    .finally(() => {
      /*
      |--------------------------------------------------------------------------
      | CLEAR ACTIVE REQUEST
      |--------------------------------------------------------------------------
      |
      | Setelah request selesai, Promise tidak lagi dianggap sebagai
      | request aktif.
      |
      */

      lotsRequest = null
    })

  return lotsRequest
}

/*
|--------------------------------------------------------------------------
| PRELOAD LOTS
|--------------------------------------------------------------------------
|
| Fungsi khusus untuk dipanggil ketika aplikasi pertama kali dibuka.
|
| Contoh:
|
| await preloadLots()
|
| Setelah itu:
|
| getLots()
|
| akan langsung mengambil data dari cache.
|
*/

export async function preloadLots(): Promise<SiteplanLot[]> {
  return getLots()
}

/*
|--------------------------------------------------------------------------
| REFRESH LOTS
|--------------------------------------------------------------------------
|
| Digunakan jika ingin memaksa mengambil data terbaru dari Supabase.
|
*/

export async function refreshLots(): Promise<SiteplanLot[]> {
  return getLots({
    forceRefresh: true
  })
}

/*
|--------------------------------------------------------------------------
| CLEAR LOTS CACHE
|--------------------------------------------------------------------------
|
| Menghapus data lots dari memory.
|
| Biasanya dipanggil setelah Admin mengubah data kavling.
|
*/

export function clearLotsCache(): void {
  lotsCache = null
  lotsCacheTime = 0
}

/*
|--------------------------------------------------------------------------
| GET CACHED LOTS
|--------------------------------------------------------------------------
|
| Mengambil cache secara langsung tanpa request ke Supabase.
|
| Jika belum ada cache, hasilnya null.
|
*/

export function getCachedLots(): SiteplanLot[] | null {
  return lotsCache
}

/*
|--------------------------------------------------------------------------
| CHECK LOTS CACHE
|--------------------------------------------------------------------------
*/

export function hasLotsCache(): boolean {
  return lotsCache !== null
}

/*
|--------------------------------------------------------------------------
| GET LOT INSTALLMENTS
|--------------------------------------------------------------------------
|
| Fungsi ini tetap mengambil data berdasarkan lot tertentu.
|
| Tidak kita masukkan ke cache global karena data cicilan
| bergantung pada kavling yang dipilih.
|
*/

export async function getLotInstallments(
  lotId: string | number
): Promise<LotInstallment[]> {
  if (!lotId) {
    return []
  }

  /*
   * Simulasi cicilan hanya butuh tenor dan margin dari payment_plans,
   * yang boleh dibaca publik. Tabel lot_installments hanya bisa dibaca
   * pengguna yang sudah login, sehingga tamu selalu melihat daftar kosong.
   */
  const { data, error } = await supabase
    .from('payment_plans')
    .select('id, plan_name, months, margin_percent')
    .order('months', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []).map((plan: any) => ({
    id: plan.id,
    monthly_payment: 0,
    payment_plans: plan,
  }))
}
