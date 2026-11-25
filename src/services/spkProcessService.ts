import { supabase } from '@/services/config/supabase'

export type SpkStepKey =
  | 'ttd_spk'
  | 'ppjb'
  | 'cicilan'
  | 'ajb'
  | 'shm'
  | 'serah_terima'

export type SpkStepStatus = 'pending' | 'scheduled' | 'ready' | 'done'

export interface SpkProcessStep {
  id: number
  spkRequestId: number
  key: SpkStepKey
  position: number
  status: SpkStepStatus
  estimatedDate: string | null
  estimateNote: string | null
  readyAt: string | null
  completedAt: string | null
  note: string | null
  proofPath: string | null
  proofName: string | null
  proofUploadedAt: string | null
}

export interface SpkStepInfo {
  title: string
  summary: string
  /** Syarat yang harus dipenuhi sebelum langkah dianggap selesai. */
  requirement: string | null
}

export const SPK_STEP_INFO: Record<SpkStepKey, SpkStepInfo> = {
  ttd_spk: {
    title: 'Tanda tangan SPK dan Booking Fee',
    summary: 'Tanda tangan langsung di atas kertas. Bisa sekaligus saat acara di notaris.',
    requirement: null,
  },
  ppjb: {
    title: 'Tanda tangan PPJB di notaris',
    summary: 'Perjanjian jual beli dibuat di notaris. Tanggal cicilan pertama ditetapkan saat ini.',
    requirement: 'Jika memilih DP, DP harus sudah dibayar sebelum atau saat tanda tangan.',
  },
  cicilan: {
    title: 'Bayar cicilan',
    summary: 'Cicilan pertama dibayar di bulan setelah PPJB, lalu berlanjut tiap bulan sampai lunas.',
    requirement: 'Langkah ini selesai sendiri saat cicilan terakhir terverifikasi lunas.',
  },
  ajb: {
    title: 'Tanda tangan AJB di notaris',
    summary: 'Akta jual beli ditandatangani di notaris.',
    requirement: 'Harga kavling harus sudah lunas sebelum atau saat tanda tangan.',
  },
  shm: {
    title: 'Penerbitan sertifikat (SHM)',
    summary: 'Notaris mengurus sertifikat atas nama pembeli. Biasanya sekitar 2 minggu setelah AJB.',
    requirement: null,
  },
  serah_terima: {
    title: 'Serah terima sertifikat',
    summary: 'Sertifikat diserahkan dan Anda menerima bukti tanda terima. Setelah itu kavling resmi terjual.',
    requirement: null,
  },
}

export const SPK_STEP_STATUS_LABEL: Record<SpkStepStatus, string> = {
  pending: 'Belum dijadwalkan',
  scheduled: 'Sudah dijadwalkan',
  ready: 'Siap diproses',
  done: 'Selesai',
}

interface StepRow {
  id: number
  spk_request_id: number
  step_key: SpkStepKey
  position: number
  status: SpkStepStatus
  estimated_date: string | null
  estimate_note: string | null
  ready_at: string | null
  completed_at: string | null
  note: string | null
  proof_path: string | null
  proof_name: string | null
  proof_uploaded_at: string | null
}

const toStep = (row: StepRow): SpkProcessStep => ({
  id: Number(row.id),
  spkRequestId: Number(row.spk_request_id),
  key: row.step_key,
  position: Number(row.position),
  status: row.status,
  estimatedDate: row.estimated_date,
  estimateNote: row.estimate_note,
  readyAt: row.ready_at,
  completedAt: row.completed_at,
  note: row.note,
  proofPath: row.proof_path,
  proofName: row.proof_name,
  proofUploadedAt: row.proof_uploaded_at,
})

const COLUMNS =
  'id, spk_request_id, step_key, position, status, estimated_date, estimate_note, ready_at, completed_at, note, proof_path, proof_name, proof_uploaded_at'

const PROOF_BUCKET = 'spk-process-proofs'
export const PROOF_MAX_BYTES = 5 * 1024 * 1024
export const PROOF_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'
const PROOF_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

/** Pesan galat bila file bukti tidak memenuhi syarat; null bila lolos. */
export function validateProofFile(file: File): string | null {
  if (!PROOF_EXT[file.type]) return 'Format bukti harus JPG, PNG, WEBP, atau PDF.'
  if (file.size > PROOF_MAX_BYTES) return 'Ukuran bukti maksimal 5 MB.'
  return null
}

/** Langkah proses satu SPK, urut sesuai prosedur. Akses diatur RLS. */
export async function getSpkProcessSteps(spkId: number): Promise<SpkProcessStep[]> {
  const { data, error } = await supabase
    .from('spk_process_steps')
    .select(COLUMNS)
    .eq('spk_request_id', spkId)
    .order('position', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as StepRow[]).map(toStep)
}

export async function adminSetStepSchedule(
  stepId: number,
  estimatedDate: string,
  note: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_spk_step_schedule', {
    p_step_id: stepId,
    p_estimated_date: estimatedDate,
    p_note: note.trim() || null,
  })
  if (error) throw new Error(error.message)
}

export async function adminMarkStepReady(stepId: number, note: string): Promise<void> {
  const { error } = await supabase.rpc('admin_mark_spk_step_ready', {
    p_step_id: stepId,
    p_note: note.trim() || null,
  })
  if (error) throw new Error(error.message)
}

export async function adminCompleteStep(stepId: number, note: string): Promise<void> {
  const { error } = await supabase.rpc('admin_complete_spk_step', {
    p_step_id: stepId,
    p_note: note.trim() || null,
  })
  if (error) throw new Error(error.message)
}

/** Unggah bukti serah terima lalu lampirkan ke langkahnya. File dibersihkan bila lampiran gagal. */
export async function adminUploadHandoverProof(step: SpkProcessStep, file: File): Promise<void> {
  const invalid = validateProofFile(file)
  if (invalid) throw new Error(invalid)

  const random = Math.random().toString(36).slice(2, 10)
  const path = `${step.spkRequestId}/serah-terima-${Date.now()}-${random}.${PROOF_EXT[file.type]}`
  const { error: uploadError } = await supabase.storage
    .from(PROOF_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw new Error(`Bukti gagal diunggah: ${uploadError.message}`)

  const { error } = await supabase.rpc('admin_attach_spk_step_proof', {
    p_step_id: step.id,
    p_path: path,
    p_name: file.name,
  })
  if (error) {
    await supabase.storage.from(PROOF_BUCKET).remove([path])
    throw new Error(error.message)
  }
}

/** URL bukti yang berlaku 5 menit. Akses diatur storage RLS. */
export async function getHandoverProofUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, 300)
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Bukti tidak bisa dibuka.')
  return data.signedUrl
}

/** Langkah aktif = langkah pertama yang belum selesai. */
export function currentStep(steps: SpkProcessStep[]): SpkProcessStep | null {
  return steps.find((s) => s.status !== 'done') ?? null
}

export function stepIsDone(steps: SpkProcessStep[], key: SpkStepKey): boolean {
  return steps.some((s) => s.key === key && s.status === 'done')
}
