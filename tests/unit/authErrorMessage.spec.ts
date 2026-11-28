import { describe, expect, it } from 'vitest'
import { AUTH_MESSAGES, authErrorMessage, emailInputError } from '@/services/auth/authErrorMessage'

const fallback = 'Belum berhasil masuk. Silakan coba lagi.'

describe('authErrorMessage', () => {
  it('menerjemahkan email atau kata sandi salah', () => {
    const error = Object.assign(new Error('Invalid login credentials'), { code: 'invalid_credentials', status: 400 })
    expect(authErrorMessage(error, fallback)).toBe(AUTH_MESSAGES.wrongCredentials)
    expect(authErrorMessage(new Error('Invalid login credentials'), fallback)).toBe(AUTH_MESSAGES.wrongCredentials)
  })

  it('mengenali email belum dikonfirmasi, batas percobaan, dan koneksi putus', () => {
    expect(authErrorMessage(new Error('Email not confirmed'), fallback)).toBe(AUTH_MESSAGES.emailNotConfirmed)
    expect(authErrorMessage({ status: 429, message: 'x' }, fallback)).toBe(AUTH_MESSAGES.tooManyAttempts)
    expect(authErrorMessage(new TypeError('Failed to fetch'), fallback)).toBe(AUTH_MESSAGES.offline)
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', status: 0 }, fallback)).toBe(AUTH_MESSAGES.offline)
  })

  it('tidak pernah menampilkan teks asli yang tidak dikenali', () => {
    expect(authErrorMessage(new Error('Database error querying schema'), fallback)).toBe(fallback)
    expect(authErrorMessage(null, fallback)).toBe(fallback)
  })
})

describe('emailInputError', () => {
  it('memberi pesan untuk email kosong atau salah tulis', () => {
    expect(emailInputError('  ')).toBe('Isi email Anda terlebih dahulu.')
    expect(emailInputError('nama@email')).toBe(AUTH_MESSAGES.invalidEmail)
    expect(emailInputError(' nama@email.com ')).toBe('')
  })
})
