<template>
  <ion-page class="owner-page">
    <AppHeader variant="owner" title="PoliLand Kairagi" :show-back="false" />
    <ion-content class="owner-content">
      <main class="owner-shell">
        <section class="panel sales-panel">
          <div class="panel-head"><div><h1>Penjualan Kavling</h1><p>Volume booking vs konfirmasi closing bulanan</p></div><label class="legend"><i class="booking" />Booking <i class="sold" />Terjual</label></div>
          <div class="month-summary"><span>Bulan: {{ monthNames[selectedMonth] }} (Puncak Tahunan)</span><strong>Booking: {{ monthlyBookings[selectedMonth] }} unit</strong><b>Terjual: {{ monthlySold[selectedMonth] }} unit</b></div>
          <div v-if="loading" class="state">Memuat statistik...</div>
          <div v-else class="bar-chart" aria-label="Grafik penjualan per bulan">
            <div v-for="(month, index) in monthNames" :key="month" class="bar-column" :class="{ selected: selectedMonth === index }" role="button" tabindex="0" :aria-label="`${month}: ${monthlyBookings[index]} booking, ${monthlySold[index]} terjual`" @click="selectedMonth = index" @keydown.enter="selectedMonth = index">
              <div class="bars"><i class="booking" :style="{ height: `${barHeight(monthlyBookings[index])}%` }" /><i class="sold" :style="{ height: `${barHeight(monthlySold[index])}%` }" /></div><small>{{ month }}</small>
            </div>
          </div>
        </section>

        <section class="panel value-panel">
          <div class="value-heading"><span class="accent-icon"><ion-icon :icon="cashOutline" /></span><div><small>Total Nilai Penjualan</small><strong>{{ currency(selectedPeriodSales) }}</strong><small>dari periode sebelumnya</small></div><span class="growth">↗ {{ growthPercent }}%</span></div>
          <div class="value-chart"><div v-for="(value, index) in monthlyValue" :key="index" class="value-point" :title="`${monthNames[index]}: ${currency(value)}`"><i :style="{ bottom: `${valueHeight(value)}%` }" /><small>{{ monthNames[index] }}</small></div></div>
        </section>

        <section class="panel">
          <div class="panel-head"><div><h2>Status Kavling</h2><p>Komposisi status terkini</p></div></div>
          <div class="donut-layout"><div class="donut" :style="statusDonut"><div><small>Total</small><strong>{{ lots.length }}</strong><small>Kavling</small></div></div><div class="legend-list"><div v-for="item in statusItems" :key="item.label"><i :style="{ background: item.color }" /><span>{{ item.label }}</span><strong>{{ item.count }}</strong><small>{{ item.percent }}%</small></div></div></div>
        </section>

        <section class="panel">
          <div class="panel-head"><div><h2>Asal Daerah Konsumen</h2><p>Berdasarkan alamat yang terdaftar</p></div></div>
          <div class="donut-layout"><div class="donut origin-donut" :style="originDonut"><div><small>Total</small><strong>{{ customers.length }}</strong><small>Konsumen</small></div></div><div class="legend-list"><div v-for="item in origins" :key="item.name"><i :style="{ background: item.color }" /><span>{{ item.name }}</span><strong>{{ item.count }}</strong><small>{{ item.percent }}%</small></div><p v-if="!origins.length" class="empty-inline">Belum ada data alamat konsumen.</p></div></div>
        </section>

        <section class="panel pipeline-panel">
          <div class="panel-head"><div><h2>Perkembangan Calon Konsumen</h2><p>Jumlah booking dan kavling terjual per bulan</p></div></div>
          <div class="legend pipeline-legend"><i class="booking" />Booking <i class="sold" />Terjual</div>
          <div class="bar-chart compact"><div v-for="(month,index) in monthNames" :key="month" class="bar-column"><div class="bars"><i class="booking" :style="{ height: `${barHeight(monthlyBookings[index])}%` }" /><i class="sold" :style="{ height: `${barHeight(monthlySold[index])}%` }" /></div><small>{{ month }}</small></div></div>
        </section>

        <section class="panel latest-panel">
          <div class="panel-head"><div><h2>Penjualan Terbaru</h2><p>Aktivitas akad dan transaksi terakhir</p></div><button class="text-action" type="button" @click="router.push('/owner/laporan')">Lihat Semua ›</button></div>
          <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Kavling</th><th>Nama Pembeli</th><th>Status</th></tr></thead><tbody><tr v-for="row in latestSales" :key="row.id"><td>{{ dateLabel(row.date) }}</td><td>{{ row.lot }}</td><td>{{ row.customer }}</td><td><span class="table-status" :class="row.sold ? 'sold' : 'booking'">{{ row.sold ? 'Terjual' : 'Booking' }}</span></td></tr><tr v-if="!latestSales.length"><td colspan="4" class="empty-cell">Belum ada transaksi kavling.</td></tr></tbody></table></div>
        </section>
        <p v-if="error" class="error-state">{{ error }} <button type="button" @click="loadData">Coba lagi</button></p>
      </main>
    </ion-content>
    <MobileTabBar variant="owner" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { cashOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { supabase } from '@/services/config/supabase'
import { getLots, type SiteplanLot } from '@/services/siteplanService'
import { normalizeLotStatus } from '@/utils/siteplan'

type Transaction = { id: number; lot_id: number; customer_id: number; status: string; final_price: number | string | null; created_at: string | null; booking_date: string | null; sold_date: string | null }
type Customer = { id: number; full_name: string | null; address: string | null }
const router = useRouter()
const loading = ref(true)
const error = ref('')
const lots = ref<SiteplanLot[]>([])
const transactions = ref<Transaction[]>([])
const customers = ref<Customer[]>([])
const selectedMonth = ref(new Date().getMonth())
const selectedYear = new Date().getFullYear()
const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const palette = ['#bd7b0a','var(--poliland-green, #355a2c)','#c5232c','#d9b9a2','#53617a']
const isSold = (status: string) => ['sold','terjual','closed','completed'].includes(status.toLowerCase())
const isBooking = (status: string) => ['booking','booked','reserved','dibooking'].some(value => status.toLowerCase().includes(value))
const monthlyBookings = computed(() => monthlyCounts(false))
const monthlySold = computed(() => monthlyCounts(true))
const monthlyValue = computed(() => Array.from({ length: 12 }, (_, month) => transactions.value.reduce((total, row) => {
  if (!isSold(row.status)) return total
  const date = row.sold_date || row.created_at
  return date && new Date(date).getFullYear() === selectedYear && new Date(date).getMonth() === month ? total + Number(row.final_price || 0) : total
}, 0)))
const selectedPeriodSales = computed(() => monthlyValue.value[selectedMonth.value] || 0)
const peakValue = computed(() => Math.max(1, ...monthlyValue.value))
const statusItems = computed(() => {
  const defs = [{ label:'Tersedia', key:'available', color:'var(--poliland-green, #355a2c)' }, { label:'Booking', key:'booking', color:'#bd7b0a' }, { label:'Terjual', key:'sold', color:'#c5232c' }]
  return defs.map(item => { const count = lots.value.filter(lot => normalizeLotStatus(lot.status) === item.key).length; return { ...item, count, percent: lots.value.length ? Math.round(count / lots.value.length * 100) : 0 } })
})
const statusDonut = computed(() => donutStyle(statusItems.value.map(item => ({ count:item.count, color:item.color }))))
const origins = computed(() => {
  const counts = new Map<string,number>()
  customers.value.forEach(customer => { const origin = originName(customer.address); counts.set(origin, (counts.get(origin) || 0) + 1) })
  return [...counts].sort((a,b) => b[1]-a[1]).slice(0,5).map(([name,count],index) => ({ name,count,color:palette[index],percent:customers.value.length ? Math.round(count/customers.value.length*100) : 0 }))
})
const originDonut = computed(() => donutStyle(origins.value.map(item => ({ count:item.count, color:item.color }))))
const latestSales = computed(() => transactions.value.filter(row => isSold(row.status) || isBooking(row.status)).slice(0,5).map(row => ({ id:row.id, date:row.sold_date || row.booking_date || row.created_at || '', lot:lots.value.find(lot => Number(lot.id)===row.lot_id)?.lot_number || `#${row.lot_id}`, customer:customers.value.find(customer => customer.id===row.customer_id)?.full_name || 'Nama belum tersedia', sold:isSold(row.status) })))
const growthPercent = computed(() => {
  const totalForYear = (targetYear:number) => transactions.value.reduce((sum,row) => {
    const date = row.sold_date || row.created_at
    return isSold(row.status) && date && new Date(date).getFullYear() === targetYear ? sum + Number(row.final_price || 0) : sum
  }, 0)
  const current = totalForYear(selectedYear)
  const previous = totalForYear(selectedYear - 1)
  return previous > 0 ? Math.round((current - previous) / previous * 100) : 0
})

function monthlyCounts(sold: boolean) { return Array.from({ length:12 },(_,month)=>transactions.value.filter(row => { const match = sold ? isSold(row.status) : isBooking(row.status); const date = sold ? (row.sold_date || row.created_at) : (row.booking_date || row.created_at); return match && date && new Date(date).getFullYear() === selectedYear && new Date(date).getMonth()===month }).length) }
function donutStyle(items: {count:number;color:string}[]) { const total=items.reduce((sum,item)=>sum+item.count,0); if (!total) return { background:'conic-gradient(#e3e5eb 0deg 360deg)' }; let start=0; const segments=items.map(item=>{ const end=start+item.count/total*360; const text=`${item.color} ${start}deg ${end}deg`; start=end; return text }); return { background:`conic-gradient(${segments.join(',')})` } }
function originName(address?: string | null) { if (!address?.trim()) return 'Belum diisi'; const parts=address.split(/[,,]/).map(part=>part.trim()).filter(Boolean); return parts[parts.length-1] || 'Lainnya' }
function barHeight(value:number) { const max=Math.max(1,...monthlyBookings.value,...monthlySold.value); return value ? Math.max(6,value/max*100) : 0 }
function valueHeight(value:number) { return value ? Math.max(4,value/peakValue.value*100) : 0 }
function currency(value:number) { return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value) }
function dateLabel(value:string) { return value ? new Date(value).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '—' }
async function loadData() { loading.value=true; error.value=''; try { const [lotRows, txResult, customerResult]=await Promise.all([getLots({forceRefresh:true}),supabase.from('lot_transactions').select('id, lot_id, customer_id, status, final_price, created_at, booking_date, sold_date').order('created_at',{ascending:false}).limit(500),supabase.from('customers').select('id, full_name, address').limit(1000)]); if(txResult.error) throw txResult.error; if(customerResult.error) throw customerResult.error; lots.value=lotRows; transactions.value=(txResult.data||[]) as Transaction[]; customers.value=(customerResult.data||[]) as Customer[] } catch(cause) { error.value=cause instanceof Error?cause.message:'Data statistik gagal dimuat.' } finally { loading.value=false } }
onMounted(()=>{void loadData()})
</script>

<style scoped>
.owner-page,.owner-content{--background:var(--app-background, #faf9f6);color:var(--text-primary, #252525);font-family:var(--font-primary,var(--ion-font-family,sans-serif))}.owner-shell{display:grid;gap:13px;width:min(100%,760px);margin:auto;padding:14px 16px calc(100px + env(safe-area-inset-bottom,0px))}.panel{padding:15px;border-radius:17px;background:#fff;box-shadow:0 6px 18px rgb(37 37 37 / 4%)}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}.panel-head h1,.panel-head h2{margin:0;color:var(--text-primary, #252525);font-size:15px;font-weight:750}.panel-head p{margin:3px 0 0;color:#66718a;font-size:10px;line-height:1.4}.legend{display:flex;align-items:center;gap:5px;color:#554b42;font-size:10px;white-space:nowrap}.legend i,.legend-list i{width:8px;height:8px;border-radius:50%}.booking{background:#bd7b0a!important}.sold{background:#c5232c!important}.month-summary{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:7px;margin-bottom:12px;padding:8px;border-radius:9px;color:#53617a;background:var(--surface-muted, #f5f3ee);font-size:10px}.month-summary strong{color:#ba8520;font-weight:600}.month-summary b{color:#c5232c;font-weight:600}.bar-chart{display:grid;height:150px;grid-template-columns:repeat(12,minmax(0,1fr));align-items:end;gap:3px;padding:8px 3px 0;border-bottom:1px solid #e7eaf2}.bar-column{display:flex;min-width:0;height:100%;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px;cursor:pointer}.bars{display:flex;width:100%;height:100%;align-items:flex-end;justify-content:center;gap:2px;border-bottom:1px solid #e8eaf1}.bars i{width:36%;min-width:3px;border-radius:3px 3px 0 0}.bars i.booking{background:#bd7b0a}.bars i.sold{background:#c5232c}.bar-column small{color:#47536b;font-size:9px}.bar-column.selected small{color:#c5232c;font-weight:700}.state{grid-column:1/-1;margin:15px 0;color:#727b8c;text-align:center;font-size:12px}.value-heading{display:flex;align-items:center;gap:10px}.accent-icon{display:grid;width:43px;height:43px;flex:0 0 auto;place-items:center;border-radius:12px;color:#b98d35;background:#ffe0ca;font-size:22px}.value-heading>div{display:grid;gap:2px}.value-heading small{color:#65718a;font-size:10px}.value-heading strong{color:var(--text-primary, #252525);font-size:22px;font-weight:800}.growth{margin-left:auto;padding:4px 7px;border-radius:99px;color:var(--poliland-green, #355a2c);background:#c5f5df;font-size:10px;font-weight:700}.value-chart{display:grid;height:102px;grid-template-columns:repeat(12,minmax(0,1fr));align-items:stretch;gap:3px;margin-top:13px;border-bottom:1px solid #e7eaf2}.value-point{position:relative;display:flex;justify-content:center;align-items:flex-end}.value-point i{position:absolute;width:7px;height:7px;border:2px solid var(--poliland-gold, #cba044);border-radius:50%;background:#fff}.value-point small{position:absolute;bottom:-15px;color:#57627a;font-size:8px}.donut-layout{display:grid;grid-template-columns:116px minmax(0,1fr);align-items:center;gap:12px;padding:4px 2px}.donut{display:grid;width:102px;height:102px;place-items:center;border-radius:50%}.donut>div{display:grid;width:66px;height:66px;align-content:center;justify-items:center;border-radius:50%;background:#fff}.donut small{color:#65718a;font-size:8px}.donut strong{color:var(--text-primary, #252525);font-size:20px;line-height:1.1}.legend-list{display:grid;gap:8px}.legend-list>div{display:grid;grid-template-columns:8px minmax(0,1fr) 22px 30px;align-items:center;gap:6px;color:#34415a;font-size:10px}.legend-list strong,.legend-list small{text-align:right}.legend-list small{color:#68728a}.empty-inline{grid-column:1/-1;margin:0;color:#747d8e;font-size:10px}.pipeline-legend{justify-content:flex-end;margin:-5px 0 5px}.compact{height:120px}.latest-panel .panel-head{margin-bottom:10px}.text-action{padding:3px 0;border:0;color:#bf9336;background:transparent;font:inherit;font-size:11px;white-space:nowrap}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:440px;font-size:10px;text-align:left}th{padding:9px 7px;color:#34415a;background:var(--surface-muted, #f5f3ee);font-weight:700}td{padding:11px 7px;color:#3f4c65;border-bottom:1px solid #f0f1f5}.table-status{padding:4px 7px;border-radius:99px;font-size:9px}.table-status.booking{color:#94610a;background:#ffe7cc}.table-status.sold{color:#b1262e;background:#ffdcde}.empty-cell{text-align:center;color:#7a8190}.error-state{padding:10px;border-radius:10px;color:#a83838;background:#fff0f0;font-size:11px}.error-state button{border:0;color:#8e6510;background:transparent;font:inherit;font-weight:700}@media(min-width:600px){.owner-shell{gap:18px;padding:22px 24px 120px}.panel{padding:20px}.bar-chart{height:190px}.compact{height:150px}.panel-head h1,.panel-head h2{font-size:17px}}
.owner-shell{box-sizing:border-box;min-width:0;overflow-x:clip;padding-bottom:calc(120px + env(safe-area-inset-bottom,0px))}
.panel{box-sizing:border-box;width:100%;min-width:0}
.panel-head>div,.value-heading>div{min-width:0}
.value-heading>div{flex:1}
.value-heading strong{overflow-wrap:anywhere;font-size:clamp(14px,5vw,22px)}
.month-summary{grid-template-columns:repeat(3,minmax(0,1fr))}
.month-summary>*{min-width:0;overflow-wrap:anywhere}
</style>
