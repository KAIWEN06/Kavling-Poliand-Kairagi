<script setup lang="ts">
import { computed } from 'vue'
import { IonPage, IonContent } from '@ionic/vue'
import {
  ArrowRight,
  Layers3,
  Wallet,
  FileText,
  Map,
  UserRoundPlus,
  UsersRound,
  Clock3,
  CalendarDays,
  Bookmark,
} from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'

import houseImage from '@/assets/images/Modern_Mountain House_at Sunrise.png'
import mascotImage from '@/assets/mascot/Cheerful_Chibi_House_Mascot.png'

type InventoryItem = {
  label: string
  value: number
  percentage: number
  color: string
  dot: string
}

const inventory: InventoryItem[] = [
  { label: 'Tersedia', value: 32, percentage: 41.6, color: '#587448', dot: 'bg-[#587448]' },
  { label: 'Dipesan', value: 18, percentage: 23.4, color: '#D5A12A', dot: 'bg-[#D5A12A]' },
  { label: 'Terjual', value: 27, percentage: 35, color: '#B85B42', dot: 'bg-[#B85B42]' },
]

const tasks = [
  {
    title: 'Verifikasi Pembayaran',
    description: '4 bukti transfer menunggu pemeriksaan',
    icon: Wallet,
    tone: 'text-[var(--poliland-gold-text-soft)] bg-[#F8ECD7]',
    destination: 'Keuangan',
  },
  {
    title: 'Konfirmasi SPK Konsumen',
    description: '2 berkas pemesanan unit baru',
    icon: FileText,
    tone: 'text-[#47723A] bg-[#EDF0E3]',
    destination: 'SPK',
  },
]

const quickActions = [
  { label: 'Siteplan 2D', icon: Map, color: 'text-[#355A2C]', tab: 'Kavling' },
  { label: 'Tambah Client', icon: UserRoundPlus, color: 'text-[#355A2C]', tab: 'Pembeli' },
  { label: 'Pembayaran', icon: Wallet, color: 'text-[var(--poliland-gold-text)]', tab: 'Keuangan' },
  { label: 'SPK', icon: FileText, color: 'text-[#355A2C]', tab: 'SPK' },
]

const activities = [
  {
    title: 'Kemon Saha',
    description: 'Mengajukan SPK kavling LOT_023',
    status: 'Menunggu Konfirmasi',
    time: '2 jam lalu',
    icon: Bookmark,
    iconTone: 'text-[var(--poliland-gold-text-soft)] bg-[#F7EAD5]',
    statusTone: 'text-[var(--poliland-gold-text-soft)] bg-[#F7EAD5]',
  },
  {
    title: 'Cicilan LOT_015',
    description: 'Bukti transfer DP tahap 2 telah diunggah',
    status: 'Menunggu Verifikasi',
    time: '3 jam lalu',
    icon: FileText,
    iconTone: 'text-[#2473B7] bg-[#E4EDF6]',
    statusTone: 'text-[#1765A5] bg-[#E2EDF7]',
  },
  {
    title: 'Marketing Rian',
    description: 'Menambahkan 1 calon pembeli baru',
    status: 'Prospek',
    time: '5 jam lalu',
    icon: UserRoundPlus,
    iconTone: 'text-[#3C6A32] bg-[#E9EDDF]',
    statusTone: 'text-[#35652D] bg-[#E8EDDF]',
  },
]

const totalUnits = computed(() =>
  inventory.reduce((total, item) => total + item.value, 0),
)

function navigate(destination: string) {
  // TODO: Hubungkan ke route yang sesuai setelah nama route final ditetapkan.
  // Contoh: router.push({ name: 'admin-kavling' })
  console.info(`Navigasi ke: ${destination}`)
}
</script>

<template>
  <ion-page>
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="false" class="[--background:#eeeae3]">
      <main
        class="mx-auto min-h-full w-full max-w-7xl overflow-x-clip bg-[linear-gradient(180deg,#fbf8f2_0%,#f6f1e9_100%)] px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4 text-[#171817] sm:px-6 sm:pt-6 lg:px-8"
      >
        <!-- Konten dibatasi lebarnya agar dashboard tidak melebar berlebihan di desktop. -->
        <div class="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">

          <!-- Hero: gambar berada di area sendiri pada mobile agar tidak menimpa teks. -->
          <section
            class="grid min-w-0 grid-cols-1 items-center gap-3 overflow-hidden rounded-3xl sm:grid-cols-2 sm:gap-5 lg:gap-8"
            aria-labelledby="dashboard-title"
          >
            <div class="min-w-0 px-1 py-3 sm:py-6">
              <p class="m-0 break-words font-serif text-[clamp(1.65rem,5vw,2.25rem)] font-bold leading-tight tracking-tight">
                Selamat Pagi,
              </p>
              <h1
                id="dashboard-title"
                class="mt-0.5 break-words font-serif text-[clamp(2.5rem,8vw,3.5rem)] font-bold leading-[1.05] text-[var(--poliland-gold-text)]"
              >
                Admin
              </h1>
              <p class="mt-2 max-w-prose break-words text-sm leading-relaxed text-[#393A36] sm:text-base">
                Berikut ringkasan operasional PoliLand Kairagi hari ini.
              </p>
              <span class="mt-3 block h-1 w-9 rounded-full bg-[#C28B1C]"></span>
            </div>

            <div class="relative grid min-h-48 min-w-0 grid-cols-2 items-end sm:min-h-56">
              <img
                :src="houseImage"
                alt="Ilustrasi rumah PoliLand"
                class="col-span-2 row-start-1 h-48 w-full rounded-2xl object-cover object-center sm:h-56"
              />
              <img
                :src="mascotImage"
                alt="Maskot PoliLand"
                class="col-start-1 row-start-1 z-10 ml-2 h-40 w-full self-end object-contain drop-shadow-md sm:h-48"
              />
            </div>
          </section>

          <!-- Inventory -->
          <section
            class="min-w-0 rounded-3xl border border-white/80 bg-white/80 p-4 shadow-sm sm:p-5"
            aria-labelledby="inventory-title"
          >
            <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex min-w-0 items-center gap-2">
                <Layers3 :size="28" class="shrink-0 text-[var(--poliland-gold-text)]" />
                <h2 id="inventory-title" class="min-w-0 break-words text-base font-extrabold sm:text-lg">
                  Inventaris Kavling
                </h2>
              </div>
              <button
                type="button"
                class="inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-[#F8ECD6] px-3 py-2 text-sm font-medium text-[var(--poliland-gold-text-soft)] transition hover:bg-[#F2E1C2]"
                @click="navigate('Kavling')"
              >
                <span>Total {{ totalUnits }} Unit</span>
                <ArrowRight :size="16" class="shrink-0" />
              </button>
            </div>

            <div class="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[minmax(7rem,0.75fr)_minmax(0,2fr)] sm:items-center">
              <div class="flex items-center justify-center gap-3 border-b border-[#D9D0C4] pb-3 sm:flex-col sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
                <strong class="font-serif text-6xl font-medium leading-none tracking-tight sm:text-7xl">
                  {{ totalUnits }}
                </strong>
                <span class="text-sm text-[#393A36]">Unit</span>
              </div>

              <div class="grid min-w-0 grid-cols-3">
                <div
                  v-for="item in inventory"
                  :key="item.label"
                  class="min-w-0 border-r border-[#EEE7DC] px-1 text-center last:border-r-0 sm:px-2"
                >
                  <div class="flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] sm:flex-row sm:text-sm">
                    <i class="h-2.5 w-2.5 shrink-0 rounded-full" :class="item.dot"></i>
                    <span class="break-words">{{ item.label }}</span>
                  </div>
                  <strong class="mt-2 block font-serif text-2xl font-semibold leading-tight sm:text-3xl">
                    {{ item.value }}
                  </strong>
                  <small class="mt-1 block text-xs text-[#41413D] sm:text-sm">
                    {{ item.percentage.toLocaleString('id-ID') }}%
                  </small>
                </div>
              </div>
            </div>

            <div
              class="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-[#EEE7DC]"
              role="img"
              aria-label="Komposisi status kavling"
            >
              <span
                v-for="item in inventory"
                :key="item.label"
                class="h-full first:rounded-l-full last:rounded-r-full"
                :style="{ width: `${item.percentage}%`, backgroundColor: item.color }"
              ></span>
            </div>
          </section>

          <!-- Operational tasks: heading dan daftar ditumpuk pada mobile. -->
          <section
            class="grid min-w-0 grid-cols-1 gap-4 rounded-3xl bg-[linear-gradient(115deg,#35482b,#53613b_75%,#3e4d30)] p-4 text-white sm:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1.7fr)] sm:items-center sm:p-5"
            aria-labelledby="tasks-title"
          >
            <div class="flex min-w-0 items-start justify-between gap-3 sm:flex-col">
              <div class="min-w-0">
                <span class="block break-words text-xs text-[#F2EEE5] sm:text-sm">
                  Perlu Ditindaklanjuti
                </span>
                <h2 id="tasks-title" class="mt-2 break-words font-serif text-2xl font-bold leading-tight sm:text-3xl">
                  Tugas Operasional
                </h2>
              </div>
              <span class="shrink-0 rounded-full bg-[#C97B5D] px-3 py-1.5 text-xs">
                {{ tasks.length }} Tugas
              </span>
            </div>

            <div class="grid min-w-0 gap-2">
              <button
                v-for="task in tasks"
                :key="task.title"
                type="button"
                class="flex min-w-0 items-center gap-3 rounded-2xl bg-[#FFFDFA] p-3 text-left text-[#171817] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D5A12A]"
                @click="navigate(task.destination)"
              >
                <span
                  class="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                  :class="task.tone"
                >
                  <component :is="task.icon" :size="23" />
                </span>
                <span class="grid min-w-0 flex-1 gap-1">
                  <strong class="break-words text-sm leading-snug">{{ task.title }}</strong>
                  <small class="break-words text-xs leading-relaxed text-[#55534D]">{{ task.description }}</small>
                </span>
                <ArrowRight :size="20" class="shrink-0 text-[#272822]" />
              </button>
            </div>
          </section>

          <!-- Quick actions -->
          <section class="min-w-0" aria-labelledby="quick-actions-title">
            <div class="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex min-w-0 items-center gap-3">
                <span class="ml-1 h-6 w-1 shrink-0 rotate-12 rounded-full bg-[#C58D1D]"></span>
                <h2 id="quick-actions-title" class="break-words text-lg font-extrabold">
                  Aksi Cepat
                </h2>
              </div>
              <button
                type="button"
                class="inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--poliland-gold-text)]"
                @click="navigate('Lainnya')"
              >
                Lihat Semua <ArrowRight :size="17" />
              </button>
            </div>

            <div class="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                v-for="action in quickActions"
                :key="action.label"
                type="button"
                class="flex min-h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-[#E4D9C9] bg-white/60 p-3 text-center text-[#1C1D1A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                :class="action.label === 'Siteplan 2D' ? 'border-[#52633B] bg-[linear-gradient(145deg,#52633b,#3f512f)] text-white' : ''"
                @click="navigate(action.tab)"
              >
                <component
                  :is="action.icon"
                  :size="29"
                  :stroke-width="1.9"
                  :class="action.label === 'Siteplan 2D' ? 'text-white' : action.color"
                />
                <span class="max-w-full break-words text-sm leading-snug">{{ action.label }}</span>
              </button>
            </div>
          </section>

          <!-- Buyer statistics -->
          <section
            class="min-w-0 rounded-3xl border border-white/80 bg-white/80 p-4 shadow-sm sm:p-5"
            aria-labelledby="buyer-statistics-title"
          >
            <div class="flex min-w-0 flex-col gap-2 border-b border-[#E9E1D6] pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex min-w-0 items-center gap-2">
                <UsersRound :size="27" class="shrink-0 text-[#355A2C]" />
                <h2 id="buyer-statistics-title" class="break-words text-base font-extrabold sm:text-lg">
                  Statistik Calon Pembeli
                </h2>
              </div>
              <div class="inline-flex w-fit items-center gap-2 text-xs text-[#55534E] sm:text-sm">
                <span>Oktober 2026</span>
                <CalendarDays :size="16" />
              </div>
            </div>

            <div class="grid min-w-0 grid-cols-1 divide-y divide-[#E5DDD2] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div class="min-w-0 py-3 text-center sm:px-2">
                <span class="block break-words text-xs text-[#55534F]">Prospek Aktif</span>
                <strong class="mt-1 block font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                  24 <small class="font-sans text-xs text-[#32733A]">↑ +3%</small>
                </strong>
              </div>
              <div class="min-w-0 py-3 text-center sm:px-2">
                <span class="block break-words text-xs text-[#55534F]">Follow Up Mendesak</span>
                <strong class="mt-1 block font-serif text-3xl font-semibold leading-tight text-[var(--poliland-gold-text)] sm:text-4xl">
                  8 <small class="font-sans text-xs text-[#32733A]">↑ +2%</small>
                </strong>
              </div>
              <div class="min-w-0 py-3 text-center sm:px-2">
                <span class="block break-words text-xs text-[#55534F]">Closing Marketing</span>
                <strong class="mt-1 block font-serif text-3xl font-semibold leading-tight text-[var(--poliland-gold-text)] sm:text-4xl">
                  68%
                </strong>
              </div>
            </div>

            <div class="h-3 w-full overflow-hidden rounded-full bg-[#E9E0D3]">
              <span class="block h-full w-[68%] rounded-full bg-[linear-gradient(90deg,#506b3d,#aab58c)]"></span>
            </div>
            <div class="mt-3 grid grid-cols-1 gap-2 text-xs text-[#41413D] sm:grid-cols-3 sm:gap-3">
              <span class="flex items-center gap-2"><i class="h-2.5 w-2.5 shrink-0 rounded-full bg-[#526B3E]"></i>Rian (12)</span>
              <span class="flex items-center gap-2"><i class="h-2.5 w-2.5 shrink-0 rounded-full bg-[#9BA77C]"></i>Santi (7)</span>
              <span class="flex items-center gap-2"><i class="h-2.5 w-2.5 shrink-0 rounded-full bg-[#E5DCCD]"></i>Lainnya (5)</span>
            </div>
          </section>

          <!-- Recent activity -->
          <section class="min-w-0 pb-2" aria-labelledby="recent-activity-title">
            <div class="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex min-w-0 items-center gap-2">
                <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-[var(--poliland-gold-text)]">
                  <Clock3 :size="25" />
                </span>
                <h2 id="recent-activity-title" class="break-words text-lg font-extrabold">
                  Aktivitas Terkini
                </h2>
              </div>
              <button
                type="button"
                class="inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--poliland-gold-text)]"
                @click="navigate('Riwayat')"
              >
                Lihat Riwayat <ArrowRight :size="17" />
              </button>
            </div>

            <div class="grid min-w-0 gap-2">
              <article
                v-for="activity in activities"
                :key="activity.title"
                class="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-b border-[#E8E0D5] py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] sm:items-center"
              >
                <div
                  class="row-span-2 grid h-10 w-10 place-items-center rounded-full sm:row-span-1"
                  :class="activity.iconTone"
                >
                  <component :is="activity.icon" :size="21" />
                </div>

                <div class="min-w-0">
                  <strong class="block break-words text-sm leading-snug">{{ activity.title }}</strong>
                  <p class="mb-0 mt-1 break-words text-xs leading-relaxed text-[#4E4C47]">
                    {{ activity.description }}
                  </p>
                </div>

                <span
                  class="col-start-2 w-fit max-w-full whitespace-normal break-words rounded-full px-3 py-1.5 text-left text-xs leading-snug sm:col-start-auto sm:text-center"
                  :class="activity.statusTone"
                >
                  {{ activity.status }}
                </span>
                <time class="col-start-2 text-xs text-[#595750] sm:col-start-auto sm:whitespace-nowrap">
                  {{ activity.time }}
                </time>
              </article>
            </div>
          </section>
        </div>
      </main>
    </ion-content>

    <MobileTabBar variant="admin" />
  </ion-page>
</template>
