import React, { useState, useEffect } from 'react';
import {
  Play,
  Dumbbell,
  List,
  BarChart2,
  Plus,
  Clock,
  Flame,
  Trophy,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getRoutines, getRoutineDetails } from '../../services/sportService';
import { supabase } from '../../services/supabase';
import type { Routine, Workout } from '../../types';
import './SportsHub.css';
import { DashboardLayout } from '../../components/DashboardLayout';
import { SettingsModal } from '../../components/Settings/SettingsModal';
import { useWorkout } from '../../context/WorkoutContext';
import { startOfMonth, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const SportsHub: React.FC = () => {
  const navigate = useNavigate();
  const { startWorkout, activeSession, elapsedSeconds } = useWorkout();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingRoutineId, setStartingRoutineId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const loadHubData = async () => {
      setLoading(true);
      try {
        const [fetchedRoutines, workoutsRes] = await Promise.all([
          getRoutines(),
          supabase
            .from('workouts')
            .select('*')
            .neq('routine_title', 'Ajuste Manual')
            .order('start_time', { ascending: false })
            .limit(20),
        ]);

        setRoutines(fetchedRoutines);
        if (workoutsRes.data) {
          setRecentWorkouts(workoutsRes.data as Workout[]);
        }
      } catch (e) {
        console.error('Error cargando SportsHub:', e);
      } finally {
        setLoading(false);
      }
    };

    loadHubData();
  }, []);

  const handleStartRoutine = async (routine: Routine) => {
    if (startingRoutineId !== null) return;
    setStartingRoutineId(routine.id);
    try {
      const details = await getRoutineDetails(routine.id);
      if (!details || details.length === 0) {
        if (
          confirm(
            `La rutina "${routine.name}" aún no tiene ejercicios asignados. ¿Quieres ir a editarla ahora?`
          )
        ) {
          navigate('/routines');
        }
        return;
      }
      startWorkout(routine, details);
      navigate('/workout-session');
    } catch (e) {
      alert('Error cargando los ejercicios de la rutina');
    } finally {
      setStartingRoutineId(null);
    }
  };

  // Formatear cronómetro en vivo (MM:SS)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  };

  // KPIs rápidos
  const monthStartIso = startOfMonth(new Date()).toISOString();
  const workoutsThisMonth = recentWorkouts.filter((w) => w.start_time >= monthStartIso).length;
  const lastWorkout = recentWorkouts[0];

  const activeDoneCount = activeSession
    ? Object.values(activeSession.logs).filter((l) => l.done).length
    : 0;
  const activeTotalCount = activeSession ? activeSession.exercises.length : 0;

  return (
    <DashboardLayout isFullWidth={true} onOpenSettings={() => setIsSettingsOpen(true)}>
      <div className="sports-hub-wrapper">
        {/* 1. BANNER DE SESIÓN EN CURSO (SI ESTÁS ENTRENANDO AHORA) */}
        {activeSession && (
          <div
            className="active-workout-banner animate-in"
            onClick={() => navigate('/workout-session')}
          >
            <div className="active-banner-left">
              <span className="live-badge">
                <span className="live-dot" /> EN CURSO
              </span>
              <h2>{activeSession.routineTitle}</h2>
              <p>
                {activeDoneCount} de {activeTotalCount} ejercicios completados
              </p>
            </div>

            <div className="active-banner-right">
              <div className="live-timer-pill">
                <Clock size={16} />
                <span>{formatTime(elapsedSeconds)}</span>
              </div>
              <button type="button" className="resume-workout-btn">
                <span>Continuar</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* 2. CABECERA + MÉTRICAS RÁPIDAS */}
        <div className="sports-top-grid">
          <div className="sports-welcome-card">
            <div>
              <span className="sports-eyebrow">Centro de Entrenamiento</span>
              <h1>Tu Gimnasio</h1>
              <p>
                {lastWorkout
                  ? `Último entreno: ${lastWorkout.routine_title} (${formatDistanceToNow(
                      new Date(lastWorkout.start_time),
                      { addSuffix: true, locale: es }
                    )})`
                  : 'Elige una rutina abajo para iniciar tu sesión de hoy.'}
              </p>
            </div>

            <div className="sports-kpi-row">
              <div className="sport-kpi-pill">
                <Flame size={18} color="#ff9f43" />
                <div>
                  <strong>{workoutsThisMonth}</strong>
                  <span>Este mes</span>
                </div>
              </div>

              <div className="sport-kpi-pill">
                <Trophy size={18} color="var(--color-primary)" />
                <div>
                  <strong>{routines.length}</strong>
                  <span>Rutinas</span>
                </div>
              </div>
            </div>
          </div>

          {/* TARJETAS DE NAVEGACIÓN A MÓDULOS */}
          <div className="sports-nav-cards">
            <Link to="/routines" className="sport-module-card">
              <div className="module-icon-wrap">
                <List size={20} />
              </div>
              <div className="module-card-text">
                <strong>Mis Rutinas</strong>
                <span>Crear y editar planes</span>
              </div>
              <ChevronRight size={18} className="module-arrow" />
            </Link>

            <Link to="/exercises" className="sport-module-card">
              <div className="module-icon-wrap">
                <Dumbbell size={20} />
              </div>
              <div className="module-card-text">
                <strong>Biblioteca de Ejercicios</strong>
                <span>Pesos, notas y técnica</span>
              </div>
              <ChevronRight size={18} className="module-arrow" />
            </Link>

            <Link to="/sportstats" className="sport-module-card">
              <div className="module-icon-wrap">
                <BarChart2 size={20} />
              </div>
              <div className="module-card-text">
                <strong>Progreso y Estadísticas</strong>
                <span>Peso corporal e historial</span>
              </div>
              <ChevronRight size={18} className="module-arrow" />
            </Link>
          </div>
        </div>

        {/* 3. LANZADOR DIRECTO DE RUTINAS (UN SOLO CLICK PARA ENTRENAR) */}
        <section className="quick-routines-section">
          <div className="section-header-bar">
            <div className="section-header-title">
              <Activity size={18} color="var(--color-primary)" />
              <h2>Iniciar Rutina Rápida</h2>
            </div>

            <Link to="/routines" className="manage-routines-link">
              <Plus size={15} /> Gestionar rutinas
            </Link>
          </div>

          {loading ? (
            <div className="routines-Empty-box">Cargando tus rutinas...</div>
          ) : routines.length === 0 ? (
            <div className="routines-Empty-box">
              <Dumbbell size={36} strokeWidth={1.5} />
              <p>Aún no has creado ninguna rutina de entrenamiento.</p>
              <button
                type="button"
                className="create-first-routine-btn"
                onClick={() => navigate('/routines')}
              >
                <Plus size={16} /> Crear mi primera rutina
              </button>
            </div>
          ) : (
            <div className="quick-routines-grid">
              {routines.map((routine) => {
                const isStarting = startingRoutineId === routine.id;
                return (
                  <div key={routine.id} className="quick-routine-card">
                    <div
                      className="quick-routine-info"
                      onClick={() => navigate('/routines')}
                      title="Ver o editar rutina"
                    >
                      <h3>{routine.name}</h3>
                      <span>Toca para editar ejercicios o series</span>
                    </div>

                    <button
                      type="button"
                      className="start-routine-pill-btn"
                      disabled={isStarting}
                      onClick={() => handleStartRoutine(routine)}
                    >
                      <Play size={15} fill="currentColor" />
                      <span>{isStarting ? 'Abriendo...' : 'Entrenar'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. HISTORIAL RECIENTE DE ENTRENAMIENTOS */}
        {recentWorkouts.length > 0 && (
          <section className="recent-workouts-section">
            <div className="section-header-bar">
              <h2>Últimas Sesiones</h2>
              <Link to="/sportstats" className="manage-routines-link">
                Ver estadísticas
              </Link>
            </div>

            <div className="recent-workouts-list">
              {recentWorkouts.slice(0, 4).map((w) => {
                const mins = w.duration_seconds ? Math.round(w.duration_seconds / 60) : 0;
                return (
                  <div key={w.id} className="recent-workout-row">
                    <div className="recent-workout-main">
                      <strong>{w.routine_title}</strong>
                      <span>
                        {new Date(w.start_time).toLocaleDateString('es-CL', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    {mins > 0 && (
                      <span className="workout-duration-badge">
                        <Clock size={12} /> {mins} min
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </DashboardLayout>
  );
};