<template>
  <ion-page class="owner-page">
    <AppHeader variant="owner" title="PoliLand Kairagi" :show-back="true" :back-label="pageTitle" @back="router.push('/owner/lainnya')" />
    <ion-content class="owner-content">
      <main class="owner-shell">
        <header class="page-heading"><span>{{ kind === 'marketing' ? 'TIM PEMASARAN' : 'DATA KONSUMEN' }}</span><h1>{{ pageTitle }}</h1><p>{{ kind === 'marketing' ? 'Pantau jumlah calon konsumen dan transaksi yang tercatat untuk setiap marketing.' : 'Daftar konsumen dan riwayat kavling berdasarkan data sistem.' }}</p></header>
        <label class="search"><ion-icon :icon="searchOutline" /><input v-model="query" :placeholder="kind === 'marketing' ? 'Cari nama marketing...' : 'Cari nama, nomor, atau email...'" /></label>
        <p v-if="error" class="state error">{{ error }} <button @click="load">Coba lagi</button></p>
        <p v-else-if="loading" class="state">Memuat data...</p>
        <template v-else-if="kind === 'buyers'">
          <button v-for="customer in filteredCustomers" :key="customer.id" type="button" class="data-card" :aria-label="`Lihat detail ${customer.full_name || 'pembeli'}`" @click="selectedCustomer = customer">
            <span class="avatar"><ion-icon :icon="personOutline" /></span>
            <div class="data-copy"><strong>{{ customer.full_name || 'Nama belum diisi' }}</strong><small>{{ customer.phone || customer.email || 'Kontak belum tersedia' }}</small><small>{{ one(customer.marketing)?.full_name ? `Marketing: ${one(customer.marketing).full_name}` : 'Pendaftaran langsung' }}</small></div>
            <span class="badge" :class="customerStage(customer)">{{ customerStageLabel(customer) }}</span>
            <div v-if="customer.lot_transactions?.length" class="related">{{ lotNumbers(customer) }}</div>
          </button>
          <p v-if="!filteredCustomers.length" class="state">Belum ada data konsumen yang cocok.</p>
        </template>
        <template v-else>
          <article v-for="person in filteredMarketing" :key="person.id" class="data-card">
            <span class="avatar marketing"><ion-icon :icon="peopleOutline" /></span><div class="data-copy"><strong>{{ person.full_name || 'Nama belum diisi' }}</strong><small>{{ person.prospectCount }} calon konsumen tercatat</small><small>{{ person.bookingCount }} booking · {{ person.soldCount }} terjual</small></div><span class="badge">Marketing</span>
          </article>
          <p v-if="!filteredMarketing.length" class="state">Belum ada data marketing yang cocok.</p>
        </template>
      </main>
    </ion-content>
    <MobileTabBar variant="owner" />
    <ion-modal
      class="owner-buyer-detail-modal"
      :is-open="Boolean(selectedCustomer)"
      :breakpoints="[0, 0.55, 0.9]"
      :initial-breakpoint="0.55"
      :handle="true"
      @did-dismiss="selectedCustomer = null"
    >
      <ion-content v-if="selectedCustomer" class="buyer-detail-content">
        <div class="buyer-detail">
          <button class="close-buyer-detail" type="button" aria-label="Tutup detail pembeli" @click="selectedCustomer = null">×</button>
          <header class="buyer-detail-heading">
            <span class="avatar"><ion-icon :icon="personOutline" /></span>
            <div><small>Detail pembeli</small><h2>{{ selectedCustomer.full_name || 'Nama belum diisi' }}</h2></div>
            <span class="badge" :class="customerStage(selectedCustomer)">{{ customerStageLabel(selectedCustomer) }}</span>
          </header>

          <section class="buyer-detail-section">
            <h3>Informasi Pembeli</h3>
            <dl>
              <div><dt>No. telepon</dt><dd>{{ selectedCustomer.phone || 'Belum tercatat' }}</dd></div>
              <div><dt>WhatsApp</dt><dd>{{ selectedCustomer.whatsapp_phone || 'Belum tercatat' }}</dd></div>
              <div><dt>Email</dt><dd>{{ selectedCustomer.email || 'Belum tercatat' }}</dd></div>
              <div><dt>Alamat</dt><dd>{{ selectedCustomer.address || 'Belum tercatat' }}</dd></div>
              <div><dt>Marketing</dt><dd>{{ one(selectedCustomer.marketing)?.full_name || 'Pendaftaran langsung' }}</dd></div>
              <div><dt>Tanggal terdaftar</dt><dd>{{ dateLabel(selectedCustomer.created_at) }}</dd></div>
            </dl>
          </section>

          <section v-if="selectedCustomer.lot_transactions?.length" class="buyer-detail-section">
            <h3>Riwayat Kavling</h3>
            <article v-for="transaction in selectedCustomer.lot_transactions" :key="transaction.id" class="buyer-detail-entry">
              <strong>{{ one(transaction.lots)?.lot_number || `Kavling #${transaction.lot_id}` }}</strong>
              <small>{{ one(one(transaction.lots)?.blocks)?.code || one(one(transaction.lots)?.blocks)?.name || 'Blok belum tercatat' }} · {{ transaction.status || 'Status belum tercatat' }}</small>
              <small>{{ transaction.payment_type === 'Installment' ? 'Cicilan' : transaction.payment_type || 'Pembayaran belum tercatat' }} · {{ formatAmount(transaction.final_price) }}</small>
              <small v-if="transaction.booking_date || transaction.sold_date">Tanggal: {{ dateLabel(transaction.sold_date || transaction.booking_date) }}</small>
            </article>
          </section>

          <section v-if="selectedCustomer.customer_interests?.length" class="buyer-detail-section">
            <h3>Minat Kavling</h3>
            <article v-for="interest in selectedCustomer.customer_interests" :key="interest.id" class="buyer-detail-entry">
              <strong>{{ one(interest.lots)?.lot_number || `Kavling #${interest.lot_id}` }}</strong>
              <small>{{ one(one(interest.lots)?.blocks)?.code || one(one(interest.lots)?.blocks)?.name || 'Blok belum tercatat' }} · {{ interest.payment_type === 'Installment' ? 'Cicilan' : 'Cash' }}</small>
              <small v-if="one(interest.payment_plans)?.plan_name">Rencana: {{ one(interest.payment_plans).plan_name }}</small>
              <small v-if="interest.notes">Catatan: {{ interest.notes }}</small>
            </article>
          </section>

          <section v-if="selectedCustomer.payments?.length" class="buyer-detail-section">
            <h3>Pembayaran</h3>
            <article v-for="payment in selectedCustomer.payments" :key="payment.id" class="buyer-detail-entry">
              <strong>{{ payment.payment_category || payment.payment_method || 'Pembayaran' }}</strong>
              <small>{{ formatAmount(payment.amount) }} · {{ dateLabel(payment.payment_date || payment.created_at) }}</small>
              <small>Status: {{ payment.status || 'Belum tercatat' }}</small>
              <small v-if="payment.note">Catatan: {{ payment.note }}</small>
            </article>
          </section>

          <section v-if="selectedCustomer.customer_notes?.length" class="buyer-detail-section">
            <h3>Catatan Pembeli</h3>
            <article v-for="note in selectedCustomer.customer_notes" :key="note.id" class="buyer-detail-entry">
              <p>{{ note.note }}</p>
              <small>{{ dateLabel(note.created_at) }}</small>
            </article>
          </section>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonContent, IonIcon, IonModal, IonPage } from '@ionic/vue'
import { peopleOutline, personOutline, searchOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { customerService } from '@/services/marketing/customerService'
import { supabase } from '@/services/config/supabase'

// Bentuk data fleksibel: relasi Supabase bisa berupa objek tunggal atau array
type CustomerRow = any
const one = (value: any) => (Array.isArray(value) ? value[0] : value)
const route=useRoute();const router=useRouter();const kind=computed(()=>route.params.kind==='marketing'?'marketing':'buyers');const pageTitle=computed(()=>kind.value==='marketing'?'Data Marketing':'Data Pembeli');const customers=ref<CustomerRow[]>([]);const selectedCustomer=ref<CustomerRow|null>(null);const marketing=ref<any[]>([]);const query=ref('');const loading=ref(true);const error=ref('')
const filteredCustomers=computed(()=>customers.value.filter(row=>`${row.full_name||''} ${row.phone||''} ${row.email||''}`.toLowerCase().includes(query.value.toLowerCase())))
const filteredMarketing=computed(()=>marketing.value.filter(row=>String(row.full_name||'').toLowerCase().includes(query.value.toLowerCase())))
function customerStage(customer:CustomerRow){const status=customer.lot_transactions?.map((row:any)=>String(row.status||'').toLowerCase())||[];return status.some((value:string)=>value.includes('sold'))?'sold':status.some((value:string)=>value.includes('book'))?'booking':'prospect'}
function customerStageLabel(customer:CustomerRow){const stage=customerStage(customer);return stage==='sold'?'Pembeli':stage==='booking'?'Booking':'Prospek'}
function lotNumbers(customer:CustomerRow){return customer.lot_transactions?.map((item:any)=>one(item.lots)?.lot_number).filter(Boolean).join(', ')||''}
function dateLabel(value?:string|null){if(!value)return'Belum tercatat';const date=new Date(value);return Number.isNaN(date.getTime())?'Belum tercatat':date.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}
function formatAmount(value:number|string|null|undefined){if(value===null||value===undefined||value==='')return'Belum tercatat';const amount=Number(value);return Number.isFinite(amount)?new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(amount):'Belum tercatat'}
async function load(){loading.value=true;error.value='';try{if(kind.value==='buyers'){customers.value=(await customerService.getAdminCustomers()) as unknown as CustomerRow[]}else{const [{data:profiles,error:profileError},{data:rows,error:rowsError}]=await Promise.all([supabase.from('profiles').select('id,full_name').eq('role','marketing').order('full_name'),supabase.from('customers').select('marketing_id,lot_transactions(status)')]);if(profileError)throw profileError;if(rowsError)throw rowsError;marketing.value=(profiles||[]).map(profile=>{const related=(rows||[]).filter(row=>row.marketing_id===profile.id);return{id:profile.id,full_name:profile.full_name,prospectCount:related.length,bookingCount:related.filter(row=>String(row.lot_transactions?.[0]?.status||'').toLowerCase().includes('book')).length,soldCount:related.filter(row=>String(row.lot_transactions?.[0]?.status||'').toLowerCase().includes('sold')).length}})}}catch(cause){error.value=cause instanceof Error?cause.message: typeof cause==='object'&&cause!==null&&'message' in cause&&typeof cause.message==='string'?cause.message:'Data tidak dapat dimuat.'}finally{loading.value=false}}
onMounted(()=>void load())
</script>

<style scoped>
.owner-page,.owner-content{--background:var(--app-background,#faf9f6);color:var(--text-primary,#252525);font-family:var(--font-primary,var(--ion-font-family,sans-serif))}.owner-shell{display:grid;gap:11px;width:min(100%,760px);margin:auto;padding:18px 16px calc(100px + env(safe-area-inset-bottom,0px))}.page-heading span{color:var(--poliland-gold-text-soft,#805708);font-size:10px;font-weight:750;letter-spacing:.08em}.page-heading h1{margin:5px 0;color:var(--text-primary,#252525);font-size:22px}.page-heading p{margin:0;color:var(--text-secondary,#717178);font-size:12px;line-height:1.5}.search{display:flex;min-height:42px;align-items:center;gap:8px;padding:0 12px;border:1px solid var(--border-default,#eae7e0);border-radius:12px;background:#fff;color:var(--text-secondary,#717178)}.search ion-icon{font-size:18px}.search input{width:100%;border:0;outline:0;background:transparent;color:var(--text-primary,#252525);font:inherit;font-size:12px}.data-card{display:flex;min-width:0;align-items:center;gap:9px;padding:11px;border:1px solid var(--border-default,#eae7e0);border-radius:14px;background:#fff}.avatar{display:grid;width:38px;height:38px;flex:0 0 auto;place-items:center;border-radius:12px;color:var(--poliland-gold-text-soft,#805708);background:var(--poliland-gold-soft,#f4d69a);font-size:19px}.avatar.marketing{color:var(--poliland-green,#355a2c);background:#e6eee2}.data-copy{display:grid;min-width:0;flex:1;gap:3px}.data-copy strong{overflow:hidden;color:var(--text-primary,#252525);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.data-copy small{overflow:hidden;color:var(--text-secondary,#717178);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.badge{flex:0 0 auto;padding:5px 7px;border-radius:99px;color:var(--poliland-green,#355a2c);background:#e6eee2;font-size:9px}.badge.booking{color:#805708;background:#f8edcf}.badge.sold{color:#a62a2d;background:#ffebeb}.related{flex-basis:100%;margin:-2px 0 0 47px;color:var(--text-secondary,#717178);font-size:10px}.state{margin:0;padding:19px;border-radius:13px;background:#fff;color:var(--text-secondary,#717178);text-align:center;font-size:12px}.state.error{color:#a83838}.state button{border:0;background:transparent;color:var(--poliland-green);font:inherit;font-weight:700}
.data-card{width:100%;flex-wrap:wrap;color:inherit;font:inherit;text-align:left;cursor:pointer}
.data-card:focus-visible{outline:2px solid var(--poliland-green,#355a2c);outline-offset:2px}
ion-modal.owner-buyer-detail-modal{--width:100%;--height:100%;--border-radius:24px 24px 0 0;--backdrop-opacity:.4}
ion-modal.owner-buyer-detail-modal::part(content){border:1px solid var(--border-default,#eae7e0);border-radius:24px 24px 0 0;background:#fff}
.buyer-detail-content{--background:#fff}
.buyer-detail{position:relative;display:grid;gap:15px;padding:32px 20px calc(26px + env(safe-area-inset-bottom,0px));color:var(--text-primary,#252525)}
.close-buyer-detail{position:absolute;top:8px;right:13px;width:34px;height:34px;border:0;border-radius:50%;background:var(--surface-muted,#f5f3ee);color:var(--text-secondary,#717178);font-size:22px}
.buyer-detail-heading{display:flex;min-width:0;align-items:center;gap:10px;padding-right:28px}
.buyer-detail-heading>div{display:grid;min-width:0;flex:1;gap:3px}
.buyer-detail-heading>div>small{color:var(--text-secondary,#717178);font-size:10px}
.buyer-detail-heading h2{margin:0;overflow-wrap:anywhere;font-size:18px}
.buyer-detail-section{display:grid;gap:8px;padding-top:12px;border-top:1px solid var(--border-default,#eae7e0)}
.buyer-detail-section h3{margin:0;font-size:13px}
.buyer-detail-section dl{display:grid;gap:0;margin:0}
.buyer-detail-section dl div{display:grid;grid-template-columns:minmax(90px,.8fr) minmax(0,1.2fr);gap:10px;padding:9px 0;border-top:1px solid #f0efec}
.buyer-detail-section dt{color:var(--text-secondary,#717178);font-size:11px}
.buyer-detail-section dd{margin:0;overflow-wrap:anywhere;font-size:11px;font-weight:600;text-align:right}
.buyer-detail-entry{display:grid;gap:4px;padding:10px;border:1px solid var(--border-default,#eae7e0);border-radius:12px;background:#fff}
.buyer-detail-entry strong{font-size:12px}
.buyer-detail-entry small{color:var(--text-secondary,#717178);font-size:10px;line-height:1.45;overflow-wrap:anywhere}
.buyer-detail-entry p{margin:0;font-size:11px;line-height:1.5;overflow-wrap:anywhere}
</style>
