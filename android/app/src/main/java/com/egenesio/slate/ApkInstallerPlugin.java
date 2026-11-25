package com.egenesio.slate;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * Downloads a new Slate APK from its release, checks its SHA-256 against the
 * one GitHub published, and hands it to the system installer. The system asks
 * the user to confirm; Android keeps the install only if the signing key matches.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    private static final int MAX_REDIRECTS = 5;

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject out = new JSObject();
        boolean allowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
        out.put("allowed", allowed);
        call.resolve(out);
    }

    /** Opens this app's "Install unknown apps" page in system settings. */
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("this device has no settings page for installs");
        }
    }

    @PluginMethod
    public void install(PluginCall call) {
        final String url = call.getString("url");
        final String sha256 = call.getString("sha256");
        final String fileName = call.getString("fileName", "slate-update.apk");
        if (url == null || !url.startsWith("https://")) {
            call.reject("a https download url is required");
            return;
        }
        if (sha256 == null || !sha256.matches("[0-9a-fA-F]{64}")) {
            call.reject("a sha256 of the APK is required");
            return;
        }
        if (!fileName.matches("[A-Za-z0-9._-]+\\.apk")) {
            call.reject("invalid file name");
            return;
        }
        new Thread(() -> {
            try {
                File file = download(url, fileName, call);
                String actual = sha256Of(file);
                if (!actual.equalsIgnoreCase(sha256)) {
                    file.delete();
                    call.reject("the download does not match the published checksum");
                    return;
                }
                getActivity().runOnUiThread(() -> {
                    try {
                        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                        Intent intent = new Intent(Intent.ACTION_VIEW);
                        intent.setDataAndType(uri, "application/vnd.android.package-archive");
                        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        getContext().startActivity(intent);
                        JSObject out = new JSObject();
                        out.put("started", true);
                        call.resolve(out);
                    } catch (Exception e) {
                        call.reject("could not open the installer: " + e.getMessage());
                    }
                });
            } catch (Exception e) {
                call.reject("download failed: " + e.getMessage());
            }
        }, "slate-update").start();
    }

    private File download(String start, String fileName, PluginCall call) throws Exception {
        File dir = new File(getContext().getCacheDir(), "updates");
        if (!dir.exists() && !dir.mkdirs()) throw new Exception("cannot create the update folder");
        File[] old = dir.listFiles();
        if (old != null) for (File f : old) f.delete();
        File target = new File(dir, fileName);

        String current = start;
        HttpURLConnection conn = null;
        for (int i = 0; i <= MAX_REDIRECTS; i++) {
            conn = (HttpURLConnection) new URL(current).openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setRequestProperty("Accept", "application/octet-stream");
            int code = conn.getResponseCode();
            if (code >= 300 && code < 400) {
                String next = conn.getHeaderField("Location");
                conn.disconnect();
                if (next == null || !next.startsWith("https://")) throw new Exception("unexpected redirect");
                current = next;
                continue;
            }
            if (code != 200) throw new Exception("HTTP " + code);
            break;
        }
        if (conn == null) throw new Exception("no response");
        long total = conn.getContentLengthLong();
        long received = 0;
        try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(target)) {
            byte[] buffer = new byte[64 * 1024];
            int n;
            long lastReport = 0;
            while ((n = in.read(buffer)) != -1) {
                out.write(buffer, 0, n);
                received += n;
                if (received - lastReport > 256 * 1024) {
                    lastReport = received;
                    JSObject progress = new JSObject();
                    progress.put("received", received);
                    progress.put("total", total);
                    notifyListeners("progress", progress);
                }
            }
        } finally {
            conn.disconnect();
        }
        return target;
    }

    private static String sha256Of(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new java.io.FileInputStream(file)) {
            byte[] buffer = new byte[64 * 1024];
            int n;
            while ((n = in.read(buffer)) != -1) digest.update(buffer, 0, n);
        }
        StringBuilder hex = new StringBuilder();
        for (byte b : digest.digest()) hex.append(String.format("%02x", b));
        return hex.toString();
    }
}
