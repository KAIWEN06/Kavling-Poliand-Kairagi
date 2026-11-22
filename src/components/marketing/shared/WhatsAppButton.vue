<template>
  <button
    type="button"
    class="mk-btn mk-btn--wa"
    :class="{ 'mk-wa--compact': compact }"
    :disabled="!number"
    :title="number ? 'Kirim pesan WhatsApp' : 'Nomor WhatsApp belum tersedia'"
    :aria-label="number ? `Hubungi ${clientName || 'client'} melalui WhatsApp` : 'Nomor WhatsApp belum tersedia'"
    @click.stop="open = true"
  >
    <ion-icon :icon="logoWhatsapp" aria-hidden="true" />
    <span v-if="!compact">WhatsApp</span>
  </button>

  <AppModal
    v-model="open"
    title="Kirim pesan WhatsApp"
    confirm-text="Buka WhatsApp"
    :confirm-disabled="!message.trim()"
    @confirm="send"
  >
    <div class="mk-wa">
      <p class="mk-muted">Tujuan: <b>+{{ number }}</b> ({{ clientName }})</p>
      <label class="mk-field">
        <span>Pesan awal</span>
        <textarea v-model="message" class="mk-input" rows="5" maxlength="1000" />
        <small>Pesan dapat diubah sebelum dikirim. Pengiriman tetap dilakukan dari aplikasi WhatsApp Anda.</small>
      </label>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { logoWhatsapp } from 'ionicons/icons'
import AppModal from '@/components/ui/AppModal.vue'
import { buildWhatsappLink, defaultWhatsappMessage, normalizeWhatsappNumber } from '@/utils/marketingStatus'

const props = withDefaults(
  defineProps<{ phone?: string | null; fallbackPhone?: string | null; clientName?: string | null; senderName?: string | null; compact?: boolean }>(),
  { phone: null, fallbackPhone: null, clientName: null, senderName: null, compact: false },
)

const open = ref(false)
const message = ref('')
const number = computed(() => normalizeWhatsappNumber(props.phone) ?? normalizeWhatsappNumber(props.fallbackPhone))

watch(open, (isOpen) => {
  if (isOpen) message.value = defaultWhatsappMessage(props.clientName, props.senderName)
})

function send() {
  const link = buildWhatsappLink(number.value, message.value)
  if (!link) return
  window.open(link, '_blank', 'noopener')
  open.value = false
}
</script>

<style scoped>
.mk-wa { display: grid; gap: 12px; }
.mk-wa p { margin: 0; }
.mk-wa--compact { min-width: 44px; padding: 0 10px; }
</style>
