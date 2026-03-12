import React, { createContext, useContext, useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { useAuth } from './AuthContext';
import { getMyHabits, getRangeLogs } from '../services/habitService';
import { getTasksRange, getNotesRange } from '../services/dailyService';
import { getGoogleEventsForMonth } from '../services/googleService';
import { getAppSettings, saveAppSettings } from '../services/settingsService';
import type { Habit, Task, DayNote, AppSettings } from '../types';
import { supabase } from '../services/supabase'; // Asegúrate de importar esto

interface DataContextType {
  // Datos crudos del mes
  habits: Habit[];
  habitLogs: { habit_id: number; date: string }[];
  tasks: Task[];
  notes: DayNote[];
  googleEvents: any[];
  appSettings: AppSettings;
  updateAppSettings: (newSettings: AppSettings) => Promise<void>;
  loading: boolean;
  refreshData: () => Promise<void>; // Para forzar recarga manual
  
  // Control de fecha visualizada para saber qué mes cargar
  currentMonthView: Date;
  setCurrentMonthView: (date: Date) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [currentMonthView, setCurrentMonthView] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // --- ALMACÉN EN MEMORIA ---
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<DayNote[]>([]);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [appSettings, setAppSettingsState] = useState<AppSettings>({
    show_stats: true, show_calendar: true, show_sports: true, theme: 'light'
  });  
  // Función Maestra de Carga
  const loadMonthData = async () => {
    if (!session) return;
    setLoading(true);

    // --- EL GUARDIA DE SEGURIDAD DE GOOGLE ---
    // Si la sesión de MyBuddy existe, pero el token de Google se borró por inactividad...
    if (!session.provider_token) {
      
      // 1. Verificar si estamos en medio de una redirección (la URL tiene tokens)
      if (window.location.hash.includes('access_token') || window.location.hash.includes('provider_token')) {
        console.log("⏳ Supabase está procesando el token de la URL. Esperando...");
        return; // Detenemos la carga y dejamos que Supabase termine su trabajo
      }

      // 2. Sistema Anti-Bucle Infinito (Cooldown de 10 segundos)
      const lastRedirect = sessionStorage.getItem('lastGoogleRedirect');
      const now = Date.now();
      
      if (lastRedirect && now - parseInt(lastRedirect) < 10000) {
        console.error("❌ Bucle detectado. Redirección cancelada por seguridad.");
        // Si entra en bucle, mejor detenerse que colapsar el navegador
        return; 
      }

      console.warn("🔄 Token de Google ausente o vencido. Refrescando sesión...");
      sessionStorage.setItem('lastGoogleRedirect', now.toString()); // Anotar la hora del salto
      
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href, 
          scopes: 'https://www.googleapis.com/auth/calendar',
          queryParams: {
            access_type: 'offline',
            login_hint: session.user.email || '' 
          }
        }
      });
      return; 
    } else {
      // Si llegamos aquí, el token existe y es válido
      console.log("✅ Token de Google recibido correctamente.");
      sessionStorage.removeItem('lastGoogleRedirect'); // Limpiamos el seguro anti-bucles
    }

    // 2. Cambiamos cómo calculamos start y end
    const monthStart = startOfMonth(currentMonthView);
    const monthEnd = endOfMonth(currentMonthView);

    // Ampliamos el rango para que incluya la primera semana visible y la última
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    try {
      // 1. Cargar todo en paralelo (Promise.all es clave para velocidad)
      const [
        fetchedHabits,
        fetchedLogs,
        fetchedTasks,
        fetchedNotes,
        fetchedGoogle,
        fetchedSettings
      ] = await Promise.all([
        getMyHabits(),
        getRangeLogs(start, end),
        getTasksRange(start, end),
        getNotesRange(start, end),
        session.provider_token ? getGoogleEventsForMonth(session.provider_token, start, end) : [],
        getAppSettings()
      ]);

      // NOTA SOBRE GOOGLE: getGoogleEvents original calculaba startOfDay/endOfDay internamente sobre la fecha dada.
      // Si esa función solo mira 1 día, tendremos que modificarla ligeramente o crear getGoogleEventsFullRange.
      // ASUMIREMOS QUE CREAS UNA COPIA llamada `getGoogleEventsFullMonth` que acepta start/end explicitos, 
      // o modificas la logica de llamada. 
      // *Corrección:* Para simplificar, usaremos getGoogleEventsRange (la que hicimos para los dots) 
      // pero asegúrate de que esa traiga title y time como hicimos en el paso anterior.
      
      setHabits(fetchedHabits);
      setHabitLogs(fetchedLogs);
      setTasks(fetchedTasks);
      setNotes(fetchedNotes);
      setGoogleEvents(fetchedGoogle || []);
      setAppSettingsState(fetchedSettings || { show_stats: true, show_calendar: true, show_sports: true, theme: 'light' });

    } catch (error: any) {
      console.error("Error cargando datos:", error);

      // --- AQUÍ ESTÁ LA MAGIA AUTOMÁTICA ---
      // Si el error es específicamente de token vencido
      if (error.message === "TOKEN_EXPIRED" || error.message?.includes("401")) {
        console.log("Token vencido. Refrescando sesión automáticamente...");
        
        // Disparamos el login inmediatamente
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
            scopes: 'https://www.googleapis.com/auth/calendar',
            queryParams: {
              access_type: 'offline',
              // Importante NO poner prompt: 'consent' para que sea silencioso
            },
          }
        });
        return; // Detenemos la ejecución para que se recargue la página
      }
    } finally {
      setLoading(false);
    }
  };

  // Recargar cuando cambia el mes o el usuario
  useEffect(() => {
    loadMonthData();
  }, [currentMonthView, session]); // Dependencia clave: Mes

  useEffect(() => {
  if (appSettings.theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}, [appSettings.theme]);

  const updateAppSettings = async (newSettings: AppSettings) => {
    setAppSettingsState(newSettings); // Optimistic UI
    await saveAppSettings(newSettings); // Guardar en BD
  };
  return (
    <DataContext.Provider value={{
      habits, habitLogs, tasks, notes, googleEvents,
      loading,
      refreshData: loadMonthData,
      currentMonthView, setCurrentMonthView,
      appSettings,
      updateAppSettings
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