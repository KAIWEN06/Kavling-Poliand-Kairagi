
import { supabase } from '@/services/config/supabase'

// =========================================================
// TYPES
// =========================================================

export interface PaymentPlan {
  id: number
  plan_name: string
  months: number
  margin_percent: number | null
}

export interface LotInstallment {
  id: number
  lot_id: number
  plan_id: number
  monthly_payment: number | null
  is_custom: boolean
}

export interface Lot {
  id: number
  polygon_id: string
  lot_number: string
  block_id: number | null
  dimension: string | null
  area: number | null
  cash_price: number | null
  promo_price: number | null
  status: 'Available' | 'Booking' | 'Sold' | null
  payment_type: 'Cash' | 'Installment' | null
  customer_id: number | null
  booking_date: string | null
  sold_date: string | null
  color: string | null
  description: string | null
  created_at: string | null
  updated_at: string | null
  panorama_url: string | null
  panorama_boundary: unknown
}

export type SPKDocumentType =
  | 'KTP'
  | 'KK'
  | 'NPWP'
  | 'Payment Proof'

export interface SPKDocumentFile {
  type: SPKDocumentType
  file: File
}

export interface CreateSPKRequestInput {
  customer_full_name: string
  customer_phone: string
  customer_email: string | null
  customer_address: string
  lot_id: number
  lot_price_snapshot: number
  payment_method: 'Cash' | 'Installment'
  payment_plan_id: number | null
  months: number | null
  monthly_payment: number | null
  margin_percent_snapshot: number | null
  notes: string | null
}

export interface SPKSubmissionResult {
  id: number
  spk_number: string
}

// =========================================================
// LOT HELPERS
// =========================================================

export function formatLotNumber(lotNumber: string): string {
  return lotNumber.replace(/-/g, '_')
}

// =========================================================
// PAYMENT PLANS
// =========================================================

export async function getPaymentPlans(): Promise<PaymentPlan[]> {
  const { data, error } = await supabase
    .from('payment_plans')
    .select('id, plan_name, months, margin_percent')
    .order('months', { ascending: true })

  if (error) throw error

  return (data ?? []) as PaymentPlan[]
}

// =========================================================
// LOT
// =========================================================

export async function getLotById(id: number): Promise<Lot | null> {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error

  return data as Lot | null
}

export async function getLotByNumber(
  lotNumber: string,
): Promise<Lot | null> {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .eq('lot_number', lotNumber)
    .maybeSingle()

  if (error) throw error

  return data as Lot | null
}

export async function getAvailableLots(): Promise<Lot[]> {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .eq('status', 'Available')
    .order('lot_number', { ascending: true })

  if (error) throw error

  return (data ?? []) as Lot[]
}

// =========================================================
// LOT INSTALLMENTS
// =========================================================

export async function getLotInstallments(
  lotId: number,
): Promise<LotInstallment[]> {
  const { data, error } = await supabase
    .from('lot_installments')
    .select('id, lot_id, plan_id, monthly_payment, is_custom')
    .eq('lot_id', lotId)
    .order('plan_id', { ascending: true })

  if (error) throw error

  return (data ?? []) as LotInstallment[]
}

// =========================================================
// SUBMIT SPK
// =========================================================

export async function submitSPKRequest(
  input: CreateSPKRequestInput,
  documents: SPKDocumentFile[],
): Promise<SPKSubmissionResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Sesi login tidak ditemukan.')
  }

  const requiredTypes: SPKDocumentType[] = [
    'KTP',
    'KK',
    'Payment Proof',
  ]

  for (const type of requiredTypes) {
    if (!documents.some(document => document.type === type)) {
      throw new Error(`Dokumen ${type} wajib diunggah.`)
    }
  }

  const maxFileSize = 5 * 1024 * 1024

  for (const document of documents) {
    if (document.file.size > maxFileSize) {
      throw new Error(
        `${document.file.name} melebihi batas 5 MB.`,
      )
    }
  }

  const uploadedPaths: string[] = []
  let requestId: number | null = null

  try {
    // Membuat pengajuan SPK
    const { data: request, error: requestError } = await supabase
      .from('spk_requests')
      .insert({
        ...input,
        marketing_id: user.id,
      })
      .select('id, spk_number')
      .single()

    if (requestError) throw requestError

    requestId = Number(request.id)

    // Upload dokumen
    for (const document of documents) {
      const extension =
        document.file.name.split('.').pop()?.toLowerCase() || 'bin'

      const safeExtension = extension.replace(/[^a-z0-9]/g, '')

      const filePath =
        `${user.id}/${requestId}/` +
        `${document.type.toLowerCase().replace(/\s+/g, '-')}-` +
        `${crypto.randomUUID()}.${safeExtension}`

      const { error: uploadError } = await supabase.storage
        .from('spk-documents')
        .upload(filePath, document.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: document.file.type || undefined,
        })

      if (uploadError) throw uploadError

      uploadedPaths.push(filePath)

      const { error: metadataError } = await supabase
        .from('spk_request_documents')
        .insert({
          spk_request_id: requestId,
          document_type: document.type,
          file_name: document.file.name,
          file_path: filePath,
          mime_type: document.file.type || null,
          file_size_bytes: document.file.size,
          uploaded_by: user.id,
        })

      if (metadataError) throw metadataError
    }

    return {
      id: requestId,
      spk_number: request.spk_number,
    }

  } catch (error) {
    // Membersihkan file jika proses gagal
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await supabase.storage
        .from('spk-documents')
        .remove(uploadedPaths)

      if (cleanupError) {
        console.error('Gagal membersihkan file:', cleanupError)
      }
    }

    // Menghapus pengajuan jika proses gagal
    if (requestId !== null) {
      const { error: deleteError } = await supabase
        .from('spk_requests')
        .delete()
        .eq('id', requestId)

      if (deleteError) {
        console.error('Gagal membersihkan pengajuan:', deleteError)
      }
    }

    console.error('Submit SPK error:', error)
    throw error
  }
}
