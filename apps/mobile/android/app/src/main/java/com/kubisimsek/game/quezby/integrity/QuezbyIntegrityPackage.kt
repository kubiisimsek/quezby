package com.kubisimsek.game.quezby.integrity

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/** Registers `QuezbyIntegrity` (see `MainApplication`). */
class QuezbyIntegrityPackage : ReactPackage {

  @Suppress("OVERRIDE_DEPRECATION")
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
      listOf(QuezbyIntegrityModule(reactContext))

  override fun createViewManagers(
      reactContext: ReactApplicationContext
  ): List<ViewManager<in Nothing, in Nothing>> = emptyList()
}
