// Mengirim kode OTP verifikasi nomor HP client lewat Fonnte (WhatsApp).
// Dipanggil client yang sudah login: supabase.functions.invoke('send-phone-otp', { body: { phone, channel } })
//
// Rahasia (supabase secrets set):
//   FONNTE_TOKEN      token perangkat dari dashboard Fonnte (Authorization header Fonnte)
//   CORS_ORIGINS      opsional, daftar origin dipisah koma (bawaan: *)
//
// Kode dibuat dan di-hash di database (public.issue_phone_otp). Fungsi ini hanya
// menerima kode polos satu kali untuk dikirim, tidak menyimpannya.
//
// SMS: dokumentasi Fonnte hanya mencakup WhatsApp. Saluran 'sms' mengembalikan
// 'channel_unavailable' sampai penyedia SMS dipasang di sendSms() di bawah.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const fonnteToken = Deno.env.get('FONNTE_TOKEN')

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('Supabase server configuration is incomplete.')
}

const admin = createClient(supabaseUrl, serviceRoleKey)

const origins = (Deno.env.get('CORS_ORIGINS') || '*')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

function corsHeaders(request: Request) {
  const requestOrigin = request.headers.get('Origin') || ''
  const origin = origins.includes('*')
    ? '*'
    : origins.includes(requestOrigin)
      ? requestOrigin
      : origins[0] || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function reply(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  })
}

// Kode `hint` dari fungsi database dipetakan ke status HTTP dan pesan untuk pengguna.
const DB_ERRORS: Record<string, { status: number; message: string }> = {
  otp_cooldown: { status: 429, message: 'Tunggu 60 detik sebelum meminta kode lagi.' },
  otp_user_limit: { status: 429, message: 'Terlalu banyak permintaan kode. Coba lagi dalam satu jam.' },
  otp_phone_limit: { status: 429, message: 'Terlalu banyak permintaan untuk nomor ini. Coba lagi dalam satu jam.' },
  otp_bad_phone: { status: 400, message: 'Masukkan nomor seluler Indonesia yang valid.' },
  otp_bad_channel: { status: 400, message: 'Saluran pengiriman tidak dikenal.' },
  otp_forbidden: { status: 403, message: 'Hanya akun client yang dapat meminta kode.' },
}

function otpMessage(code: string): string {
  return `${code} adalah kode verifikasi PoliLand Anda. Berlaku 5 menit. Jangan bagikan kode ini kepada siapa pun.`
}

async function sendWhatsApp(target: string, code: string): Promise<{ ok: boolean; reason?: string }> {
  if (!fonnteToken) return { ok: false, reason: 'not_configured' }
  const form = new FormData()
  form.set('target', target)
  form.set('message', otpMessage(code))
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: fonnteToken },
      body: form,
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json().catch(() => null) as { status?: boolean; reason?: string } | null
    if (!res.ok || !data?.status) {
      console.error('[send-phone-otp] Fonnte menolak pengiriman:', res.status, data?.reason)
      return { ok: false, reason: data?.reason ?? `http_${res.status}` }
    }
    return { ok: true }
  } catch (error) {
    console.error('[send-phone-otp] Fonnte tidak terjangkau:', error)
    return { ok: false, reason: 'network' }
  }
}

// deno-lint-ignore require-await
async function sendSms(_target: string, _code: string): Promise<{ ok: boolean; reason?: string }> {
  // Pasang penyedia SMS di sini (mis. Twilio atau Zenziva), lalu kembalikan { ok: true }.
  return { ok: false, reason: 'channel_unavailable' }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  if (request.method !== 'POST') return reply(request, { error: 'Metode tidak didukung.' }, 405)

  const authorization = request.headers.get('Authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) return reply(request, { error: 'Belum login.' }, 401)

  // Identitas diambil dari token, bukan dari body, supaya OTP tidak bisa diminta atas nama akun lain.
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return reply(request, { error: 'Sesi tidak valid. Masuk ulang.' }, 401)

  let body: { phone?: unknown; channel?: unknown }
  try {
    body = await request.json()
  } catch {
    return reply(request, { error: 'Permintaan tidak valid.' }, 400)
  }
  const phone = typeof body.phone === 'string' ? body.phone : ''
  const channel = body.channel === 'sms' ? 'sms' : 'whatsapp'

  const { data, error } = await admin.rpc('issue_phone_otp', {
    p_user_id: userData.user.id,
    p_phone: phone,
    p_channel: channel,
  })
  if (error) {
    const mapped = DB_ERRORS[error.hint ?? '']
    if (mapped) return reply(request, { error: mapped.message, code: error.hint }, mapped.status)
    console.error('[send-phone-otp] issue_phone_otp gagal:', error)
    return reply(request, { error: 'Kode gagal dibuat. Coba lagi.' }, 500)
  }

  const issued = data as { challenge_id: string; code: string; phone: string; expires_at: string }
  const sent = channel === 'sms' ? await sendSms(issued.phone, issued.code) : await sendWhatsApp(issued.phone, issued.code)

  if (!sent.ok) {
    // Kode yang tidak terkirim dibatalkan agar tidak menggantung.
    await admin.from('phone_otp_challenges').update({ consumed_at: new Date().toISOString() }).eq('id', issued.challenge_id)
    if (sent.reason === 'channel_unavailable') {
      return reply(request, { error: 'Pengiriman lewat SMS belum tersedia. Gunakan WhatsApp.', code: 'channel_unavailable' }, 503)
    }
    return reply(request, { error: 'Kode gagal dikirim. Pastikan nomor aktif di WhatsApp lalu coba lagi.', code: 'send_failed' }, 502)
  }

  // Pembersihan OTP lama, tidak menunggu hasilnya (pg_cron tidak aktif di proyek ini).
  void admin.rpc('purge_old_phone_otps').then(({ error: purgeError }) => {
    if (purgeError) console.error('[send-phone-otp] purge gagal:', purgeError)
  })

  return reply(request, { ok: true, channel, expires_at: issued.expires_at, phone_masked: `${issued.phone.slice(0, 4)}****${issued.phone.slice(-3)}` })
})
