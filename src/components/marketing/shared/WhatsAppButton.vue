<template>
  <button
    type="button"
    :class="tile ? 'mk-wa-tile' : ['mk-btn', 'mk-btn--wa', { 'mk-wa--compact': compact }]"
    :disabled="!number"
    :title="number ? 'Kirim pesan WhatsApp' : 'Nomor WhatsApp belum tersedia'"
    :aria-label="number ? `Hubungi ${clientName || 'klien'} lewat WhatsApp` : 'Nomor WhatsApp belum tersedia'"
    @click.stop="open = true"
  >
    <ion-icon :icon="logoWhatsapp" aria-hidden="true" />
    <span v-if="!compact || tile">WhatsApp</span>
  </button>

  <AppModal
    guard-unsaved
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
        <small>Anda mengirimnya sendiri dari WhatsApp.</small>
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
  defineProps<{ phone?: string | null; fallbackPhone?: string | null; clientName?: string | null; senderName?: string | null; compact?: boolean; tile?: boolean }>(),
  { phone: null, fallbackPhone: null, clientName: null, senderName: null, compact: false, tile: false },
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
/* Ubin aksi di halaman detail klien, sama dengan ubin Telepon/Status/Follow-up di sebelahnya. */
.mk-wa-tile {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  width: 100%; min-height: 58px; padding: 0 4px;
  border: 1px solid var(--border-default); border-radius: var(--radius-control);
  background: var(--surface-primary); color: var(--text-primary);
  font: inherit; font-size: 11px; cursor: pointer;
  touch-action: manipulation; user-select: none; -webkit-user-select: none;
  transition: transform var(--dur-instant) var(--ease-out);
}
.mk-wa-tile ion-icon { color: #1f7a4a; font-size: 20px; }
.mk-wa-tile:active { transform: scale(0.97); transition-timing-function: var(--ease-spring); }
.mk-wa-tile:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.mk-wa-tile[disabled] { opacity: 0.55; cursor: not-allowed; }
@media (prefers-reduced-motion: reduce) { .mk-wa-tile:active { transform: none; } }
</style>
