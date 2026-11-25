import { formatInstallmentRange } from '@/utils/installmentFormat'
import type { CashflowEntry, CashflowTotals, ReportPeriod } from '@/utils/financialCashflow'

type Cell = string | number

export interface PdfSection {
  title: string
  head: string[]
  body: Cell[][]
  /** indeks kolom yang rata kanan (nominal) */
  rightAlign?: number[]
}

export interface PdfReportInput {
  title: string
  subtitle: string
  /** pasangan label-nilai yang tampil sebagai kartu ringkasan di bagian atas */
  summary?: Array<[string, string]>
  sections: PdfSection[]
}

export const formatPdfRupiah = (value: number) => `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)}`
const shortDate = (value: string) => new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(`${value.slice(0, 10)}T00:00:00Z`))

const SOURCE_LABELS: Record<string, string> = {
  payments: 'Pembayaran',
  booking_fee_refunds: 'Pengembalian tanda jadi',
  purchase_refunds: 'Pengembalian dana pembelian',
  financial_reversal: 'Pembalikan',
}
const CATEGORY_LABELS: Record<string, string> = {
  Booking: 'Tanda Jadi', 'Down Payment': 'Uang Muka', Installment: 'Cicilan',
  'Cash Purchase': 'Pembelian Tunai', Other: 'Lainnya', Unclassified: 'Belum Dikategorikan',
}

export function buildCashflowPdfInput(entries: CashflowEntry[], totals: CashflowTotals, period: ReportPeriod, generatedAt: string): PdfReportInput {
  const sorted = [...entries].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on) || a.id - b.id)
  return {
    title: 'Laporan Keuangan - Ringkasan Arus Kas',
    subtitle: `Periode: ${period.label} (${shortDate(period.start)} - ${shortDate(period.end)})  |  Dicetak: ${generatedAt}`,
    summary: [
      ['Pemasukan bruto', formatPdfRupiah(totals.grossIncome)],
      ['Total pengeluaran', formatPdfRupiah(totals.totalExpenses)],
      ['Pengembalian dana', formatPdfRupiah(totals.refundExpenses)],
      ['Arus kas bersih', formatPdfRupiah(totals.netCashFlow)],
    ],
    sections: [{
      title: `Transaksi kas (${sorted.length})`,
      head: ['Tanggal', 'Arah', 'Kategori', 'Sumber', 'Referensi bank', 'Nominal'],
      body: sorted.map((e) => [
        shortDate(e.occurred_on),
        e.flow_direction === 'inflow' ? 'Masuk' : 'Keluar',
        e.installment_numbers?.length ? formatInstallmentRange(e.installment_numbers, e.installment_total) : (CATEGORY_LABELS[e.category] ?? e.category),
        `${SOURCE_LABELS[e.source_table] ?? e.source_table} #${e.source_id}`,
        e.bank_reference || '-',
        `${e.flow_direction === 'inflow' ? '+' : '-'}${formatPdfRupiah(e.amount)}`,
      ]),
      rightAlign: [5],
    }],
  }
}

export async function buildReportPdf(input: PdfReportInput): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const green: [number, number, number] = [30, 77, 43]

  doc.setFillColor(...green)
  doc.rect(0, 0, pageWidth, 8, 'F')
  doc.setTextColor(...green)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(input.title, margin, 44)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('PoliLand Kairagi', margin, 58)
  doc.text(doc.splitTextToSize(input.subtitle, pageWidth - margin * 2), margin, 72)

  let y = 94
  if (input.summary?.length) {
    const gap = 8
    const cardW = (pageWidth - margin * 2 - gap * (input.summary.length - 1)) / input.summary.length
    input.summary.forEach(([label, value], i) => {
      const x = margin + i * (cardW + gap)
      doc.setDrawColor(225)
      doc.setFillColor(248, 246, 240)
      doc.roundedRect(x, y, cardW, 48, 6, 6, 'FD')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(110)
      doc.text(label, x + 8, y + 16)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30)
      doc.text(doc.splitTextToSize(value, cardW - 16), x + 8, y + 34)
    })
    y += 68
  }

  for (const section of input.sections) {
    if (y > pageHeight - 100) { doc.addPage(); y = 50 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30)
    doc.text(section.title, margin, y)
    const right = new Set(section.rightAlign ?? [])
    autoTable(doc, {
      startY: y + 8,
      head: [section.head],
      body: section.body.length
        ? section.body.map((row) => row.map(String))
        : [[{ content: 'Tidak ada data pada periode ini.', colSpan: section.head.length, styles: { halign: 'center', textColor: 120 } }]],
      margin: { left: margin, right: margin, bottom: 40 },
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
      headStyles: { fillColor: green, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 248, 243] },
      didParseCell: (data) => {
        if (right.has(data.column.index) && data.cell.colSpan === 1) data.cell.styles.halign = 'right'
      },
    })
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 24
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(140)
    doc.text('Dokumen dibuat otomatis dari sistem PoliLand Kairagi.', margin, pageHeight - 18)
    doc.text(`Halaman ${i} / ${pages}`, pageWidth - margin, pageHeight - 18, { align: 'right' })
  }
  return doc.output('blob')
}
