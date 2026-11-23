package com.poliland.kairagi

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.util.Locale

/**
 * Menerima push FCM (data-only) dan menampilkan notifikasi kustom, juga saat proses aplikasi
 * tidak berjalan. Tidak ada WebView/JS di sini, jadi validasi memakai konteks yang disimpan
 * di disk oleh plugin (role & user terakhir yang login). Push untuk user/role lain dibuang.
 */
class PoliLandMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(message: RemoteMessage) {
        val d = message.data
        val title = d["title"]?.trim().orEmpty()
        if (title.isEmpty()) return

        val recipientId = d["recipientId"].orEmpty()
        val targetRole = d["targetRole"].orEmpty().lowercase(Locale.ROOT)
        val activeUser = NotificationHelper.activeUserId(this)
        val activeRole = NotificationHelper.activeRole(this)

        // Logout / akun berbeda / role berbeda: jangan tampilkan.
        if (activeUser == null || activeRole == null) return
        if (recipientId != activeUser || targetRole != activeRole) return

        val high = d["priority"] == "high"
        NotificationHelper.show(
            this,
            NotificationHelper.Spec(
                id = d["id"] ?: System.nanoTime().toString(),
                title = title,
                message = d["message"].orEmpty(),
                badge = d["badge"],
                soundName = NotificationHelper.DEFAULT_SOUND,
                pattern = if (high) NotificationHelper.HIGH_PATTERN else NotificationHelper.NORMAL_PATTERN,
                targetRole = targetRole,
                recipientId = recipientId,
                route = d["route"].orEmpty(),
                payload = d["payload"] ?: "{}",
            ),
        )
    }

    /** Token baru: disimpan; JS mendaftarkannya ke server saat aplikasi dibuka berikutnya. */
    override fun onNewToken(token: String) {
        NotificationHelper.savePushToken(this, token)
        CustomNotificationPlugin.notifyTokenRefreshed(token)
    }
}
