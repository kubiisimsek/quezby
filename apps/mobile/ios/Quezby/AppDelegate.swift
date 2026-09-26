import GoogleSignIn
import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    window?.backgroundColor = ReactNativeDelegate.arena

    factory.startReactNative(
      withModuleName: "Quezby",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  /// Google sign-in comes back through the app's URL scheme; anything else is a deep link.
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if GIDSignIn.sharedInstance.handle(url) {
      return true
    }
    return RCTLinkingManager.application(app, open: url, options: options)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  /// The arena's canvas (`canvas` in design/palette.mjs, as LaunchScreen.storyboard paints it):
  /// behind the first frame and behind a reload — choosing Arabic, or leaving it, flips the
  /// reading direction and reloads the app, which must not flash white.
  static let arena = UIColor(red: 0.1411764706, green: 0.0196078431, blue: 0.3294117647, alpha: 1)

  override func customize(_ rootView: RCTRootView) {
    super.customize(rootView)
    rootView.backgroundColor = ReactNativeDelegate.arena
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
