package com.egenesio.slate;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Paints the window behind the WebView. On Android System WebView < 140,
 * Capacitor pads the window instead of drawing the page under the status and
 * navigation bars, so those strips show this colour. src/native/platform.ts keeps it
 * in sync with the app's light/dark theme.
 */
@CapacitorPlugin(name = "WindowBackground")
public class WindowBackgroundPlugin extends Plugin {

    @PluginMethod
    public void setColor(PluginCall call) {
        String color = call.getString("color");
        if (color == null) {
            call.reject("color is required");
            return;
        }
        final int parsed;
        try {
            parsed = Color.parseColor(color);
        } catch (IllegalArgumentException e) {
            call.reject("invalid color: " + color);
            return;
        }
        getActivity().runOnUiThread(() -> {
            getActivity().getWindow().setBackgroundDrawable(new ColorDrawable(parsed));
            call.resolve();
        });
    }
}
