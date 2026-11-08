import { supabase } from '@/services/config/supabase'

export type NoteCategory =
  | 'Follow Up'
  | 'Preferensi Kavling'
  | 'Hasil Pertemuan'
  | 'Informasi Customer'
  | 'Lainnya'

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

export type CustomerNoteHistory = {
  id: number
  note_id: string
  customer_id: number
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_by: string | null
  created_at: string
}

type NotePayload = Pick<
  CustomerNote,
  'title' | 'content' | 'category' | 'is_pinned'
>

export const customerNotesService = {
  async getAuthenticatedUser() {
    const { data, error } = await supabase.auth.getUser()

    if (error) throw error

    if (!data.user) {
      throw new Error('Sesi login Supabase tidak ditemukan. Silakan login kembali.')
    }

    return data.user
  },

  async list(customerId: number): Promise<CustomerNote[]> {
    let result = await supabase
      .from('customer_notes')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })

    // Pertahankan kompatibilitas jika tabel masih menggunakan struktur lama.
    if (
      result.error &&
      (result.error.message.includes('is_pinned') ||
        result.error.message.includes('updated_at'))
    ) {
      result = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
    }

    if (result.error) throw result.error

    return (result.data ?? []).map((row: Record<string, any>) => {
      let legacy: Record<string, any> | null = null

      try {
        legacy = row.note ? JSON.parse(row.note) : null
      } catch {
        legacy = null
      }

      return {
        ...row,
        id: String(row.id),
        title: row.title || legacy?.title || 'Catatan',
        content: row.content || legacy?.content || row.note || '',
        category: row.category || legacy?.category || 'Lainnya',
        is_pinned: row.is_pinned ?? legacy?.is_pinned ?? false,
        updated_at: row.updated_at || row.created_at,
      } as CustomerNote
    })
  },

  async create(customerId: number, payload: NotePayload): Promise<CustomerNote> {
    await this.getAuthenticatedUser()

    const modern = await supabase
      .from('customer_notes')
      .insert({
        customer_id: customerId,
        note: payload.content,
        ...payload,
      })
      .select('*')
      .single()

    if (!modern.error) {
      return {
        ...modern.data,
        id: String(modern.data.id),
      } as CustomerNote
    }

    const message = modern.error.message.toLowerCase()
    const isLegacySchema =
      message.includes('category') || message.includes('title')

    if (!isLegacySchema) throw modern.error

    const legacy = await supabase
      .from('customer_notes')
      .insert({
        customer_id: customerId,
        note: JSON.stringify(payload),
      })
      .select('*')
      .single()

    if (legacy.error) throw legacy.error

    return {
      ...legacy.data,
      ...payload,
      id: String(legacy.data.id),
    } as CustomerNote
  },

  async update(
    id: string,
    payload: Partial<NotePayload>,
  ): Promise<CustomerNote> {
    const modern = await supabase
      .from('customer_notes')
      .update({
        ...payload,
        ...(payload.content !== undefined ? { note: payload.content } : {}),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (!modern.error) {
      return {
        ...modern.data,
        id: String(modern.data.id),
      } as CustomerNote
    }

    const message = modern.error.message.toLowerCase()
    const isLegacySchema =
      message.includes('category') || message.includes('title')

    if (!isLegacySchema) throw modern.error

    const legacy = await supabase
      .from('customer_notes')
      .update({ note: JSON.stringify(payload) })
      .eq('id', id)
      .select('*')
      .single()

    if (legacy.error) throw legacy.error

    return {
      ...legacy.data,
      ...payload,
      id: String(legacy.data.id),
    } as CustomerNote
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('customer_notes')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async history(noteId: string): Promise<CustomerNoteHistory[]> {
    if (!noteId) {
      throw new Error('ID catatan tidak valid.')
    }

    const { data, error } = await supabase
      .from('customer_note_histories')
      .select(
        'id, note_id, customer_id, action, old_data, new_data, changed_by, created_at',
      )
      .eq('note_id', noteId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Customer Notes] History error:', error)
      throw new Error(`Gagal mengambil riwayat catatan: ${error.message}`)
    }

    return (data ?? []).map((row) => ({
      ...row,
      note_id: String(row.note_id),
    })) as CustomerNoteHistory[]
  },
}
