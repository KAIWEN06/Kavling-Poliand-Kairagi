import { mascotAnimations } from '@/data/mascotAnimations'

/** Frame maskot halaman Welcome. Cache tingkat modul: splash memanaskannya, Welcome memakainya. */
export const welcomeClips = {
  idle: { dir: mascotAnimations.idle, count: 25, loop: true },
  wave: { dir: mascotAnimations.wave, count: 57, loop: false },
  point: { dir: mascotAnimations.pointDown, count: 38, loop: false },
}
export type WelcomeClipName = keyof typeof welcomeClips

const images = new Map<string, Promise<HTMLImageElement>>()

/** Unduh sekaligus decode, agar drawImage pertama tidak menahan thread utama. */
const loadFrame = (name: WelcomeClipName, n: number) => {
  const url = `/mascot-frames/${welcomeClips[name].dir}/frame-${String(n).padStart(4, '0')}.webp`
  let task = images.get(url)
  if (!task) {
    task = new Promise<HTMLImageElement>((resolve) => {
      const img = new Image()
      img.onload = () => {
        const done = () => resolve(img)
        img.decode().then(done, done)
      }
      img.onerror = () => {
        images.delete(url) // boleh dicoba lagi pada kunjungan berikutnya
        resolve(img)
      }
      img.src = url
    })
    images.set(url, task)
  }
  return task
}

export const loadPosterFrame = () => loadFrame('idle', 1)

export const loadClip = (name: WelcomeClipName) =>
  Promise.all(Array.from({ length: welcomeClips[name].count }, (_, i) => loadFrame(name, i + 1)))

/** Berurutan sesuai kebutuhan layar: poster, idle, lambaian, lalu menunjuk. */
export const warmWelcomeMascot = async () => {
  await loadPosterFrame()
  await loadClip('idle')
  await loadClip('wave')
  await loadClip('point')
}
