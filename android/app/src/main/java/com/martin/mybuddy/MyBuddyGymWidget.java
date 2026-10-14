package com.martin.mybuddy;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import org.json.JSONObject;

public class MyBuddyGymWidget extends AppWidgetProvider {

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
        JSONObject gym = snapshot != null ? snapshot.optJSONObject("gymSummary") : null;

        int count = gym != null ? gym.optInt("workoutsThisMonth", 0) : 0;
        String activeTitle = gym != null ? gym.optString("activeWorkoutTitle", "") : "";
        String lastRoutine = gym != null ? gym.optString("lastRoutineName", "Tu Gimnasio") : "Tu Gimnasio";

        boolean isTrainingNow = !activeTitle.isEmpty() && !"null".equals(activeTitle);

        String statusText = isTrainingNow
            ? "⚡ En curso: " + activeTitle
            : "Próxima: " + lastRoutine;

        String btnText = isTrainingNow
            ? "▶ CONTINUAR ENTRENO"
            : "▶ IR AL GIMNASIO";

        String targetPath = isTrainingNow ? "/workout-session" : "/sports";
        PendingIntent openGymIntent = WidgetDataHelper.openRoutePendingIntent(context, targetPath, 103);

        for (int widgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_gym);
            views.setTextViewText(R.id.gym_month_count, "🔥 " + count + " este mes");
            views.setTextViewText(R.id.gym_status_text, statusText);
            views.setTextViewText(R.id.gym_action_btn, btnText);

            views.setOnClickPendingIntent(R.id.widget_root, openGymIntent);
            views.setOnClickPendingIntent(R.id.gym_action_btn, openGymIntent);
            views.setOnClickPendingIntent(R.id.gym_status_text, openGymIntent);
            appWidgetManager.updateAppWidget(widgetId, views);
        }
    }
}