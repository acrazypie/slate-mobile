package com.egenesio.slate;

import android.content.ComponentName;
import android.content.pm.PackageManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Switches the home-screen icon. Each colour is an activity-alias in the
 * manifest; exactly one carries the LAUNCHER filter. Enable the chosen alias
 * first, then disable the others, so there is never zero launcher entries.
 * DONT_KILL_APP keeps the app itself running.
 *
 * Side effect (shown to the user in Settings): some launchers move the icon or
 * drop pinned shortcuts to Slate when the entry changes.
 */
@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {

    /** Colour key -> alias class suffix. Teal is the default (enabled in the manifest). */
    private static final String[] KEYS = {"teal", "teal-oled", "lime", "lime-oled", "violet", "violet-oled", "apricot", "apricot-oled", "amber", "amber-oled", "sage", "sage-oled", "pink", "pink-oled", "coral", "coral-oled", "periwinkle", "periwinkle-oled", "chalk", "chalk-oled"};
    private static final String[] ALIASES = {"LauncherTeal", "LauncherTealOled", "LauncherLime", "LauncherLimeOled", "LauncherViolet", "LauncherVioletOled", "LauncherApricot", "LauncherApricotOled", "LauncherAmber", "LauncherAmberOled", "LauncherSage", "LauncherSageOled", "LauncherPink", "LauncherPinkOled", "LauncherCoral", "LauncherCoralOled", "LauncherPeriwinkle", "LauncherPeriwinkleOled", "LauncherChalk", "LauncherChalkOled"};

    @PluginMethod
    public void set(PluginCall call) {
        String icon = call.getString("icon");
        int chosen = -1;
        for (int i = 0; i < KEYS.length; i++) {
            if (KEYS[i].equals(icon)) chosen = i;
        }
        if (chosen < 0) {
            call.reject("unknown icon: " + icon);
            return;
        }
        try {
            PackageManager pm = getContext().getPackageManager();
            String pkg = getContext().getPackageName();
            pm.setComponentEnabledSetting(
                new ComponentName(pkg, pkg + "." + ALIASES[chosen]),
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP);
            for (int i = 0; i < ALIASES.length; i++) {
                if (i == chosen) continue;
                pm.setComponentEnabledSetting(
                    new ComponentName(pkg, pkg + "." + ALIASES[i]),
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("could not change the icon: " + e.getMessage());
        }
    }
}
