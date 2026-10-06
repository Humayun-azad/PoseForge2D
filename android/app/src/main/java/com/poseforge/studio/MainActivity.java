package com.poseforge.studio;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER = 1001;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setBuiltInZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) s.setSafeBrowsingEnabled(true);
        WebView.setWebContentsDebuggingEnabled(true);
        webView.addJavascriptInterface(new NativeBridge(), "NativeBridge");
        webView.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("file:///android_asset/")) return false;
                if (url.startsWith("https://")) { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); return true; }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = params.createIntent();
                try { startActivityForResult(intent, FILE_CHOOSER); return true; }
                catch (Exception e) { fileCallback = null; Toast.makeText(MainActivity.this, "File picker unavailable", Toast.LENGTH_SHORT).show(); return false; }
            }
        });
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER && fileCallback != null) {
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount(); results = new Uri[n];
                    for(int i=0;i<n;i++) results[i]=data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) results = new Uri[]{data.getData()};
            }
            fileCallback.onReceiveValue(results); fileCallback = null;
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    public class NativeBridge {
        @JavascriptInterface public void saveBase64File(String filename, String mime, String base64) {
            runOnUiThread(() -> {
                try {
                    byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ContentValues values = new ContentValues();
                        values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                        values.put(MediaStore.Downloads.MIME_TYPE, mime);
                        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/PoseForge2D");
                        Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                        if (uri == null) throw new Exception("Could not create output file");
                        try (OutputStream out = getContentResolver().openOutputStream(uri)) { if (out == null) throw new Exception("Output unavailable"); out.write(bytes); }
                        Toast.makeText(MainActivity.this, "Saved to Downloads/PoseForge2D", Toast.LENGTH_LONG).show();
                    } else {
                        File dir = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "PoseForge2D");
                        if (!dir.exists()) dir.mkdirs();
                        File file = new File(dir, filename);
                        try (FileOutputStream out = new FileOutputStream(file)) { out.write(bytes); }
                        Toast.makeText(MainActivity.this, "Saved: " + file.getAbsolutePath(), Toast.LENGTH_LONG).show();
                    }
                } catch (Exception e) { Toast.makeText(MainActivity.this, "Save failed: " + e.getMessage(), Toast.LENGTH_LONG).show(); }
            });
        }
    }
}
