package com.martin.mybuddy;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public class MyBuddyDayWidget extends AppWidgetProvider {

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (WidgetDataHelper.ACTION_REFRESH_WIDGETS.equals(intent.getAction())) {
            WidgetDataHelper.updateAllWidgets(context);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        JSONObject snapshot = WidgetDataHelper.getSnapshot(context);
        JSONObject daySummary = snapshot != null ? snapshot.optJSONObject("daySummary") : null;

        int done = daySummary != null ? daySummary.optInt("habitsDone", 0) : 0;
        int total = daySummary != null ? daySummary.optInt("habitsTotal", 0) : 0;
        int pct = daySummary != null ? daySummary.optInt("habitsProgressPct", 0) : 0;

        List<String> lines = new ArrayList<>();

        if (daySummary != null) {
            JSONArray habitsArr = daySummary.optJSONArray("habits");
            if (habitsArr != null) {
                int maxH = Math.min(habitsArr.length(), 4);
                for (int i = 0; i < maxH; i++) {
                    JSONObject h = habitsArr.optJSONObject(i);
                    if (h != null) {
                        String check = h.optBoolean("done") ? "☑" : "☐";
                        lines.add(check + " " + h.optString("name", ""));
                    }
                }
            }

            JSONArray tasksArr = daySummary.optJSONArray("pendingTasks");
            if (tasksArr != null) {
                int maxT = Math.min(tasksArr.length(), 3);
                for (int i = 0; i < maxT; i++) {
                    JSONObject t = tasksArr.optJSONObject(i);
                    if (t != null) {
                        lines.add("• " + t.optString("title", ""));
                    }
                }
            }
        }

        String bodyText;
        if (snapshot == null) {
            bodyText = "Abre MyBuddy para sincronizar tu día...";
        } else if (lines.isEmpty()) {
            bodyText = "✨ Todo al día por hoy";
        } else {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < lines.size(); i++) {
                if (i > 0) sb.append("\n");
                sb.append(lines.get(i));
            }
            bodyText = sb.toString();
        }

        for (int widgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_day);
            views.setTextViewText(R.id.day_progress_badge, done + "/" + total + " (" + pct + "%)");
            views.setProgressBar(R.id.day_progress_bar, 100, pct, false);
            views.setTextViewText(R.id.day_items_text, bodyText);

            PendingIntent openHome = WidgetDataHelper.openRoutePendingIntent(context, "/", 101);
            views.setOnClickPendingIntent(R.id.widget_root, openHome);
            views.setOnClickPendingIntent(R.id.day_items_text, openHome);
            views.setOnClickPendingIntent(
                R.id.widget_refresh_btn,
                WidgetDataHelper.refreshPendingIntent(context, MyBuddyDayWidget.class, 901)
            );
            appWidgetManager.updateAppWidget(widgetId, views);
        }
    }
}