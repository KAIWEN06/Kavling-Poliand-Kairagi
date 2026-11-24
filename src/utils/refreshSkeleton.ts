import type { Ref } from 'vue'

/** Waktu minimum skeleton tampil saat tarik-segarkan, supaya tidak berkedip bila data datang cepat. */
export const REFRESH_SKELETON_MS = 900

/**
 * Menyalakan flag skeleton selama `task` berjalan dan minimal REFRESH_SKELETON_MS.
 * Flag dipisah dari `loading` halaman agar muat senyap (tanpa spinner) tidak memadamkannya lebih awal.
 */
export async function withRefreshSkeleton(flag: Ref<boolean>, task: () => Promise<unknown>) {
  flag.value = true
  try {
    await Promise.all([
      Promise.resolve().then(task).catch((error: unknown) => console.error('Gagal memuat ulang data:', error)),
      new Promise(resolve => setTimeout(resolve, REFRESH_SKELETON_MS)),
    ])
  } finally {
    flag.value = false
  }
}
