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

public class MyBuddyAgendaWidget extends AppWidgetProvider {

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
        String dateStr = snapshot != null ? snapshot.optString("dateStr", "") : "";
        JSONObject agenda = snapshot != null ? snapshot.optJSONObject("agendaSummary") : null;
        JSONArray eventsArr = agenda != null ? agenda.optJSONArray("events") : null;

        List<String> lines = new ArrayList<>();
        if (eventsArr != null) {
            int maxE = Math.min(eventsArr.length(), 4);
            for (int i = 0; i < maxE; i++) {
                JSONObject ev = eventsArr.optJSONObject(i);
                if (ev != null) {
                    String time = ev.optString("time", "");
                    String title = ev.optString("title", "");
                    if (!time.isEmpty() && !"Todo el día".equals(time)) {
                        lines.add("🕒 " + time + "  " + title);
                    } else {
                        lines.add("📌 " + title);
                    }
                }
            }
        }

        String bodyText;
        if (snapshot == null) {
            bodyText = "Abre MyBuddy para sincronizar agenda";
        } else if (lines.isEmpty()) {
            bodyText = "Sin eventos programados para hoy";
        } else {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < lines.size(); i++) {
                if (i > 0) sb.append("\n");
                sb.append(lines.get(i));
            }
            bodyText = sb.toString();
        }

        for (int widgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_agenda);
            views.setTextViewText(R.id.agenda_date_label, dateStr);
            views.setTextViewText(R.id.agenda_events_text, bodyText);

            PendingIntent openAgenda = WidgetDataHelper.openRoutePendingIntent(context, "/", 102);
            views.setOnClickPendingIntent(R.id.widget_root, openAgenda);
            views.setOnClickPendingIntent(R.id.agenda_events_text, openAgenda);
            appWidgetManager.updateAppWidget(widgetId, views);
        }
    }
}