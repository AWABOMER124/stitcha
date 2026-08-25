import Flutter
import GoogleMaps
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let mapsAPIKey = Bundle.main.object(forInfoDictionaryKey: "GMSApiKey") as? String
    if let mapsAPIKey, !mapsAPIKey.isEmpty, !mapsAPIKey.contains("$(") {
      GMSServices.provideAPIKey(mapsAPIKey)
    } else {
      #if DEBUG
      NSLog("MAPS_API_KEY is not configured; Google Maps will be unavailable.")
      #else
      fatalError("MAPS_API_KEY is required for release builds.")
      #endif
    }
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }
}
