import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { format, getDay, startOfDay, isBefore } from 'date-fns';
import type { Habit, Task } from '../types';

export const WIDGET_DATA_KEY = 'mybuddy_widget_snapshot';

export interface WidgetSnapshot {
  updatedAt: string;
  dateStr: string;
  // Para poder hacer check desde el widget directo a Supabase
  auth: {
    supabaseUrl: string;
    supabaseAnonKey: string;
    accessToken: string | null;
    userId: string | null;
  };
  // WIDGET 1: Mi Día (Rutinas + Tareas de hoy)
  daySummary: {
    habitsDone: number;
    habitsTotal: number;
    habitsProgressPct: number;
    habits: { id: number; name: string; done: boolean }[];
    pendingTasks: { id: number; title: string; category: string }[];
  };
  // WIDGET 2: Agenda (Eventos de hoy)
  agendaSummary: {
    events: { id: string; title: string; time: string; color: string }[];
  };
  // WIDGET 3: Gym & Racha
  gymSummary: {
    workoutsThisMonth: number;
    lastRoutineName: string;
    activeWorkoutTitle: string | null;
  };
}

export const syncWidgetsData = async (params: {
  habits: Habit[];
  habitLogs: { habit_id: number; date: string }[];
  tasks: Task[];
  googleEvents: any[];
  accessToken?: string | null;
  userId?: string | null;
  workoutsThisMonth?: number;
  lastRoutineName?: string;
  activeWorkoutTitle?: string | null;
}) => {
  // Si estamos en el navegador de PC normal, igual lo guarda en localStorage sin dar error,
  // y en Android escribe directo en SharedPreferences nativo ("CapacitorStorage")
  try {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    let dayOfWeek = getDay(now);
    if (dayOfWeek === 0) dayOfWeek = 7;

    // 1. Filtrar rutinas que tocan HOY
    const todaysHabits = params.habits.filter((h) => {
      if (!h.frequency.includes(dayOfWeek)) return false;
      if (h.created_at) {
        const creationDate = startOfDay(new Date(h.created_at));
        if (isBefore(startOfDay(now), creationDate)) return false;
      }
      return true;
    });

    const completedIds = new Set(
      params.habitLogs.filter((l) => l.date === todayStr).map((l) => l.habit_id)
    );

    const mappedHabits = todaysHabits.map((h) => ({
      id: h.id,
      name: h.name,
      done: completedIds.has(h.id),
    }));

    const habitsDone = mappedHabits.filter((h) => h.done).length;
    const habitsTotal = mappedHabits.length;
    const habitsProgressPct =
      habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 100) : 0;

    // 2. Tareas pendientes de HOY
    const pendingTasks = params.tasks
      .filter((t) => t.date === todayStr && !t.completed)
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category || 'Inbox',
      }));

    // 3. Eventos de Google de HOY
    const todaysEvents = params.googleEvents
      .filter((ev) => ev.date === todayStr)
      .slice(0, 5)
      .map((ev) => ({
        id: String(ev.id),
        title: String(ev.title),
        time: ev.time || 'Todo el día',
        color: ev.color || '#9381ff',
      }));

    // 4. Leer datos previos de Gym si no se pasaron en esta llamada
    let prevGym = {
      workoutsThisMonth: 0,
      lastRoutineName: 'Entrenar ahora',
      activeWorkoutTitle: null as string | null,
    };

    const existing = await Preferences.get({ key: WIDGET_DATA_KEY });
    if (existing.value) {
      try {
        const parsed = JSON.parse(existing.value) as WidgetSnapshot;
        if (parsed.gymSummary) prevGym = parsed.gymSummary;
      } catch {
        // Ignorar JSON corrupto
      }
    }

    const snapshot: WidgetSnapshot = {
      updatedAt: now.toISOString(),
      dateStr: todayStr,
      auth: {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        accessToken: params.accessToken ?? null,
        userId: params.userId ?? null,
      },
      daySummary: {
        habitsDone,
        habitsTotal,
        habitsProgressPct,
        habits: mappedHabits,
        pendingTasks,
      },
      agendaSummary: {
        events: todaysEvents,
      },
      gymSummary: {
        workoutsThisMonth: params.workoutsThisMonth ?? prevGym.workoutsThisMonth,
        lastRoutineName: params.lastRoutineName ?? prevGym.lastRoutineName,
        activeWorkoutTitle:
          params.activeWorkoutTitle !== undefined
            ? params.activeWorkoutTitle
            : prevGym.activeWorkoutTitle,
      },
    };

    await Preferences.set({
      key: WIDGET_DATA_KEY,
      value: JSON.stringify(snapshot),
    });

    if (Capacitor.isNativePlatform()) {
      console.log('📱 Datos sincronizados con los Widgets de Android');
    }
  } catch (err) {
    console.warn('Error sincronizando datos para widgets:', err);
  }
};