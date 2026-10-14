package com.martin.mybuddy

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject

private const val PREFS_NAME = "CapacitorStorage"
private const val SNAPSHOT_KEY = "mybuddy_widget_snapshot"
private const val ACTION_REFRESH_WIDGETS = "com.martin.mybuddy.ACTION_REFRESH_WIDGETS"

internal object WidgetDataHelper {
    fun getSnapshot(context: Context): JSONObject? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val raw = prefs.getString(SNAPSHOT_KEY, null) ?: return null
            JSONObject(raw)
        } catch (e: Exception) {
            null
        }
    }

    fun openAppPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    fun refreshPendingIntent(context: Context, providerClass: Class<*>): PendingIntent {
        val intent = Intent(context, providerClass).apply {
            action = ACTION_REFRESH_WIDGETS
        }
        return PendingIntent.getBroadcast(
            context,
            providerClass.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    fun updateAllWidgets(context: Context) {
        val manager = AppWidgetManager.getInstance(context)

        val dayIds = manager.getAppWidgetIds(ComponentName(context, MyBuddyDayWidget::class.java))
        if (dayIds.isNotEmpty()) MyBuddyDayWidget().onUpdate(context, manager, dayIds)

        val agendaIds = manager.getAppWidgetIds(ComponentName(context, MyBuddyAgendaWidget::class.java))
        if (agendaIds.isNotEmpty()) MyBuddyAgendaWidget().onUpdate(context, manager, agendaIds)

        val gymIds = manager.getAppWidgetIds(ComponentName(context, MyBuddyGymWidget::class.java))
        if (gymIds.isNotEmpty()) MyBuddyGymWidget().onUpdate(context, manager, gymIds)
    }
}

/**
 * WIDGET 1: MI DÍA (Rutinas + Tareas de Hoy)
 */
class MyBuddyDayWidget : AppWidgetProvider() {
    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH_WIDGETS) {
            WidgetDataHelper.updateAllWidgets(context)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val snapshot = WidgetDataHelper.getSnapshot(context)
        val daySummary = snapshot?.optJSONObject("daySummary")

        val done = daySummary?.optInt("habitsDone", 0) ?: 0
        val total = daySummary?.optInt("habitsTotal", 0) ?: 0
        val pct = daySummary?.optInt("habitsProgressPct", 0) ?: 0

        val lines = mutableListOf<String>()

        // 1. Rutinas de hoy
        val habitsArr = daySummary?.optJSONArray("habits")
        if (habitsArr != null && habitsArr.length() > 0) {
            for (i in 0 until minOf(habitsArr.length(), 4)) {
                val h = habitsArr.getJSONObject(i)
                val check = if (h.optBoolean("done")) "☑" else "☐"
                lines.add("$check ${h.optString("name")}")
            }
        }

        // 2. Tareas pendientes de hoy
        val tasksArr = daySummary?.optJSONArray("pendingTasks")
        if (tasksArr != null && tasksArr.length() > 0) {
            for (i in 0 until minOf(tasksArr.length(), 3)) {
                val t = tasksArr.getJSONObject(i)
                lines.add("• ${t.optString("title")}")
            }
        }

        val bodyText = if (lines.isEmpty()) {
            "✨ Todo listo por hoy (toca para abrir)"
        } else {
            lines.joinToString("\n")
        }

        for (widgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_day)
            views.setTextViewText(R.id.day_progress_badge, "$done/$total ($pct%)")
            views.setProgressBar(R.id.day_progress_bar, 100, pct, false)
            views.setTextViewText(R.id.day_items_text, bodyText)

            views.setOnClickPendingIntent(R.id.widget_root, WidgetDataHelper.openAppPendingIntent(context))
            views.setOnClickPendingIntent(
                R.id.widget_refresh_btn,
                WidgetDataHelper.refreshPendingIntent(context, MyBuddyDayWidget::class.java)
            )
            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}

/**
 * WIDGET 2: AGENDA DE HOY (Google Calendar)
 */
class MyBuddyAgendaWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val snapshot = WidgetDataHelper.getSnapshot(context)
        val dateStr = snapshot?.optString("dateStr", "") ?: ""
        val eventsArr = snapshot?.optJSONObject("agendaSummary")?.optJSONArray("events")

        val lines = mutableListOf<String>()
        if (eventsArr != null && eventsArr.length() > 0) {
            for (i in 0 until minOf(eventsArr.length(), 4)) {
                val ev = eventsArr.getJSONObject(i)
                val time = ev.optString("time", "")
                val title = ev.optString("title", "")
                if (time.isNotEmpty() && time != "Todo el día") {
                    lines.add("🕒 $time  $title")
                } else {
                    lines.add("📌 $title")
                }
            }
        }

        val bodyText = if (lines.isEmpty()) "No tienes eventos programados hoy." else lines.joinToString("\n")

        for (widgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_agenda)
            views.setTextViewText(R.id.agenda_date_label, dateStr)
            views.setTextViewText(R.id.agenda_events_text, bodyText)
            views.setOnClickPendingIntent(R.id.widget_root, WidgetDataHelper.openAppPendingIntent(context))
            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}

/**
 * WIDGET 3: GYM & RACHA
 */
class MyBuddyGymWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val snapshot = WidgetDataHelper.getSnapshot(context)
        val gym = snapshot?.optJSONObject("gymSummary")

        val count = gym?.optInt("workoutsThisMonth", 0) ?: 0
        val activeTitle = gym?.optString("activeWorkoutTitle", "") ?: ""
        val lastRoutine = gym?.optString("lastRoutineName", "Tu Gimnasio") ?: "Tu Gimnasio"

        val statusText = if (activeTitle.isNotEmpty() && activeTitle != "null") {
            "⚡ En curso: $activeTitle"
        } else {
            "Próxima sesión: $lastRoutine"
        }

        val btnText = if (activeTitle.isNotEmpty() && activeTitle != "null") {
            "▶ CONTINUAR ENTRENO"
        } else {
            "▶ ENTRENAR AHORA"
        }

        for (widgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_gym)
            views.setTextViewText(R.id.gym_month_count, "🔥 $count este mes")
            views.setTextViewText(R.id.gym_status_text, statusText)
            views.setTextViewText(R.id.gym_action_btn, btnText)
            views.setOnClickPendingIntent(R.id.widget_root, WidgetDataHelper.openAppPendingIntent(context))
            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}