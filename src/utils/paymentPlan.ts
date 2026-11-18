export function formatPaymentPlanName(planName: string | null | undefined, months: number | string | null | undefined): string {
  const normalizedMonths = Number(months)
  const normalizedName = String(planName ?? '').trim()
  if (/^\d+\s*[xX]$/.test(normalizedName)) {
    return normalizedName.replace(/\s*[xX]$/, 'X')
  }
  if (normalizedName) return normalizedName
  return Number.isInteger(normalizedMonths) && normalizedMonths > 0 ? `${normalizedMonths}X` : 'Skema Cicilan'
}
