<template>
  <section class="cms-panel" aria-labelledby="hours-title">
    <header class="panel-head">
      <div>
        <h2 id="hours-title">Jam Operasional</h2>
        <p>Atur hari dan rentang waktu yang bisa dipilih klien untuk meminta survei lokasi. Zona waktu WITA (Asia/Makassar).</p>
      </div>
      <button class="btn btn-primary" type="button" :disabled="saving || loading" @click="save">{{ saving ? 'Menyimpan…' : 'Simpan jam operasional' }}</button>
    </header>

    <p v-if="loading" class="state" role="status">Memuat jam operasional…</p>
    <template v-else>
      <ul class="hours-list">
        <li v-for="day in DAY_OPTIONS" :key="day.key" class="hours-row" :class="{ closed: hours.days[day.key].closed }">
          <div class="hours-day">
            <strong>{{ day.label }}</strong>
            <span>{{ hours.days[day.key].closed ? 'Libur' : 'Buka' }}</span>
          </div>
          <label class="switch">
            <input v-model="hours.days[day.key].closed" type="checkbox">
            <span>Tutup</span>
          </label>
          <div class="hours-time">
            <label class="field">Mulai
              <input v-model="hours.days[day.key].open" type="time" :disabled="hours.days[day.key].closed">
            </label>
            <span class="sep" aria-hidden="true">–</span>
            <label class="field">Selesai
              <input v-model="hours.days[day.key].close" type="time" :disabled="hours.days[day.key].closed">
            </label>
          </div>
        </li>
      </ul>
      <p class="hint note">Klien hanya melihat slot pada hari yang dibuka. Slot dibuat setiap 1 jam dan tetap perlu dikonfirmasi Admin.</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { contactsService, DAY_OPTIONS, createDefaultOperatingHours, type OperatingHoursConfig } from '@/services/contactService'

const emit = defineEmits<{ notify: [message: string, type?: 'success' | 'error'] }>()

const hours = ref<OperatingHoursConfig>(createDefaultOperatingHours())
const loading = ref(true)
const saving = ref(false)

async function load() {
  try {
    hours.value = await contactsService.getOperatingHours()
  } catch (error) {
    emit('notify', error instanceof Error ? error.message : 'Jam operasional gagal dimuat.', 'error')
  } finally {
    loading.value = false
  }
}

async function save() {
  for (const day of DAY_OPTIONS) {
    const item = hours.value.days[day.key]
    if (!item.closed && (!item.open || !item.close || item.open >= item.close)) {
      return emit('notify', `Jam ${day.label} tidak valid. Jam mulai harus lebih awal dari jam selesai.`, 'error')
    }
  }
  saving.value = true
  try {
    await contactsService.saveOperatingHours(hours.value)
    emit('notify', 'Jam operasional tersimpan.', 'success')
  } catch (error) {
    emit('notify', error instanceof Error ? error.message : 'Jam operasional gagal disimpan.', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped src="./cmsPanel.css"></style>
<style scoped>
.hours-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.hours-row { display: grid; grid-template-columns: 110px 90px minmax(0, 1fr); align-items: center; gap: 14px; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.hours-row.closed { background: var(--surface-muted); }
.hours-day { display: grid; gap: 2px; }
.hours-day strong { font-size: 14px; }
.hours-day span { font-size: 11px; font-weight: 700; color: var(--poliland-green); }
.hours-row.closed .hours-day span { color: var(--text-secondary); }
.hours-time { display: flex; align-items: flex-end; gap: 10px; }
.hours-time .field { flex: 1; min-width: 0; }
.hours-time input:disabled { opacity: .45; }
.sep { padding-bottom: 12px; color: var(--text-secondary); }
.note { margin: 14px 0 0; }
@media (max-width: 720px) {
  .hours-row { grid-template-columns: 1fr auto; gap: 10px; }
  .hours-time { grid-column: 1 / -1; }
}
</style>
