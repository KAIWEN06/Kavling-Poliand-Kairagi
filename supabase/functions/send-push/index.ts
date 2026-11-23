// Mengirim push FCM (HTTP v1) untuk setiap baris baru di public.notifications.
// Dipanggil oleh Database Webhook (INSERT). Rahasia yang dibutuhkan (supabase secrets set):
//   PUSH_WEBHOOK_SECRET        nilai yang sama dengan header x-webhook-secret pada webhook
//   FCM_SERVICE_ACCOUNT_JSON   isi JSON service account Firebase (Project settings > Service accounts)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET')
const serviceAccountRaw = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')

const admin = createClient(supabaseUrl, serviceRoleKey)

interface NotificationRow {
  id: string
  recipient_id: string
  category: string
  type: string
  priority: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  read_at: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  spk: 'SPK',
  payment: 'Pembayaran',
  client: 'Client',
  transaction: 'Transaksi',
  commission: 'Komisi',
  reminder: 'Pengingat',
  survey: 'Survei',
  system: 'Info',
}

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

let cachedToken: { value: string; exp: number } | null = null

async function accessToken(sa: { client_email: string; private_key: string; token_uri?: string }) {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value
  const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token'
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  )
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`))
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${b64url(sig)}`,
    }),
  })
  if (!res.ok) throw new Error(`OAuth FCM gagal: ${res.status}`)
  const json = await res.json()
  cachedToken = { value: json.access_token, exp: now + Number(json.expires_in ?? 3600) }
  return cachedToken.value
}

Deno.serve(async (req) => {
  if (!webhookSecret || req.headers.get('x-webhook-secret') !== webhookSecret) {
    return new Response('unauthorized', { status: 401 })
  }
  if (!serviceAccountRaw) return new Response('FCM_SERVICE_ACCOUNT_JSON belum diatur', { status: 500 })

  const body = await req.json().catch(() => null)
  const row = body?.record as NotificationRow | undefined
  if (!row || body?.type !== 'INSERT' || row.read_at) return new Response('ignored', { status: 200 })

  // Role penerima diambil dari server (bukan dari klien) agar tidak bisa dipalsukan.
  const [{ data: tokens }, { data: profile }] = await Promise.all([
    admin.from('device_tokens').select('token').eq('user_id', row.recipient_id),
    admin.from('profiles').select('role').eq('id', row.recipient_id).maybeSingle(),
  ])
  if (!tokens?.length || !profile?.role) return new Response('no-device', { status: 200 })

  const sa = JSON.parse(serviceAccountRaw)
  const bearer = await accessToken(sa)
  const role = String(profile.role).toLowerCase()
  const label = CATEGORY_LABEL[row.category] ?? 'Info'
  const payload = JSON.stringify({ notificationId: row.id, category: row.category, type: row.type, ...(row.data ?? {}) })

  let sent = 0
  for (const { token } of tokens) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          // Data-only: aplikasi native yang menampilkan notifikasi (layout, suara, getar kustom).
          data: {
            id: row.id,
            title: row.title,
            message: row.body ?? '',
            badge: label,
            targetRole: role,
            recipientId: row.recipient_id,
            category: row.category,
            priority: row.priority,
            route: '', // dihitung di aplikasi sesuai role saat diklik
            payload,
          },
          android: { priority: 'HIGH', ttl: '86400s' },
        },
      }),
    })
    if (res.ok) {
      sent++
    } else if (res.status === 404 || res.status === 400) {
      const err = await res.text()
      if (err.includes('UNREGISTERED') || err.includes('NOT_FOUND')) {
        await admin.from('device_tokens').delete().eq('token', token)
      }
    }
  }
  return new Response(JSON.stringify({ sent }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
