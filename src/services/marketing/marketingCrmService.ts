import { assertCustomerFields } from '@/utils/inputValidation'
import type { addressColumns } from '@/utils/address'
/**
 * Service data bersama Marketing & Kepala Bagian Marketing.
 *
 * Semua query membaca tabel yang SAMA dengan Admin dan Client (customers,
 * spk_requests, payments, installment_schedules, lot_transactions,
 * marketing_commissions). Pembatasan data TIDAK dilakukan di sini, melainkan
 * oleh RLS Supabase (lihat migration 202611230001). Service ini tidak
 * memiliki fungsi tulis untuk SPK, pembayaran, jadwal cicilan, atau komisi.
 */
import { supabase } from '@/services/config/supabase'
import {
  DUPLICATE_FOLLOWUP_MESSAGE,
  assertFollowupNotDuplicate,
  isDuplicateFollowupError,
} from '@/services/marketing/customerFollowupService'
import { loadPaymentInstallmentInfo } from '@/services/Finance/paymentInstallmentInfo'
import { formatInstallmentRange } from '@/utils/installmentFormat'
import { calculateFinanceBalance } from '@/composables/useFinanceCalculations'
import type { FinanceTransactionRecord } from '@/types/finance'
import { matchesCrmFilter, type CrmStatus } from '@/utils/marketingStatus'

export type StaffRole = 'marketing' | 'marketing_head' | 'admin' | 'owner'

export interface StaffProfile {
  id: string
  full_name: string
  role: StaffRole
}

export interface TeamMember {
  id: string
  full_name: string
  role: 'marketing' | 'marketing_head'
}

/** Tambahkan penanda cicilan (mis. "Cicilan ke-2 dari 12") ke baris pembayaran. */
async function withInstallmentLabels<T extends { id: number | string }>(rows: T[]): Promise<Array<T & { installment_label: string }>> {
  const info = await loadPaymentInstallmentInfo(rows.map((row) => Number(row.id)))
  return rows.map((row) => {
    const found = info.get(Number(row.id))
    return { ...row, installment_label: found ? formatInstallmentRange(found.numbers, found.total) : '' }
  })
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function fail(error: unknown): never {
  throw error instanceof Error ? error : new Error((error as { message?: string })?.message || 'Permintaan gagal diproses.')
}

// ---------------------------------------------------------------------
// Profil & tim
// ---------------------------------------------------------------------

export async function getStaffProfile(): Promise<StaffProfile> {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) fail(authError)
  if (!auth.user) throw new Error('Sesi masuk tidak ditemukan. Silakan masuk kembali.')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (error) fail(error)
  if (!data || !['marketing', 'marketing_head', 'admin', 'owner'].includes(data.role)) {
    throw new Error('Akun ini tidak memiliki akses ke modul pemasar.')
  }
  return { id: data.id, full_name: data.full_name || 'Pengguna', role: data.role as StaffRole }
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['marketing', 'marketing_head'])
    .order('full_name', { ascending: true })
  if (error) fail(error)
  return (data ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name || 'Marketing',
    role: row.role as TeamMember['role'],
  }))
}

// ---------------------------------------------------------------------
// Daftar client
// ---------------------------------------------------------------------

export interface ClientListItem {
  id: number
  full_name: string
  phone: string | null
  whatsapp_phone: string | null
  email: string | null
  address: string | null
  province_name: string | null
  city_name: string | null
  district_name?: string | null
  village_name?: string | null
  marketing_id: string | null
  marketing_name: string | null
  crm_status: CrmStatus
  last_contacted_at: string | null
  created_at: string
  interests: Array<{ lot_number: string; block: string | null; payment_type: string; plan_name: string | null; months: number | null }>
  latest_spk_status: string | null
  latest_spk_number: string | null
  latest_payment_status: string | null
  has_transaction: boolean
}

export interface ClientListFilters {
  search?: string
  marketingId?: string | null
  crmStatus?: string | null
  spkStatus?: 'none' | 'pending' | 'approved' | 'rejected' | null
  paymentStatus?: 'Pending' | 'Confirmed' | 'Rejected' | 'none' | null
  from?: string | null
  to?: string | null
}

export async function listClients(): Promise<ClientListItem[]> {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      id, full_name, phone, whatsapp_phone, email, address, province_name, city_name, district_name, village_name,
      marketing_id, crm_status, last_contacted_at, created_at,
      marketing:profiles!customers_marketing_id_fkey (id, full_name),
      customer_interests (
        id, payment_type,
        lots (lot_number, blocks (name, code)),
        payment_plans (plan_name, months)
      ),
      spk_requests (id, spk_number, status, submitted_at),
      payments (id, status, submitted_at),
      lot_transactions (id, status)
    `)
    .order('created_at', { ascending: false })
  if (error) fail(error)

  return (data ?? []).map((row: any) => {
    const spks = [...(row.spk_requests ?? [])].sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)))
    const pays = [...(row.payments ?? [])].sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)))
    const marketing = one(row.marketing) as { full_name?: string } | null
    return {
      id: Number(row.id),
      full_name: row.full_name,
      phone: row.phone,
      whatsapp_phone: row.whatsapp_phone,
      email: row.email,
      address: row.address,
      province_name: row.province_name,
      city_name: row.city_name,
      district_name: row.district_name,
      village_name: row.village_name,
      marketing_id: row.marketing_id,
      marketing_name: marketing?.full_name ?? null,
      crm_status: row.crm_status ?? 'Baru',
      last_contacted_at: row.last_contacted_at,
      created_at: row.created_at,
      interests: (row.customer_interests ?? []).map((interest: any) => {
        const lot = one(interest.lots) as any
        const block = one(lot?.blocks) as any
        const plan = one(interest.payment_plans) as any
        return {
          lot_number: lot?.lot_number ?? '-',
          block: block?.name || block?.code || null,
          payment_type: interest.payment_type,
          plan_name: plan?.plan_name ?? null,
          months: plan?.months ?? null,
        }
      }),
      latest_spk_status: spks[0]?.status ?? null,
      latest_spk_number: spks[0]?.spk_number ?? null,
      latest_payment_status: pays[0]?.status ?? null,
      has_transaction: (row.lot_transactions ?? []).some((t: any) => t.status !== 'Cancelled'),
    }
  })
}

export function filterClients(rows: ClientListItem[], f: ClientListFilters): ClientListItem[] {
  const keyword = (f.search ?? '').trim().toLowerCase()
  const digits = keyword.replace(/\D/g, '')
  return rows.filter((row) => {
    if (keyword) {
      const haystack = [row.full_name, row.email, row.address, row.city_name, row.province_name,
        ...row.interests.map((i) => i.lot_number)].filter(Boolean).join(' ').toLowerCase()
      const phoneHit = digits.length >= 3 && [row.phone, row.whatsapp_phone].some((p) => String(p ?? '').replace(/\D/g, '').includes(digits))
      if (!haystack.includes(keyword) && !phoneHit) return false
    }
    if (f.marketingId && row.marketing_id !== f.marketingId) return false
    if (f.crmStatus && !matchesCrmFilter(row.crm_status, f.crmStatus)) return false
    if (f.spkStatus) {
      const s = row.latest_spk_status
      if (f.spkStatus === 'none' && s) return false
      if (f.spkStatus === 'pending' && s !== 'Submitted' && s !== 'Under Review') return false
      if (f.spkStatus === 'approved' && s !== 'Approved') return false
      if (f.spkStatus === 'rejected' && s !== 'Rejected') return false
    }
    if (f.paymentStatus) {
      const p = row.latest_payment_status
      if (f.paymentStatus === 'none' ? !!p : p !== f.paymentStatus && !(f.paymentStatus === 'Rejected' && p === 'Needs Reupload')) return false
    }
    const day = row.created_at.slice(0, 10)
    if (f.from && day < f.from) return false
    if (f.to && day > f.to) return false
    return true
  })
}

// ---------------------------------------------------------------------
// Detail client
// ---------------------------------------------------------------------

export interface ClientDetail {
  customer: any
  marketing: { id: string; full_name: string } | null
  interests: any[]
  crmHistory: any[]
  followups: any[]
  notes: any[]
  spks: any[]
  transactions: Array<any & { balance: ReturnType<typeof calculateFinanceBalance>; schedules: any[] }>
  payments: any[]
  commissions: any[]
  cancellations: any[]
  actors: Record<string, { full_name: string; role: string }>
}

export async function getClientDetail(customerId: number): Promise<ClientDetail> {
  const { data: customer, error } = await supabase
    .from('customers')
    .select(`
      *,
      marketing:profiles!customers_marketing_id_fkey (id, full_name),
      customer_interests (
        id, lot_id, payment_type, plan_id, notes, created_at,
        lots (id, lot_number, polygon_id, dimension, area, cash_price, promo_price, status, panorama_url, blocks (name, code)),
        payment_plans (id, plan_name, months, margin_percent)
      )
    `)
    .eq('id', customerId)
    .maybeSingle()
  if (error) fail(error)
  if (!customer) throw new Error('Klien tidak ditemukan atau bukan tanggung jawab Anda.')

  const [crmRes, followRes, notesRes, spkRes, txRes, payRes, cancelRes] = await Promise.all([
    supabase.from('customer_crm_status_history').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
    supabase.from('customer_followups').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
    supabase.from('customer_notes').select('*').eq('customer_id', customerId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('spk_requests')
      .select(`id, spk_number, status, submitted_at, reviewed_at, approved_at, booking_fee_snapshot, lot_price_snapshot,
        total_payment_snapshot, payment_method, months, monthly_payment, down_payment_amount, admin_note, rejection_reason,
        rejection_category, submission_source, transaction_id, lots (lot_number, blocks (name)),
        spk_request_status_history (id, old_status, new_status, note, changed_by, created_at)`)
      .eq('customer_id', customerId)
      .order('submitted_at', { ascending: false }),
    supabase.from('lot_transactions')
      .select(`id, lot_id, status, payment_type, price_at_booking, discount_amount, final_price, down_payment, booking_fee,
        principal_amount, margin_amount, installment_total, monthly_payment, months, booking_date, sold_date, cancelled_date,
        installment_start_date, lots (lot_number, blocks (name)),
        installment_schedules (id, installment_number, due_date, due_date_official, amount, status,
          installment_penalties (id, days_late, amount, status))`)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    supabase.from('payments')
      .select('id, transaction_id, spk_request_id, amount, payment_category, payment_method, status, transfer_date, payment_date, submitted_at, verified_at, review_note, reference_number')
      .eq('customer_id', customerId)
      .order('submitted_at', { ascending: false }),
    supabase.from('purchase_cancellation_requests').select('id, transaction_id, reason, status, decision_note, created_at, reviewed_at').eq('customer_id', customerId),
  ])
  for (const res of [crmRes, followRes, notesRes, spkRes, txRes, payRes, cancelRes]) if (res.error) fail(res.error)

  const payments = await withInstallmentLabels((payRes.data ?? []) as any[])
  const transactions = (txRes.data ?? []).map((tx: any) => {
    const txPayments = payments.filter((p: any) => Number(p.transaction_id) === Number(tx.id))
    const schedules = [...(tx.installment_schedules ?? [])].sort((a, b) => a.installment_number - b.installment_number)
    return {
      ...tx,
      lot: one(tx.lots),
      schedules,
      balance: calculateFinanceBalance(tx as FinanceTransactionRecord, txPayments as any),
    }
  })

  const txIds = transactions.map((tx) => tx.id)
  let commissions: any[] = []
  if (txIds.length) {
    const { data: comm, error: commError } = await supabase
      .from('marketing_commissions')
      .select('*')
      .in('transaction_id', txIds)
      .order('created_at', { ascending: false })
    if (commError) fail(commError)
    commissions = comm ?? []
  }

  const crmHistory = crmRes.data ?? []
  const followups = followRes.data ?? []
  const notes = notesRes.data ?? []
  const spks = (spkRes.data ?? []).map((spk: any) => ({
    ...spk,
    lot: one(spk.lots),
    history: [...(spk.spk_request_status_history ?? [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
  }))

  const actorIds = new Set<string>()
  crmHistory.forEach((r: any) => r.changed_by && actorIds.add(r.changed_by))
  followups.forEach((r: any) => r.user_id && actorIds.add(r.user_id))
  notes.forEach((r: any) => r.created_by && actorIds.add(r.created_by))
  spks.forEach((s: any) => s.history.forEach((h: any) => h.changed_by && actorIds.add(h.changed_by)))
  commissions.forEach((c: any) => c.marketing_id && actorIds.add(c.marketing_id))

  const actors: ClientDetail['actors'] = {}
  if (actorIds.size) {
    const { data: people } = await supabase.from('profiles').select('id, full_name, role').in('id', [...actorIds])
    for (const person of people ?? []) actors[person.id] = { full_name: person.full_name || 'Pengguna', role: person.role }
  }

  return {
    customer,
    marketing: one(customer.marketing) as ClientDetail['marketing'],
    interests: (customer.customer_interests ?? []).map((i: any) => ({ ...i, lot: one(i.lots), plan: one(i.payment_plans) })),
    crmHistory,
    followups,
    notes,
    spks,
    transactions,
    payments,
    commissions,
    cancellations: cancelRes.data ?? [],
    actors,
  }
}

// ---------------------------------------------------------------------
// Tulis: hanya data CRM (status perkembangan, follow-up, catatan, profil)
// ---------------------------------------------------------------------

export async function updateCrmStatus(customerId: number, status: CrmStatus, note?: string | null) {
  const { error } = await supabase.rpc('update_customer_crm_status', {
    p_customer_id: customerId,
    p_status: status,
    p_note: note?.trim() || null,
  })
  if (error) fail(error)
}

export const FOLLOWUP_METHODS = ['WhatsApp', 'Telepon', 'Pertemuan', 'Email', 'Lainnya'] as const
export const FOLLOWUP_RESULTS = ['Follow Up', 'Tertarik', 'Negosiasi', 'Menunggu', 'Tidak Tertarik', 'Selesai'] as const

export async function addFollowup(input: {
  customer_id: number
  followup_date: string
  method: (typeof FOLLOWUP_METHODS)[number]
  status: (typeof FOLLOWUP_RESULTS)[number]
  notes: string | null
  next_followup_date: string | null
}) {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sesi masuk tidak ditemukan.')
  const row = { ...input, user_id: auth.user.id }
  await assertFollowupNotDuplicate(row)
  const { error } = await supabase.from('customer_followups').insert(row)
  if (error) fail(isDuplicateFollowupError(error) ? new Error(DUPLICATE_FOLLOWUP_MESSAGE) : error)
}

export const NOTE_CATEGORIES = ['Follow Up', 'Preferensi Kavling', 'Hasil Pertemuan', 'Informasi Customer', 'Arahan Kepala Bagian', 'Lainnya'] as const

export async function addNote(customerId: number, payload: { title: string; content: string; category: string }) {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sesi masuk tidak ditemukan.')
  const { error } = await supabase.from('customer_notes').insert({
    customer_id: customerId,
    title: payload.title.trim(),
    content: payload.content.trim(),
    note: payload.content.trim(),
    category: payload.category,
    created_by: auth.user.id,
  })
  if (error) fail(error)
}

export interface EditableClientFields extends Partial<ReturnType<typeof addressColumns>> {
  full_name: string
  phone: string | null
  whatsapp_phone: string | null
  email: string | null
  notes: string | null
}

export async function updateClientInfo(customerId: number, fields: EditableClientFields) {
  assertCustomerFields(fields)
  if (!fields.phone?.trim() && !fields.whatsapp_phone?.trim()) throw new Error('Nomor kontak atau WhatsApp wajib diisi.')
  // marketing_id, user_id, registration_source sengaja tidak dikirim (dijaga trigger DB).
  const { error } = await supabase.from('customers').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', customerId)
  if (error) fail(error)
}

export async function contactAlreadyRegistered(phone: string | null, whatsapp: string | null, excludeId?: number | null) {
  const { data, error } = await supabase.rpc('customer_contact_exists', {
    p_phone: phone || null,
    p_whatsapp: whatsapp || null,
    p_exclude_id: excludeId ?? null,
  })
  if (error) fail(error)
  return data === true
}

export interface ContactConflict {
  /** Pesan siap tampil: apa yang terjadi dan langkah berikutnya. */
  message: string
  /** Id client yang bisa dibuka pemanggil; null bila datanya bukan miliknya. */
  customerId: number | null
}

const GENERIC_CONFLICT =
  'Nomor kontak ini sudah terdaftar sebagai klien lain. Hubungi Kepala Pemasaran atau Admin untuk penanganannya.'

/** Mengembalikan null bila nomor belum dipakai, selain itu penjelasan siapa yang memegangnya. */
export async function findContactConflict(
  phone: string | null,
  whatsapp: string | null,
  excludeId?: number | null,
): Promise<ContactConflict | null> {
  const { data, error } = await supabase.rpc('lookup_contact_owner', {
    p_phone: phone || null,
    p_whatsapp: whatsapp || null,
    p_exclude_id: excludeId ?? null,
  })
  if (error) {
    // Fungsi belum ada di database (migrasi belum diterapkan): pakai pengecekan lama.
    if (error.code === 'PGRST202') {
      return (await contactAlreadyRegistered(phone, whatsapp, excludeId)) ? { message: GENERIC_CONFLICT, customerId: null } : null
    }
    fail(error)
  }

  const result = data as { status: string; customer_id: number | null; customer_name: string | null }
  if (result.status === 'free') return null

  const name = result.customer_name?.trim()
  const customerId = result.customer_id ?? null
  switch (result.status) {
    case 'mine':
      return { message: `Nomor ini sudah ada di daftar Anda${name ? ` atas nama ${name}` : ''}.`, customerId }
    case 'other_marketing':
      return {
        message: name
          ? `Nomor ini sudah ditangani pemasar lain, atas nama ${name}. Pindahkan lewat Admin bila perlu.`
          : 'Nomor ini sudah ditangani pemasar lain. Minta Kepala Pemasaran atau Admin memindahkannya.',
        customerId,
      }
    case 'unassigned':
      return {
        message: name
          ? `Nomor ini sudah terdaftar atas nama ${name} tanpa pemasar penanggung jawab. Tetapkan penanggung jawabnya lewat Admin.`
          : 'Nomor ini sudah terdaftar dan belum punya pemasar penanggung jawab. Minta Admin menetapkan Anda.',
        customerId,
      }
    default:
      return { message: GENERIC_CONFLICT, customerId }
  }
}

// ---------------------------------------------------------------------
// SPK, pembayaran, jadwal, komisi (BACA-SAJA)
// ---------------------------------------------------------------------

function ownerOf(row: { customers?: any; submission_source?: string; marketing_id?: string | null }) {
  const customer = one(row.customers) as any
  return customer?.marketing_id ?? (row.submission_source === 'Marketing' ? row.marketing_id ?? null : null)
}

export async function listSpkRequests() {
  const { data, error } = await supabase
    .from('spk_requests')
    .select(`id, spk_number, status, submitted_at, reviewed_at, approved_at, booking_fee_snapshot, payment_method, months, notary_status,
      admin_note, rejection_reason, rejection_category, submission_source, marketing_id, customer_id, customer_full_name,
      customers (id, full_name, marketing_id),
      lots (lot_number, blocks (name)),
      payments (id, status, payment_category, amount),
      spk_request_status_history (id, old_status, new_status, note, created_at)`)
    .order('submitted_at', { ascending: false })
  if (error) fail(error)
  return (data ?? []).map((row: any) => {
    const booking = (row.payments ?? []).filter((p: any) => p.payment_category === 'Booking')
    return {
      ...row,
      owner_id: ownerOf(row),
      customer_name: (one(row.customers) as any)?.full_name ?? row.customer_full_name,
      lot: one(row.lots),
      booking_payment_status: booking.find((p: any) => p.status === 'Confirmed')?.status ?? booking[0]?.status ?? null,
      history: [...(row.spk_request_status_history ?? [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    }
  })
}

export async function listPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select(`id, amount, payment_category, payment_method, status, transfer_date, submitted_at, verified_at, review_note,
      customer_id, transaction_id,
      customers (id, full_name, marketing_id),
      lots (lot_number, blocks (name)),
      spk_requests (spk_number, submission_source, marketing_id)`)
    .order('submitted_at', { ascending: false })
  if (error) fail(error)
  const labelled = await withInstallmentLabels((data ?? []) as any[])
  return labelled.map((row: any) => {
    const spk = one(row.spk_requests) as any
    return {
      ...row,
      owner_id: (one(row.customers) as any)?.marketing_id ?? (spk?.submission_source === 'Marketing' ? spk.marketing_id : null),
      customer_name: (one(row.customers) as any)?.full_name ?? '-',
      lot: one(row.lots),
      spk_number: spk?.spk_number ?? null,
    }
  })
}

export async function listInstallmentSchedules() {
  const { data, error } = await supabase
    .from('installment_schedules')
    .select(`id, transaction_id, installment_number, due_date, due_date_official, amount, status,
      installment_penalties (days_late, amount, status),
      lot_transactions (id, status, payment_type, final_price, down_payment, months, monthly_payment,
        customers (id, full_name, marketing_id, phone, whatsapp_phone),
        lots (lot_number, blocks (name)))`)
    .order('due_date', { ascending: true })
  if (error) fail(error)
  return (data ?? []).map((row: any) => {
    const tx = one(row.lot_transactions) as any
    const customer = one(tx?.customers) as any
    const penalty = one(row.installment_penalties) as any
    return {
      ...row,
      transaction: tx,
      customer_id: customer?.id ?? null,
      customer_name: customer?.full_name ?? '-',
      owner_id: customer?.marketing_id ?? null,
      lot: one(tx?.lots),
      penalty,
    }
  }).filter((row: any) => row.transaction?.status !== 'Cancelled')
}

export async function listCommissions() {
  const { data, error } = await supabase
    .from('marketing_commissions')
    .select(`id, transaction_id, marketing_id, commission_type, base_amount, commission_rate, commission_amount,
      release_threshold_percent, status, paid_at, notes, created_at,
      lot_transactions (id, final_price, payment_type, customers (full_name), lots (lot_number))`)
    .order('created_at', { ascending: false })
  if (error) fail(error)
  return (data ?? []).map((row: any) => {
    const tx = one(row.lot_transactions) as any
    return { ...row, transaction: tx, customer_name: (one(tx?.customers) as any)?.full_name ?? '-', lot: one(tx?.lots) }
  })
}

// ---------------------------------------------------------------------
// RPC laporan, aktivitas, notifikasi
// ---------------------------------------------------------------------

export interface MarketingReport {
  period: { from: string; to: string; bucket: 'day' | 'week' | 'month'; timezone: string }
  summary: Record<string, any> & { crm: Record<string, number>; cash_in_by_category: Record<string, number> }
  trend: Array<{ bucket: string; new_clients: number; spk_approved: number; units_sold: number; contract_value: number; cash_in: number }>
  team: Array<{
    id: string; full_name: string; role: string; total_clients: number; new_clients: number; contacted: number
    followup: number; interested: number; negotiation: number; submission: number; won: number; lost: number
    spk_approved: number; units_sold: number; contract_value: number; commission_total: number
    conversion_rate: number; last_activity_at: string | null
  }>
  regions: Array<{ province: string; city: string; clients: number; buyers: number; conversion_rate: number | null }>
}

export async function getMarketingReport(from: string, to: string, marketingId?: string | null): Promise<MarketingReport> {
  const { data, error } = await supabase.rpc('get_marketing_report', {
    p_from: from,
    p_to: to,
    p_marketing_id: marketingId || null,
  })
  if (error) fail(error)
  return data as MarketingReport
}

export interface ActivityItem {
  kind: 'crm' | 'followup' | 'note' | 'spk'
  occurred_at: string
  customer_id: number | null
  customer_name: string | null
  actor_name: string
  actor_role: string | null
  title: string
  body: string | null
}

export async function getMarketingActivity(marketingId?: string | null, limit = 20): Promise<ActivityItem[]> {
  const { data, error } = await supabase.rpc('get_marketing_activity', { p_marketing_id: marketingId || null, p_limit: limit })
  if (error) fail(error)
  return (data ?? []) as ActivityItem[]
}

export interface MarketingNotification {
  kind: string
  title: string
  body: string | null
  severity: 'info' | 'success' | 'warning' | 'danger'
  customer_id: number | null
  customer_name: string | null
  occurred_at: string
}

export async function getMarketingNotifications(limit = 40): Promise<MarketingNotification[]> {
  const { data, error } = await supabase.rpc('get_marketing_notifications', { p_limit: limit })
  if (error) fail(error)
  return (data ?? []) as MarketingNotification[]
}
