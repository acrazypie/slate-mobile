package com.egenesio.slate;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

// The Google sign-in plugin asks for the calendar scopes with a system
// consent screen, which it can only show through this activity. It needs
// this interface and the onActivityResult forward (see README, Google sync).
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // local plugins must be registered before super.onCreate
        registerPlugin(WindowBackgroundPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // marker only
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN) {
            PluginHandle handle = getBridge() != null ? getBridge().getPlugin("SocialLogin") : null;
            if (handle != null && handle.getInstance() instanceof SocialLoginPlugin) {
                ((SocialLoginPlugin) handle.getInstance()).handleGoogleLoginIntent(requestCode, data);
            }
        }
    }
}
