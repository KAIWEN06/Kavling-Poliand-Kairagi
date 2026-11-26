/**
 * Perkecil foto di perangkat sebelum diunggah agar cepat dimuat.
 * Hanya untuk foto tampilan. Jangan dipakai untuk dokumen, bukti bayar, atau panorama.
 * Bila gagal atau hasilnya tidak lebih kecil, file asli dikembalikan.
 */
const MAX_EDGE = 1920 // cukup tajam untuk layar penuh HP
const QUALITY = 0.85
const SKIP_BYTES = 300 * 1024

const EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

const encode = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY))

export async function compressImage(file: File): Promise<File> {
  if (!/^image\/(jpe?g|png|webp)$/.test(file.type)) return file

  try {
    // `from-image` menjaga orientasi EXIF foto kamera.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))

    if (scale === 1 && file.size <= SKIP_BYTES) {
      bitmap.close()
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return file
    }
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    let blob = await encode(canvas, 'image/webp')
    // WebKit tidak bisa menulis WebP dan diam-diam menghasilkan PNG.
    // Sumber JPEG tidak punya transparansi, jadi aman ditulis ulang sebagai JPEG.
    if (blob?.type !== 'image/webp' && /jpe?g$/.test(file.type)) {
      blob = await encode(canvas, 'image/jpeg')
    }
    if (!blob || !EXTENSIONS[blob.type] || blob.size >= file.size) return file

    const name = `${file.name.replace(/\.[^.]+$/, '')}.${EXTENSIONS[blob.type]}`
    return new File([blob], name, { type: blob.type })
  } catch {
    return file
  }
}
