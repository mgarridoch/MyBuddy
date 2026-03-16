import React, { createContext, useContext, useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { useAuth } from './AuthContext';
import { getMyHabits, getRangeLogs } from '../services/habitService';
import { getTasksRange, getNotesRange } from '../services/dailyService';
import { getGoogleEventsForMonth } from '../services/googleService';
import { getAppSettings, saveAppSettings } from '../services/settingsService';
import type { Habit, Task, DayNote, AppSettings } from '../types';
import { supabase } from '../services/supabase';

interface DataContextType {
  habits: Habit[];
  habitLogs: { habit_id: number; date: string }[];
  tasks: Task[];
  notes: DayNote[];
  googleEvents: any[];
  appSettings: AppSettings;
  updateAppSettings: (newSettings: AppSettings) => Promise<void>;
  loading: boolean;
  refreshData: () => Promise<void>;
  currentMonthView: Date;
  setCurrentMonthView: (date: Date) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [currentMonthView, setCurrentMonthView] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<DayNote[]>([]);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [appSettings, setAppSettingsState] = useState<AppSettings>({
    show_stats: true, show_calendar: true, show_sports: true, theme: 'light'
  });  

  const loadMonthData = async () => {
    if (!session) return;
    setLoading(true);

    // Generamos una URL limpia para las redirecciones (ej: https://tusitio.com/sports en vez de https://tusitio.com/sports#token=123)
    const cleanUrl = window.location.origin + window.location.pathname;

    // --- EL GUARDIA DE SEGURIDAD DE GOOGLE ---
    if (!session.provider_token) {
      
      // 1. Verificar si estamos en medio de una redirección
      if (window.location.hash.includes('access_token') || window.location.hash.includes('provider_token')) {
        console.log("⏳ Supabase está procesando el token de la URL. Esperando...");
        
        // ANTI-BLOQUEO: Si después de 3 segundos Supabase no ha limpiado la URL, 
        // significa que la URL se quedó "pegada" (ej: el usuario apretó F5). 
        // La limpiamos nosotros a la fuerza y recargamos.
        setTimeout(() => {
          if (window.location.hash.includes('access_token')) {
            console.warn("🧹 Limpiando URL pegada a la fuerza...");
            window.history.replaceState(null, '', cleanUrl);
            loadMonthData(); // Reintentamos la carga
          }
        }, 3000);
        
        return; 
      }

      // 2. Sistema Anti-Bucle Infinito
      const lastRedirect = sessionStorage.getItem('lastGoogleRedirect');
      const now = Date.now();
      
      if (lastRedirect && now - parseInt(lastRedirect) < 10000) {
        console.error("❌ Bucle detectado. Redirección cancelada por seguridad.");
        setLoading(false);
        return; 
      }

      console.warn("🔄 Token de Google ausente o vencido. Refrescando sesión...");
      sessionStorage.setItem('lastGoogleRedirect', now.toString()); 
      
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: cleanUrl, // <-- USAMOS LA URL LIMPIA
          scopes: 'https://www.googleapis.com/auth/calendar',
          queryParams: {
            access_type: 'offline',
            login_hint: session.user.email || '' 
          }
        }
      });
      return; 
    } else {
      console.log("✅ Token de Google recibido correctamente.");
      sessionStorage.removeItem('lastGoogleRedirect'); 
    }

    const monthStart = startOfMonth(currentMonthView);
    const monthEnd = endOfMonth(currentMonthView);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    try {
      const [
        fetchedHabits, fetchedLogs, fetchedTasks, fetchedNotes, fetchedGoogle, fetchedSettings
      ] = await Promise.all([
        getMyHabits(),
        getRangeLogs(start, end),
        getTasksRange(start, end),
        getNotesRange(start, end),
        session.provider_token ? getGoogleEventsForMonth(session.provider_token, start, end) : [],
        getAppSettings()
      ]);
      
      setHabits(fetchedHabits);
      setHabitLogs(fetchedLogs);
      setTasks(fetchedTasks);
      setNotes(fetchedNotes);
      setGoogleEvents(fetchedGoogle || []);
      setAppSettingsState(fetchedSettings || { show_stats: true, show_calendar: true, show_sports: true, theme: 'light' });

    } catch (error: any) {
      console.error("Error cargando datos:", error);

      if (error.message === "TOKEN_EXPIRED" || error.message?.includes("401")) {
        console.log("Token vencido. Refrescando sesión automáticamente...");
        
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: cleanUrl, // <-- USAMOS LA URL LIMPIA AQUÍ TAMBIÉN
            scopes: 'https://www.googleapis.com/auth/calendar',
            queryParams: {
              access_type: 'offline',
              login_hint: session.user.email || ''
            },
          }
        });
        return; 
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData();
  }, [currentMonthView, session]); 

  useEffect(() => {
    if (appSettings.theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [appSettings.theme]);

  const updateAppSettings = async (newSettings: AppSettings) => {
    setAppSettingsState(newSettings); 
    await saveAppSettings(newSettings); 
  };

  return (
    <DataContext.Provider value={{
      habits, habitLogs, tasks, notes, googleEvents, appSettings, updateAppSettings,
      loading, refreshData: loadMonthData, currentMonthView, setCurrentMonthView
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
};