import { supabase } from '@/services/config/supabase'
import { DEFAULT_SPK_BOOKING_FEE, paymentService } from '@/services/Finance/paymentService'

export type SPKStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Cancelled'
export type SPKSource = 'Marketing' | 'Client' | 'Admin'
export type CustomerSource = 'Marketing' | 'Client' | 'Admin'
export type SPKDocumentType = 'KTP' | 'KK' | 'NPWP' | 'Payment Proof'
export type SPKPaymentMethod = 'Cash' | 'Installment'

export interface SPKDocumentFile {
  type: SPKDocumentType
  file: File
}
export interface SPKBookingPaymentSummary {
  totalAmount: number
  confirmedAmount: number
  pendingAmount: number
  rejectedAmount: number
  requiredAmount: number
  isSatisfied: boolean
  payments: Array<{
    id: number
    amount: number
    status: 'Pending' | 'Confirmed' | 'Rejected' | 'Needs Reupload'
    proof_path: string | null
  }>
}

export interface SPKBookingFeeRefund {
  status: 'Pending Refund' | 'Refunded'
  amount: number
  proofPath: string | null
  refundMethod: string | null
  refundNote: string | null
  bankReference: string | null
  refundedAt: string | null
}

export interface SPKDocument {
  id: number
  spk_request_id: number
  document_type: SPKDocumentType
  file_name: string
  file_path: string
  mime_type: string | null
  file_size_bytes: number | null
  created_at: string | null
  storage_bucket?: string
}

export interface AdminSPKRequest {
  id: number
  spk_number: string
  marketing_id: string | null
  submitted_by: string | null
  submission_source: SPKSource
  customer_id: number | null
  customer_full_name: string
  customer_phone: string
  customer_email: string | null
  customer_address: string | null
  lot_id: number
  lot_price_snapshot: number
  payment_method: SPKPaymentMethod
  payment_plan_id: number | null
  months: number | null
  monthly_payment: number | null
  margin_percent_snapshot: number | null
  down_payment_snapshot: number
  total_payment_snapshot: number | null
  notes: string | null
  status: SPKStatus
  reviewed_by: string | null
  reviewed_at: string | null
  approved_at: string | null
  admin_note: string | null
  rejection_reason: string | null
  transaction_id: number | null
  booking_fee_snapshot?: number
  submitted_at: string
  created_at: string
  updated_at: string
  marketing_name?: string | null
  lot_number?: string
  block_name?: string
  lot_status?: string | null
  documents: SPKDocument[]
  booking_payment: SPKBookingPaymentSummary
  booking_fee_refund: SPKBookingFeeRefund | null
}

export interface SPKAdminStats {
  total: number
  submitted: number
  underReview: number
  approved: number
  rejected: number
}

export interface CreateAdminSPKInput {
  customer_id: number
  customer_full_name: string
  customer_phone: string
  customer_email: string | null
  customer_address: string
  lot_id: number
  lot_price_snapshot: number
  payment_method: SPKPaymentMethod
  payment_plan_id: number | null
  months: number | null
  monthly_payment: number | null
  margin_percent_snapshot: number | null
  down_payment_snapshot: number
  total_payment_snapshot: number
  notes: string | null
}

export interface AdminSPKCustomer {
  id: number
  full_name: string
  phone: string | null
  whatsapp_phone: string | null
  email: string | null
  address: string | null
  interests: Array<{
    lot_id: number
    lot_number: string
    block_name: string | null
  }>
}

export interface AdminLotInstallmentOption {
  id: number
  lot_id: number
  plan_id: number
  monthly_payment: number | null
  is_custom: boolean
  plan_name: string
  months: number
  margin_percent: number
}

export interface AdminAvailableLot {
  id: number
  lot_number: string
  block_id: number | null
  block_name: string | null
  block_code: string | null
  cash_price: number | null
  promo_price: number | null
  status: string | null
}

const STORAGE_BUCKET = 'spk-client-private-documents'
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024
const ALLOWED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function toNullableNumber(value: unknown): number | null {
  return value == null ? null : Number(value)
}

function normalizeSource(row: any): SPKSource {
  if (row.submission_source === 'Admin' || row.submission_source === 'Client' || row.submission_source === 'Marketing') {
    return row.submission_source
  }
  if (row.marketing_id) return 'Marketing'
  return row.submitted_by ? 'Admin' : 'Client'
}

export async function getAdminSPKRequests(): Promise<AdminSPKRequest[]> {
  const { data: rows, error } = await supabase
    .from('spk_requests')
    .select('*')
    .order('created_at', { ascending: false })
  throwIfError(error)
  if (!rows?.length) return []

  const marketingIds = [...new Set(rows.map((row: any) => row.marketing_id).filter(Boolean))] as string[]
  const lotIds = [...new Set(rows.map((row: any) => Number(row.lot_id)).filter(Number.isFinite))] as number[]
  const requestIds = rows.map((row: any) => Number(row.id))

  const [profilesResult, lotsResult, documentsResult, bookingPaymentsResult, refundsResult] = await Promise.all([
    marketingIds.length
      ? supabase.from('profiles').select('id, full_name').in('id', marketingIds)
      : Promise.resolve({ data: [], error: null } as any),
    lotIds.length
      ? supabase.from('lots').select('id, lot_number, block_id, status, blocks(name, code)').in('id', lotIds)
      : Promise.resolve({ data: [], error: null } as any),
    supabase.from('spk_request_documents').select('*').in('spk_request_id', requestIds).order('created_at'),
    supabase.from('payments')
      .select('id, spk_request_id, amount, status, proof_path, created_at')
      .in('spk_request_id', requestIds)
      .eq('payment_category', 'Booking')
      .order('created_at', { ascending: false }),
    supabase
      .from('booking_fee_refunds')
      .select('spk_request_id, status, amount, proof_path, refund_method, refund_note, bank_reference, refunded_at')
      .in('spk_request_id', requestIds),
  ])

  throwIfError(profilesResult.error)
  throwIfError(lotsResult.error)
  throwIfError(documentsResult.error)
  throwIfError(bookingPaymentsResult.error)
  if (
    refundsResult.error
    && refundsResult.error.code !== '42P01'
    && refundsResult.error.code !== 'PGRST205'
  ) {
    throwIfError(refundsResult.error)
  }

  const profileMap = new Map<string, string | null>(
    (profilesResult.data || []).map((profile: any) => [profile.id, profile.full_name ?? null]),
  )
  const lotMap = new Map<number, { lot_number: string; block_name: string | null; status: string | null }>()
  for (const lot of lotsResult.data || []) {
    const block = relationOne(lot.blocks)
    lotMap.set(Number(lot.id), {
      lot_number: lot.lot_number,
      block_name: block?.name || block?.code || null,
      status: lot.status ?? null,
    })
  }

  const documentsMap = new Map<number, SPKDocument[]>()
  for (const rawDocument of documentsResult.data || []) {
    const document = {
      ...rawDocument,
      id: Number(rawDocument.id),
      spk_request_id: Number(rawDocument.spk_request_id),
      file_size_bytes: toNullableNumber(rawDocument.file_size_bytes),
    } as SPKDocument
    const list = documentsMap.get(document.spk_request_id) || []
    list.push(document)
    documentsMap.set(document.spk_request_id, list)
  }

  const bookingPaymentMap = new Map<number, SPKBookingPaymentSummary>()
  const paymentProofDocuments = new Map<number, SPKDocument[]>()
  for (const payment of bookingPaymentsResult.data || []) {
    const requestId = Number(payment.spk_request_id)
    const existing = bookingPaymentMap.get(requestId) || {
      totalAmount: 0,
      confirmedAmount: 0,
      pendingAmount: 0,
      rejectedAmount: 0,
      requiredAmount: 0,
      isSatisfied: false,
      payments: [],
    }
    const amount = Math.max(0, Number(payment.amount || 0))
    existing.totalAmount += amount
    if (payment.status === 'Confirmed') existing.confirmedAmount += amount
    if (payment.status === 'Pending' || payment.status === 'Needs Reupload') existing.pendingAmount += amount
    if (payment.status === 'Rejected') existing.rejectedAmount += amount
    existing.payments.push({
      id: Number(payment.id),
      amount,
      status: payment.status,
      proof_path: payment.proof_path ?? null,
    })
    bookingPaymentMap.set(requestId, existing)
    if (payment.proof_path) {
      const proofList = paymentProofDocuments.get(requestId) || []
      proofList.push({
        id: -Number(payment.id),
        spk_request_id: requestId,
        document_type: 'Payment Proof',
        file_name: String(payment.proof_path).split('/').pop() || 'Bukti pembayaran',
        file_path: payment.proof_path,
        mime_type: null,
        file_size_bytes: null,
        created_at: payment.created_at ?? null,
        storage_bucket: 'payment-proofs',
      })
      paymentProofDocuments.set(requestId, proofList)
    }
  }

  const refundMap = new Map<number, SPKBookingFeeRefund>()
  for (const refund of refundsResult.data || []) {
    refundMap.set(Number(refund.spk_request_id), {
      status: refund.status,
      amount: Number(refund.amount),
      proofPath: refund.proof_path ?? null,
      refundMethod: refund.refund_method ?? null,
      refundNote: refund.refund_note ?? null,
      bankReference: refund.bank_reference ?? null,
      refundedAt: refund.refunded_at ?? null,
    })
  }

  return rows.map((row: any) => {
    const lot = lotMap.get(Number(row.lot_id))
    const source = normalizeSource(row)
    const requestId = Number(row.id)
    return {
      ...row,
      id: Number(row.id),
      customer_id: toNullableNumber(row.customer_id),
      lot_id: Number(row.lot_id),
      lot_price_snapshot: Number(row.lot_price_snapshot || 0),
      payment_plan_id: toNullableNumber(row.payment_plan_id),
      months: toNullableNumber(row.months),
      monthly_payment: toNullableNumber(row.monthly_payment),
      margin_percent_snapshot: toNullableNumber(row.margin_percent_snapshot),
      down_payment_snapshot: Number(row.down_payment_snapshot || 0),
      total_payment_snapshot: toNullableNumber(row.total_payment_snapshot),
      submission_source: source,
      marketing_name: row.marketing_id ? profileMap.get(row.marketing_id) || 'Marketing tidak tersedia' : null,
      lot_number: lot?.lot_number || `ID ${row.lot_id}`,
      block_name: lot?.block_name || 'Blok tidak tersedia',
      lot_status: lot?.status ?? null,
      documents: [
        ...(documentsMap.get(requestId) || []),
        ...(paymentProofDocuments.get(requestId) || []),
      ],
      booking_payment: {
        ...(bookingPaymentMap.get(requestId) || {
          totalAmount: 0,
          confirmedAmount: 0,
          pendingAmount: 0,
          rejectedAmount: 0,
          requiredAmount: 0,
          isSatisfied: false,
          payments: [],
        }),
        requiredAmount: Number(row.booking_fee_snapshot ?? DEFAULT_SPK_BOOKING_FEE),
        isSatisfied: (bookingPaymentMap.get(requestId)?.confirmedAmount || 0) >= Number(row.booking_fee_snapshot ?? DEFAULT_SPK_BOOKING_FEE),
      },
      booking_fee_refund: refundMap.get(requestId) ?? null,
    } as AdminSPKRequest
  })
}

export async function getCustomersForAdminSPK(source: CustomerSource): Promise<AdminSPKCustomer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      id, full_name, phone, whatsapp_phone, email, address, registration_source,
      customer_interests (
        lot_id,
        lots (
          lot_number,
          blocks (name, code)
        )
      )
    `)
    .eq('registration_source', source)
    .order('full_name', { ascending: true })
  throwIfError(error)

  return (data || []).map((row: any) => ({
    id: Number(row.id),
    full_name: row.full_name,
    phone: row.phone ?? null,
    whatsapp_phone: row.whatsapp_phone ?? null,
    email: row.email ?? null,
    address: row.address ?? null,
    interests: (row.customer_interests || []).map((interest: any) => {
      const lot = relationOne(interest.lots)
      const block = relationOne(lot?.blocks)
      return {
        lot_id: Number(interest.lot_id),
        lot_number: lot?.lot_number || `Lot #${interest.lot_id}`,
        block_name: block?.name || block?.code || null,
      }
    }),
  }))
}

export async function createCustomerForAdminSPK(input: {
  full_name: string
  phone: string | null
  whatsapp_phone: string | null
  email: string | null
  address: string | null
}): Promise<number> {
  const fullName = input.full_name.trim()
  if (!fullName) throw new Error('Nama customer wajib diisi.')
  if (!input.phone && !input.whatsapp_phone) {
    throw new Error('Nomor telepon atau WhatsApp wajib diisi.')
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      full_name: fullName,
      phone: input.phone,
      whatsapp_phone: input.whatsapp_phone,
      email: input.email,
      address: input.address,
      registration_source: 'Admin',
    })
    .select('id')
    .single()
  throwIfError(error)
  if (!data?.id) throw new Error('Customer berhasil dikirim tetapi ID tidak diterima.')
  return Number(data.id)
}

export function getAdminSPKStats(rows: AdminSPKRequest[]): SPKAdminStats {
  return {
    total: rows.length,
    submitted: rows.filter(row => row.status === 'Submitted').length,
    underReview: rows.filter(row => row.status === 'Under Review').length,
    approved: rows.filter(row => row.status === 'Approved').length,
    rejected: rows.filter(row => row.status === 'Rejected').length,
  }
}

export async function getSPKDocumentUrl(filePath: string, bucket = STORAGE_BUCKET): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 300)
  throwIfError(error)
  if (!data?.signedUrl) throw new Error('Tautan dokumen tidak tersedia.')
  return data.signedUrl
}

export async function getAvailableLotsForAdmin(): Promise<AdminAvailableLot[]> {
  const { data, error } = await supabase
    .from('lots')
    .select('id, lot_number, block_id, cash_price, promo_price, status, blocks(name, code)')
    .eq('status', 'Available')
    .order('lot_number', { ascending: true })
  throwIfError(error)

  return (data || []).map((row: any) => {
    const block = relationOne(row.blocks)
    return {
      id: Number(row.id),
      lot_number: row.lot_number,
      block_id: toNullableNumber(row.block_id),
      block_name: block?.name || null,
      block_code: block?.code || null,
      cash_price: toNullableNumber(row.cash_price),
      promo_price: toNullableNumber(row.promo_price),
      status: row.status ?? null,
    }
  })
}

export async function getLotInstallmentOptionsForAdmin(lotId: number): Promise<AdminLotInstallmentOption[]> {
  const { data, error } = await supabase
    .from('lot_installments')
    .select('id, lot_id, plan_id, monthly_payment, is_custom, payment_plans(id, plan_name, months, margin_percent)')
    .eq('lot_id', lotId)
  throwIfError(error)

  return (data || []).map((row: any) => {
    const plan = relationOne(row.payment_plans)
    return {
      id: Number(row.id),
      lot_id: Number(row.lot_id),
      plan_id: Number(row.plan_id),
      monthly_payment: toNullableNumber(row.monthly_payment),
      is_custom: Boolean(row.is_custom),
      plan_name: plan?.plan_name || `${Number(plan?.months || 0)} Bulan`,
      months: Number(plan?.months || 0),
      margin_percent: Number(plan?.margin_percent ?? 0),
    }
  }).filter((option: AdminLotInstallmentOption) => option.months > 0)
}

function validateAdminSPKInput(input: CreateAdminSPKInput, documents: SPKDocumentFile[]): void {
  if (!Number.isInteger(input.customer_id) || input.customer_id <= 0) {
    throw new Error('Customer belum dipilih dengan benar.')
  }
  if (!Number.isInteger(input.lot_id) || input.lot_id <= 0) {
    throw new Error('Kavling belum dipilih dengan benar.')
  }
  if (!Number.isFinite(input.lot_price_snapshot) || input.lot_price_snapshot <= 0) {
    throw new Error('Harga kavling tidak valid.')
  }
  if (!input.customer_full_name.trim()) {
    throw new Error('Nama customer wajib tersedia.')
  }

  if (input.payment_method === 'Cash') {
    if (input.payment_plan_id !== null || input.months !== null || input.monthly_payment !== null) {
      throw new Error('Data tenor dan cicilan harus kosong untuk pembayaran tunai.')
    }
    if (input.down_payment_snapshot !== 0) {
      throw new Error('DP snapshot untuk pembayaran tunai harus 0.')
    }
  } else {
    if (!(input.down_payment_snapshot > 0 && input.down_payment_snapshot < input.lot_price_snapshot)) {
      throw new Error('DP harus lebih besar dari 0 dan lebih kecil dari harga kavling.')
    }
    if (!input.payment_plan_id || !input.months || input.months <= 0 || !input.monthly_payment || input.monthly_payment <= 0) {
      throw new Error('Rincian cicilan belum lengkap.')
    }
  }
  if (!Number.isFinite(input.total_payment_snapshot) || input.total_payment_snapshot <= 0) {
    throw new Error('Total pembayaran tidak valid.')
  }

  const required: SPKDocumentType[] = ['KTP', 'KK', 'Payment Proof']
  for (const type of required) {
    if (!documents.some(document => document.type === type)) {
      throw new Error(`Dokumen ${type} wajib disertakan.`)
    }
  }
  for (const document of documents) {
    if (document.file.size > MAX_DOCUMENT_SIZE) {
      throw new Error(`${document.file.name} melebihi batas 5 MB.`)
    }
    if (document.file.type && !ALLOWED_DOCUMENT_TYPES.includes(document.file.type)) {
      throw new Error(`Format ${document.file.name} harus JPG, PNG, WEBP, atau PDF.`)
    }
  }
}

export async function createAdminSPKRequest(
  input: CreateAdminSPKInput,
  documents: SPKDocumentFile[],
): Promise<{ id: number; spk_number: string }> {
  validateAdminSPKInput(input, documents)

  const { data: authData, error: authError } = await supabase.auth.getUser()
  throwIfError(authError)
  const user = authData.user
  if (!user) throw new Error('Sesi login tidak ditemukan.')

  const uploadedSPKPaths: string[] = []
  const uploadedPaymentPaths: string[] = []
  let requestId: number | null = null

  try {
    const { data: request, error: insertError } = await supabase
      .from('spk_requests')
      .insert({
        customer_id: input.customer_id,
        customer_full_name: input.customer_full_name.trim(),
        customer_phone: input.customer_phone.trim(),
        customer_email: input.customer_email?.trim() || null,
        customer_address: input.customer_address.trim(),
        lot_id: input.lot_id,
        lot_price_snapshot: Math.round(input.lot_price_snapshot),
        payment_method: input.payment_method,
        payment_plan_id: input.payment_method === 'Installment' ? input.payment_plan_id : null,
        months: input.payment_method === 'Installment' ? input.months : null,
        monthly_payment: input.payment_method === 'Installment' ? Math.round(input.monthly_payment || 0) : null,
        margin_percent_snapshot: input.payment_method === 'Installment' ? input.margin_percent_snapshot ?? 0 : null,
        down_payment_snapshot: input.payment_method === 'Installment' ? Math.round(input.down_payment_snapshot) : 0,
        total_payment_snapshot: Math.round(input.total_payment_snapshot),
        notes: input.notes?.trim() || null,
        marketing_id: null,
        submitted_by: user.id,
        submission_source: 'Admin',
        status: 'Submitted',
      })
      .select('id, spk_number, booking_fee_snapshot')
      .single()
    if (insertError) throw new Error(`SPK database gagal disimpan: ${insertError.message}`)
    if (!request) throw new Error('Gagal membuat pengajuan SPK.')
    requestId = Number(request.id)

    for (const document of documents) {
      const extension = (document.file.name.split('.').pop() || 'bin')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'bin'

      if (document.type === 'Payment Proof') {
        let proofPath: string
        try {
          proofPath = await paymentService.uploadSPKBookingProof(document.file, requestId)
        } catch (error) {
          throw new Error(`Upload bukti pembayaran gagal: ${error instanceof Error ? error.message : 'Kesalahan Storage'}`)
        }
        uploadedPaymentPaths.push(proofPath)
        try {
          await paymentService.createSPKBookingPayment({
            spk_request_id: requestId,
            customer_id: input.customer_id,
            lot_id: input.lot_id,
            amount: Number(request.booking_fee_snapshot ?? DEFAULT_SPK_BOOKING_FEE),
            proof_path: proofPath,
            note: `Booking Fee untuk ${request.spk_number}`,
          })
        } catch (error) {
          throw new Error(`Booking Fee gagal disimpan: ${error instanceof Error ? error.message : 'Kesalahan database'}`)
        }
        continue
      }

      const safeType = document.type.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      // KTP, KK, dan NPWP tetap disimpan di bucket dokumen privat SPK.
      const path = `${user.id}/${requestId}/${safeType}-${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, document.file, {
        cacheControl: '3600',
        upsert: false,
        contentType: document.file.type || 'application/octet-stream',
      })
      if (uploadError) throw new Error(`Upload dokumen ${document.type} gagal: ${uploadError.message}`)
      uploadedSPKPaths.push(path)

      const { error: metadataError } = await supabase.from('spk_request_documents').insert({
        spk_request_id: requestId,
        document_type: document.type,
        file_name: document.file.name,
        file_path: path,
        mime_type: document.file.type || null,
        file_size_bytes: document.file.size,
        uploaded_by: user.id,
      })
      if (metadataError) throw new Error(`Metadata dokumen ${document.type} gagal disimpan: ${metadataError.message}`)
    }

    return { id: requestId, spk_number: request.spk_number }
  } catch (error) {
    // Bersihkan metadata, objek Storage, lalu request. Setiap cleanup dicoba terpisah.
    if (requestId !== null) {
      const { error: metadataCleanupError } = await supabase
        .from('spk_request_documents')
        .delete()
        .eq('spk_request_id', requestId)
      if (metadataCleanupError) console.error('Cleanup SPK document metadata failed:', metadataCleanupError)
    }

    if (uploadedSPKPaths.length) {
      const { error: storageCleanupError } = await supabase.storage.from(STORAGE_BUCKET).remove(uploadedSPKPaths)
      if (storageCleanupError) console.error('Cleanup SPK storage failed:', storageCleanupError)
    }

    if (uploadedPaymentPaths.length) {
      const { error: paymentStorageCleanupError } = await supabase.storage.from('payment-proofs').remove(uploadedPaymentPaths)
      if (paymentStorageCleanupError) console.error('Cleanup payment proof storage failed:', paymentStorageCleanupError)
    }

    if (requestId !== null) {
      const { error: paymentCleanupError } = await supabase.from('payments').delete().eq('spk_request_id', requestId)
      if (paymentCleanupError) console.error('Cleanup SPK payment failed:', paymentCleanupError)
    }

    if (requestId !== null) {
      const { error: requestCleanupError } = await supabase.from('spk_requests').delete().eq('id', requestId)
      if (requestCleanupError) console.error('Cleanup SPK request failed:', requestCleanupError)
    }
    throw error
  }
}

export async function approveSPKRequest(requestId: number): Promise<void> {
  const { error } = await supabase.rpc('admin_approve_spk_request', { p_request_id: requestId })
  throwIfError(error)
}

export type SPKRejectionCategory = 'Administrative Error' | 'Buyer Cancellation' | 'Other'

export async function rejectSPKRequest(
  requestId: number,
  reason: string,
  category: SPKRejectionCategory = 'Other',
): Promise<void> {
  const trimmedReason = reason.trim()
  if (!trimmedReason) throw new Error('Alasan penolakan wajib diisi.')
  const { error } = await supabase.rpc('admin_reject_spk_request_with_category', {
    p_request_id: requestId,
    p_rejection_reason: trimmedReason,
    p_rejection_category: category,
  })
  throwIfError(error)
}

export async function uploadBookingFeeRefundProof(
  spkRequestId: number,
  file: File,
): Promise<string> {
  if (!Number.isInteger(spkRequestId) || spkRequestId <= 0) {
    throw new Error('ID SPK tidak valid.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran bukti pengembalian maksimal 5 MB.')
  }
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
    throw new Error('Format bukti pengembalian harus JPG, PNG, WEBP, atau PDF.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExtension = /^[a-z0-9]{2,5}$/.test(extension) ? extension : 'jpg'
  const path = `refund/${spkRequestId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`

  const { error } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  throwIfError(error)
  return path
}

export async function recordBookingFeeRefund(
  paymentId: number,
  proofPath: string,
  refundMethod: string,
  refundNote: string,
  bankReference: string | null,
  refundedAt: string,
): Promise<void> {
  const { error } = await supabase.rpc('record_booking_fee_refund', {
    p_payment_id: paymentId,
    p_proof_path: proofPath,
    p_refund_method: refundMethod,
    p_refund_note: refundNote,
    p_bank_reference: bankReference,
    p_refunded_at: refundedAt,
  })
  throwIfError(error)
}
