
import { spkAddressGaps } from '@/utils/address'
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
  customer_id: number
  lot_id: number
  payment_method: 'Cash' | 'Installment'
  payment_plan_id: number | null
  down_payment_amount?: number | null
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

export interface MarketingSpkCustomer {
  id: number
  full_name: string
  phone: string | null
  email: string | null
  address: string | null
  /** Kolom alamat yang masih kosong dan wajib ada sebelum SPK diajukan. */
  address_gaps: string[]
}

// Klien milik Marketing yang login (RLS + filter marketing_id; klien mandiri tidak muncul).
export async function getMyCustomersForSpk(): Promise<MarketingSpkCustomer[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi masuk tidak ditemukan.')

  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, phone, email, address, country_code, country_name, province_code, province_name, city_code, city_name, district_code, district_name, village_code, village_name, street_address')
    .eq('marketing_id', user.id)
    .order('full_name', { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: Number(row.id),
    full_name: row.full_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    address_gaps: spkAddressGaps(row),
  }))
}

const SPK_BUCKET = 'spk-client-private-documents'

export async function submitSPKRequest(
  input: CreateSPKRequestInput,
  documents: SPKDocumentFile[],
): Promise<SPKSubmissionResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Sesi masuk tidak ditemukan.')
  }

  if (!input.customer_id) {
    throw new Error('Pilih klien terlebih dahulu.')
  }

  for (const type of ['KTP', 'KK', 'Payment Proof'] as SPKDocumentType[]) {
    if (!documents.some(document => document.type === type)) {
      throw new Error(`Dokumen ${type} wajib diunggah.`)
    }
  }

  const maxFileSize = 5 * 1024 * 1024
  for (const document of documents) {
    if (document.file.size > maxFileSize) {
      throw new Error(`${document.file.name} melebihi batas 5 MB.`)
    }
  }

  // Server memvalidasi kepemilikan klien, kavling, dan harga.
  const { data: requestId, error: requestError } = await supabase.rpc(
    'create_marketing_spk_request',
    {
      p_customer_id: input.customer_id,
      p_lot_id: input.lot_id,
      p_payment_method: input.payment_method,
      p_payment_plan_id: input.payment_plan_id,
      p_down_payment_amount: input.down_payment_amount ?? 0,
      p_notes: input.notes,
    },
  )

  if (requestError) throw requestError
  if (typeof requestId !== 'number') {
    throw new Error('SPK tersimpan, tetapi nomor pengajuan tidak diterima.')
  }

  const uploadedPaths: string[] = []

  try {
    const rows: Array<Record<string, unknown>> = []

    for (const document of documents) {
      const extension = (document.file.name.split('.').pop() || 'bin')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'bin'

      const filePath =
        `${user.id}/${requestId}/` +
        `${document.type.toLowerCase().replace(/\s+/g, '-')}-` +
        `${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(SPK_BUCKET)
        .upload(filePath, document.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: document.file.type || undefined,
        })

      if (uploadError) throw uploadError
      uploadedPaths.push(filePath)

      rows.push({
        spk_request_id: requestId,
        document_type: document.type,
        file_name: document.file.name,
        file_path: filePath,
        mime_type: document.file.type || null,
        file_size_bytes: document.file.size,
        uploaded_by: user.id,
      })
    }

    const { error: metadataError } = await supabase
      .from('spk_request_documents')
      .insert(rows)
    if (metadataError) throw metadataError

    // Booking Fee dicatat 'Pending' (menunggu verifikasi Admin), idempoten.
    const { error: paymentError } = await supabase.rpc(
      'create_marketing_spk_initial_payment',
      { p_request_id: requestId },
    )
    if (paymentError) throw paymentError

    const { data: spk } = await supabase
      .from('spk_requests')
      .select('spk_number')
      .eq('id', requestId)
      .maybeSingle()

    return { id: requestId, spk_number: spk?.spk_number ?? `#${requestId}` }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await supabase.storage
        .from(SPK_BUCKET)
        .remove(uploadedPaths)
      if (cleanupError) console.error('Gagal membersihkan file:', cleanupError)
    }

    const { error: discardError } = await supabase.rpc(
      'discard_marketing_spk_request',
      { p_request_id: requestId },
    )
    if (discardError) console.error('Gagal membersihkan pengajuan:', discardError)

    console.error('Submit SPK error:', error)
    throw error
  }
}
