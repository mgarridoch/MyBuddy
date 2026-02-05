import React, { createContext, useContext, useState, useEffect } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from './AuthContext';
import { getMyHabits, getRangeLogs } from '../services/habitService';
import { getTasksRange, getNotesRange } from '../services/dailyService';
import { getGoogleEventsForMonth } from '../services/googleService';
import type { Habit, Task, DayNote } from '../types';

interface DataContextType {
  // Datos crudos del mes
  habits: Habit[];
  habitLogs: { habit_id: number; date: string }[];
  tasks: Task[];
  notes: DayNote[];
  googleEvents: any[];
  
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

  // Función Maestra de Carga
  const loadMonthData = async () => {
    if (!session) return;
    setLoading(true);
    
    const start = startOfMonth(currentMonthView);
    const end = endOfMonth(currentMonthView);

    try {
      // 1. Cargar todo en paralelo (Promise.all es clave para velocidad)
      const [
        fetchedHabits,
        fetchedLogs,
        fetchedTasks,
        fetchedNotes,
        fetchedGoogle
      ] = await Promise.all([
        getMyHabits(),
        getRangeLogs(start, end),
        getTasksRange(start, end),
        getNotesRange(start, end),
        session.provider_token ? getGoogleEventsForMonth(session.provider_token, start, end) : []
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

    } catch (error) {
      console.error("Error cargando datos del mes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Recargar cuando cambia el mes o el usuario
  useEffect(() => {
    loadMonthData();
  }, [currentMonthView, session]); // Dependencia clave: Mes

  return (
    <DataContext.Provider value={{
      habits, habitLogs, tasks, notes, googleEvents,
      loading,
      refreshData: loadMonthData,
      currentMonthView, setCurrentMonthView
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