import { supabase } from '@/services/config/supabase'
import type { CreateSPKRequestInput, SPKDocumentFile, SPKDocumentType } from '@/services/marketing/spkService'

export type SPKStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Cancelled'
export type SPKSource = 'Marketing' | 'Client' | 'Admin'

export interface AdminAvailableLot {
  id: number
  lot_number: string
  block_id: number | null
  cash_price: number | null
  promo_price: number | null
  status: string
}

export interface AdminPaymentPlan {
  id: number
  plan_name: string
  months: number
  margin_percent: number | null
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
  payment_method: 'Cash' | 'Installment'
  payment_plan_id: number | null
  months: number | null
  monthly_payment: number | null
  margin_percent_snapshot: number | null
  notes: string | null
  status: SPKStatus
  reviewed_by: string | null
  reviewed_at: string | null
  approved_at: string | null
  admin_note: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  marketing_name?: string | null
  lot_number?: string
  block_name?: string
  documents: SPKDocument[]
}

export interface SPKAdminStats {
  total: number
  submitted: number
  underReview: number
  approved: number
  rejected: number
}
export type CreateAdminSPKInput = CreateSPKRequestInput

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export async function getAdminSPKRequests(): Promise<AdminSPKRequest[]> {
  const { data: requests, error } = await supabase.from('spk_requests').select('*').order('created_at', { ascending: false })
  throwIfError(error)
  if (!requests?.length) return []

  const marketingIds = [...new Set(requests.map((r: any) => r.marketing_id).filter(Boolean))]
  const lotIds = [...new Set(requests.map((r: any) => Number(r.lot_id)).filter(Boolean))]
  const requestIds = requests.map((r: any) => Number(r.id))
  const [profilesResult, lotsResult, docsResult] = await Promise.all([
    marketingIds.length ? supabase.from('profiles').select('id, full_name').in('id', marketingIds) : Promise.resolve({ data: [], error: null } as any),
    lotIds.length ? supabase.from('lots').select('id, lot_number, block_id').in('id', lotIds) : Promise.resolve({ data: [], error: null } as any),
    supabase.from('spk_request_documents').select('*').in('spk_request_id', requestIds).order('created_at'),
  ])
  throwIfError(profilesResult.error); throwIfError(lotsResult.error); throwIfError(docsResult.error)

  const profileMap = new Map((profilesResult.data || []).map((p: any) => [p.id, p.full_name]))
  const lotMap = new Map((lotsResult.data || []).map((l: any) => [Number(l.id), l.lot_number]))
  const docsMap = new Map<number, SPKDocument[]>()
  for (const doc of (docsResult.data || []) as SPKDocument[]) {
    const list = docsMap.get(Number(doc.spk_request_id)) || []
    list.push(doc); docsMap.set(Number(doc.spk_request_id), list)
  }
  return requests.map((row: any) => ({
    ...row,
    id: Number(row.id),
    lot_id: Number(row.lot_id),
    submission_source: row.submission_source || (row.marketing_id ? 'Marketing' : 'Client'),
    marketing_name: row.marketing_id ? profileMap.get(row.marketing_id) || 'Marketing tidak tersedia' : null,
    lot_number: lotMap.get(Number(row.lot_id)) || `ID ${row.lot_id}`,
    block_name: row.block_id ? `Blok ${row.block_id}` : 'Blok tidak tersedia',
    documents: docsMap.get(Number(row.id)) || [],
  } as AdminSPKRequest))
}

export function getAdminSPKStats(rows: AdminSPKRequest[]): SPKAdminStats {
  return {
    total: rows.length,
    submitted: rows.filter(r => r.status === 'Submitted').length,
    underReview: rows.filter(r => r.status === 'Under Review').length,
    approved: rows.filter(r => r.status === 'Approved').length,
    rejected: rows.filter(r => r.status === 'Rejected').length,
  }
}

export async function getSPKDocumentUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('spk-documents').createSignedUrl(filePath, 300)
  throwIfError(error)
  if (!data?.signedUrl) throw new Error('Tautan dokumen tidak tersedia.')
  return data.signedUrl
}

export async function getAvailableLotsForAdmin(): Promise<AdminAvailableLot[]> {
  const { data, error } = await supabase.from('lots')
    .select('id, lot_number, block_id, cash_price, promo_price, status')
    .eq('status', 'Available').order('lot_number')
  throwIfError(error)
  return (data || []) as AdminAvailableLot[]
}

export async function getPaymentPlansForAdmin(): Promise<AdminPaymentPlan[]> {
  const { data, error } = await supabase.from('payment_plans')
    .select('id, plan_name, months, margin_percent').order('months')
  throwIfError(error)
  return (data || []) as AdminPaymentPlan[]
}

export async function createAdminSPKRequest(input: CreateAdminSPKInput, documents: SPKDocumentFile[]) {
  const required: SPKDocumentType[] = ['KTP', 'KK', 'Payment Proof']
  for (const type of required) {
    if (!documents.some(doc => doc.type === type)) throw new Error(`Dokumen ${type} wajib disertakan.`)
  }
  for (const doc of documents) {
    if (doc.file.size > 5 * 1024 * 1024) throw new Error(`${doc.file.name} melebihi batas 5 MB.`)
  }

  const { data: authData, error: authError } = await supabase.auth.getUser()
  throwIfError(authError)
  const user = authData.user
  if (!user) throw new Error('Sesi login tidak ditemukan.')

  const uploadedPaths: string[] = []
  let requestId: number | null = null
  try {
    const { data: request, error: insertError } = await supabase.from('spk_requests').insert({
      ...input,
      marketing_id: null,
      submitted_by: user.id,
      submission_source: 'Admin',
      status: 'Submitted',
    }).select('id, spk_number').single()
    throwIfError(insertError)
    if (!request) throw new Error('SPK request was not created.')
    requestId = Number(request.id)

    for (const doc of documents) {
      const ext = (doc.file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
      const path = `${user.id}/${requestId}/${doc.type.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('spk-documents').upload(path, doc.file, {
        cacheControl: '3600', upsert: false, contentType: doc.file.type || undefined,
      })
      throwIfError(uploadError)
      uploadedPaths.push(path)

      const { error: metadataError } = await supabase.from('spk_request_documents').insert({
        spk_request_id: requestId,
        document_type: doc.type,
        file_name: doc.file.name,
        file_path: path,
        mime_type: doc.file.type || null,
        file_size_bytes: doc.file.size,
        uploaded_by: user.id,
      })
      throwIfError(metadataError)
    }
    return { id: requestId, spk_number: request.spk_number }
  } catch (error) {
    if (uploadedPaths.length) {
      const { error: cleanupError } = await supabase.storage.from('spk-documents').remove(uploadedPaths)
      if (cleanupError) console.error('Cleanup SPK storage failed:', cleanupError)
    }
    if (requestId !== null) {
      const { error: deleteError } = await supabase.from('spk_requests').delete().eq('id', requestId)
      if (deleteError) console.error('Cleanup SPK row failed:', deleteError)
    }
    throw error
  }
}

export async function approveSPKRequest(requestId: number): Promise<void> {
  const { error } = await supabase.rpc('admin_approve_spk_request', { p_request_id: requestId })
  throwIfError(error)
}
export async function rejectSPKRequest(requestId: number, reason: string): Promise<void> {
  if (!reason.trim()) throw new Error('Alasan penolakan wajib diisi.')
  const { error } = await supabase.rpc('admin_reject_spk_request', {
    p_request_id: requestId, p_rejection_reason: reason.trim(),
  })
  throwIfError(error)
}
