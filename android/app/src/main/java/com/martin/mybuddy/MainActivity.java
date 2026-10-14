package com.martin.mybuddy;

import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onPause() {
        super.onPause();
        WidgetDataHelper.updateAllWidgets(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        WidgetDataHelper.updateAllWidgets(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }
}