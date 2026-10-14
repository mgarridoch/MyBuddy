package com.martin.mybuddy;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import org.json.JSONObject;
import java.util.Map;

public class WidgetDataHelper {
    private static final String PREFS_NAME = "CapacitorStorage";
    private static final String SNAPSHOT_KEY = "mybuddy_widget_snapshot";
    public static final String ACTION_REFRESH_WIDGETS = "com.martin.mybuddy.ACTION_REFRESH_WIDGETS";

    public static JSONObject getSnapshot(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(SNAPSHOT_KEY, null);
            if (raw != null) {
                return new JSONObject(raw);
            }
            for (Map.Entry<String, ?> entry : prefs.getAll().entrySet()) {
                Object val = entry.getValue();
                if (val instanceof String && ((String) val).contains("daySummary")) {
                    return new JSONObject((String) val);
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    public static PendingIntent openRoutePendingIntent(Context context, String path, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("mybuddy://auth-callback?path=" + path));
        intent.setClass(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    public static PendingIntent refreshPendingIntent(Context context, Class<?> providerClass, int requestCode) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_REFRESH_WIDGETS);
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);

        int[] dayIds = manager.getAppWidgetIds(new ComponentName(context, MyBuddyDayWidget.class));
        if (dayIds != null && dayIds.length > 0) {
            new MyBuddyDayWidget().onUpdate(context, manager, dayIds);
        }

        int[] agendaIds = manager.getAppWidgetIds(new ComponentName(context, MyBuddyAgendaWidget.class));
        if (agendaIds != null && agendaIds.length > 0) {
            new MyBuddyAgendaWidget().onUpdate(context, manager, agendaIds);
        }

        int[] gymIds = manager.getAppWidgetIds(new ComponentName(context, MyBuddyGymWidget.class));
        if (gymIds != null && gymIds.length > 0) {
            new MyBuddyGymWidget().onUpdate(context, manager, gymIds);
        }
    }
}