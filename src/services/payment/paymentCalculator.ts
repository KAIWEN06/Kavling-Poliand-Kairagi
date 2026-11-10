/**
 * Kalkulasi pembayaran PoliLand.
 *
 * Aturan:
 * - Booking fee berdiri sendiri dan tidak mengurangi harga kavling maupun DP.
 * - DP bersifat opsional.
 * - Jika memakai DP, DP harus lunas sebelum cicilan dimulai.
 * - Margin flat: setiap 3 bulan = 2,5% dari sisa pokok.
 * - Semua nominal disimpan dalam rupiah bulat.
 */

export type PaymentCategory =
  | "Booking"
  | "Down Payment"
  | "Installment"
  | "Cash Purchase"
  | "Other"
  | "Unclassified";

export type PaymentStatus = "Pending" | "Confirmed" | "Rejected";

export interface InstallmentCalculation {
  finalPrice: number;
  bookingFee: number;
  downPayment: number;
  principalAmount: number;
  months: number;
  marginPercent: number;
  marginAmount: number;
  installmentTotal: number;
  monthlyPayment: number;
  lastInstallmentPayment: number;
}

export interface TransactionPayment {
  amount: number | string | null;
  status: string;
  payment_category: string;
}

function toNonNegativeInteger(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} harus berupa angka valid dan tidak boleh negatif.`);
  }

  return Math.round(value);
}

/**
 * Menghitung cicilan.
 *
 * Contoh:
 * 3 bulan  => margin 2,5%
 * 6 bulan  => margin 5%
 * 9 bulan  => margin 7,5%
 *
 * Booking fee tidak masuk ke perhitungan harga cicilan.
 */
export function calculateInstallment(input: {
  finalPrice: number;
  bookingFee?: number;
  downPayment?: number;
  months: number;
}): InstallmentCalculation {
  const finalPrice = toNonNegativeInteger(input.finalPrice, "Harga final");
  const bookingFee = toNonNegativeInteger(input.bookingFee ?? 0, "Biaya booking");
  const downPayment = toNonNegativeInteger(input.downPayment ?? 0, "DP");
  const months = Number(input.months);

  if (!Number.isInteger(months) || months <= 0) {
    throw new Error("Tenor cicilan harus berupa bilangan bulat lebih dari 0.");
  }

  if (finalPrice <= 0) {
    throw new Error("Harga final kavling harus lebih besar dari 0.");
  }

  if (downPayment > finalPrice) {
    throw new Error("DP tidak boleh lebih besar dari harga final kavling.");
  }

  const principalAmount = finalPrice - downPayment;
  const marginPercent = (months / 3) * 2.5;
  const marginAmount = Math.round((principalAmount * marginPercent) / 100);
  const installmentTotal = principalAmount + marginAmount;

  // Cicilan 1 sampai n-1 memakai nominal dasar.
  // Seluruh selisih pembulatan dimasukkan ke cicilan terakhir.
  const monthlyPayment = Math.floor(installmentTotal / months);
  const lastInstallmentPayment =
    installmentTotal - monthlyPayment * (months - 1);

  return {
    finalPrice,
    bookingFee,
    downPayment,
    principalAmount,
    months,
    marginPercent,
    marginAmount,
    installmentTotal,
    monthlyPayment,
    lastInstallmentPayment,
  };
}

/**
 * Membuat jadwal cicilan per bulan.
 * Nominal cicilan terakhir otomatis menyesuaikan pembulatan.
 */
export function calculatePaymentSchedule(
  calculation: InstallmentCalculation,
): Array<{ installmentNumber: number; amount: number }> {
  return Array.from({ length: calculation.months }, (_, index) => ({
    installmentNumber: index + 1,
    amount:
      index === calculation.months - 1
        ? calculation.lastInstallmentPayment
        : calculation.monthlyPayment,
  }));
}

/**
 * Ringkasan pembayaran transaksi.
 *
 * Pembayaran Booking tidak mengurangi kewajiban pembelian.
 * Transaksi Installment:
 *   kewajiban = DP + total cicilan.
 * Transaksi Cash:
 *   kewajiban = harga final.
 *
 * Hanya status Confirmed yang dihitung sebagai pembayaran diterima.
 */
export function summarizeTransactionPayments(input: {
  paymentType: "Cash" | "Installment";
  finalPrice: number;
  downPayment: number;
  installmentTotal: number;
  payments: TransactionPayment[];
}) {
  const confirmed = input.payments.filter(
    (payment) => payment.status === "Confirmed",
  );

  const sumCategory = (category: PaymentCategory): number =>
    confirmed
      .filter((payment) => payment.payment_category === category)
      .reduce((total, payment) => {
        const amount = Number(payment.amount ?? 0);
        return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
      }, 0);

  const bookingPaid = sumCategory("Booking");
  const paidDownPayment = sumCategory("Down Payment");
  const paidInstallment = sumCategory("Installment");
  const paidCash = sumCategory("Cash Purchase");

  const totalDue =
    input.paymentType === "Installment"
      ? Math.max(0, input.downPayment) + Math.max(0, input.installmentTotal)
      : Math.max(0, input.finalPrice);

  const paidAmount =
    input.paymentType === "Installment"
      ? paidDownPayment + paidInstallment
      : paidCash;

  const remainingAmount = Math.max(totalDue - paidAmount, 0);
  const dpRemaining = Math.max(input.downPayment - paidDownPayment, 0);

  let paymentStatus: "Belum Dibayar" | "Menunggu Konfirmasi" | "Sebagian" | "Lunas";

  if (paidAmount >= totalDue) {
    paymentStatus = "Lunas";
  } else if (paidAmount > 0) {
    paymentStatus = "Sebagian";
  } else if (input.payments.some((payment) => payment.status === "Pending")) {
    paymentStatus = "Menunggu Konfirmasi";
  } else {
    paymentStatus = "Belum Dibayar";
  }

  return {
    bookingPaid,
    paidDownPayment,
    paidInstallment,
    paidCash,
    paidAmount,
    totalDue,
    remainingAmount,
    dpRemaining,
    dpSettled: input.downPayment === 0 || dpRemaining === 0,
    paymentStatus,
    pendingCount: input.payments.filter((payment) => payment.status === "Pending").length,
    rejectedCount: input.payments.filter((payment) => payment.status === "Rejected").length,
  };
}
