package com.classtrack.app;

import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Exposes the MediaStore-based Download folder writer to JavaScript as the
 * "MediaSave" plugin.
 */
@CapacitorPlugin(name = "MediaSave")
public class MediaSavePlugin extends Plugin {

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String data = call.getString("data");

        if (fileName == null || data == null) {
            call.reject("fileName and data are required");
            return;
        }

        try {
            byte[] bytes = Base64.decode(data, Base64.NO_WRAP);
            String uri = MediaSave.saveToDownloads(getContext(), fileName, mimeType, bytes);
            JSObject ret = new JSObject();
            ret.put("uri", uri);
            call.resolve(ret);
        } catch (Exception ex) {
            call.reject(ex.getMessage(), ex);
        }
    }
}