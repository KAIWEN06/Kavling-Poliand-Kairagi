
import { supabase } from '@/services/config/supabase'

export type ClientSpkDocumentKey = 'ktp' | 'kk' | 'npwp' | 'paymentProof'

export type ClientSpkStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'

export interface ClientSpkDocument {
  id: number
  document_type: 'KTP' | 'KK' | 'NPWP' | 'Payment Proof'
  file_name: string
  file_path: string
  mime_type: string | null
  file_size_bytes: number | null
}

export interface ClientSpkRecord {
  id: number
  spkNumber: string
  createdAt: string
  status: ClientSpkStatus
  lot: {
    id: number
    name: string
    area: number | string | null
    dimension: string | null
    price: number | null
  }
  buyer: {
    fullName: string
    phone: string
    email: string | null
    address: string
  }
  payment: {
    scheme: 'Cash' | 'Installment'
    method: string | null
    tenorMonths: number | null
    monthlyPayment: number | null
  }
  documents: Partial<Record<ClientSpkDocumentKey, ClientSpkDocument>>
}

export interface CreateClientSpkInput {
  lot: {
    id: number
    price: number | null
  }
  buyer: {
    fullName: string
    phone: string
    whatsappPhone: string
    email: string
    address: string
  }
  payment: {
    scheme: 'Cash' | 'Installment'
    method: 'Transfer Bank' | 'Tunai'
    planId: number | null
    tenorMonths: number | null
    monthlyPayment: number | null
  }
  documents: Record<ClientSpkDocumentKey, File | null>
}

interface SpkRequestRow {
  id: number
  spk_number: string
  submitted_at: string
  status: ClientSpkStatus
  lot_id: number
  lot_price_snapshot: number | string
  customer_full_name: string
  customer_phone: string
  customer_email: string | null
  customer_address: string
  payment_method: 'Cash' | 'Installment'
  months: number | null
  monthly_payment: number | string | null
  notes: string | null
  lot: SpkRequestLot | SpkRequestLot[] | null
}

interface SpkRequestLot {
  lot_number: string
  area: number | string | null
  dimension: string | null
  block: SpkRequestBlock | SpkRequestBlock[] | null
}

interface SpkRequestBlock {
  code: string | null
  name: string | null
}

interface SpkRequestDocumentRow extends ClientSpkDocument {
  spk_request_id: number
  uploaded_by: string
}

const STORAGE_BUCKET = 'spk-client-private-documents'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const FILE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
}

const DOCUMENTS: Array<{
  key: ClientSpkDocumentKey
  type: ClientSpkDocument['document_type']
}> = [
  { key: 'ktp', type: 'KTP' },
  { key: 'kk', type: 'KK' },
  { key: 'npwp', type: 'NPWP' },
  { key: 'paymentProof', type: 'Payment Proof' },
]

const DOCUMENT_KEY_BY_TYPE: Record<
  ClientSpkDocument['document_type'],
  ClientSpkDocumentKey
> = {
  KTP: 'ktp',
  KK: 'kk',
  NPWP: 'npwp',
  'Payment Proof': 'paymentProof',
}

const PAYMENT_METHOD_NOTE_PREFIX = 'Metode pembayaran yang dipilih: '

export function getClientSpkErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) return error.message

  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error.message
  }

  return fallback
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error

  if (!data.user) {
    throw new Error('Silakan masuk kembali untuk mengelola SPK.')
  }

  return data.user
}

function validateInput(input: CreateClientSpkInput) {
  if (!Number.isInteger(input.lot.id) || input.lot.id <= 0) {
    throw new Error('ID kavling tidak valid.')
  }

  if (!['Cash', 'Installment'].includes(input.payment.scheme)) {
    throw new Error('Skema pembayaran tidak valid.')
  }

  if (!['Transfer Bank', 'Tunai'].includes(input.payment.method)) {
    throw new Error('Metode pembayaran tidak valid.')
  }

  if (input.payment.scheme === 'Installment') {
    if (!input.payment.planId || input.payment.planId <= 0) {
      throw new Error('Pilih rencana tenor cicilan sebelum menyimpan SPK.')
    }

    if (
      input.payment.tenorMonths !== null
      && (!Number.isInteger(input.payment.tenorMonths)
        || input.payment.tenorMonths <= 0)
    ) {
      throw new Error('Tenor cicilan tidak valid.')
    }

    if (
      input.payment.monthlyPayment !== null
      && (!Number.isSafeInteger(input.payment.monthlyPayment)
        || input.payment.monthlyPayment <= 0)
    ) {
      throw new Error('Nominal cicilan tidak valid.')
    }
  }

  for (const { key } of DOCUMENTS) {
    const file = input.documents[key]

    if (!file) {
      if (key !== 'npwp') {
        throw new Error(`Dokumen ${key.toUpperCase()} wajib diunggah.`)
      }

      continue
    }

    if (!Object.hasOwn(FILE_TYPES, file.type)) {
      throw new Error(
        `${file.name}: format berkas harus JPG, PNG, atau PDF.`,
      )
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      throw new Error(`${file.name}: ukuran berkas maksimal 5 MB.`)
    }
  }
}

function getDocumentPath(
  userId: string,
  spkId: number,
  key: ClientSpkDocumentKey,
  file: File,
) {
  return `${userId}/${spkId}/${key}.${FILE_TYPES[file.type]}`
}

async function removeUploadedFiles(paths: string[]) {
  if (!paths.length) return

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(paths)

  if (error) {
    console.error(
      '[Client SPK] Gagal membersihkan unggahan sementara:',
      error,
    )
  }
}

/**
 * Membuat pengajuan SPK Client.
 *
 * Alur:
 * 1. Validasi input.
 * 2. Membuat SPK melalui RPC.
 * 3. Upload dokumen ke Storage.
 * 4. Menyimpan metadata dokumen.
 * 5. Membuat pembayaran Booking Fee melalui RPC.
 *
 * Harga, tenor, dan nominal cicilan dihitung/diambil dari database.
 */
export async function createClientSpk(
  input: CreateClientSpkInput,
): Promise<number> {
  validateInput(input)

  const user = await getAuthenticatedUser()

  // ---------------------------------------------------------
  // 1. BUAT SPK MELALUI RPC
  // ---------------------------------------------------------

  const { data: requestId, error: requestError } = await supabase.rpc(
    'create_client_spk_request',
    {
      p_customer_full_name: input.buyer.fullName,
      p_customer_phone: input.buyer.phone,
      p_customer_whatsapp_phone: input.buyer.whatsappPhone || null,
      p_customer_email: input.buyer.email || null,
      p_customer_address: input.buyer.address,

      p_lot_id: input.lot.id,

      // Database tidak mempercayai harga dari frontend.
      p_lot_price_snapshot: 0,

      p_payment_method: input.payment.scheme,

      p_payment_plan_id:
        input.payment.scheme === 'Installment'
          ? input.payment.planId
          : null,

      // Database mengambil tenor dan nominal cicilan
      // dari payment_plans dan lot_installments.
      p_months: null,
      p_monthly_payment: null,

      p_notes: `${PAYMENT_METHOD_NOTE_PREFIX}${input.payment.method}`,
    },
  )

  if (requestError) throw requestError

  if (typeof requestId !== 'number') {
    throw new Error(
      'SPK tersimpan, tetapi nomor pengajuan tidak diterima.',
    )
  }

  const uploadedPaths: string[] = []

  try {
    // -------------------------------------------------------
    // 2. UPLOAD DOKUMEN
    // -------------------------------------------------------

    const documentRows: Array<Omit<SpkRequestDocumentRow, 'id'>> = []

    for (const { key, type } of DOCUMENTS) {
      const file = input.documents[key]

      if (!file) continue

      const storagePath = getDocumentPath(
        user.id,
        requestId,
        key,
        file,
      )

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) throw uploadError

      uploadedPaths.push(storagePath)

      documentRows.push({
        spk_request_id: requestId,
        uploaded_by: user.id,
        document_type: type,
        file_name: file.name,
        file_path: storagePath,
        mime_type: file.type,
        file_size_bytes: file.size,
      })
    }

    // -------------------------------------------------------
    // 3. SIMPAN METADATA DOKUMEN
    // -------------------------------------------------------

    const { error: documentsError } = await supabase
      .from('spk_request_documents')
      .insert(documentRows)

    if (documentsError) throw documentsError

    // -------------------------------------------------------
    // 4. BUAT PEMBAYARAN BOOKING FEE
    // -------------------------------------------------------

    // RPC mengambil:
    // - Customer ID dari SPK
    // - Lot ID dari SPK
    // - Nominal dari booking_fee_snapshot
    // - Bukti dari spk_request_documents
    //
    // Client tidak melakukan INSERT langsung ke payments.

    const { error: paymentError } = await supabase.rpc(
      'create_client_spk_booking_payment',
      {
        p_request_id: requestId,
        p_payment_method: input.payment.method,
      },
    )

    if (paymentError) throw paymentError

    return requestId
  } catch (error) {
    // -------------------------------------------------------
    // 5. CLEANUP JIKA PROSES GAGAL
    // -------------------------------------------------------

    await removeUploadedFiles(uploadedPaths)

    const { error: cleanupError } = await supabase.rpc(
      'discard_client_spk_request',
      {
        p_request_id: requestId,
      },
    )

    if (cleanupError) {
      console.error(
        '[Client SPK] Gagal membersihkan data SPK sementara:',
        cleanupError,
      )
    }

    throw error
  }
}

function getFirstRelation<T>(
  value: T | T[] | null,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value
}

function toClientRecord(
  row: SpkRequestRow,
  documents: Partial<Record<ClientSpkDocumentKey, ClientSpkDocument>>,
): ClientSpkRecord {
  const lot = getFirstRelation(row.lot)

  if (!lot) {
    throw new Error('Data kavling SPK tidak ditemukan.')
  }

  const block = getFirstRelation(lot.block)

  const blockName = block?.code || block?.name

  const lotName = blockName
    ? `${/^blok\b/i.test(blockName) ? blockName : `Blok ${blockName}`} - No. ${lot.lot_number}`
    : lot.lot_number

  return {
    id: row.id,
    spkNumber: row.spk_number,
    createdAt: row.submitted_at,
    status: row.status,

    lot: {
      id: row.lot_id,
      name: lotName,
      area: lot.area,
      dimension: lot.dimension,
      price: Number(row.lot_price_snapshot),
    },

    buyer: {
      fullName: row.customer_full_name,
      phone: row.customer_phone,
      email: row.customer_email,
      address: row.customer_address,
    },

    payment: {
      scheme: row.payment_method,

      method: row.notes?.startsWith(PAYMENT_METHOD_NOTE_PREFIX)
        ? row.notes.slice(PAYMENT_METHOD_NOTE_PREFIX.length)
        : null,

      tenorMonths: row.months,

      monthlyPayment:
        row.monthly_payment === null
          ? null
          : Number(row.monthly_payment),
    },

    documents,
  }
}

/**
 * Mengambil seluruh pengajuan SPK milik Client yang sedang login.
 */
export async function getClientSpks(): Promise<ClientSpkRecord[]> {
  const user = await getAuthenticatedUser()

  const { data, error } = await supabase
    .from('spk_requests')
    .select(`
      id,
      spk_number,
      submitted_at,
      status,
      lot_id,
      lot_price_snapshot,
      customer_full_name,
      customer_phone,
      customer_email,
      customer_address,
      payment_method,
      months,
      monthly_payment,
      notes,
      lot:lots!spk_requests_lot_id_fkey (
        lot_number,
        area,
        dimension,
        block:blocks (code, name)
      )
    `)
    .eq('submitted_by', user.id)
    .eq('submission_source', 'Client')
    .order('submitted_at', { ascending: false })

  if (error) throw error

  const requests = (data ?? []) as SpkRequestRow[]

  if (!requests.length) return []

  const requestIds = requests.map((request) => request.id)

  // Ambil dokumen milik user yang sedang login.
  const { data: documentRows, error: documentsError } = await supabase
    .from('spk_request_documents')
    .select(`
      id,
      spk_request_id,
      document_type,
      file_name,
      file_path,
      mime_type,
      file_size_bytes,
      uploaded_by
    `)
    .in('spk_request_id', requestIds)
    .eq('uploaded_by', user.id)

  if (documentsError) throw documentsError

  const documentsByRequest = new Map<
    number,
    Partial<Record<ClientSpkDocumentKey, ClientSpkDocument>>
  >()

  for (const document of (documentRows ?? []) as SpkRequestDocumentRow[]) {
    const key = DOCUMENT_KEY_BY_TYPE[document.document_type]

    if (!key) continue

    const documents = documentsByRequest.get(document.spk_request_id) ?? {}

    documents[key] = document

    documentsByRequest.set(document.spk_request_id, documents)
  }

  return requests.map((request) =>
    toClientRecord(
      request,
      documentsByRequest.get(request.id) ?? {},
    ),
  )
}

/**
 * Menghapus pengajuan SPK Client.
 *
 * SPK yang sudah memiliki pembayaran Booking Fee tidak dapat
 * dihapus melalui fungsi ini.
 */
export async function deleteClientSpk(id: number): Promise<void> {
  const user = await getAuthenticatedUser()

  const { data: request, error: requestError } = await supabase
    .from('spk_requests')
    .select('id, status, transaction_id')
    .eq('id', id)
    .eq('submitted_by', user.id)
    .eq('submission_source', 'Client')
    .maybeSingle()

  if (requestError) throw requestError

  if (!request) {
    throw new Error(
      'SPK tidak ditemukan. Muat ulang halaman lalu coba kembali.',
    )
  }

  if (
    request.status === 'Under Review'
    || request.status === 'Approved'
    || request.transaction_id !== null
  ) {
    throw new Error(
      'SPK yang sedang ditinjau atau sudah disetujui tidak dapat dihapus.',
    )
  }

  // ---------------------------------------------------------
  // 1. CEK PEMBAYARAN BOOKING
  // ---------------------------------------------------------

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, status')
    .eq('spk_request_id', id)
    .eq('payment_category', 'Booking')
    .maybeSingle()

  if (paymentError) throw paymentError

  if (payment) {
    throw new Error(
      'SPK sudah memiliki pembayaran Booking Fee. Hubungi Admin untuk proses pembatalan.',
    )
  }

  // ---------------------------------------------------------
  // 2. AMBIL PATH DOKUMEN
  // ---------------------------------------------------------

  const { data: documents, error: documentsError } = await supabase
    .from('spk_request_documents')
    .select('file_path')
    .eq('spk_request_id', id)
    .eq('uploaded_by', user.id)

  if (documentsError) throw documentsError

  const filePaths = (documents ?? []).map(
    (document) => document.file_path,
  )

  // ---------------------------------------------------------
  // 3. HAPUS DATA DATABASE TERLEBIH DAHULU
  // ---------------------------------------------------------

  const { error: deleteError } = await supabase
    .from('spk_requests')
    .delete()
    .eq('id', id)
    .eq('submitted_by', user.id)
    .eq('submission_source', 'Client')

  if (deleteError) throw deleteError

  // ---------------------------------------------------------
  // 4. HAPUS FILE STORAGE SETELAH DATABASE BERHASIL
  // ---------------------------------------------------------

  if (filePaths.length) {
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(filePaths)

    if (storageError) {
      console.error(
        '[Client SPK] Data SPK terhapus, tetapi file Storage gagal dibersihkan:',
        storageError,
      )

      throw new Error(
        'Data SPK berhasil dihapus, tetapi beberapa file dokumen gagal dibersihkan dari Storage.',
        { cause: storageError },
      )
    }
  }
}
