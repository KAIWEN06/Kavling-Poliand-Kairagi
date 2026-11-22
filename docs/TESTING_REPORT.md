# Laporan Pengujian

Status: audit statis dan inspeksi katalog database dilakukan pada 21-22 November 2026. Migrasi finansial, koreksi SPK, denda, wanprestasi, dan rekonsiliasi telah diterapkan; tidak ada data dummy yang dibuat.

| Area | Hasil | Catatan |
|---|---|---|
| Source structure, routes, service dan page | PASS (inspeksi) | Vue/Ionic, bukan React |
| Database tables, columns, routines, triggers, indexes | PASS (read-only audit) | MCP tersambung, project URL read-only |
| SPK approval/refusal runtime | NOT RUN | Tidak ada transaksi percobaan pada data produksi |
| Duplicate payment confirmation/concurrency | NOT RUN | Belum ada pengujian atomik |
| Refund 50%, double refund, refund eligibility | NOT RUN | Logika sudah ada di migrasi lokal; belum dijalankan pada staging |
| Double-entry balance and bank reconciliation | NOT RUN / PARTIAL | SQL invariant checks tersedia; bank reconciliation belum dibuat |
| RLS client-to-client isolation | NOT RUN | Policy audit mengindikasikan predicate terlalu luas pada customers/profiles |
| `npm.cmd run build` | PASS | Type-check dan Vite production build selesai; terdapat Lightning CSS warning untuk `:host-context` dan peringatan bundle >500 kB. |
| `npm.cmd run test:unit -- --run tests/unit/financeCalculations.spec.ts tests/unit/financialCashflow.spec.ts` | PASS | 14 tes lulus, mencakup kalkulasi keuangan dan ringkasan cash flow. |
| `npm.cmd run test:unit -- --run` | FAIL | 14 tes lulus; tes bawaan `tests/unit/example.spec.ts` gagal karena `document is not defined` (Vitest tidak dikonfigurasi dengan environment DOM). |
| Buku kas dan jurnal SQL | PARTIAL | Objek/trigger/RLS diverifikasi setelah migrasi; skenario mutasi tidak dijalankan pada data produksi. |
| Pembatalan dan refund SQL | NOT RUN | Migrasi menyiapkan RPC atomik; belum diuji terhadap transaksi staging. |
| Tampilan Admin Buku Kas | PASS (build) | Type-check/build lulus; runtime Supabase tidak dimutasi untuk pengujian. |
| Form client/Admin pembatalan | PASS (build) | Type-check/build lulus; submit memerlukan RPC setelah migrasi dijalankan. |
| Click-through UI setiap kontrol | NOT RUN | Belum ada sesi browser/runtime untuk mencoba kontrol secara interaktif. |

Skrip pemeriksaan pascamigrasi tersedia di `supabase/verification/financial_cash_ledger_checks.sql`. Objek database telah tersedia; skrip mutasi/integrasi tetap harus dijalankan pada staging agar tidak membuat data percobaan di produksi.

Tidak ada skenario PASS yang diklaim untuk perilaku finansial runtime. Jalankan suite terisolasi setelah policy/ledger/refund diterapkan; jangan menguji mutation ke data produksi.
