import React, { useState, useEffect } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Timer,
  Save,
  PlayCircle,
  Minus,
  Plus,
  Flame,
  X,
  RotateCcw,
} from 'lucide-react';
import './WorkoutSession.css';

export const WorkoutSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeSession, elapsedSeconds, updateLog, finishWorkout, cancelWorkout } = useWorkout();

  // Ejercicio abierto para ver video/notas en modal ligero
  const [videoModalIndex, setVideoModalIndex] = useState<number | null>(null);

  // Temporizador de descanso entre series
  const [restSecondsLeft, setRestSecondsLeft] = useState<number>(0);
  const [restTotal, setRestTotal] = useState<number>(90);

  useEffect(() => {
    if (restSecondsLeft <= 0) return;
    const interval = window.setInterval(() => {
      setRestSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [restSecondsLeft]);

  if (!activeSession) return <Navigate to="/sports" replace />;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startRestTimer = (secs: number) => {
    setRestTotal(secs);
    setRestSecondsLeft(secs);
  };

  const totalExercises = activeSession.exercises.length;
  const completedExercises = Object.values(activeSession.logs).filter((l) => l.done).length;
  const progressPct =
    totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  const adjustWeight = (index: number, currentWeight: number, delta: number) => {
    const next = Math.max(0, Number((Number(currentWeight || 0) + delta).toFixed(1)));
    updateLog(index, { weight: next });
  };

  const handleToggleExerciseDone = (index: number, currentDone: boolean) => {
    const nextDone = !currentDone;
    updateLog(index, { done: nextDone });
    // Si acaba de completar un ejercicio y el timer de descanso está apagado, sugerir/iniciar 90s opcional
  };

  const handleFinish = async () => {
    const ok = await finishWorkout();
    if (ok) {
      navigate('/sports');
    }
  };

  const focusedItem =
    videoModalIndex !== null ? activeSession.exercises[videoModalIndex] : null;

  return (
    <div className="workout-session-shell">
      {/* 1. HEADER STICKY CON PROGRESO Y CRONÓMETRO */}
      <header className="workout-sticky-top">
        <div className="workout-top-row">
          <button
            type="button"
            className="workout-nav-back"
            onClick={() => navigate('/sports')}
            title="Volver al Hub (el entreno sigue activo)"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="workout-title-center">
            <h1>{activeSession.routineTitle}</h1>
            <div className="workout-live-meta">
              <span className="workout-elapsed-pill">
                <Timer size={13} /> {formatTime(elapsedSeconds)}
              </span>
              <span className="workout-count-pill">
                {completedExercises}/{totalExercises} listos
              </span>
            </div>
          </div>

          <button type="button" className="workout-cancel-btn" onClick={cancelWorkout}>
            Cancelar
          </button>
        </div>

        {/* Barra de progreso de la rutina */}
        <div className="workout-progress-bar">
          <div className="workout-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* BARRA DE DESCANSO RÁPIDO (REST TIMER) */}
        <div className="rest-timer-bar">
          {restSecondsLeft > 0 ? (
            <div className="rest-timer-active">
              <div className="rest-countdown">
                <Flame size={15} color="#ff9f43" />
                <span>Descanso: <strong>{formatTime(restSecondsLeft)}</strong></span>
              </div>
              <div className="rest-active-controls">
                <button type="button" onClick={() => setRestSecondsLeft((s) => s + 30)}>
                  +30s
                </button>
                <button type="button" onClick={() => setRestSecondsLeft(restTotal)}>
                  <RotateCcw size={13} />
                </button>
                <button
                  type="button"
                  className="rest-stop-btn"
                  onClick={() => setRestSecondsLeft(0)}
                >
                  <X size={14} /> Saltar
                </button>
              </div>
            </div>
          ) : (
            <div className="rest-timer-presets">
              <span className="rest-label">Descanso:</span>
              <button type="button" onClick={() => startRestTimer(60)}>
                1:00
              </button>
              <button type="button" onClick={() => startRestTimer(90)}>
                1:30
              </button>
              <button type="button" onClick={() => startRestTimer(120)}>
                2:00
              </button>
              <button type="button" onClick={() => startRestTimer(180)}>
                3:00
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. LISTA DE EJERCICIOS CON CONTROLES DIRECTOS */}
      <main className="workout-cards-list">
        {activeSession.exercises.map((item, index) => {
          const log = activeSession.logs[index];
          if (!log) return null;

          const isDone = log.done;
          const hasVideoOrNotes = Boolean(item.exercise?.video_url || item.exercise?.notes);

          return (
            <div
              key={`${item.exercise_id}-${index}`}
              className={`session-exercise-card ${isDone ? 'is-completed' : ''}`}
            >
              {/* Fila superior: Orden + Nombre + Botón de Video + Check grande */}
              <div className="session-card-header">
                <div className="session-ex-title-group">
                  <span className="session-ex-index">#{index + 1}</span>
                  <div>
                    <h3>{item.exercise.name}</h3>
                    <span className="session-ex-target">
                      Meta: <strong>{item.sets} series</strong> × {item.reps} reps
                    </span>
                  </div>
                </div>

                <div className="session-card-actions">
                  {hasVideoOrNotes && (
                    <button
                      type="button"
                      className="session-video-btn"
                      onClick={() => setVideoModalIndex(index)}
                      title="Ver técnica o notas"
                    >
                      <PlayCircle size={18} />
                      <span>Técnica</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={`session-check-btn ${isDone ? 'checked' : ''}`}
                    onClick={() => handleToggleExerciseDone(index, isDone)}
                    aria-label="Marcar ejercicio como completado"
                  >
                    {isDone ? <CheckCircle2 size={28} /> : <Circle size={28} />}
                  </button>
                </div>
              </div>

              {/* Fila inferior: Controles táctiles de Peso (kg) y Reps en línea */}
              <div className="session-inputs-grid">
                {/* Control de Peso con botones -2.5 / +2.5 */}
                <div className="session-control-box">
                  <label>Peso (kg)</label>
                  <div className="stepper-input-row">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => adjustWeight(index, log.weight, -2.5)}
                    >
                      <Minus size={15} />
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      inputMode="decimal"
                      value={log.weight}
                      onChange={(e) =>
                        updateLog(index, { weight: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => adjustWeight(index, log.weight, 2.5)}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                {/* Control de Repeticiones */}
                <div className="session-control-box">
                  <label>Repeticiones logradas</label>
                  <div className="stepper-input-row">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={log.reps}
                      onChange={(e) => updateLog(index, { reps: e.target.value })}
                      placeholder="Ej: 10"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* 3. FOOTER FIJO PARA GUARDAR SESIÓN */}
      <footer className="workout-sticky-footer">
        <button type="button" className="finish-session-btn" onClick={handleFinish}>
          <Save size={20} />
          <span>
            Terminar Entrenamiento ({completedExercises}/{totalExercises})
          </span>
        </button>
      </footer>

      {/* 4. MODAL LIGERO DE VIDEO / TÉCNICA (SI EL USUARIO LO ABRE) */}
      {focusedItem && (
        <div className="task-modal-overlay" onClick={() => setVideoModalIndex(null)}>
          <div
            className="task-modal-card"
            style={{ maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="task-modal-header">
              <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>
                {focusedItem.exercise.name}
              </h3>
              <button
                type="button"
                className="task-modal-close"
                onClick={() => setVideoModalIndex(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="task-modal-body">
              {focusedItem.exercise.video_url ? (
                <div className="focus-video-box">
                  <video src={focusedItem.exercise.video_url} controls loop playsInline autoPlay />
                </div>
              ) : (
                <div className="no-video-box">Sin video de referencia</div>
              )}

              {focusedItem.exercise.notes && (
                <div className="exercise-notes-callout">
                  <strong>Notas de técnica:</strong>
                  <p>{focusedItem.exercise.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};