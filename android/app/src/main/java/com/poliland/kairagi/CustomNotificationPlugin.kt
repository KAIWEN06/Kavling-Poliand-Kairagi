package com.poliland.kairagi

import android.Manifest
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.firebase.messaging.FirebaseMessaging
import java.lang.ref.WeakReference
import java.util.Locale

/**
 * Jembatan Capacitor untuk notifikasi native PoliLand. Penampilan notifikasi ada di
 * [NotificationHelper]; push saat aplikasi ditutup ditangani [PoliLandMessagingService].
 * Catatan channel Android 8+ (suara/getar tidak bisa diubah setelah channel dibuat) ada di
 * [NotificationHelper].
 */
@CapacitorPlugin(
    name = "CustomNotification",
    permissions = [
        Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications"),
    ],
)
class CustomNotificationPlugin : Plugin() {

    override fun load() {
        instance = WeakReference(this)
        dispatchClick(activity?.intent)
    }

    override fun handleOnNewIntent(intent: Intent?) {
        super.handleOnNewIntent(intent)
        dispatchClick(intent)
    }

    // ---------------------------------------------------------------- permission

    @PluginMethod
    fun checkAndRequestPermissions(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || NotificationHelper.canPost(context)) {
            call.resolve(permissionResult())
            return
        }
        requestPermissionForAlias("notifications", call, "onPermissionResult")
    }

    @PermissionCallback
    fun onPermissionResult(call: PluginCall) {
        call.resolve(permissionResult())
    }

    private fun permissionResult(): JSObject {
        val ok = NotificationHelper.canPost(context)
        return JSObject().put("granted", ok).put("status", if (ok) "granted" else "denied")
    }

    // ------------------------------------------------------------ konteks role

    /** Menetapkan role & user aktif (disimpan ke disk agar push saat app tertutup divalidasi). */
    @PluginMethod
    fun setActiveContext(call: PluginCall) {
        val role = call.getString("role")?.trim()?.lowercase(Locale.ROOT)
        val userId = call.getString("userId")?.trim()
        if (role.isNullOrEmpty() || userId.isNullOrEmpty()) {
            call.reject("role dan userId wajib diisi.", "invalid_context")
            return
        }
        val changed = NotificationHelper.activeUserId(context) != userId || NotificationHelper.activeRole(context) != role
        NotificationHelper.saveContext(context, role, userId)
        if (changed) NotificationManagerCompat.from(context).cancelAll()
        call.resolve()
    }

    /** Logout: hapus konteks dan semua notifikasi di tray. */
    @PluginMethod
    fun clearActiveContext(call: PluginCall) {
        NotificationHelper.saveContext(context, null, null)
        NotificationManagerCompat.from(context).cancelAll()
        call.resolve()
    }

    // -------------------------------------------------------------- push token

    /** Mengambil token FCM. Gagal (reject) bila google-services.json belum dipasang. */
    @PluginMethod
    fun getPushToken(call: PluginCall) {
        try {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful && !task.result.isNullOrEmpty()) {
                    NotificationHelper.savePushToken(context, task.result)
                    call.resolve(JSObject().put("token", task.result))
                } else {
                    call.reject("Token push tidak tersedia.", "push_unavailable")
                }
            }
        } catch (e: Exception) {
            call.reject("Firebase belum dikonfigurasi (google-services.json).", "push_unavailable")
        }
    }

    /** Menghapus token FCM lokal (logout) agar perangkat mendapat token baru untuk akun berikutnya. */
    @PluginMethod
    fun deletePushToken(call: PluginCall) {
        NotificationHelper.savePushToken(context, null)
        try {
            FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener { call.resolve() }
        } catch (e: Exception) {
            call.resolve()
        }
    }

    // ---------------------------------------------------------------- tampilkan

    @PluginMethod
    fun showCustomNotification(call: PluginCall) {
        val title = call.getString("title")?.trim().orEmpty()
        if (title.isEmpty()) {
            call.reject("title wajib diisi.", "invalid_args")
            return
        }
        val role = NotificationHelper.activeRole(context)
        val userId = NotificationHelper.activeUserId(context)
        if (role == null || userId == null) {
            call.reject("Tidak ada user aktif; notifikasi diabaikan.", "no_active_context")
            return
        }
        val targetRole = call.getString("targetRole")?.trim()?.lowercase(Locale.ROOT)
        val recipientId = call.getString("recipientId")?.trim()
        if (!targetRole.isNullOrEmpty() && targetRole != role) {
            call.reject("Notifikasi untuk role '$targetRole' tidak sesuai role aktif.", "role_mismatch")
            return
        }
        if (!recipientId.isNullOrEmpty() && recipientId != userId) {
            call.reject("Notifikasi untuk penerima lain.", "recipient_mismatch")
            return
        }

        val idText = call.data.opt("id")?.toString()?.takeIf { it.isNotBlank() && it != "null" }
            ?: System.nanoTime().toString()
        val arr = call.getArray("vibrationPattern")
        val pattern = arr?.let { a ->
            (0 until a.length()).mapNotNull { i -> a.optLong(i, -1L).takeIf { it in 0..5000 } }.take(12).toLongArray()
        }

        val shown = NotificationHelper.show(
            context,
            NotificationHelper.Spec(
                id = idText,
                title = title,
                message = call.getString("message")?.trim().orEmpty(),
                badge = call.getString("badge"),
                soundName = call.getString("soundName"),
                pattern = pattern,
                targetRole = role,
                recipientId = userId,
                route = call.getString("route").orEmpty(),
                payload = (call.getObject("payload") ?: JSObject()).toString(),
            ),
        )
        if (!shown) {
            call.reject("Izin notifikasi belum diberikan.", "permission_denied")
            return
        }
        call.resolve(JSObject().put("id", idText))
    }

    // ------------------------------------------------------------------- klik

    /** Meneruskan tap notifikasi ke JS; ditahan (retain) bila listener belum terpasang. */
    private fun dispatchClick(intent: Intent?) {
        if (intent == null || intent.action != NotificationHelper.ACTION_CLICK ||
            intent.getBooleanExtra(NotificationHelper.EXTRA_HANDLED, false) ||
            // Dibuka lagi dari daftar aplikasi terbaru: Android mengirim ulang intent lama.
            intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY != 0
        ) return
        intent.putExtra(NotificationHelper.EXTRA_HANDLED, true)
        val payload = try {
            JSObject(intent.getStringExtra(NotificationHelper.EXTRA_PAYLOAD) ?: "{}")
        } catch (_: Exception) {
            JSObject()
        }
        val data = JSObject()
            .put("id", intent.getStringExtra(NotificationHelper.EXTRA_ID))
            .put("targetRole", intent.getStringExtra(NotificationHelper.EXTRA_TARGET_ROLE))
            .put("recipientId", intent.getStringExtra(NotificationHelper.EXTRA_RECIPIENT_ID))
            .put("route", intent.getStringExtra(NotificationHelper.EXTRA_ROUTE))
            .put("payload", payload)
            .put("clickedAt", System.currentTimeMillis())
        notifyListeners("notificationClicked", data, true)
    }

    companion object {
        private var instance: WeakReference<CustomNotificationPlugin>? = null

        /** Dipanggil [PoliLandMessagingService] saat FCM merotasi token. */
        fun notifyTokenRefreshed(token: String) {
            instance?.get()?.notifyListeners("pushTokenRefreshed", JSObject().put("token", token))
        }
    }
}
