package com.madematik.draw2d;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Opening and saving through Android's own pickers (Storage Access Framework): the user
 * chooses where a file goes, no storage permission is needed. drAW3D's copy also prints.
 * The web side is src/app/native.ts.
 */
@CapacitorPlugin(name = "DrawFiles")
public class DrawFilesPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        // .drw2 has no MIME type of its own; the contents are checked by the app.
        intent.setType("*/*");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        startActivityForResult(call, intent, "opened");
    }

    @ActivityCallback
    private void opened(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = picked(result);
        if (uri == null) {
            cancelled(call);
            return;
        }
        readDocument(call, uri);
    }

    /** Read a document another app handed over (a .drw2 file tapped in a file manager). */
    @PluginMethod
    public void read(PluginCall call) {
        String uri = call.getString("uri");
        if (uri == null) {
            call.reject("Dosya yeri yok.");
            return;
        }
        readDocument(call, Uri.parse(uri));
    }

    private void readDocument(PluginCall call, Uri uri) {
        try (InputStream input = getContext().getContentResolver().openInputStream(uri)) {
            if (input == null) throw new IllegalStateException("Dosya okunamadı.");
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[16384];
            for (int read; (read = input.read(buffer)) != -1; ) bytes.write(buffer, 0, read);
            JSObject file = new JSObject();
            file.put("uri", uri.toString());
            file.put("name", displayName(uri));
            file.put("text", new String(bytes.toByteArray(), StandardCharsets.UTF_8));
            call.resolve(file);
        } catch (Exception error) {
            call.reject("Dosya okunamadı.", error);
        }
    }

    /**
     * Ask where a new file goes. Only the name and type travel with this call: Android keeps a
     * pending call in the activity's saved state while the picker is open, and a large
     * payload there (a PNG) crashes the app, the saved state being limited to about 1 MB.
     * The contents follow with `write`.
     */
    @PluginMethod
    public void create(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mimeType", "application/octet-stream"));
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("name", "drAW2D"));
        startActivityForResult(call, intent, "created");
    }

    @ActivityCallback
    private void created(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = picked(result);
        if (uri == null) {
            cancelled(call);
            return;
        }
        JSObject place = new JSObject();
        place.put("uri", uri.toString());
        place.put("name", displayName(uri));
        call.resolve(place);
    }

    /** Write the contents into a document the user picked (or opened) before. */
    @PluginMethod
    public void write(PluginCall call) {
        String uri = call.getString("uri");
        if (uri == null) {
            call.reject("Dosya yeri yok.");
            return;
        }
        try {
            Uri target = Uri.parse(uri);
            String data = call.getString("data", "");
            byte[] bytes = Boolean.TRUE.equals(call.getBoolean("base64", false))
                ? Base64.decode(data, Base64.DEFAULT)
                : data.getBytes(StandardCharsets.UTF_8);
            // "wt" truncates: a shorter document must not keep the old file's tail.
            try (OutputStream output = getContext().getContentResolver().openOutputStream(target, "wt")) {
                if (output == null) throw new IllegalStateException("Dosya yazılamadı.");
                output.write(bytes);
            }
            JSObject saved = new JSObject();
            saved.put("uri", uri);
            saved.put("name", displayName(target));
            call.resolve(saved);
        } catch (Exception error) {
            call.reject("Dosya kaydedilemedi.", error);
        }
    }

    private static Uri picked(ActivityResult result) {
        Intent data = result.getData();
        return result.getResultCode() == Activity.RESULT_OK && data != null ? data.getData() : null;
    }

    private static void cancelled(PluginCall call) {
        JSObject none = new JSObject();
        none.put("cancelled", true);
        call.resolve(none);
    }

    private String displayName(Uri uri) {
        try (Cursor cursor = getContext().getContentResolver().query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) return cursor.getString(0);
        } catch (Exception ignored) {
            // Some providers do not report a name.
        }
        String last = uri.getLastPathSegment();
        return last != null ? last : "drAW2D";
    }
}
