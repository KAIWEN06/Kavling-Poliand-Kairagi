
import {
  createClient,
  type User,
} from 'https://esm.sh/@supabase/supabase-js@2'

type TeamRole = 'owner' | 'admin' | 'marketing'

type Action =
  | 'list'
  | 'create'
  | 'update'
  | 'deactivate'
  | 'reactivate'
  | 'marketing_overview'
  | 'marketing_detail'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase server configuration is incomplete.')
}

const admin = createClient(
  supabaseUrl,
  serviceRoleKey,
)

const origins = (
  Deno.env.get('CORS_ORIGINS') || '*'
)
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

function reply(
  request: Request,
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders(request),
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  )
}

function isRole(value: unknown): value is TeamRole {
  return (
    value === 'owner' ||
    value === 'admin' ||
    value === 'marketing'
  )
}

/**
 * Aturan pengelolaan akun yang sudah ada.
 *
 * Owner:
 * - Boleh mengelola Admin.
 * - Boleh mengelola Marketing.
 * - Tidak boleh mengelola Owner lain.
 *
 * Admin:
 * - Hanya boleh mengelola Marketing.
 * - Tidak boleh mengelola Owner atau Admin.
 */
function mayManage(
  callerRole: TeamRole,
  targetRole: unknown,
): boolean {
  if (callerRole === 'owner') {
    return (
      targetRole === 'admin' ||
      targetRole === 'marketing'
    )
  }

  if (callerRole === 'admin') {
    return targetRole === 'marketing'
  }

  return false
}

/**
 * Aturan pembuatan akun.
 *
 * Owner:
 * - Boleh membuat Owner, Admin, Marketing.
 *
 * Admin:
 * - Boleh membuat Owner dan Marketing.
 * - Tidak boleh membuat Admin.
 */
function mayCreate(
  callerRole: TeamRole,
  targetRole: unknown,
): targetRole is TeamRole {
  if (!isRole(targetRole)) {
    return false
  }

  if (callerRole === 'owner') {
    return true
  }

  if (callerRole === 'admin') {
    return (
      targetRole === 'owner' ||
      targetRole === 'marketing'
    )
  }

  return false
}

function isUserBanned(user: User | null) {
  if (!user?.banned_until) {
    return false
  }

  return new Date(user.banned_until).getTime() > Date.now()
}

function isActive(
  user: User | null,
  marketing: { is_active?: boolean } | null,
  role: TeamRole,
) {
  const authActive = !isUserBanned(user)

  if (role === 'marketing') {
    return authActive && marketing?.is_active !== false
  }

  return authActive
}

function textField(
  value: unknown,
  name: string,
  max: number,
  required = false,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    if (required) {
      throw new Error(`${name} wajib diisi.`)
    }

    return null
  }

  if (typeof value !== 'string') {
    throw new Error(`${name} tidak valid.`)
  }

  const result = value.trim()

  if (result.length > max) {
    throw new Error(`${name} maksimal ${max} karakter.`)
  }

  if (required && !result) {
    throw new Error(`${name} wajib diisi.`)
  }

  return result || null
}

function emailField(value: unknown) {
  const email = textField(
    value,
    'Email',
    254,
    true,
  )!

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Format email tidak valid.')
  }

  return email.toLowerCase()
}

function optionalDate(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null
  }

  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new Error('Tanggal bergabung tidak valid.')
  }

  const date = new Date(`${value}T00:00:00Z`)

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error('Tanggal bergabung tidak valid.')
  }

  return value
}

function validateProfileInput(
  body: Record<string, unknown>,
  requireEmail = false,
) {
  const fullName = textField(
    body.full_name,
    'Nama lengkap',
    120,
    true,
  )!

  const email = requireEmail
    ? emailField(body.email)
    : body.email === undefined
      ? null
      : emailField(body.email)

  const phone = textField(
    body.phone,
    'Nomor telepon',
    32,
  )
  const whatsappPhone = textField(
    body.whatsapp_phone,
    'Nomor WhatsApp',
    32,
  )

  const isValidIndonesianMobile = (value: string | null) => {
    if (!value) return true
    const normalized = value.replace(/[\s().-]/g, '')
    return /^(?:\+?62|0)8\d{7,11}$/.test(normalized)
  }

  if (!isValidIndonesianMobile(phone)) {
    throw new Error('Nomor telepon harus menggunakan format Indonesia, contoh 081234567890 atau 6281234567890.')
  }
  if (!isValidIndonesianMobile(whatsappPhone)) {
    throw new Error('Nomor WhatsApp harus menggunakan format Indonesia, contoh 081234567890 atau 6281234567890.')
  }

  return {
    fullName,
    email,
    phone,
    whatsappPhone,
    address: textField(body.address, 'Alamat', 500),
    employeeCode: textField(
      body.employee_code,
      'Kode marketing',
      50,
    ),
    joinDate: optionalDate(body.join_date),
  }
}

/**
 * Verifikasi token dan role pemanggil.
 *
 * Jangan percaya role yang dikirim dari frontend.
 * Role selalu diambil langsung dari tabel profiles.
 */
async function authorize(request: Request) {
  const token = request.headers
    .get('Authorization')
    ?.match(/^Bearer\s+(.+)$/i)?.[1]

  if (!token) {
    throw new Response('Unauthorized', {
      status: 401,
    })
  }

  const {
    data,
    error,
  } = await admin.auth.getUser(token)

  if (error || !data.user) {
    throw new Response('Sesi login tidak valid.', {
      status: 401,
    })
  }

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (
    !isRole(profile?.role) ||
    (
      profile.role !== 'owner' &&
      profile.role !== 'admin'
    )
  ) {
    throw new Response('Akses ditolak.', {
      status: 403,
    })
  }

  return {
    user: data.user,
    role: profile.role as TeamRole,
  }
}

async function getAuthUser(id: string) {
  const {
    data,
    error,
  } = await admin.auth.admin.getUserById(id)

  if (error) {
    throw error
  }

  return data.user
}

/**
 * Mengambil daftar anggota.
 *
 * Admin hanya mendapatkan Owner dan Marketing.
 * Owner mendapatkan Owner, Admin, dan Marketing.
 */
async function listMembers(callerRole: TeamRole) {
  const roles =
    callerRole === 'owner'
      ? ['owner', 'admin', 'marketing']
      : ['owner', 'marketing']

  const {
    data,
    error,
  } = await admin
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      created_at,
      marketing_profiles (
        phone,
        whatsapp_phone,
        address,
        employee_code,
        photo_url,
        join_date,
        is_active
      )
    `)
    .in('role', roles)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return Promise.all(
    (data || []).map(async (profile: any) => {
      const marketing = Array.isArray(
        profile.marketing_profiles,
      )
        ? profile.marketing_profiles[0] || null
        : profile.marketing_profiles || null

      try {
        const user = await getAuthUser(profile.id)

        return {
          id: profile.id,
          full_name:
            profile.full_name ||
            user.user_metadata?.full_name ||
            null,
          email: user.email || null,
          role: profile.role,
          created_at: profile.created_at,
          phone: marketing?.phone || null,
          whatsapp_phone: marketing?.whatsapp_phone || null,
          address: marketing?.address || null,
          employee_code:
            marketing?.employee_code || null,
          photo_url: marketing?.photo_url || null,
          join_date: marketing?.join_date || null,
          is_active: isActive(
            user,
            marketing,
            profile.role,
          ),
          auth_status: 'available',
        }
      } catch {
        return {
          id: profile.id,
          full_name: profile.full_name || null,
          email: null,
          role: profile.role,
          created_at: profile.created_at,
          phone: marketing?.phone || null,
          whatsapp_phone: marketing?.whatsapp_phone || null,
          address: marketing?.address || null,
          employee_code:
            marketing?.employee_code || null,
          photo_url: marketing?.photo_url || null,
          join_date: marketing?.join_date || null,
          is_active: false,
          auth_status: 'unavailable',
        }
      }
    }),
  )
}

/**
 * Menghapus data jika proses pembuatan akun gagal.
 */
async function rollbackCreatedUser(
  id: string,
  role: TeamRole,
) {
  if (role === 'marketing') {
    await admin
      .from('marketing_profiles')
      .delete()
      .eq('user_id', id)
  }

  await admin
    .from('profiles')
    .delete()
    .eq('id', id)

  await admin.auth.admin.deleteUser(id)
}

/**
 * Membuat akun baru.
 */
async function createMember(
  request: Request,
  caller: User,
  callerRole: TeamRole,
  body: Record<string, unknown>,
) {
  const targetRole = body.role

  if (!mayCreate(callerRole, targetRole)) {
    return reply(
      request,
      {
        error: 'Anda tidak memiliki izin membuat role tersebut.',
      },
      403,
    )
  }

  const role = targetRole as TeamRole

  const input = validateProfileInput(
    body,
    true,
  )

  const email = input.email!

  const password =
    typeof body.password === 'string'
      ? body.password
      : ''

  if (
    password.length < 8 ||
    password.length > 128
  ) {
    return reply(
      request,
      {
        error: 'Password harus berisi 8 sampai 128 karakter.',
      },
      400,
    )
  }

  /**
   * Metadata created_by berguna untuk mengetahui
   * siapa pembuat akun melalui Supabase Auth.
   */
  const {
    data: created,
    error: createError,
  } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      created_by: caller.id,
      created_by_role: callerRole,
      assigned_role: role,
    },
  })

  if (createError || !created.user) {
    return reply(
      request,
      {
        error:
          createError?.message ||
          'Akun gagal dibuat.',
      },
      400,
    )
  }

  const id = created.user.id

  /**
   * Simpan profil utama.
   */
  const {
    error: profileError,
  } = await admin
    .from('profiles')
    .insert({
      id,
      full_name: input.fullName,
      role,
    })

  if (profileError) {
    await rollbackCreatedUser(id, role)

    console.error(
      'Create profile failed:',
      profileError.message,
    )

    return reply(
      request,
      {
        error: 'Profil akun gagal dibuat.',
      },
      500,
    )
  }

  /**
   * Hanya Marketing yang memiliki marketing_profiles.
   */
  if (role === 'marketing') {
    const {
      error: marketingError,
    } = await admin
      .from('marketing_profiles')
      .insert({
        user_id: id,
        employee_code: input.employeeCode,
        phone: input.phone,
        whatsapp_phone: input.whatsappPhone,
        address: input.address,
        join_date: input.joinDate,
        is_active: true,
      })

    if (marketingError) {
      await rollbackCreatedUser(id, role)

      console.error(
        'Create marketing profile failed:',
        marketingError.message,
      )

      return reply(
        request,
        {
          error: 'Profil Marketing gagal dibuat.',
        },
        500,
      )
    }
  }

  return reply(
    request,
    {
      member: {
        id,
        full_name: input.fullName,
        email,
        role,
        created_at: created.user.created_at,
        phone: role === 'marketing' ? input.phone : null,
        whatsapp_phone: role === 'marketing' ? input.whatsappPhone : null,
        address: role === 'marketing' ? input.address : null,
        employee_code:
          role === 'marketing'
            ? input.employeeCode
            : null,
        join_date:
          role === 'marketing'
            ? input.joinDate
            : null,
        is_active: true,
      },
    },
    201,
  )
}

/**
 * Mengubah data anggota yang memang boleh dikelola.
 */
async function updateMember(
  request: Request,
  callerRole: TeamRole,
  targetId: string,
  body: Record<string, unknown>,
) {
  const {
    data: target,
    error: targetError,
  } = await admin
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', targetId)
    .maybeSingle()

  if (targetError) {
    throw targetError
  }

  if (
    !target ||
    !mayManage(callerRole, target.role)
  ) {
    return reply(
      request,
      {
        error: 'Akun tidak dapat dikelola.',
      },
      403,
    )
  }

  const input = validateProfileInput(
    {
      ...body,
      full_name: body.full_name ?? target.full_name,
    },
    false,
  )

  if (input.fullName !== target.full_name) {
    const {
      error,
    } = await admin
      .from('profiles')
      .update({
        full_name: input.fullName,
      })
      .eq('id', targetId)

    if (error) {
      throw error
    }
  }

  if (target.role === 'marketing') {
    const update: Record<string, unknown> = {}

    if ('phone' in body) {
      update.phone = input.phone
    }

    if ('whatsapp_phone' in body) {
      update.whatsapp_phone = input.whatsappPhone
    }

    if ('address' in body) {
      update.address = input.address
    }

    if ('employee_code' in body) {
      update.employee_code = input.employeeCode
    }

    if ('join_date' in body) {
      update.join_date = input.joinDate
    }

    if (Object.keys(update).length > 0) {
      // Update terlebih dahulu dan minta baris yang berhasil diperbarui.
      // Supabase tidak menganggap UPDATE tanpa baris cocok sebagai error,
      // sehingga hasilnya harus diperiksa agar tidak memberi sukses palsu.
      const {
        data: updatedRows,
        error: updateError,
      } = await admin
        .from('marketing_profiles')
        .update({
          ...update,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', targetId)
        .select('user_id')

      if (updateError) {
        throw updateError
      }

      // Jika profil Marketing belum ada, buat barisnya.
      // is_active=true hanya diberikan saat INSERT baru, bukan saat UPDATE,
      // sehingga mengedit data tidak akan mengaktifkan kembali akun nonaktif.
      if (!updatedRows || updatedRows.length === 0) {
        const {
          error: insertError,
        } = await admin
          .from('marketing_profiles')
          .insert({
            user_id: targetId,
            is_active: true,
            ...update,
            updated_at: new Date().toISOString(),
          })

        if (insertError) {
          // Antisipasi jika baris dibuat oleh request lain di waktu bersamaan.
          // Jika konflik unique terjadi, coba UPDATE sekali lagi.
          if (insertError.code === '23505') {
            const {
              error: retryError,
            } = await admin
              .from('marketing_profiles')
              .update({
                ...update,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', targetId)

            if (retryError) {
              throw retryError
            }
          } else {
            throw insertError
          }
        }
      }
    }
  }

  const targetUser = await getAuthUser(targetId)

  return reply(
    request,
    {
      member: {
        id: targetId,
        full_name: input.fullName,
        email: targetUser.email || null,
        role: target.role,
        is_active: isActive(
          targetUser,
          null,
          target.role,
        ),
      },
    },
  )
}

/**
 * Mengaktifkan atau menonaktifkan akun.
 */
async function setMemberActive(
  request: Request,
  callerRole: TeamRole,
  targetId: string,
  action: 'deactivate' | 'reactivate',
) {
  const {
    data: target,
    error: targetError,
  } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', targetId)
    .maybeSingle()

  if (targetError) {
    throw targetError
  }

  if (
    !target ||
    !mayManage(callerRole, target.role)
  ) {
    return reply(
      request,
      {
        error: 'Akun tidak dapat dikelola.',
      },
      403,
    )
  }

  const shouldBeActive = action === 'reactivate'

  const {
    error: authError,
  } = await admin.auth.admin.updateUserById(
    targetId,
    {
      ban_duration: shouldBeActive
        ? 'none'
        : '876000h',
    },
  )

  if (authError) {
    throw authError
  }

  /**
   * Sinkronkan status Marketing di tabel marketing_profiles.
   */
  if (target.role === 'marketing') {
    const {
      error: profileError,
    } = await admin
      .from('marketing_profiles')
      .upsert(
        {
          user_id: targetId,
          is_active: shouldBeActive,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        },
      )

    if (profileError) {
      // Kembalikan status Auth jika sinkronisasi profil gagal.
      await admin.auth.admin.updateUserById(
        targetId,
        {
          ban_duration: shouldBeActive
            ? '876000h'
            : 'none',
        },
      )

      throw profileError
    }
  }

  return reply(
    request,
    {
      member: {
        id: targetId,
        role: target.role,
        is_active: shouldBeActive,
      },
    },
  )
}



type MarketingPeriod = '30d' | '90d' | '180d' | 'all'
type CustomerRow = {
  id: number
  full_name: string
  phone: string | null
  email: string | null
  address: string | null
  created_at: string | null
  marketing_id: string | null
}
type TransactionRow = {
  id: number
  customer_id: number
  lot_id: number
  status: 'Booking' | 'Sold' | 'Cancelled' | string
  payment_type: string
  final_price: number
  booking_date: string | null
  sold_date: string | null
  cancelled_date: string | null
  lots?: { lot_number?: string | null } | Array<{ lot_number?: string | null }> | null
}
type CommissionRow = {
  id: number
  transaction_id: number
  marketing_id: string
  commission_type: 'Booking Fee' | 'Sales'
  base_amount: number
  commission_rate: number | null
  commission_amount: number
  status: 'Pending' | 'Eligible' | 'Processing' | 'Paid' | 'Cancelled'
  paid_at: string | null
  created_at: string
}

/**
 * Ambil semua baris secara bertahap agar hasil tidak terpotong oleh batas
 * maksimum baris default PostgREST/Supabase.
 */
async function fetchAllRows<T>(
  queryFactory: (from: number, to: number) => any,
): Promise<T[]> {
  const rows: T[] = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await queryFactory(from, from + pageSize - 1)
    if (error) throw error

    const page = (data || []) as T[]
    rows.push(...page)
    if (page.length < pageSize) break
    from += pageSize
  }

  return rows
}

function normalizePeriod(value: unknown): MarketingPeriod {
  return value === '30d' || value === '90d' || value === '180d'
    ? value
    : 'all'
}

function periodStart(period: MarketingPeriod): Date | null {
  if (period === 'all') return null
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 180
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return start
}

function isWithinPeriod(value: string | null | undefined, start: Date | null) {
  if (!start) return true
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date >= start
}

function lotNumberOf(transaction: TransactionRow): string | null {
  const relation = transaction.lots
  if (Array.isArray(relation)) return relation[0]?.lot_number || null
  return relation?.lot_number || null
}

async function getCustomersForMarketing(marketingId?: string): Promise<CustomerRow[]> {
  return await fetchAllRows<CustomerRow>((from, to) => {
    let query = admin
      .from('customers')
      .select('id, full_name, phone, email, address, created_at, marketing_id')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (marketingId) query = query.eq('marketing_id', marketingId)
    else query = query.not('marketing_id', 'is', null)

    return query
  })
}

async function getTransactionsForCustomers(customerIds: number[]): Promise<TransactionRow[]> {
  if (!customerIds.length) return []

  const rows: TransactionRow[] = []
  // Batasi ukuran IN agar URL request PostgREST tidak menjadi terlalu panjang.
  for (let index = 0; index < customerIds.length; index += 100) {
    const ids = customerIds.slice(index, index + 100)
    const chunk = await fetchAllRows<TransactionRow>((from, to) =>
      admin
        .from('lot_transactions')
        .select('id, customer_id, lot_id, status, payment_type, final_price, booking_date, sold_date, cancelled_date, lots(lot_number)')
        .in('customer_id', ids)
        .order('booking_date', { ascending: false })
        .range(from, to),
    )
    rows.push(...chunk)
  }
  return rows
}

async function getCommissions(marketingId?: string): Promise<CommissionRow[]> {
  return await fetchAllRows<CommissionRow>((from, to) => {
    let query = admin
      .from('marketing_commissions')
      .select('id, transaction_id, marketing_id, commission_type, base_amount, commission_rate, commission_amount, status, paid_at, created_at')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (marketingId) query = query.eq('marketing_id', marketingId)
    return query
  })
}

function emptyMarketingSummary(marketingId: string) {
  return {
    marketing_id: marketingId,
    total_clients: 0,
    sold_clients: 0,
    sold_lots: 0,
    sales_value: 0,
    booking_transactions: 0,
    pending_commission: 0,
    paid_commission: 0,
  }
}

function calculateMarketingSummary(
  marketingId: string,
  customers: CustomerRow[],
  transactions: TransactionRow[],
  commissions: CommissionRow[],
  start: Date | null,
) {
  const customerIds = new Set(customers.map((customer) => customer.id))
  const relevantTransactions = transactions.filter((transaction) => customerIds.has(transaction.customer_id))
  const soldTransactions = relevantTransactions.filter((transaction) =>
    transaction.status === 'Sold' && isWithinPeriod(transaction.sold_date || transaction.booking_date, start)
  )
  const bookingTransactions = relevantTransactions.filter((transaction) =>
    transaction.status === 'Booking' && isWithinPeriod(transaction.booking_date, start)
  )
  const soldClients = new Set(soldTransactions.map((transaction) => transaction.customer_id))
  const soldLots = new Set(soldTransactions.map((transaction) => transaction.lot_id))
  const periodCommissions = commissions.filter((commission) =>
    commission.marketing_id === marketingId &&
    commission.status !== 'Cancelled' &&
    isWithinPeriod(commission.created_at, start)
  )

  return {
    marketing_id: marketingId,
    total_clients: customers.length,
    sold_clients: soldClients.size,
    sold_lots: soldLots.size,
    sales_value: soldTransactions.reduce((total, transaction) => total + Number(transaction.final_price || 0), 0),
    booking_transactions: bookingTransactions.length,
    pending_commission: periodCommissions
      .filter((commission) => ['Pending', 'Eligible', 'Processing'].includes(commission.status))
      .reduce((total, commission) => total + Number(commission.commission_amount || 0), 0),
    paid_commission: periodCommissions
      .filter((commission) => commission.status === 'Paid')
      .reduce((total, commission) => total + Number(commission.commission_amount || 0), 0),
  }
}

async function marketingOverview(periodValue: unknown) {
  const period = normalizePeriod(periodValue)
  const start = periodStart(period)

  const [marketingProfiles, customers, commissions] = await Promise.all([
    fetchAllRows<{ id: string }>((from, to) =>
      admin.from('profiles').select('id').eq('role', 'marketing').order('created_at', { ascending: true }).range(from, to),
    ),
    getCustomersForMarketing(),
    getCommissions(),
  ])

  const transactions = await getTransactionsForCustomers(customers.map((customer) => customer.id))
  const summaries = marketingProfiles.map((profile) =>
    calculateMarketingSummary(
      profile.id,
      customers.filter((customer) => customer.marketing_id === profile.id),
      transactions,
      commissions,
      start,
    ),
  )

  return { summaries, period }
}

async function marketingDetail(marketingId: string, periodValue: unknown) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(marketingId)) {
    throw new Response('ID Marketing tidak valid.', { status: 400 })
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('id', marketingId)
    .eq('role', 'marketing')
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) throw new Response('Akun Marketing tidak ditemukan.', { status: 404 })

  const [marketingResult, user, customers, commissions] = await Promise.all([
    admin.from('marketing_profiles')
      .select('phone, whatsapp_phone, address, employee_code, photo_url, join_date, is_active')
      .eq('user_id', marketingId)
      .maybeSingle(),
    getAuthUser(marketingId),
    getCustomersForMarketing(marketingId),
    getCommissions(marketingId),
  ])

  if (marketingResult.error) throw marketingResult.error
  const marketing = marketingResult.data
  const member = {
    id: profile.id,
    full_name: profile.full_name || user.user_metadata?.full_name || null,
    email: user.email || null,
    role: 'marketing' as const,
    created_at: profile.created_at,
    phone: marketing?.phone || null,
    whatsapp_phone: marketing?.whatsapp_phone || null,
    address: marketing?.address || null,
    employee_code: marketing?.employee_code || null,
    photo_url: marketing?.photo_url || null,
    join_date: marketing?.join_date || null,
    is_active: isActive(user, marketing, 'marketing'),
    auth_status: 'available' as const,
  }

  const transactions = await getTransactionsForCustomers(customers.map((customer) => customer.id))
  const period = normalizePeriod(periodValue)
  const start = periodStart(period)
  const summary = calculateMarketingSummary(marketingId, customers, transactions, commissions, start)

  const soldTransactions = transactions.filter((transaction) =>
    transaction.status === 'Sold' && isWithinPeriod(transaction.sold_date || transaction.booking_date, start)
  )
  const bookingTransactions = transactions.filter((transaction) =>
    transaction.status === 'Booking' && isWithinPeriod(transaction.booking_date, start)
  )
  const cancelledTransactions = transactions.filter((transaction) =>
    transaction.status === 'Cancelled' && isWithinPeriod(transaction.cancelled_date || transaction.booking_date, start)
  )
  const allPeriodCommissions = commissions.filter((commission) =>
    isWithinPeriod(commission.created_at, start)
  )
  const periodCommissions = allPeriodCommissions.filter((commission) =>
    commission.status !== 'Cancelled'
  )

  const transactionById = new Map(transactions.map((transaction) => [transaction.id, transaction]))
  const customerById = new Map(customers.map((customer) => [customer.id, customer]))

  const clients = customers.map((customer) => ({
    id: customer.id,
    full_name: customer.full_name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    created_at: customer.created_at,
    transactions: transactions
      .filter((transaction) => transaction.customer_id === customer.id)
      .sort((a, b) => (b.booking_date || '').localeCompare(a.booking_date || ''))
      .map((transaction) => ({
        id: transaction.id,
        lot_id: transaction.lot_id,
        lot_number: lotNumberOf(transaction),
        status: transaction.status,
        payment_type: transaction.payment_type,
        final_price: Number(transaction.final_price || 0),
        booking_date: transaction.booking_date,
        sold_date: transaction.sold_date,
      })),
  }))

  const commissionItems = allPeriodCommissions.map((commission) => {
    const transaction = transactionById.get(commission.transaction_id)
    const customer = transaction ? customerById.get(transaction.customer_id) : null
    return {
      id: commission.id,
      transaction_id: commission.transaction_id,
      commission_type: commission.commission_type,
      base_amount: Number(commission.base_amount || 0),
      commission_rate: commission.commission_rate === null ? null : Number(commission.commission_rate),
      commission_amount: Number(commission.commission_amount || 0),
      status: commission.status,
      paid_at: commission.paid_at,
      created_at: commission.created_at,
      customer_name: customer?.full_name || null,
      lot_number: transaction ? lotNumberOf(transaction) : null,
    }
  })

  const totalCommission = periodCommissions.reduce((total, item) => total + Number(item.commission_amount || 0), 0)
  const pendingCommission = periodCommissions
    .filter((item) => ['Pending', 'Eligible', 'Processing'].includes(item.status))
    .reduce((total, item) => total + Number(item.commission_amount || 0), 0)
  const paidCommission = periodCommissions
    .filter((item) => item.status === 'Paid')
    .reduce((total, item) => total + Number(item.commission_amount || 0), 0)

  return {
    member,
    period,
    metrics: {
      total_clients: customers.length,
      new_clients: customers.filter((customer) => isWithinPeriod(customer.created_at, start)).length,
      sold_clients: summary.sold_clients,
      sold_lots: summary.sold_lots,
      sales_value: summary.sales_value,
      booking_transactions: bookingTransactions.length,
      cancelled_transactions: cancelledTransactions.length,
      conversion_rate: customers.length ? Number(((summary.sold_clients / customers.length) * 100).toFixed(1)) : 0,
      total_commission: totalCommission,
      pending_commission: pendingCommission,
      paid_commission: paidCommission,
    },
    clients,
    commissions: commissionItems,
  }
}


/**
 * Handler utama Edge Function.
 */
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(
      null,
      {
        status: 204,
        headers: corsHeaders(request),
      },
    )
  }

  if (request.method !== 'POST') {
    return reply(
      request,
      {
        error: 'Method Not Allowed',
      },
      405,
    )
  }

  try {
    const {
      user: caller,
      role: callerRole,
    } = await authorize(request)

    let body: Record<string, unknown>

    try {
      body = await request.json()
    } catch {
      return reply(
        request,
        {
          error: 'Format permintaan tidak valid.',
        },
        400,
      )
    }

    const action = body.action as Action

    const allowedActions: Action[] = [
      'list',
      'create',
      'update',
      'deactivate',
      'reactivate',
      'marketing_overview',
      'marketing_detail',
    ]

    if (!allowedActions.includes(action)) {
      return reply(
        request,
        {
          error: 'Tindakan tidak dikenal.',
        },
        400,
      )
    }

    /**
     * LIST
     */
    if (action === 'list') {
      const members = await listMembers(callerRole)

      return reply(
        request,
        {
          members,
        },
      )
    }

    /**
     * MARKETING OVERVIEW
     */
    if (action === 'marketing_overview') {
      const result = await marketingOverview(body.period)
      return reply(request, result)
    }

    /**
     * MARKETING DETAIL
     */
    if (action === 'marketing_detail') {
      const marketingId = typeof body.id === 'string' ? body.id : ''
      if (!marketingId) {
        return reply(request, { error: 'ID Marketing wajib diisi.' }, 400)
      }
      const result = await marketingDetail(marketingId, body.period)
      return reply(request, result)
    }

    /**
     * CREATE
     */
    if (action === 'create') {
      return await createMember(
        request,
        caller,
        callerRole,
        body,
      )
    }

    /**
     * Validasi target untuk tindakan selain list/create.
     */
    const targetId =
      typeof body.id === 'string'
        ? body.id
        : ''

    if (
      !targetId ||
      targetId === caller.id
    ) {
      return reply(
        request,
        {
          error: 'Target akun tidak valid.',
        },
        400,
      )
    }

    /**
     * UPDATE
     */
    if (action === 'update') {
      return await updateMember(
        request,
        callerRole,
        targetId,
        body,
      )
    }

    /**
     * DEACTIVATE / REACTIVATE
     */
    return await setMemberActive(
      request,
      callerRole,
      targetId,
      action,
    )
  } catch (error) {
    if (error instanceof Response) {
      return reply(
        request,
        {
          error: await error.text(),
        },
        error.status,
      )
    }

    console.error(
      'manage-team-user:',
      error instanceof Error
        ? error.message
        : error,
    )

    return reply(
      request,
      {
        error: 'Terjadi kesalahan pada server.',
      },
      500,
    )
  }
})
