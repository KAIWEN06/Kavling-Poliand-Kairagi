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
          <article v-for="customer in filteredCustomers" :key="customer.id" class="data-card">
            <span class="avatar"><ion-icon :icon="personOutline" /></span>
            <div class="data-copy"><strong>{{ customer.full_name || 'Nama belum diisi' }}</strong><small>{{ customer.phone || customer.email || 'Kontak belum tersedia' }}</small><small>{{ customer.marketing?.full_name ? `Marketing: ${customer.marketing.full_name}` : 'Pendaftaran langsung' }}</small></div>
            <span class="badge" :class="customerStage(customer)">{{ customerStageLabel(customer) }}</span>
            <div v-if="customer.lot_transactions?.length" class="related">{{ lotNumbers(customer) }}</div>
          </article>
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
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { peopleOutline, personOutline, searchOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { customerService } from '@/services/marketing/customerService'
import { supabase } from '@/services/config/supabase'

const route=useRoute();const router=useRouter();const kind=computed(()=>route.params.kind==='marketing'?'marketing':'buyers');const pageTitle=computed(()=>kind.value==='marketing'?'Data Marketing':'Data Pembeli');const customers=ref<any[]>([]);const marketing=ref<any[]>([]);const query=ref('');const loading=ref(true);const error=ref('')
const filteredCustomers=computed(()=>customers.value.filter(row=>`${row.full_name||''} ${row.phone||''} ${row.email||''}`.toLowerCase().includes(query.value.toLowerCase())))
const filteredMarketing=computed(()=>marketing.value.filter(row=>String(row.full_name||'').toLowerCase().includes(query.value.toLowerCase())))
function customerStage(customer:any){const status=customer.lot_transactions?.map((row:any)=>String(row.status||'').toLowerCase())||[];return status.some((value:string)=>value.includes('sold'))?'sold':status.some((value:string)=>value.includes('book'))?'booking':'prospect'}
function customerStageLabel(customer:any){const stage=customerStage(customer);return stage==='sold'?'Pembeli':stage==='booking'?'Booking':'Prospek'}
function lotNumbers(customer:any){return customer.lot_transactions?.map((item:any)=>item.lots?.lot_number).filter(Boolean).join(', ')||''}
async function load(){loading.value=true;error.value='';try{if(kind.value==='buyers'){customers.value=await customerService.getAdminCustomers()}else{const [{data:profiles,error:profileError},{data:rows,error:rowsError}]=await Promise.all([supabase.from('profiles').select('id,full_name').eq('role','marketing').order('full_name'),supabase.from('customers').select('marketing_id,lot_transactions(status)')]);if(profileError)throw profileError;if(rowsError)throw rowsError;marketing.value=(profiles||[]).map(profile=>{const related=(rows||[]).filter(row=>row.marketing_id===profile.id);return{id:profile.id,full_name:profile.full_name,prospectCount:related.length,bookingCount:related.filter(row=>String(row.lot_transactions?.[0]?.status||'').toLowerCase().includes('book')).length,soldCount:related.filter(row=>String(row.lot_transactions?.[0]?.status||'').toLowerCase().includes('sold')).length}})}}catch(cause){error.value=cause instanceof Error?cause.message:'Data tidak dapat dimuat.'}finally{loading.value=false}}
onMounted(()=>void load())
</script>

<style scoped>
.owner-page,.owner-content{--background:var(--app-background,#faf9f6);color:var(--text-primary,#252525);font-family:var(--font-primary,var(--ion-font-family,sans-serif))}.owner-shell{display:grid;gap:11px;width:min(100%,760px);margin:auto;padding:18px 16px calc(100px + env(safe-area-inset-bottom,0px))}.page-heading span{color:var(--poliland-gold-text-soft,#805708);font-size:10px;font-weight:750;letter-spacing:.08em}.page-heading h1{margin:5px 0;color:var(--text-primary,#252525);font-size:22px}.page-heading p{margin:0;color:var(--text-secondary,#717178);font-size:12px;line-height:1.5}.search{display:flex;min-height:42px;align-items:center;gap:8px;padding:0 12px;border:1px solid var(--border-default,#eae7e0);border-radius:12px;background:#fff;color:var(--text-secondary,#717178)}.search ion-icon{font-size:18px}.search input{width:100%;border:0;outline:0;background:transparent;color:var(--text-primary,#252525);font:inherit;font-size:12px}.data-card{display:flex;min-width:0;align-items:center;gap:9px;padding:11px;border:1px solid var(--border-default,#eae7e0);border-radius:14px;background:#fff}.avatar{display:grid;width:38px;height:38px;flex:0 0 auto;place-items:center;border-radius:12px;color:var(--poliland-gold-text-soft,#805708);background:var(--poliland-gold-soft,#f4d69a);font-size:19px}.avatar.marketing{color:var(--poliland-green,#355a2c);background:#e6eee2}.data-copy{display:grid;min-width:0;flex:1;gap:3px}.data-copy strong{overflow:hidden;color:var(--text-primary,#252525);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.data-copy small{overflow:hidden;color:var(--text-secondary,#717178);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.badge{flex:0 0 auto;padding:5px 7px;border-radius:99px;color:var(--poliland-green,#355a2c);background:#e6eee2;font-size:9px}.badge.booking{color:#805708;background:#f8edcf}.badge.sold{color:#a62a2d;background:#ffebeb}.related{flex-basis:100%;margin:-2px 0 0 47px;color:var(--text-secondary,#717178);font-size:10px}.state{margin:0;padding:19px;border-radius:13px;background:#fff;color:var(--text-secondary,#717178);text-align:center;font-size:12px}.state.error{color:#a83838}.state button{border:0;background:transparent;color:var(--poliland-green);font:inherit;font-weight:700}
</style>
