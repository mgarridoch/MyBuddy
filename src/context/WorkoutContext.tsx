import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Routine, RoutineExercise, Exercise } from '../types';
import { supabase } from '../services/supabase';

export interface ActiveSession {
  routineId: number;
  routineTitle: string;
  startTime: string; // Guardamos como string ISO para que sea compatible con JSON
  exercises: (RoutineExercise & { exercise: Exercise })[];
  // Clave: Index (number) -> Valor: Datos
  logs: Record<number, { done: boolean; weight: number; reps: string; exerciseId: number }>;
}

interface WorkoutContextType {
  activeSession: ActiveSession | null;
  elapsedSeconds: number;
  startWorkout: (routine: Routine, details: any[]) => void;
  updateLog: (index: number, data: any) => void;
  finishWorkout: () => Promise<void>;
  cancelWorkout: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'mybuddy_active_workout';

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // 1. INICIALIZACIÓN: Intentar leer del LocalStorage al cargar la página
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // 2. PERSISTENCIA: Cada vez que cambie la sesión, guardar en LocalStorage
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activeSession));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [activeSession]);

  // 3. CRONÓMETRO INTELIGENTE
  useEffect(() => {
    if (activeSession) {
      // Calcular tiempo real basado en la hora de inicio (para sobrevivir al F5)
      const start = new Date(activeSession.startTime).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        setElapsedSeconds(diff >= 0 ? diff : 0);
      };

      updateTimer(); // Ejecutar una vez al inicio
      timerRef.current = window.setInterval(updateTimer, 1000);
    } else {
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession]); // Se reinicia si cambia la sesión (o si se recupera del storage)

  // --- ACCIONES ---

  const startWorkout = (routine: Routine, exercises: any[]) => {
    const initialLogs: any = {};
    exercises.forEach((ex, index) => {
      initialLogs[index] = {
        done: false,
        weight: ex.exercise.last_weight || 0,
        reps: ex.reps || '10',
        exerciseId: ex.exercise_id
      };
    });

    const newSession: ActiveSession = {
      routineId: routine.id,
      routineTitle: routine.name,
      startTime: new Date().toISOString(), // Guardar como string
      exercises: exercises,
      logs: initialLogs
    };

    setActiveSession(newSession);
  };

  const updateLog = (index: number, data: any) => {
    if (!activeSession) return;
    setActiveSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [index]: { ...prev.logs[index], ...data }
        }
      };
    });
  };

  const cancelWorkout = () => {
    if (confirm("¿Cancelar entrenamiento? Se perderá el progreso.")) {
      setActiveSession(null);
      // El useEffect se encargará de limpiar el localStorage
    }
  };

  const finishWorkout = async () => {
    if (!activeSession) return;

    const doneCount = Object.values(activeSession.logs).filter(l => l.done).length;
    const totalCount = activeSession.exercises.length;

    const message = doneCount < totalCount 
      ? `Aún te faltan ejercicios (${doneCount}/${totalCount}). ¿Seguro que quieres terminar?`
      : "¿Terminar entrenamiento y guardar progreso?";

    if (!confirm(message)) return;

    try {
      const endTime = new Date();
      // Guardar cabecera
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .insert([{
          routine_title: activeSession.routineTitle,
          start_time: activeSession.startTime, // Ya está en ISO
          end_time: endTime.toISOString(),
          duration_seconds: elapsedSeconds
        }])
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Guardar detalles
      const logsToInsert = activeSession.exercises.map((ex, index) => {
        const log = activeSession.logs[index];
        
        // Actualizar peso sugerido (sin await para velocidad)
        if (log.weight > 0) {
          supabase.from('exercises').update({ last_weight: log.weight }).eq('id', ex.exercise_id).then();
        }

        return {
          workout_id: workoutData.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise.name,
          weight: log.weight,
          reps: parseInt(log.reps) || 0
        };
      });

      const { error: logsError } = await supabase.from('workout_logs').insert(logsToInsert);
      if (logsError) throw logsError;

      // Éxito: Limpiar sesión
      setActiveSession(null);
      
      // Redirigir al Hub
      window.location.href = '/sports';

    } catch (error) {
      console.error("Error guardando entreno:", error);
      alert("Error al guardar. Revisa tu conexión.");
    }
  };

  return (
    <WorkoutContext.Provider value={{ activeSession, elapsedSeconds, startWorkout, updateLog, finishWorkout, cancelWorkout }}>
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) throw new Error("useWorkout must be used within a WorkoutProvider");
  return context;
};