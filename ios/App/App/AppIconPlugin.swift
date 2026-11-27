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
        case "teal-oled": return "AppIcon-OLED"
        case "lime": return "AppIcon-Lime"
        case "lime-oled": return "AppIcon-Lime-OLED"
        case "violet": return "AppIcon-Violet"
        case "violet-oled": return "AppIcon-Violet-OLED"
        case "apricot": return "AppIcon-Apricot"
        case "apricot-oled": return "AppIcon-Apricot-OLED"
        case "amber": return "AppIcon-Amber"
        case "amber-oled": return "AppIcon-Amber-OLED"
        case "sage": return "AppIcon-Sage"
        case "sage-oled": return "AppIcon-Sage-OLED"
        case "pink": return "AppIcon-Pink"
        case "pink-oled": return "AppIcon-Pink-OLED"
        case "coral": return "AppIcon-Coral"
        case "coral-oled": return "AppIcon-Coral-OLED"
        case "periwinkle": return "AppIcon-Periwinkle"
        case "periwinkle-oled": return "AppIcon-Periwinkle-OLED"
        case "chalk": return "AppIcon-Chalk"
        case "chalk-oled": return "AppIcon-Chalk-OLED"
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
