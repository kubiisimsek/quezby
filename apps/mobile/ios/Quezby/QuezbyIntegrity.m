#import <CommonCrypto/CommonDigest.h>
#import <React/RCTBridgeModule.h>

@import DeviceCheck;

/**
 * App Attest for the device check — `src/lib/integrity.ts` is its only
 * caller. Apple signs a client data hash, so the SHA-256 of the API's
 * challenge (its UTF-8 bytes) is taken here; key ids, attestations and
 * assertions cross to JS as base64. Every failure rejects with a code the JS
 * side knows: Apple's `DCError`, in words.
 *
 * A legacy module on purpose: React Native runs it through the interop layer,
 * like the other legacy modules in this app. App Attest needs iOS 14; the
 * deployment target is above it.
 */
@interface QuezbyIntegrity : NSObject <RCTBridgeModule>
@end

@implementation QuezbyIntegrity

RCT_EXPORT_MODULE(QuezbyIntegrity)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

static NSData *QZClientDataHash(NSString *challenge)
{
  NSData *bytes = [challenge dataUsingEncoding:NSUTF8StringEncoding] ?: [NSData data];
  unsigned char digest[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(bytes.bytes, (CC_LONG)bytes.length, digest);
  return [NSData dataWithBytes:digest length:CC_SHA256_DIGEST_LENGTH];
}

static NSString *QZCodeFor(NSError *_Nullable error)
{
  if (error == nil || ![error.domain isEqualToString:DCErrorDomain]) {
    return @"unknown";
  }
  switch ((DCError)error.code) {
    case DCErrorFeatureUnsupported:
      return @"unsupported";
    case DCErrorInvalidKey:
      return @"invalid_key";
    case DCErrorInvalidInput:
      return @"invalid_input";
    case DCErrorServerUnavailable:
      return @"server_unavailable";
    default:
      return @"unknown";
  }
}

static void QZReject(RCTPromiseRejectBlock reject, NSError *_Nullable error)
{
  reject(QZCodeFor(error), error.localizedDescription ?: @"App Attest failed.", error);
}

/** The shared service when this device can attest; nil (and rejected) when it cannot. */
static DCAppAttestService *_Nullable QZService(RCTPromiseRejectBlock reject)
{
  DCAppAttestService *service = [DCAppAttestService sharedService];
  if (![service isSupported]) {
    reject(@"unsupported", @"App Attest is not available on this device.", nil);
    return nil;
  }
  return service;
}

RCT_EXPORT_METHOD(isSupported : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)
{
  resolve(@([[DCAppAttestService sharedService] isSupported]));
}

RCT_EXPORT_METHOD(generateKey : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)
{
  DCAppAttestService *service = QZService(reject);
  if (service == nil) {
    return;
  }
  [service generateKeyWithCompletionHandler:^(NSString *_Nullable keyId, NSError *_Nullable error) {
    if (keyId == nil || error != nil) {
      QZReject(reject, error);
      return;
    }
    resolve(keyId);
  }];
}

RCT_EXPORT_METHOD(attestKey
                  : (NSString *)keyId challenge
                  : (NSString *)challenge resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
{
  DCAppAttestService *service = QZService(reject);
  if (service == nil) {
    return;
  }
  [service attestKey:keyId
         clientDataHash:QZClientDataHash(challenge)
      completionHandler:^(NSData *_Nullable attestation, NSError *_Nullable error) {
        if (attestation == nil || error != nil) {
          QZReject(reject, error);
          return;
        }
        resolve([attestation base64EncodedStringWithOptions:0]);
      }];
}

RCT_EXPORT_METHOD(generateAssertion
                  : (NSString *)keyId challenge
                  : (NSString *)challenge resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
{
  DCAppAttestService *service = QZService(reject);
  if (service == nil) {
    return;
  }
  [service generateAssertion:keyId
              clientDataHash:QZClientDataHash(challenge)
           completionHandler:^(NSData *_Nullable assertion, NSError *_Nullable error) {
             if (assertion == nil || error != nil) {
               QZReject(reject, error);
               return;
             }
             resolve([assertion base64EncodedStringWithOptions:0]);
           }];
}

@end
