/**
 * Isian "Tambah klien" yang sama untuk semua role. Field baru ditambahkan di sini dan
 * di ClientForm.vue, sehingga tidak ada form yang tertinggal.
 */
import { addressColumns, emptyAddress, missingBasicAddressFields, type AddressValue } from '@/utils/address'
import { validateEmail, validateName, validatePhone } from '@/utils/inputValidation'

export interface ClientDraft {
  full_name: string
  phone: string
  whatsapp_phone: string
  email: string
  address: AddressValue
  marketing_id: string
  lot_ids: number[]
  payment_type: 'Cash' | 'Installment'
  plan_id: number | null
  notes: string
}

/**
 * required: wajib memilih pemasar; optional: boleh tanpa pemasar;
 * self: tercatat atas nama pemakai; none: tidak ditampilkan.
 */
export type AssigneeMode = 'required' | 'optional' | 'self' | 'none'

export interface ClientDraftRules {
  assignee: AssigneeMode
  interest: 'required' | 'optional' | 'hidden'
}

export function emptyClientDraft(): ClientDraft {
  return {
    full_name: '',
    phone: '',
    whatsapp_phone: '',
    email: '',
    address: emptyAddress(),
    marketing_id: '',
    lot_ids: [],
    payment_type: 'Cash',
    plan_id: null,
    notes: '',
  }
}

/** Pesan galat pertama menurut urutan isian di layar, atau null bila sudah lengkap. */
export function validateClientDraft(draft: ClientDraft, rules: ClientDraftRules): string | null {
  const personal =
    validateName(draft.full_name, 'Nama')
    ?? validatePhone(draft.phone, 'Nomor HP')
    ?? validatePhone(draft.whatsapp_phone, 'Nomor WhatsApp', false)
    ?? validateEmail(draft.email, false)
  if (personal) return personal

  const missing = missingBasicAddressFields(draft.address)
  if (missing.length) return `Lengkapi alamat: ${missing.join(', ')}.`

  if (rules.assignee === 'required' && !draft.marketing_id) return 'Pilih pemasar penanggung jawab.'
  if (rules.interest === 'required' && !draft.lot_ids.length) return 'Pilih minimal satu kaveling.'
  return null
}

/** Kolom tabel customers. WhatsApp yang dikosongkan berarti sama dengan nomor HP. */
export function clientDraftColumns(draft: ClientDraft) {
  const phone = draft.phone.trim()
  return {
    full_name: draft.full_name.trim(),
    phone,
    whatsapp_phone: draft.whatsapp_phone.trim() || phone,
    email: draft.email.trim() || null,
    notes: draft.notes.trim() || null,
    ...addressColumns(draft.address),
  }
}

export function clientDraftInterests(draft: ClientDraft) {
  return draft.lot_ids.map((lotId) => ({
    lot_id: lotId,
    payment_type: draft.payment_type,
    plan_id: draft.payment_type === 'Installment' ? draft.plan_id : null,
    notes: draft.notes.trim() || null,
  }))
}
