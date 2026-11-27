package com.poliland.kairagi

import android.Manifest
import android.content.ContentValues
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import androidx.annotation.RequiresApi
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.io.File

/**
 * Menyimpan file langsung ke folder Download publik, tanpa lembar Bagikan.
 * Android 10+ lewat MediaStore (tanpa izin). Android 7-9 menulis langsung dan butuh izin penyimpanan.
 */
@CapacitorPlugin(
    name = "FileSaver",
    permissions = [
        Permission(strings = [Manifest.permission.WRITE_EXTERNAL_STORAGE], alias = "storage"),
    ],
)
class FileSaverPlugin : Plugin() {

    @PluginMethod
    fun saveToDownloads(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "onStoragePermission")
            return
        }
        write(call)
    }

    @PermissionCallback
    fun onStoragePermission(call: PluginCall) {
        if (getPermissionState("storage") != PermissionState.GRANTED) {
            call.reject("Izin penyimpanan ditolak.", "permission_denied")
            return
        }
        write(call)
    }

    private fun write(call: PluginCall) {
        val name = call.getString("filename")?.let { File(it).name }?.trim()
        val data = call.getString("data")
        if (name.isNullOrEmpty() || data == null) {
            call.reject("filename dan data wajib diisi.", "invalid_args")
            return
        }
        val mimeType = call.getString("mimeType")?.takeIf { it.isNotBlank() } ?: "application/octet-stream"
        try {
            val bytes = Base64.decode(data, Base64.DEFAULT)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                writeWithMediaStore(name, mimeType, bytes)
            } else {
                writeToPublicFolder(name, mimeType, bytes)
            }
            call.resolve()
        } catch (e: Exception) {
            call.reject("File tidak dapat disimpan.", "write_failed", e)
        }
    }

    /** MediaStore menomori sendiri bila nama file sudah ada. */
    @RequiresApi(Build.VERSION_CODES.Q)
    private fun writeWithMediaStore(name: String, mimeType: String, bytes: ByteArray) {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, name)
            put(MediaStore.Downloads.MIME_TYPE, mimeType)
            put(MediaStore.Downloads.IS_PENDING, 1)
        }
        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: error("MediaStore menolak file baru")
        try {
            resolver.openOutputStream(uri).use { stream -> requireNotNull(stream).write(bytes) }
            resolver.update(uri, ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }, null, null)
        } catch (e: Exception) {
            resolver.delete(uri, null, null)
            throw e
        }
    }

    private fun writeToPublicFolder(name: String, mimeType: String, bytes: ByteArray) {
        @Suppress("DEPRECATION")
        val folder = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        folder.mkdirs()
        val base = name.substringBeforeLast('.')
        val extension = name.substringAfterLast('.', "").let { if (it.isEmpty()) "" else ".$it" }
        var target = File(folder, name)
        var number = 1
        while (target.exists()) {
            target = File(folder, "$base (${number++})$extension")
        }
        target.writeBytes(bytes)
        // Tanpa pemindaian, file belum muncul di aplikasi Unduhan.
        MediaScannerConnection.scanFile(context, arrayOf(target.absolutePath), arrayOf(mimeType), null)
    }
}
