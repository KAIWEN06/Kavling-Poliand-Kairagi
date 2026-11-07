import { supabase } from '@/services/config/supabase'

export type NoteCategory = 'Follow Up' | 'Preferensi Kavling' | 'Hasil Pertemuan' | 'Informasi Customer' | 'Lainnya'
export type CustomerNote = {
  id: string
  customer_id: number
  title: string
  content: string
  category: NoteCategory
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export const customerNotesService = {
  async getAuthenticatedUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    if (!data.user) throw new Error('Sesi login Supabase tidak ditemukan. Silakan login kembali.')
    return data.user
  },
  async list(customerId: number) {
    let result = await supabase.from('customer_notes').select('*').eq('customer_id', customerId).order('is_pinned', { ascending: false }).order('updated_at', { ascending: false })
    if (result.error && (result.error.message.includes('is_pinned') || result.error.message.includes('updated_at'))) {
      result = await supabase.from('customer_notes').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
    }
    if (result.error) throw result.error
    const data = result.data
    return (data ?? []).map((row: any) => {
      let legacy = null
      try { legacy = row.note ? JSON.parse(row.note) : null } catch { legacy = null }
      return {
        ...row,
        title: row.title || legacy?.title || 'Catatan',
        content: row.content || legacy?.content || row.note || '',
        category: row.category || legacy?.category || 'Lainnya',
        is_pinned: row.is_pinned ?? legacy?.is_pinned ?? false,
        updated_at: row.updated_at || row.created_at,
      }
    }) as CustomerNote[]
  },
  async create(customerId: number, payload: Pick<CustomerNote, 'title' | 'content' | 'category' | 'is_pinned'>) {
    await this.getAuthenticatedUser()
    const modern = await supabase.from('customer_notes').insert({ customer_id: customerId, note: payload.content, ...payload }).select().single()
    if (!modern.error) return modern.data as CustomerNote
    if (!modern.error.message.toLowerCase().includes('category') && !modern.error.message.toLowerCase().includes('title')) throw modern.error
    const legacy = await supabase.from('customer_notes').insert({ customer_id: customerId, note: JSON.stringify(payload) }).select().single()
    if (legacy.error) throw legacy.error
    return { ...legacy.data, ...payload } as CustomerNote
  },
  async update(id: string, payload: Partial<Pick<CustomerNote, 'title' | 'content' | 'category' | 'is_pinned'>>) {
    const modern = await supabase.from('customer_notes').update({ ...payload, ...(payload.content !== undefined ? { note: payload.content } : {}) }).eq('id', id).select().single()
    if (!modern.error) return modern.data as CustomerNote
    if (!modern.error.message.toLowerCase().includes('category') && !modern.error.message.toLowerCase().includes('title')) throw modern.error
    const legacy = await supabase.from('customer_notes').update({ note: JSON.stringify(payload) }).eq('id', id).select().single()
    if (legacy.error) throw legacy.error
    return { ...legacy.data, ...payload } as CustomerNote
  },
  async remove(id: string) {
    const { error } = await supabase.from('customer_notes').delete().eq('id', id)
    if (error) throw error
  },
  async history(noteId: string) {
    const { data, error } = await supabase.from('customer_note_histories').select('*').eq('note_id', noteId).order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },
}
