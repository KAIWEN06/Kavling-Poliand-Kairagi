# Notifikasi Native Android

## File yang terlibat

| Lapisan | File |
|---|---|
| Plugin native | `android/app/src/main/java/com/poliland/kairagi/CustomNotificationPlugin.kt` |
| Registrasi | `MainActivity.java` (`registerPlugin(CustomNotificationPlugin.class)` sebelum `super.onCreate`) |
| Layout | `res/layout/layout_custom_notification.xml` (+ `_big`) |
| Aset | `res/raw/notif_alert.wav`, `res/drawable/ic_stat_notify.xml`, `ic_notif_badge.xml`, `res/values{,-night}/notif_colors.xml` |
| Generator suara | `python scripts/generate_notif_sound.py` |
| Wrapper TS | `src/plugins/customNotification.ts` |
| Logika per role | `src/services/notification/roleNotificationService.ts` |
| Sambungan realtime | `src/composables/useNotifications.ts` |

Alur: baris baru di tabel `notifications` (Supabase Realtime) → `useNotifications.onInsert` →
`roleNotificationService.notify()` → plugin native. Notifikasi hanya tampil jika
`recipient_id` = user aktif dan `targetRole` = role aktif; native memeriksanya sekali lagi.

## Contoh pemakaian di komponen

```ts
import { roleNotificationService } from '@/services/notification/roleNotificationService'

// Minta izin (Android 13+), mis. dari halaman Pengaturan
const granted = await roleNotificationService.requestPermission()

// Kirim notifikasi uji untuk role aktif
await roleNotificationService.show({
  id: `test-${Date.now()}`,
  title: 'Pembayaran diterima',
  message: 'Cicilan ke-3 untuk Kavling A-12 telah dikonfirmasi.',
  badge: 'Pembayaran',
  route: '/client/pembayaran',
  payload: { lot_id: 'A-12' },
})
```

Klik ditangani otomatis oleh `roleNotificationService` (listener dipasang sekali). Untuk
menangani klik secara manual:

```ts
import { CustomNotification } from '@/plugins/customNotification'
const handle = await CustomNotification.addListener('notificationClicked', (e) => console.log(e.route, e.payload))
// handle.remove() saat tidak dipakai
```

Rute dari notifikasi diperiksa: harus ada, bukan 404, dan boleh diakses role aktif; jika
tidak, pengguna diarahkan ke beranda rolenya. Klik saat belum login → ke `/login`, klik
disimpan 15 menit dan diproses setelah login bila user & role sama; bila berbeda, dibuang
dengan toast.

## Sinkronisasi & build

```bash
npm run build
npx cap sync android
npx cap open android      # atau: cd android && gradlew assembleDebug
```

Gradle butuh JDK 21 (`JAVA_HOME`, mis. folder `jbr` Android Studio). Kotlin ditambahkan lewat
`kotlin-gradle-plugin` di `android/build.gradle`.

## Push saat aplikasi ditutup (FCM)

Alur: INSERT di `notifications` → Database Webhook → Edge Function `send-push` → FCM →
`PoliLandMessagingService` (native, tanpa WebView) → notifikasi kustom. Push tiba ke perangkat
yang token-nya terdaftar untuk `recipient_id`; native membuang push bila user/role di
perangkat tidak cocok (logout / ganti akun), dan token dihapus saat logout.

Langkah satu kali (perlu akun Firebase Anda):
1. Firebase Console → buat project → tambah app Android `com.poliland.kairagi` → unduh
   `google-services.json` → taruh di `android/app/google-services.json` (jangan dikomit bila repo publik).
2. Project settings → Service accounts → *Generate new private key* (JSON).
3. Terapkan migrasi `supabase/migrations/202611260001_push_device_tokens.sql`.
4. `supabase secrets set PUSH_WEBHOOK_SECRET=<acak> FCM_SERVICE_ACCOUNT_JSON="$(cat key.json)"`
5. `supabase functions deploy send-push --no-verify-jwt`
6. Dashboard → Database → Webhooks → tabel `notifications`, event INSERT, target Edge Function
   `send-push`, header `x-webhook-secret: <PUSH_WEBHOOK_SECRET>`.
7. `npm run build && npx cap sync android`, lalu build ulang aplikasi.

Tanpa `google-services.json`, aplikasi tetap berjalan; hanya push yang nonaktif.

## Catatan penting

- Push berhenti bila pengguna *Force stop* aplikasi dari pengaturan Android (batasan sistem),
  dan sebagian OEM menahan push di background (lihat checklist OEM).

- **Channel (API 26+)**: suara & getar melekat pada channel dan tidak bisa diubah setelah
  dibuat. ID channel = `poliland_alerts_<suara>_<hash pola>`; ganti suara/pola → channel baru.
  Pada perangkat yang sudah memasang versi lama, pengguna harus mengatur ulang channel atau
  uninstall. API < 26 memakai `setSound`/`setVibrate` langsung.
- Resource shrinking (jika diaktifkan nanti) bisa membuang `raw/` yang dirujuk lewat nama;
  tambahkan `res/raw/keep.xml` dengan `tools:keep="@raw/notif_alert"`.

## Checklist pengujian (perangkat fisik)

Mode suara
- [ ] Normal: chime + getar terdengar.
- [ ] Vibrate: hanya getar.
- [ ] Silent: tanpa suara/getar, notifikasi tetap tampil.
- [ ] Do Not Disturb aktif: notifikasi diredam sesuai aturan DND pengguna (perilaku sistem, bukan bug).

Izin
- [ ] Android 13+: dialog izin muncul sekali setelah login; tolak → tidak ada notifikasi, tidak crash.
- [ ] Android 12 ke bawah: tanpa dialog, notifikasi tampil.

Per role (admin, marketing, marketing_head, client, owner)
- [ ] Foreground: notifikasi tampil; tap → halaman benar (`resolveNotificationRoute`).
- [ ] Background: tap → app naik ke depan, rute benar.
- [ ] Push: tutup app (swipe dari recents), buat baris `notifications` baru untuk user itu → notifikasi muncul dengan suara/getar.
- [ ] App ditutup (swipe dari recents) lalu tap notifikasi yang masih di tray → cold start ke rute benar.
- [ ] Ganti akun/role: tray lama dibersihkan, notifikasi role lama tidak muncul lagi.
- [ ] Logout: tray kosong; tap notifikasi lama (jika masih ada) → `/login`, tidak masuk ke halaman role lain.
- [ ] Login ulang dengan user yang sama → klik tertunda diproses; user lain → toast, tidak berpindah.

Tampilan
- [ ] Mode terang & gelap: teks terbaca, label hijau kontras; bentuk collapsed dan expanded.

OEM (Xiaomi/MIUI, Oppo/ColorOS, Vivo, Huawei, Samsung)
- [ ] Aktifkan autostart / matikan battery optimization untuk PoliLand; banyak OEM mematikan
  proses di background sehingga Realtime berhenti dan notifikasi tidak datang.
- [ ] Pastikan channel "Notifikasi PoliLand" berstatus *Urgent/Pop on screen* di pengaturan sistem.
