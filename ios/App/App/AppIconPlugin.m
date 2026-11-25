#import <Capacitor/Capacitor.h>

// Registers AppIconPlugin (AppIconPlugin.swift) with the Capacitor bridge under the name "AppIcon".
CAP_PLUGIN(AppIconPlugin, "AppIcon",
  CAP_PLUGIN_METHOD(set, CAPPluginReturnPromise);
)
