
import { supabase } from '@/services/config/supabase'

export type InstallmentScheduleRecord = {
  id: number
  transaction_id: number
  installment_number: number
  due_date: string
  /** false selama PPJB belum selesai: due_date masih sementara. */
  due_date_official?: boolean
  amount: number
  status: 'Pending' | 'Paid' | 'Overdue'
  pending_payment?: boolean
}

export type PaymentAllocationInput = {
  installment_schedule_id: number
  allocated_amount: number
}

export type PaymentRecord = {
  id: number
  customer_id: number | null
  lot_id: number | null
  transaction_id: number | null
  spk_request_id?: number | null
  payment_date: string | null
  amount: number | null
  payment_method: string | null
  payment_category: string
  reference_number: string | null
  proof_path: string | null
  note: string | null
  review_note: string | null
  status: 'Pending' | 'Confirmed' | 'Rejected' | 'Needs Reupload'
  created_at: string
  verified_at: string | null
  verified_by: string | null
}

export type PaymentDetail = {
  payment: PaymentRecord
  customer: {
    id: number
    full_name: string
    phone: string | null
    whatsapp_phone: string | null
  } | null
  lot: {
    id: number
    lot_number: string
    area: number | null
    blocks?: { name: string } | null
  } | null
  spk: {
    id: number
    spk_number: string
    status: string
  } | null
  transaction: {
    id: number
    payment_type: string
    final_price: number
    months: number | null
    monthly_payment: number | null
  } | null
  allocations: Array<{
    allocated_amount: number
    schedule: InstallmentScheduleRecord | null
  }>
}

const PAYMENTS = 'payments'
const SCHEDULES = 'installment_schedules'
const ALLOCATIONS = 'payment_allocations'

const PROOF_BUCKET = 'payment-proofs'
const CLIENT_SPK_PROOF_BUCKET = 'spk-client-private-documents'

export const DEFAULT_SPK_BOOKING_FEE = 1_000_000

export const paymentService = {
  // =========================================================
  // INSTALLMENT SCHEDULES
  // =========================================================

  async getInstallmentSchedules(
    transactionId: number,
  ): Promise<InstallmentScheduleRecord[]> {
    const { data, error } = await supabase
      .from(SCHEDULES)
      .select(`
        id,
        transaction_id,
        installment_number,
        due_date,
        due_date_official,
        amount,
        status,
        payment_allocations (
          allocated_amount,
          payments (status)
        )
      `)
      .eq('transaction_id', transactionId)
      .order('installment_number', { ascending: true })

    if (error) throw error

    return (data ?? []).map((row: any) => ({
      id: Number(row.id),
      transaction_id: Number(row.transaction_id),
      installment_number: Number(row.installment_number),
      due_date: row.due_date,
      due_date_official: row.due_date_official,
      amount: Number(row.amount),
      status: row.status,

      pending_payment: (row.payment_allocations ?? []).some(
        (allocation: any) =>
          allocation.payments?.status === 'Pending'
          || allocation.payments?.status === 'Needs Reupload',
      ),
    })) as InstallmentScheduleRecord[]
  },

  // =========================================================
  // PAYMENT DETAIL
  // =========================================================

  async getPaymentDetail(paymentId: number): Promise<PaymentDetail> {
    const { data: paymentData, error: paymentError } = await supabase
      .from(PAYMENTS)
      .select('*')
      .eq('id', paymentId)
      .single()

    if (paymentError) throw paymentError

    const payment = paymentData as PaymentRecord

    const [
      customerResult,
      lotResult,
      spkResult,
      transactionResult,
      allocationResult,
    ] = await Promise.all([
      payment.customer_id
        ? supabase
            .from('customers')
            .select('id, full_name, phone, whatsapp_phone')
            .eq('id', payment.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      payment.lot_id
        ? supabase
            .from('lots')
            .select('id, lot_number, area, blocks(name)')
            .eq('id', payment.lot_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      payment.spk_request_id
        ? supabase
            .from('spk_requests')
            .select('id, spk_number, status')
            .eq('id', payment.spk_request_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      payment.transaction_id
        ? supabase
            .from('lot_transactions')
            .select('id, payment_type, final_price, months, monthly_payment')
            .eq('id', payment.transaction_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      supabase
        .from(ALLOCATIONS)
        .select(`
          allocated_amount,
          installment_schedules (
            id,
            transaction_id,
            installment_number,
            due_date,
            amount,
            status
          )
        `)
        .eq('payment_id', paymentId),
    ])

    for (const result of [
      customerResult,
      lotResult,
      spkResult,
      transactionResult,
      allocationResult,
    ]) {
      if (result.error) throw result.error
    }

    const allocations = (allocationResult.data ?? []).map((item: any) => ({
      allocated_amount: Number(item.allocated_amount),

      schedule: item.installment_schedules
        ? {
            ...item.installment_schedules,
            amount: Number(item.installment_schedules.amount),
          } as InstallmentScheduleRecord
        : null,
    }))

    return {
      payment,

      customer: customerResult.data as PaymentDetail['customer'],

      lot: lotResult.data as PaymentDetail['lot'],

      spk: spkResult.data as PaymentDetail['spk'],

      transaction: transactionResult.data as PaymentDetail['transaction'],

      allocations,
    }
  },

  // =========================================================
  // MARKETING NAME
  // =========================================================

  async getMarketingName(customerId: number): Promise<string> {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('marketing_id')
      .eq('id', customerId)
      .maybeSingle()

    if (customerError) throw customerError

    if (!customer?.marketing_id) return ''

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', customer.marketing_id)
      .maybeSingle()

    if (profileError) throw profileError

    return profile?.full_name ?? ''
  },

  // =========================================================
  // PAYMENT PROOF URL
  // =========================================================

  /**
   * Menghasilkan signed URL untuk bukti pembayaran.
   *
   * Default:
   * - payment-proofs
   *
   * Jika pembayaran terhubung ke SPK Client:
   * - spk-client-private-documents
   *
   * spkRequestId bersifat opsional agar pemanggil lama
   * tetap kompatibel.
   */
  async getProofUrl(
    path: string,
    spkRequestId?: number | null,
    storageBucket?: string,
  ): Promise<string> {
    if (!path?.trim()) {
      throw new Error('Path bukti pembayaran tidak tersedia.')
    }

    // Bukti SPK dari Admin disimpan di payment-proofs, sedangkan bukti
    // SPK dari Client disimpan di spk-client-private-documents. Karena satu
    // payment dapat memiliki spk_request_id pada kedua alur, ID SPK tidak
    // cukup untuk menentukan bucket dengan pasti.
    const candidates = storageBucket
      ? [storageBucket]
      : spkRequestId
        ? [PROOF_BUCKET, CLIENT_SPK_PROOF_BUCKET]
        : [PROOF_BUCKET, CLIENT_SPK_PROOF_BUCKET]

    let lastError: unknown = null

    for (const bucket of candidates) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 300)

      if (!error && data?.signedUrl) return data.signedUrl
      lastError = error
    }

    if (lastError instanceof Error) throw lastError
    throw new Error('Tautan bukti pembayaran tidak tersedia pada bucket penyimpanan.')
  },

  // =========================================================
  // UPLOAD PAYMENT PROOF
  // =========================================================

  async uploadProof(
    file: File,
    transactionId: number,
  ): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'

    const safeExtension = /^[a-z0-9]{2,5}$/.test(extension)
      ? extension
      : 'jpg'

    const path = `${transactionId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`

    const { error } = await supabase.storage
      .from(PROOF_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      })

    if (error) throw error

    return path
  },

  // =========================================================
  // UPLOAD SPK BOOKING PROOF - ADMIN FLOW
  // =========================================================

  /**
   * Fungsi ini tetap digunakan oleh Admin.
   *
   * Client tidak menggunakan fungsi ini karena Client
   * menyimpan bukti di spk-client-private-documents.
   */
  async uploadSPKBookingProof(
    file: File,
    spkRequestId: number,
  ): Promise<string> {
    if (!Number.isInteger(spkRequestId) || spkRequestId <= 0) {
      throw new Error('ID pengajuan SPK tidak valid.')
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Ukuran file tidak boleh melebihi 5 MB.')
    }

    if (![
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ].includes(file.type)) {
      throw new Error('Format file harus JPG, PNG, WEBP, atau PDF.')
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'

    const safeExtension = /^[a-z0-9]{2,5}$/.test(extension)
      ? extension
      : 'jpg'

    const path = `spk/${spkRequestId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`

    const { error } = await supabase.storage
      .from(PROOF_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      })

    if (error) throw error

    return path
  },

  // =========================================================
  // REPLACE PAYMENT PROOF
  // =========================================================

  async replacePaymentProof(
    paymentId: number,
    file: File,
  ): Promise<void> {
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      throw new Error('ID pembayaran tidak valid.')
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Ukuran file tidak boleh melebihi 5 MB.')
    }

    if (![
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ].includes(file.type)) {
      throw new Error('Format file harus JPG, PNG, WEBP, atau PDF.')
    }

    const { data: payment, error: paymentError } = await supabase
      .from(PAYMENTS)
      .select(`
        id,
        spk_request_id,
        transaction_id,
        proof_path,
        status
      `)
      .eq('id', paymentId)
      .eq('status', 'Needs Reupload')
      .maybeSingle()

    if (paymentError) throw paymentError

    if (!payment) {
      throw new Error(
        'Pembayaran tidak sedang menunggu unggah ulang.',
      )
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'

    const safeExtension = /^[a-z0-9]{2,5}$/.test(extension)
      ? extension
      : 'jpg'

    const isClientSpkPayment = Boolean(payment.spk_request_id)
    const { data: authData, error: authError } =
      await supabase.auth.getUser()

    if (authError) throw authError

    const userId = authData.user?.id

    if (!userId) {
      throw new Error('Sesi masuk tidak ditemukan.')
    }

    const targetBucket = isClientSpkPayment
      ? CLIENT_SPK_PROOF_BUCKET
      : PROOF_BUCKET

    // Policy Storage hanya mengizinkan Client menulis di folder miliknya sendiri.
    const folder = isClientSpkPayment
      ? `${userId}/${payment.spk_request_id}`
      : `${userId}/${payment.transaction_id ?? paymentId}`

    const newPath = isClientSpkPayment
      ? `${folder}/reupload-${Date.now()}-${crypto.randomUUID()}.${safeExtension}`
      : `${folder}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`

    const { error: uploadError } = await supabase.storage
      .from(targetBucket)
      .upload(newPath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) throw uploadError

    const { data: replacedPayment, error: replaceError } =
      await supabase.rpc('replace_payment_proof_atomically', {
        p_payment_id: paymentId,
        p_new_proof_path: newPath,
        p_file_name: file.name,
        p_mime_type: file.type,
        p_file_size_bytes: file.size,
      })

    if (replaceError || !replacedPayment) {
      await supabase.storage
        .from(targetBucket)
        .remove([newPath])
      throw replaceError ?? new Error('Pembayaran gagal dikembalikan ke status Menunggu.')
    }

    // Bukti lama tetap disimpan di Storage dan dicatat pada
    // payment_proof_history untuk audit.
  },

  // =========================================================
  // CREATE SPK BOOKING PAYMENT - ADMIN FLOW
  // =========================================================

  /**
   * Membuat pembayaran Booking berstatus Pending
   * untuk alur Admin.
   *
   * Jangan digunakan oleh Client.
   * Client menggunakan RPC create_client_spk_booking_payment.
   */
  async createSPKBookingPayment(input: {
    spk_request_id: number
    customer_id: number
    lot_id: number
    amount: number
    proof_path: string
    note?: string | null
  }): Promise<PaymentRecord> {
    if (
      !Number.isInteger(input.spk_request_id)
      || input.spk_request_id <= 0
    ) {
      throw new Error('ID pengajuan SPK tidak valid.')
    }

    if (!input.proof_path.trim()) {
      throw new Error(
        'Bukti tanda jadi wajib tersedia sebelum pembayaran dibuat.',
      )
    }

    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new Error('Nominal tanda jadi tidak valid.')
    }

    // Cegah pembayaran Booking ganda.
    const { data: existingPayment, error: existingPaymentError } =
      await supabase
        .from(PAYMENTS)
        .select('id')
        .eq('spk_request_id', input.spk_request_id)
        .eq('payment_category', 'Booking')
        .limit(1)
        .maybeSingle()

    if (existingPaymentError) throw existingPaymentError

    if (existingPayment) {
      throw new Error(
        'Tanda jadi untuk SPK ini sudah dibuat.',
      )
    }

    const { data, error } = await supabase
      .from(PAYMENTS)
      .insert({
        spk_request_id: input.spk_request_id,
        customer_id: input.customer_id,
        lot_id: input.lot_id,
        transaction_id: null,
        payment_date: null,
        amount: input.amount,
        payment_method: null,
        payment_category: 'Booking',
        reference_number: null,
        proof_path: input.proof_path,
        note: input.note ?? 'Tanda jadi dari pengajuan SPK',
        status: 'Pending',
      })
      .select('*')
      .single()

    if (error) {
      await supabase.storage
        .from(PROOF_BUCKET)
        .remove([input.proof_path])

      throw error
    }

    return data as PaymentRecord
  },

  // =========================================================
  // CREATE PAYMENT
  // =========================================================

  async createPayment(input: {
    customer_id: number
    lot_id: number
    transaction_id: number
    payment_date: string
    amount: number
    payment_method: string
    payment_category: string
    reference_number: string | null
    proof_path: string
    note: string | null
    allocations: PaymentAllocationInput[]
  }): Promise<PaymentRecord> {
    const allocations: PaymentAllocationInput[] = input.allocations
    const scheduleIds = allocations.map((allocation) => allocation.installment_schedule_id)
    if (new Set(scheduleIds).size !== scheduleIds.length) {
      throw new Error('Satu cicilan tidak boleh dialokasikan lebih dari sekali.')
    }

    const { data, error } = await supabase.rpc('create_admin_payment_with_allocations', {
      p_customer_id: input.customer_id,
      p_lot_id: input.lot_id,
      p_transaction_id: input.transaction_id,
      p_payment_date: input.payment_date,
      p_amount: input.amount,
      p_payment_method: input.payment_method,
      p_payment_category: input.payment_category,
      p_reference_number: input.reference_number,
      p_proof_path: input.proof_path,
      p_note: input.note,
      p_allocations: allocations,
    })

    if (error) {
      await supabase.storage.from(PROOF_BUCKET).remove([input.proof_path])
      throw error
    }

    return data as PaymentRecord
  },

  // =========================================================
  // REVIEW PAYMENT
  // =========================================================

  async reviewPayment(
    paymentId: number,
    status: 'Confirmed' | 'Rejected' | 'Needs Reupload',
    note: string | null,
  ): Promise<void> {
    const { data: authData, error: authError } =
      await supabase.auth.getUser()

    if (authError) throw authError

    const { data, error } = await supabase.rpc('review_payment_atomically', {
      p_payment_id: paymentId,
      p_status: status,
      p_review_note: note,
      p_verified_by: authData.user?.id ?? null,
    })

    if (error) throw error

    if (!data) {
      throw new Error(
        'Transaksi sudah ditinjau atau statusnya telah berubah. Muat ulang data sebelum melanjutkan.',
      )
    }
  },
}
