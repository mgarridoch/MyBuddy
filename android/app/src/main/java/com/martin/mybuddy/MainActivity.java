package com.martin.mybuddy;

import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onPause() {
        super.onPause();
        // Actualiza los 3 widgets directamente sin depender de broadcasts bloqueados
        WidgetDataHelper.INSTANCE.updateAllWidgets(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        WidgetDataHelper.INSTANCE.updateAllWidgets(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }
}