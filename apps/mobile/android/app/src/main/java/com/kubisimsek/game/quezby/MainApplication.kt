package com.kubisimsek.game.quezby

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.kubisimsek.game.quezby.integrity.QuezbyIntegrityPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // The app's own native modules, which autolinking does not see.
          add(QuezbyIntegrityPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    loadReactNative(this)
  }

  /**
   * Android 8+ shows a notification only on a channel. "social" carries every
   * push the API sends — friend requests, VS invites and results, phrases
   * (PushService, firebase.json) — named in the phone's language; creating it
   * again on each start keeps that name current.
   */
  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel =
      NotificationChannel(
          "social",
          getString(R.string.notification_channel_social),
          NotificationManager.IMPORTANCE_HIGH,
        )
        .apply { description = getString(R.string.notification_channel_social_description) }
    getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
  }
}
