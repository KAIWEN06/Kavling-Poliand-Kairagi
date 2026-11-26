import { Capacitor } from '@capacitor/core'

/**
 * Menyimpan Blob sebagai file.
 * - Web: unduhan browser biasa.
 * - Aplikasi native (Android/iOS): WebView tidak menangani unduhan blob, jadi file ditulis ke cache
 *   lalu dibuka lewat lembar Bagikan agar pengguna bisa menyimpan / mengirim PDF.
 */
export async function saveBlobAsFile(blob: Blob, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ])
    const data = await blobToBase64(blob)
    const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache, recursive: true })
    await Share.share({ title: filename, url: uri, dialogTitle: 'Simpan atau bagikan laporan' })
    return
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca file.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(blob)
  })
}
