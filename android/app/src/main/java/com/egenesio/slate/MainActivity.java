package com.egenesio.slate;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // local plugins must be registered before super.onCreate
        registerPlugin(WindowBackgroundPlugin.class);
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(AppIconPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
