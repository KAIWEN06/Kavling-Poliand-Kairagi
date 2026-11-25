<template>
  <IonModal
    :enter-animation="modalEnterAnimation"
    :leave-animation="modalLeaveAnimation"
    :is-open="open"
    class="document-viewer-modal"
    @didDismiss="emit('close')"
  >
    <DocumentViewer
      :url="url"
      :file-name="fileName"
      :mime-type="mimeType"
      :subtitle="subtitle"
      :loading="loading"
      :error="error"
      :can-retry="canRetry"
      @close="emit('close')"
      @retry="emit('retry')"
    />
  </IonModal>
</template>

<script setup lang="ts">
import { IonModal } from '@ionic/vue'
import DocumentViewer from '@/components/ui/DocumentViewer.vue'
import { modalEnterAnimation, modalLeaveAnimation } from '@/utils/modalAnimation'

/** Satu-satunya pintu masuk penampil dokumen/bukti di semua role. */
withDefaults(
  defineProps<{
    open: boolean
    url?: string
    fileName?: string
    mimeType?: string | null
    subtitle?: string
    loading?: boolean
    error?: string
    canRetry?: boolean
  }>(),
  { url: '', fileName: '', mimeType: null, subtitle: '', loading: false, error: '', canRetry: false },
)

const emit = defineEmits<{ (e: 'close'): void; (e: 'retry'): void }>()
</script>

<style>
.document-viewer-modal {
  --width: 100vw;
  --height: 100dvh;
  --border-radius: 0;
}
</style>
