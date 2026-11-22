import { supabase } from '@/services/config/supabase'
import type { Region } from '@/types/address'

/**
 * Mengambil wilayah berdasarkan tingkat dan parent.
 * level: 1 provinsi, 2 kabupaten/kota, 3 kecamatan, 4 desa/kelurahan.
 * Untuk level 1, parentId harus null/tidak diberikan.
 */
export async function getRegions(
  level: 1 | 2 | 3 | 4,
  parentId?: number | null,
): Promise<Region[]> {
  let query = supabase
    .from('indonesia_regions')
    .select('id, code, name, level, parent_id')
    .eq('level', level)
    .order('name', { ascending: true })

  if (level === 1) {
    query = query.is('parent_id', null)
  } else {
    if (parentId == null) {
      throw new Error(`parentId wajib diisi untuk mengambil wilayah level ${level}.`)
    }
    query = query.eq('parent_id', parentId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as Region[]
}

/** Mengambil satu wilayah berdasarkan kode wilayah unik. */
export async function getRegionByCode(code: string | null | undefined): Promise<Region | null> {
  if (!code) return null

  const { data, error } = await supabase
    .from('indonesia_regions')
    .select('id, code, name, level, parent_id')
    .eq('code', code)
    .maybeSingle()

  if (error) throw error
  return data as Region | null
}
