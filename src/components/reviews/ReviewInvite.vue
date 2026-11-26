<template>
  <!-- Pembungkus selalu ada agar useRealtimeRefresh bisa mengenali halaman yang sedang tampil. -->
  <div class="invite-host" :class="{ 'invite-host--empty': !visible }">
    <Transition name="invite">
      <section v-if="visible && milestone" class="invite" aria-labelledby="invite-title">
        <span class="invite__stars" aria-hidden="true">
          <ion-icon v-for="n in 5" :key="n" :icon="star" :style="{ '--i': n - 1 }" />
        </span>
        <h2 id="invite-title" class="invite__title">{{ TITLES[milestone] }}</h2>
        <p class="invite__text">Ceritakan lewat ulasan singkat bila berkenan.</p>
        <div class="invite__actions">
          <AppButton size="small" @click="formOpen = true">Tulis ulasan</AppButton>
          <AppButton size="small" variant="neutral" fill="clear" @click="dismiss">Lewati</AppButton>
        </div>
      </section>
    </Transition>

    <Teleport to="body">
      <AppModal
        ref="modalRef"
        v-model="formOpen"
        title="Tulis ulasan"
        :show-footer="false"
        guard-unsaved
      >
        <ReviewForm @submitted="onSubmitted" @close="modalRef?.close()" />
      </AppModal>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { star } from 'ionicons/icons'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import ReviewForm from '@/components/reviews/ReviewForm.vue'
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import { useToast } from '@/composables/useToast'
import { reviewService } from '@/services/reviewService'
import { getReachedReviewMilestones } from '@/services/reviewMilestoneService'
import {
  dismissPrompt,
  pickMilestone,
  readPromptState,
  recordView,
  type ReviewMilestone,
} from '@/utils/reviewPrompt'
import { loadPromptState, savePromptState } from '@/services/reviewPromptStateService'

const TITLES: Record<ReviewMilestone, string> = {
  booking_paid: 'Bagaimana proses pemesanan Anda?',
  survey_done: 'Bagaimana survei lokasinya?',
  paid_off: 'Bagaimana pengalaman membeli di PoliLand?',
}

const route = useRoute()
const hostPath = route.path
const toast = useToast()

const visible = ref(false)
const milestone = ref<ReviewMilestone | null>(null)
const formOpen = ref(false)
const modalRef = ref<InstanceType<typeof AppModal> | null>(null)
let userId = ''
let reached: ReviewMilestone[] = []
let token = 0

/** Ajakan hanya pelengkap: gagal memeriksa berarti tidak tampil. */
async function check() {
  const current = ++token
  try {
    const writer = await reviewService.getWriterState()
    if (!writer.isClient || !writer.userId) return hide()
    userId = writer.userId

    let state = await loadPromptState(userId)
    if (!state || state.done) return hide()

    if (await reviewService.getMyLatestReview(userId)) {
      await savePromptState(userId, { ...state, done: true })
      return hide()
    }

    const found = await getReachedReviewMilestones(userId)
    if (current !== token || route.path !== hostPath) return
    reached = found

    // Dibaca ulang: halaman lain bisa saja sudah mencatat "Lewati".
    state = readPromptState(userId)
    if (!state) return hide()
    const next = pickMilestone(state, reached)
    if (!next) return hide()

    const viewed = recordView(state, new Date().toLocaleDateString('en-CA'))
    if (viewed.expired) {
      await savePromptState(userId, dismissPrompt(state, reached))
      return hide()
    }
    if (viewed.state !== state && !(await savePromptState(userId, viewed.state))) return hide()
    if (current !== token || route.path !== hostPath) return
    milestone.value = next
    visible.value = true
  } catch (error) {
    console.warn('[Ajakan ulasan] Tidak dapat diperiksa:', error)
  }
}

function hide() {
  visible.value = false
}

function dismiss() {
  // Pemeriksaan yang masih berjalan tidak boleh memunculkan kartu lagi.
  token++
  const state = readPromptState(userId)
  if (state) void savePromptState(userId, dismissPrompt(state, reached))
  hide()
}

function onSubmitted() {
  token++
  const state = readPromptState(userId)
  if (state) void savePromptState(userId, { ...state, done: true })
  formOpen.value = false
  hide()
  toast.success('Terima kasih. Ulasan Anda tampil setelah disetujui Admin.')
}

onMounted(check)

watch(
  () => route.path,
  (path) => {
    if (path === hostPath) void check()
    else formOpen.value = false
  },
)

useRealtimeRefresh(['payments', 'lot_transactions', 'survey_requests', 'customer_reviews'], check, {
  pauseWhen: () => formOpen.value,
})
</script>

<style scoped>
/* Tanpa ajakan, pembungkus tidak boleh menambah jarak pada grid halaman. */
.invite-host--empty { display: none; }

.invite {
  position: relative;
  display: grid;
  gap: var(--space-2);
  overflow: hidden;
  padding: var(--space-5) var(--space-4) var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(203, 160, 68, 0.18), transparent 60%),
    var(--surface-primary);
}

.invite__stars { display: flex; gap: 4px; color: var(--gold-500); font-size: 20px; }
.invite__stars ion-icon {
  animation: invite-star 420ms var(--ease-spring) both;
  animation-delay: calc(180ms + var(--i) * 60ms);
}

.invite__title {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  line-height: 1.25;
}
.invite__text { margin: 0; color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.5; }
.invite__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-1); }
.invite__actions > * { min-height: 44px; margin: 0; }

.invite-enter-active { transition: opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-spring); }
.invite-leave-active { transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out); }
.invite-enter-from { opacity: 0; transform: translateY(12px); }
.invite-leave-to { opacity: 0; transform: scale(0.97); }

@keyframes invite-star {
  from { opacity: 0; transform: translateY(6px) scale(0.6); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .invite__stars ion-icon { animation: none; }
  .invite-enter-from, .invite-leave-to { transform: none; }
}
</style>
