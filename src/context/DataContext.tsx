import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns';
import { useAuth } from './AuthContext';
import { getMyHabits, getRangeLogs } from '../services/habitService';
import { getTasksRange, getNotesRange, getAllTasks } from '../services/dailyService';
import { getGoogleEventsForMonth } from '../services/googleService';
import { getAppSettings, saveAppSettings } from '../services/settingsService';
import type { Habit, Task, DayNote, AppSettings } from '../types';
import { supabase } from '../services/supabase';
import { syncWidgetsData } from '../services/widgetBridge';

const THEME_CACHE_KEY = 'mybuddy_theme_cache';

interface DataContextType {
  habits: Habit[];
  habitLogs: { habit_id: number; date: string }[];
  tasks: Task[];
  allTasks: Task[];
  notes: DayNote[];
  googleEvents: any[];
  appSettings: AppSettings;
  updateAppSettings: (newSettings: AppSettings) => Promise<void>;
  loading: boolean;
  googleConnected: boolean;
  reconnectGoogleCalendar: () => Promise<void>;
  refreshData: () => Promise<void>;
  currentMonthView: Date;
  setCurrentMonthView: (date: Date) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, user, googleToken, clearGoogleToken } = useAuth();
  const [currentMonthView, setCurrentMonthView] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<DayNote[]>([]);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);

  // Leemos el tema desde localStorage para que no parpadee en blanco al abrir
  const [appSettings, setAppSettingsState] = useState<AppSettings>(() => {
    const cachedTheme = (localStorage.getItem(THEME_CACHE_KEY) as 'light' | 'dark') || 'dark';
    return {
      show_stats: true,
      show_calendar: true,
      show_sports: true,
      theme: cachedTheme,
    };
  });

  // Evita disparar dos cargas idénticas al mismo tiempo
  const isFetchingRef = useRef(false);

  const reconnectGoogleCalendar = useCallback(async () => {
    if (!user) return;
    const cleanUrl = window.location.origin + window.location.pathname;
    const lastRedirect = sessionStorage.getItem('lastGoogleRedirect');
    const now = Date.now();

    // Si ya redirigimos hace menos de 30 segundos, no forzamos otra redirección
    if (lastRedirect && now - parseInt(lastRedirect, 10) < 30000) {
      console.warn('⏳ Redirección reciente detectada, evitando doble recarga.');
      return;
    }

    sessionStorage.setItem('lastGoogleRedirect', now.toString());
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: cleanUrl,
        scopes: 'https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline',
          login_hint: user.email || '',
        },
      },
    });
  }, [user]);

  const loadMonthData = useCallback(async () => {
    if (!user?.id || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    const monthStart = startOfMonth(currentMonthView);
    const monthEnd = endOfMonth(currentMonthView);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const activeGoogleToken = session?.provider_token || googleToken;

    try {
      // 1. Cargamos SIEMPRE los datos de Supabase al instante (sin bloquear por Google)
      const [
        fetchedHabits,
        fetchedLogs,
        fetchedTasks,
        fetchedNotes,
        fetchedSettings,
        fetchedAllTasks,
      ] = await Promise.all([
        getMyHabits(),
        getRangeLogs(start, end),
        getTasksRange(start, end),
        getNotesRange(start, end),
        getAppSettings(),
        getAllTasks(),
      ]);

      setHabits(fetchedHabits);
      setHabitLogs(fetchedLogs);
      setTasks(fetchedTasks);
      setNotes(fetchedNotes);
      if (fetchedSettings) {
        setAppSettingsState(fetchedSettings);
        localStorage.setItem(THEME_CACHE_KEY, fetchedSettings.theme);
      }
      setAllTasks(fetchedAllTasks);

      // 2. Cargamos Google Calendar en paralelo / separado si tenemos token válido
      if (activeGoogleToken) {
        try {
          const events = await getGoogleEventsForMonth(activeGoogleToken, start, end);
          setGoogleEvents(events || []);
          sessionStorage.removeItem('lastGoogleRedirect');
        } catch (gError: any) {
          console.warn('⚠️ Token de Google vencido:', gError.message);
          clearGoogleToken();
          setGoogleEvents([]);
        }
      } else {
        // Si no hay token en caché y nunca hemos redirigido en esta sesión del navegador,
        // hacemos 1 sola sincronización silenciosa
        const hasAttemptedThisSession = sessionStorage.getItem('googleSyncAttempted');
        if (!hasAttemptedThisSession) {
          sessionStorage.setItem('googleSyncAttempted', 'true');
          reconnectGoogleCalendar();
        }
      }
    } catch (error) {
      console.error('Error cargando datos de Supabase:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?.id, format(currentMonthView, 'yyyy-MM'), session?.provider_token, googleToken, clearGoogleToken, reconnectGoogleCalendar]);

  // Dependemos SOLO del ID del usuario y del mes actual ('yyyy-MM'), no del objeto session entero
  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  useEffect(() => {
    if (appSettings.theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [appSettings.theme]);

  // Sincronizar automáticamente con los Widgets de Android cuando cambian los datos
  useEffect(() => {
    if (!user?.id) return;
    syncWidgetsData({
      habits,
      habitLogs,
      tasks,
      googleEvents,
      accessToken: session?.access_token || null,
      userId: user.id,
    });
  }, [habits, habitLogs, tasks, googleEvents, session?.access_token, user?.id]);

  const updateAppSettings = async (newSettings: AppSettings) => {
    setAppSettingsState(newSettings);
    localStorage.setItem(THEME_CACHE_KEY, newSettings.theme);
    await saveAppSettings(newSettings);
  };

  return (
    <DataContext.Provider
      value={{
        habits,
        habitLogs,
        tasks,
        notes,
        googleEvents,
        appSettings,
        updateAppSettings,
        allTasks,
        loading,
        googleConnected: Boolean(session?.provider_token || googleToken),
        reconnectGoogleCalendar,
        refreshData: loadMonthData,
        currentMonthView,
        setCurrentMonthView,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};