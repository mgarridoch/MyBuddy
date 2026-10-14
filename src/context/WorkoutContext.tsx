import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Routine, RoutineExercise, Exercise } from '../types';
import { supabase } from '../services/supabase';

export interface ActiveSession {
  routineId: number;
  routineTitle: string;
  startTime: string; // ISO string
  exercises: (RoutineExercise & { exercise: Exercise })[];
  logs: Record<number, { done: boolean; weight: number; reps: string; exerciseId: number }>;
}

interface WorkoutContextType {
  activeSession: ActiveSession | null;
  elapsedSeconds: number;
  startWorkout: (routine: Routine, details: any[]) => void;
  updateLog: (index: number, data: any) => void;
  finishWorkout: () => Promise<boolean>;
  cancelWorkout: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'mybuddy_active_workout';

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Persistencia en localStorage
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activeSession));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [activeSession]);

  // Cronómetro: depende SOLO de startTime para no reiniciarse al editar pesos/checks
  useEffect(() => {
    if (activeSession?.startTime) {
      const start = new Date(activeSession.startTime).getTime();

      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.floor((now - start) / 1000);
        setElapsedSeconds(diff >= 0 ? diff : 0);
      };

      updateTimer();
      timerRef.current = window.setInterval(updateTimer, 1000);
    } else {
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession?.startTime]);

  const startWorkout = (routine: Routine, exercises: any[]) => {
    const initialLogs: ActiveSession['logs'] = {};
    exercises.forEach((ex, index) => {
      initialLogs[index] = {
        done: false,
        weight: ex.exercise?.last_weight || 0,
        reps: ex.reps || '10',
        exerciseId: ex.exercise_id,
      };
    });

    const newSession: ActiveSession = {
      routineId: routine.id,
      routineTitle: routine.name,
      startTime: new Date().toISOString(),
      exercises,
      logs: initialLogs,
    };

    setActiveSession(newSession);
  };

  const updateLog = (index: number, data: any) => {
    setActiveSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [index]: { ...prev.logs[index], ...data },
        },
      };
    });
  };

  const cancelWorkout = () => {
    if (confirm('¿Cancelar entrenamiento? Se perderá el progreso actual.')) {
      setActiveSession(null);
    }
  };

  const finishWorkout = async (): Promise<boolean> => {
    if (!activeSession) return false;

    const doneCount = Object.values(activeSession.logs).filter((l) => l.done).length;
    const totalCount = activeSession.exercises.length;

    const message =
      doneCount < totalCount
        ? `Aún te faltan ejercicios (${doneCount}/${totalCount}). ¿Seguro que quieres terminar y guardar?`
        : '¿Terminar entrenamiento y guardar tu progreso?';

    if (!confirm(message)) return false;

    try {
      const endTime = new Date();
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .insert([
          {
            routine_title: activeSession.routineTitle,
            start_time: activeSession.startTime,
            end_time: endTime.toISOString(),
            duration_seconds: elapsedSeconds,
          },
        ])
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Guardamos los ejercicios que fueron completados (o todos si ninguno fue marcado)
      const exercisesToLog =
        doneCount > 0
          ? activeSession.exercises.filter((_, idx) => activeSession.logs[idx]?.done)
          : activeSession.exercises;

      const logsToInsert = exercisesToLog.map((ex) => {
        const originalIdx = activeSession.exercises.indexOf(ex);
        const log = activeSession.logs[originalIdx];

        if (log.weight > 0) {
          supabase
            .from('exercises')
            .update({ last_weight: log.weight })
            .eq('id', ex.exercise_id)
            .then();
        }

        return {
          workout_id: workoutData.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise.name,
          weight: Number(log.weight) || 0,
          reps: parseInt(log.reps, 10) || 0,
        };
      });

      if (logsToInsert.length > 0) {
        const { error: logsError } = await supabase.from('workout_logs').insert(logsToInsert);
        if (logsError) throw logsError;
      }

      setActiveSession(null);
      return true;
    } catch (error) {
      console.error('Error guardando entreno:', error);
      alert('Error al guardar entrenamiento. Revisa tu conexión.');
      return false;
    }
  };

  return (
    <WorkoutContext.Provider
      value={{
        activeSession,
        elapsedSeconds,
        startWorkout,
        updateLog,
        finishWorkout,
        cancelWorkout,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) throw new Error('useWorkout must be used within a WorkoutProvider');
  return context;
};