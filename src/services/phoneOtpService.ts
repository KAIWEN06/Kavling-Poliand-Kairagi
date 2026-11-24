import { supabase } from '@/services/config/supabase'

export type OtpChannel = 'whatsapp' | 'sms'

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'none' | 'expired' | 'locked' | 'wrong'; attemptsLeft?: number }

/** Error dengan kode mesin (`code`) dan pesan yang aman ditampilkan ke pengguna. */
export class PhoneOtpError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'PhoneOtpError'
    this.code = code
  }
}

const NETWORK_MESSAGE = 'Koneksi bermasalah. Periksa jaringan lalu coba lagi.'

// Edge Function mengembalikan { error, code } pada status non-2xx; supabase-js
// membungkusnya di error.context (objek Response).
async function readFunctionError(error: unknown): Promise<PhoneOtpError> {
  const context = (error as { context?: Response } | null)?.context
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: string; code?: string }
      if (body?.error) return new PhoneOtpError(body.error, body.code ?? 'failed')
    } catch {
      // Isi respons bukan JSON; jatuh ke pesan jaringan.
    }
  }
  return new PhoneOtpError(NETWORK_MESSAGE, 'network')
}

export async function sendPhoneOtp(
  phone: string,
  channel: OtpChannel = 'whatsapp',
): Promise<{ maskedPhone: string; expiresAt: string }> {
  const { data, error } = await supabase.functions.invoke('send-phone-otp', { body: { phone, channel } })
  if (error) throw await readFunctionError(error)
  return { maskedPhone: String(data?.phone_masked ?? ''), expiresAt: String(data?.expires_at ?? '') }
}

export async function verifyPhoneOtp(phone: string, code: string): Promise<VerifyResult> {
  const { data, error } = await supabase.rpc('verify_phone_otp', { p_phone: phone, p_code: code })
  if (error) throw new PhoneOtpError(NETWORK_MESSAGE, 'network')
  const result = data as { ok: boolean; reason?: string; attempts_left?: number }
  if (result.ok) return { ok: true }
  return {
    ok: false,
    reason: (result.reason as 'none' | 'expired' | 'locked' | 'wrong') ?? 'wrong',
    attemptsLeft: result.attempts_left,
  }
}

/** Menautkan data lama (prospek Marketing) ke akun. Mengembalikan id customer, atau null bila tidak ada data lama. */
export async function claimCustomerByVerifiedPhone(phone: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('claim_customer_by_verified_phone', { p_phone: phone })
  if (error) {
    if (error.hint === 'phone_linked_other_account') {
      throw new PhoneOtpError('Nomor ini sudah dipakai akun lain. Hubungi Admin untuk bantuan.', 'phone_linked_other_account')
    }
    if (error.hint === 'phone_not_verified') {
      throw new PhoneOtpError('Verifikasi nomor kedaluwarsa. Ulangi verifikasi.', 'phone_not_verified')
    }
    throw new PhoneOtpError('Data gagal ditautkan. Coba lagi.', 'claim_failed')
  }
  return data === null || data === undefined ? null : Number(data)
}

/** Mengembalikan nomor pertama yang sudah terdaftar (HP lalu WhatsApp), atau null bila keduanya baru. */
export async function findRegisteredNumber(phone: string, whatsapp: string, excludeId: number | null = null): Promise<string | null> {
  for (const value of [phone, whatsapp]) {
    if (!value) continue
    const { data, error } = await supabase.rpc('customer_contact_exists', {
      p_phone: value,
      p_whatsapp: null,
      p_exclude_id: excludeId,
    })
    if (error) throw new PhoneOtpError(NETWORK_MESSAGE, 'network')
    if (data === true) return value
  }
  return null
}
