package com.kubisimsek.game.quezby.integrity

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailabilityLight
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.StandardIntegrityException
import com.google.android.play.core.integrity.StandardIntegrityManager.PrepareIntegrityTokenRequest
import com.google.android.play.core.integrity.StandardIntegrityManager.StandardIntegrityTokenProvider
import com.google.android.play.core.integrity.StandardIntegrityManager.StandardIntegrityTokenRequest
import com.google.android.play.core.integrity.model.StandardIntegrityErrorCode

/**
 * Google Play Integrity (standard requests) for the device check —
 * `src/lib/integrity.ts` is its only caller. The token provider is prepared
 * once for the app's Google Cloud project and kept until Play says it went
 * stale: `prepare` is cheap to call again, it only works when there is no
 * provider. Each token is bound to the hash of one API challenge. Every
 * failure rejects with a code the JS side knows: Play's
 * `StandardIntegrityErrorCode`, in words.
 *
 * A legacy module on purpose: React Native runs it through the interop layer,
 * like the other legacy modules in this app.
 */
class QuezbyIntegrityModule(context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

  @Volatile private var provider: StandardIntegrityTokenProvider? = null
  @Volatile private var preparedFor: Long = 0L

  override fun getName(): String = NAME

  /** Google Play services are on this phone, and current enough to ask. */
  @ReactMethod
  fun isAvailable(promise: Promise) {
    val status =
        try {
          GoogleApiAvailabilityLight.getInstance()
              .isGooglePlayServicesAvailable(reactApplicationContext)
        } catch (error: Exception) {
          ConnectionResult.SERVICE_MISSING
        }
    promise.resolve(status == ConnectionResult.SUCCESS)
  }

  @ReactMethod
  fun prepare(cloudProjectNumber: String, promise: Promise) {
    val number = cloudProjectNumber.trim().toLongOrNull()
    if (number == null || number <= 0L) {
      promise.reject("cloud_project_invalid", "The Google Cloud project number is not a number.")
      return
    }
    if (provider != null && preparedFor == number) {
      promise.resolve(null)
      return
    }
    try {
      val request = PrepareIntegrityTokenRequest.builder().setCloudProjectNumber(number).build()
      IntegrityManagerFactory.createStandard(reactApplicationContext)
          .prepareIntegrityToken(request)
          .addOnSuccessListener { prepared ->
            provider = prepared
            preparedFor = number
            promise.resolve(null)
          }
          .addOnFailureListener { error -> reject(promise, error) }
    } catch (error: Exception) {
      reject(promise, error)
    }
  }

  /** A token for `requestHash`, the lower-case hex SHA-256 of the API's challenge. */
  @ReactMethod
  fun request(requestHash: String, promise: Promise) {
    val current = provider
    if (current == null) {
      promise.reject("not_prepared", "The integrity token provider is not prepared.")
      return
    }
    try {
      val request = StandardIntegrityTokenRequest.builder().setRequestHash(requestHash).build()
      current
          .request(request)
          .addOnSuccessListener { token -> promise.resolve(token.token()) }
          .addOnFailureListener { error ->
            if (codeOf(error) == PROVIDER_INVALID && provider === current) provider = null
            reject(promise, error)
          }
    } catch (error: Exception) {
      reject(promise, error)
    }
  }

  private fun reject(promise: Promise, error: Exception) {
    promise.reject(codeOf(error), error.message ?: "Play Integrity failed.", error)
  }

  companion object {
    const val NAME = "QuezbyIntegrity"
    private const val PROVIDER_INVALID = "provider_invalid"

    /** Play's error code, as the JS side names it. */
    fun codeOf(error: Exception): String {
      if (error !is StandardIntegrityException) return "unknown"
      return when (error.errorCode) {
        StandardIntegrityErrorCode.API_NOT_AVAILABLE -> "api_not_available"
        StandardIntegrityErrorCode.PLAY_STORE_NOT_FOUND -> "play_store_not_found"
        StandardIntegrityErrorCode.NETWORK_ERROR -> "network_error"
        StandardIntegrityErrorCode.APP_NOT_INSTALLED -> "app_not_installed"
        StandardIntegrityErrorCode.PLAY_SERVICES_NOT_FOUND -> "play_services_not_found"
        StandardIntegrityErrorCode.APP_UID_MISMATCH -> "app_uid_mismatch"
        StandardIntegrityErrorCode.TOO_MANY_REQUESTS -> "too_many_requests"
        StandardIntegrityErrorCode.CANNOT_BIND_TO_SERVICE -> "cannot_bind_to_service"
        StandardIntegrityErrorCode.GOOGLE_SERVER_UNAVAILABLE -> "google_server_unavailable"
        StandardIntegrityErrorCode.PLAY_STORE_VERSION_OUTDATED -> "play_store_outdated"
        StandardIntegrityErrorCode.PLAY_SERVICES_VERSION_OUTDATED -> "play_services_outdated"
        StandardIntegrityErrorCode.CLOUD_PROJECT_NUMBER_IS_INVALID -> "cloud_project_invalid"
        StandardIntegrityErrorCode.REQUEST_HASH_TOO_LONG -> "request_hash_too_long"
        StandardIntegrityErrorCode.CLIENT_TRANSIENT_ERROR -> "client_transient_error"
        StandardIntegrityErrorCode.INTEGRITY_TOKEN_PROVIDER_INVALID -> PROVIDER_INVALID
        StandardIntegrityErrorCode.INTERNAL_ERROR -> "internal_error"
        else -> "unknown"
      }
    }
  }
}
