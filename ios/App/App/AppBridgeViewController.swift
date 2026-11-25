import UIKit
import Capacitor

/// The app's root view controller (set in Main.storyboard). Registers the local
/// plugins that are written in Swift in this target.
@objc(AppBridgeViewController)
class AppBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppIconPlugin())
    }
}
