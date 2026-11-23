package com.poliland.kairagi

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.util.Locale

/**
 * Pembuat notifikasi bersama. Dipakai oleh [CustomNotificationPlugin] (aplikasi hidup) dan
 * [PoliLandMessagingService] (push FCM, termasuk saat aplikasi ditutup).
 *
 * CATATAN (Android 8.0 / API 26+): suara & pola getar adalah milik NotificationChannel dan
 * tidak bisa diubah aplikasi setelah channel dibuat. ID channel diturunkan dari suara + pola
 * getar ([channelIdFor]); mengganti salah satunya = channel baru. API < 26 memakai
 * setSound/setVibrate langsung pada builder.
 */
object NotificationHelper {
    const val CHANNEL_PREFIX = "poliland_alerts_"
    const val DEFAULT_SOUND = "notif_alert"
    const val DEFAULT_LABEL = "PoliLand"
    const val ACTION_CLICK = "com.poliland.kairagi.NOTIFICATION_CLICK"
    const val EXTRA_ID = "poliland_notif_id"
    const val EXTRA_TARGET_ROLE = "poliland_notif_target_role"
    const val EXTRA_RECIPIENT_ID = "poliland_notif_recipient_id"
    const val EXTRA_ROUTE = "poliland_notif_route"
    const val EXTRA_PAYLOAD = "poliland_notif_payload"
    const val EXTRA_HANDLED = "poliland_notif_handled"

    private const val PREFS = "poliland_notification_state"
    private const val KEY_ROLE = "active_role"
    private const val KEY_USER = "active_user_id"
    private const val KEY_PUSH_TOKEN = "push_token"

    val NORMAL_PATTERN = longArrayOf(0, 250, 150, 250, 150, 400)
    val HIGH_PATTERN = longArrayOf(0, 400, 150, 400, 150, 400, 150, 600)

    // ------------------------------------------------- konteks aktif (persisten)

    /** Disimpan ke disk agar push saat aplikasi ditutup tetap bisa divalidasi. */
    fun saveContext(context: Context, role: String?, userId: String?) {
        prefs(context).edit().putString(KEY_ROLE, role).putString(KEY_USER, userId).apply()
    }

    fun activeRole(context: Context): String? = prefs(context).getString(KEY_ROLE, null)
    fun activeUserId(context: Context): String? = prefs(context).getString(KEY_USER, null)

    fun savePushToken(context: Context, token: String?) {
        prefs(context).edit().putString(KEY_PUSH_TOKEN, token).apply()
    }

    fun savedPushToken(context: Context): String? = prefs(context).getString(KEY_PUSH_TOKEN, null)

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    // ------------------------------------------------------------- permission

    fun canPost(context: Context): Boolean {
        val permitted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        return permitted && NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    // ------------------------------------------------------------------ tampil

    class Spec(
        val id: String,
        val title: String,
        val message: String,
        val badge: String?,
        val soundName: String?,
        val pattern: LongArray?,
        val targetRole: String,
        val recipientId: String,
        val route: String,
        val payload: String,
    )

    /** Menampilkan notifikasi. Return false bila izin belum ada. */
    fun show(context: Context, spec: Spec): Boolean {
        if (!canPost(context)) return false

        val notifId = spec.id.hashCode()
        val label = spec.badge?.trim().takeUnless { it.isNullOrEmpty() } ?: DEFAULT_LABEL
        val soundName = sanitizeSoundName(spec.soundName)
        val pattern = spec.pattern?.takeIf { it.size >= 2 } ?: NORMAL_PATTERN
        val soundUri = Uri.parse("android.resource://${context.packageName}/${resolveSoundRes(context, soundName)}")
        val channelId = channelIdFor(soundName, pattern)
        ensureChannel(context, channelId, soundUri, pattern)

        val tapIntent = Intent(context, MainActivity::class.java).apply {
            action = ACTION_CLICK
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_ID, spec.id)
            putExtra(EXTRA_TARGET_ROLE, spec.targetRole)
            putExtra(EXTRA_RECIPIENT_ID, spec.recipientId)
            putExtra(EXTRA_ROUTE, spec.route)
            putExtra(EXTRA_PAYLOAD, spec.payload)
        }
        val contentIntent = PendingIntent.getActivity(
            context,
            notifId,
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setColor(ContextCompat.getColor(context, R.color.notif_status_color))
            .setContentTitle(spec.title)
            .setContentText(spec.message)
            .setCustomContentView(views(context, R.layout.layout_custom_notification, label, spec))
            .setCustomBigContentView(views(context, R.layout.layout_custom_notification_big, label, spec))
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            // Id sama (mis. Realtime + push untuk notifikasi yang sama) tidak berbunyi dua kali.
            .setOnlyAlertOnce(true)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            builder.setSound(soundUri)
            builder.setVibrate(pattern)
        }

        NotificationManagerCompat.from(context).notify(notifId, builder.build())
        return true
    }

    fun channelIdFor(soundName: String, pattern: LongArray): String =
        "$CHANNEL_PREFIX${soundName}_${Integer.toHexString(pattern.contentHashCode())}"

    fun sanitizeSoundName(raw: String?): String {
        val name = raw?.substringBeforeLast('.')?.lowercase(Locale.ROOT)?.replace(Regex("[^a-z0-9_]"), "")
        return if (name.isNullOrEmpty()) DEFAULT_SOUND else name
    }

    private fun views(context: Context, layout: Int, label: String, spec: Spec) =
        RemoteViews(context.packageName, layout).apply {
            setTextViewText(R.id.notif_label, label)
            setTextViewText(R.id.notif_title, spec.title)
            setTextViewText(R.id.notif_message, spec.message)
        }

    private fun resolveSoundRes(context: Context, name: String): Int {
        val id = context.resources.getIdentifier(name, "raw", context.packageName)
        return if (id != 0) id else context.resources.getIdentifier(DEFAULT_SOUND, "raw", context.packageName)
    }

    private fun ensureChannel(context: Context, channelId: String, soundUri: Uri, pattern: LongArray) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(channelId) != null) return
        val channel = NotificationChannel(channelId, "Notifikasi PoliLand", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Pembayaran, SPK, survei, dan informasi penting lainnya."
            setSound(
                soundUri,
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            enableVibration(true)
            vibrationPattern = pattern
            enableLights(true)
            setShowBadge(true)
            lockscreenVisibility = Notification.VISIBILITY_PRIVATE
        }
        manager.createNotificationChannel(channel)
    }
}
