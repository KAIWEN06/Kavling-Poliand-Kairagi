## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- If `graphify` is not found in the shell, use the full path `C:/Users/Kevin/.local/bin/graphify.exe` instead.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## Skills

Proyek ini memakai Vue 3 (bukan React/Next.js). Panggil skill lewat tool Skill sebelum mulai mengerjakan, tanpa menunggu diminta.

Rules:
- Setiap tugas membuat atau mengubah UI (file `.vue` di `src/views`, `src/components`, layout, styling): muat `poliland-design` PERTAMA. Itu standar visual proyek (patokan: `src/views/HomePage.vue` dan `src/views/Admin/AdminDashboard.vue`) dan cukup sendiri untuk sebagian besar tugas. Demi hemat token, muat `ui-ux-pro-max` atau `mobile-native` hanya bila tugasnya butuh hal yang tidak dijawab `poliland-design` (pola UX baru, masalah khusus di HP). Dari `DESIGN.md`, buka hanya section yang diperlukan (§13 aturan teks, §14 kontras).
- Setiap tugas yang menulis atau mengubah teks tampilan (judul, label, deskripsi, pesan): muat `humanizer` dan ikuti `DESIGN.md` §13. Satu gagasan hanya muncul sekali per layar; komponen yang berdampingan tidak boleh mengulang kata yang sama.
- Setiap warna teks baru: hitung rasio kontras dan pastikan minimal 4,5:1 (§14). Putih di atas emas dilarang.
- Tugas yang menyentuh layout responsif, tap target, atau interaksi sentuh: tambahkan `antislop-layoutmobile`.
- Tugas yang menyentuh warna, kontras, fokus, atau aksesibilitas: tambahkan `antislop-human`.
- Tugas animasi atau transisi: gunakan `find-animation-opportunities` (mencari peluang) atau `improve-animations` (audit dan rencana). `review-animations` hanya jalan bila saya mengetiknya manual.
- Tugas design token atau komponen sistematis: gunakan `design-system`.
- Contoh `shadcn-ui` dan `ui-styling` berbasis React/Next.js. Pakai hanya sebagai referensi pola Tailwind dan aksesibilitas, jangan menyalin kode React ke file Vue. Gunakan padanan Vue (misalnya shadcn-vue / Radix Vue) bila relevan.
- Perubahan kecil non-visual (logika, service, migrasi SQL, typo) tidak perlu memuat skill UI.
- Bila sebuah skill dipakai, sebutkan namanya singkat di awal jawaban.
