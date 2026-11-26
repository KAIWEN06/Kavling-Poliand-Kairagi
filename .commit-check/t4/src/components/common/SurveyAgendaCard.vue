<template>
  <section v-if="state === 'ready' && items.length" class="agenda" aria-labelledby="agenda-title">
    <div class="agenda__head">
      <h2 id="agenda-title" class="agenda__title">
        <ion-icon :icon="calendarOutline" aria-hidden="true" />
        {{ title }}
      </h2>
      <span class="agenda__count" :aria-label="`${items.length} jadwal survei`">{{ items.length }}</span>
    </div>

    <p v-if="pendingCount > 0 && variant !== 'client'" class="agenda__hint">
      {{ pendingCount }} menunggu konfirmasi
    </p>

    <ul class="agenda__list">
      <li v-for="item in visible" :key="item.survey_id">
        <button type="button" class="agenda__row" @click="open(item)">
          <span class="agenda__copy">
            <strong>{{ item.lot_number ?? `Kavling #${item.lot_id}` }}<template v-if="item.customer_name"> · {{ item.customer_name }}</template></strong>
            <small>{{ formatSurveyWhen(item.scheduled_at) }}</small>
          </span>
          <StatusBadge
            size="sm"
            :tone="item.status === 'confirmed' ? 'success' : 'warning'"
            :label="item.status === 'confirmed' ? 'Dikonfirmasi' : 'Menunggu'"
          />
          <ion-icon :icon="chevronForwardOutline" class="agenda__go" aria-hidden="true" />
        </button>
      </li>
    </ul>

    <button v-if="hiddenCount > 0 || variant === 'admin'" type="button" class="agenda__more" @click="openAll">
      {{ hiddenCount > 0 ? `Lihat ${hiddenCount} jadwal lainnya` : 'Kelola permintaan survei' }}
      <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
    </button>
  </section>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import { computed, onMounted, ref } from 'vue'
import { IonIcon, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { calendarOutline, chevronForwardOutline } from 'ionicons/icons'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { formatSurveyWhen, surveyService, type SurveyAgendaItem } from '@/services/surveyService'

const props = withDefaults(
  defineProps<{ variant: 'admin' | 'client' | 'marketing'; max?: number }>(),
  { max: 3 },
)

const ionRouter = useIonRouter()
const items = ref<SurveyAgendaItem[]>([])
const state = ref<'loading' | 'ready'>('loading')

const title = computed(() => (props.variant === 'client' ? 'Jadwal survei kaveling' : 'Jadwal survei'))
const visible = computed(() => items.value.slice(0, props.max))
const hiddenCount = computed(() => Math.max(0, items.value.length - props.max))
const pendingCount = computed(() => items.value.filter((i) => i.status === 'pending').length)

async function load({ silent = false }: LoadOptions = {}) {
  try {
    items.value = await surveyService.getMyAgenda()
  } catch (error) {
    // kartu hanya pelengkap: gagal dimuat = tidak ditampilkan, beranda tetap utuh
    console.error('[Agenda survei] Gagal memuat:', error)
    if (!silent) items.value = []
  } finally {
    state.value = 'ready'
  }
}

function open(item: SurveyAgendaItem) {
  if (props.variant === 'admin') {
    ionRouter.push(`/admin/survei?status=${item.status}`)
  } else if (props.variant === 'client') {
    ionRouter.push(`/client/kavling/${item.lot_id}`)
  } else {
    ionRouter.push(item.customer_id ? `/marketing/clients/${item.customer_id}` : '/kavling')
  }
}

/** Admin: ke halaman permintaan survei (tab Menunggu bila ada yang belum dikonfirmasi). */
function openAll() {
  if (props.variant === 'admin') {
    ionRouter.push(`/admin/survei${pendingCount.value > 0 ? '?status=pending' : ''}`)
  } else if (props.variant === 'client') {
    ionRouter.push('/client/kavling')
  } else {
    ionRouter.push('/marketing/clients')
  }
}

onMounted(() => load())
onIonViewWillEnter(() => {
  if (state.value === 'ready') void load()
})

useRealtimeRefresh(['survey_requests'], () => load({ silent: true }))

</script>

<style scoped>
.agenda {
  margin-bottom: var(--space-4, 16px);
  padding: 14px;
  background: var(--surface-primary);
  border: 1px solid var(--poliland-gold);
  border-radius: var(--radius-card);
  box-shadow: inset 4px 0 0 var(--poliland-gold);
}

.agenda__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.agenda__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.agenda__title ion-icon {
  font-size: 18px;
  color: var(--poliland-gold-text-soft);
}

.agenda__count {
  min-width: 24px;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--poliland-gold) 22%, white);
  color: var(--poliland-gold-text-soft);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.agenda__hint {
  margin: 4px 0 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--poliland-gold-text-soft);
}

.agenda__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.agenda__row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.agenda__row:active {
  background: var(--surface-muted);
}

.agenda__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.agenda__copy strong {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agenda__copy small {
  font-size: 12px;
  color: var(--text-secondary);
}

.agenda__go {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--text-secondary);
}

.agenda__more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  min-height: 44px;
  margin-top: 8px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  color: var(--poliland-green);
  font: inherit;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
}

.agenda__row:focus-visible,
.agenda__more:focus-visible {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}
</style>
