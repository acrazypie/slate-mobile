import Foundation
import Capacitor
import UIKit

/// Switches the home-screen icon (Settings › Appearance). Teal is the primary
/// icon (AppIcon); the others are alternate icons declared in Info.plist.
/// iOS shows its own confirmation alert when the icon changes.
@objc(AppIconPlugin)
public class AppIconPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppIconPlugin"
    public let jsName = "AppIcon"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)]


    /// Colour key -> alternate icon name. nil = the primary icon.
    private func iconName(for key: String) -> String?? {
        switch key {
        case "teal": return .some(nil)
        case "lime": return "AppIcon-Lime"
        case "violet": return "AppIcon-Violet"
        case "apricot": return "AppIcon-Apricot"
        case "mono": return "AppIcon-Mono"
        default: return nil
        }
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("icon") else {
            call.reject("icon is required")
            return
        }
        guard let name = iconName(for: key) else {
            call.reject("unknown icon: \(key)")
            return
        }
        guard UIApplication.shared.supportsAlternateIcons else {
            call.reject("alternate icons are not supported on this device")
            return
        }
        DispatchQueue.main.async {
            UIApplication.shared.setAlternateIconName(name) { error in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve()
                }
            }
        }
    }
}
