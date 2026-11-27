/**
 * Posisi tahapan proses sebuah SPK dan urutannya di tab "Semua".
 * Dipakai daftar SPK Klien, Admin, Marketing, dan Kepala Marketing.
 */
export type SpkStage = 'running' | 'not-started' | 'done'

export const SPK_STAGE_LABEL: Record<SpkStage, string> = {
  running: 'Sedang berjalan',
  'not-started': 'Belum dimulai',
  done: 'Selesai',
}

/** Tahapan baru ada setelah SPK disetujui; selain itu null. */
export function spkStage(status: string, notaryStatus: string | null | undefined): SpkStage | null {
  if (status !== 'Approved') return null
  if (notaryStatus === 'Selesai') return 'done'
  if (!notaryStatus || notaryStatus === 'Menunggu Diproses') return 'not-started'
  return 'running'
}

/** 0 tahapan berjalan, 1 masih menunggu, 2 selesai, 3 ditolak atau dibatalkan. */
function stageRank(status: string, notaryStatus: string | null | undefined) {
  if (status === 'Rejected' || status === 'Cancelled') return 3
  const stage = spkStage(status, notaryStatus)
  if (stage === 'running') return 0
  return stage === 'done' ? 2 : 1
}

/** Salinan terurut; di dalam kelompok yang sama urutan asal (terbaru dulu) dipertahankan. */
export function sortByRunningStage<T>(
  rows: T[],
  read: (row: T) => [status: string, notaryStatus: string | null | undefined],
): T[] {
  return [...rows].sort((a, b) => stageRank(...read(a)) - stageRank(...read(b)))
}
