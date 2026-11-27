import { Capacitor, registerPlugin } from '@capacitor/core'

interface FileSaverPlugin {
  saveToDownloads(options: { filename: string; data: string; mimeType: string }): Promise<void>
}

/** Plugin lokal Android: android/app/src/main/java/com/poliland/kairagi/FileSaverPlugin.kt */
const FileSaver = registerPlugin<FileSaverPlugin>('FileSaver')

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** Buang karakter yang ditolak sistem file dan lengkapi ekstensi yang hilang. */
export function downloadName(filename: string, mimeType = ''): string {
  const clean = filename.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'dokumen'
  const extension = EXTENSIONS[mimeType.split(';')[0].trim().toLowerCase()]
  return extension && !/\.[a-z0-9]{2,5}$/i.test(clean) ? `${clean}.${extension}` : clean
}

/**
 * Mengunduh Blob langsung ke perangkat, tanpa lembar Bagikan.
 * Mengembalikan pesan berhasil yang menyebut tempat file tersimpan.
 * - Android: folder Download.
 * - iOS: folder PoliLand di aplikasi File (iOS tidak punya folder Download bersama untuk aplikasi).
 * - Web: unduhan browser.
 */
export async function saveBlobAsFile(blob: Blob, filename: string): Promise<string> {
  const name = downloadName(filename, blob.type)
  const platform = Capacitor.getPlatform()

  if (platform === 'android') {
    await FileSaver.saveToDownloads({ filename: name, data: await blobToBase64(blob), mimeType: blob.type })
    return 'Tersimpan di folder Download.'
  }

  if (platform === 'ios') {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const exists = (path: string) =>
      Filesystem.stat({ path, directory: Directory.Documents }).then(() => true, () => false)
    const dot = name.lastIndexOf('.')
    const [base, extension] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, '']
    let path = name
    for (let number = 1; await exists(path); number++) path = `${base} (${number})${extension}`
    await Filesystem.writeFile({ path, data: await blobToBase64(blob), directory: Directory.Documents })
    return 'Tersimpan di aplikasi File, folder PoliLand.'
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'File diunduh.'
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca file.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(blob)
  })
}
