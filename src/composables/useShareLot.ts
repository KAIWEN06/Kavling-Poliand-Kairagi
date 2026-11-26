import { useToast } from '@/composables/useToast'
import { copyText, shareAsPlainText, shareContent, type ShareContent } from '@/utils/shareLot'

/** Bagikan dan salin kavling, dengan pesan hasil yang sama di semua halaman. */
export function useShareLot() {
  const toast = useToast()
  const failed = () => toast.error('Belum bisa disalin. Coba sekali lagi.')

  async function share(content: ShareContent) {
    const result = await shareContent(content)
    if (result === 'copied') {
      toast.success(content.url ? 'Info dan link disalin.' : 'Info kavling disalin.')
    } else if (result === 'failed') {
      failed()
    }
  }

  /** Dengan tautan, hanya tautannya yang disalin; tanpa tautan, info kavlingnya. */
  async function copy(content: ShareContent) {
    if (await copyText(content.url || shareAsPlainText(content))) {
      toast.success(content.url ? 'Link kavling disalin.' : 'Info kavling disalin.')
    } else {
      failed()
    }
  }

  return { share, copy }
}
