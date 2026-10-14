package com.martin.mybuddy;

import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onPause() {
        super.onPause();
        // Le avisa a los widgets que se actualicen apenas minimizas o sales de la app
        Intent intent = new Intent("com.martin.mybuddy.ACTION_REFRESH_WIDGETS");
        intent.setPackage(getPackageName());
        sendBroadcast(intent);
    }
}