import React, { useEffect, useState, useRef } from 'react';
import { format, isAfter, startOfDay, getDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  ListTodo,
  PenLine,
  Settings,
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './DayPanel.css';

// Servicios y Tipos
import { toggleHabitLog } from '../../services/habitService';
import { createTask, toggleTask, deleteTask, saveDayNote } from '../../services/dailyService';
import { deleteGoogleEvent } from '../../services/googleService';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import confetti from 'canvas-confetti';

// Modales
import { AddEventModal } from '../Calendar/AddEventModal';
import { TaskDetailModal } from '../Tasks/TaskDetailModal';
import type { Task } from '../../types';

interface DayPanelProps {
  selectedDate: Date;
  onDataChange: () => void;
  hideHeader?: boolean;
}

export const DayPanel: React.FC<DayPanelProps> = ({
  selectedDate,
  onDataChange,
  hideHeader = false,
}) => {
  const navigate = useNavigate();
  const { session, googleToken } = useAuth();
  const activeGoogleToken = session?.provider_token || googleToken;

  const {
    habits,
    habitLogs,
    tasks,
    notes,
    googleEvents,
    refreshData,
    reconnectGoogleCalendar,
  } = useData();

  // --- ESTADOS LOCALES Y OPTIMISTAS (0ms respuesta) ---
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [noteStatus, setNoteStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState< any | null >(null);
  const [localNote, setLocalNote] = useState('');
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Estados optimistas para que los checkboxes respondan en 0ms sin esperar a Supabase
  const [optimisticHabitMap, setOptimisticHabitMap] = useState<Record<number, boolean>>({});
  const [optimisticTaskMap, setOptimisticTaskMap] = useState<Record<number, boolean>>({});
  const [deletedTaskIds, setDeletedTaskIds] = useState<number[]>([]);

  const isFuture = isAfter(startOfDay(selectedDate), startOfDay(new Date()));
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Limpiar overrides optimistas cuando cambian los datos reales o la fecha
  useEffect(() => {
    setOptimisticHabitMap({});
    setOptimisticTaskMap({});
    setDeletedTaskIds([]);
  }, [dateStr, habitLogs, tasks]);

  // ---------------------------------------------------------
  // 1. FILTRADO DE HÁBITOS DEL DÍA (con estado optimista)
  // ---------------------------------------------------------
  let dayOfWeek = getDay(selectedDate);
  if (dayOfWeek === 0) dayOfWeek = 7;

  const todaysHabits = habits.filter((h) => {
    const isScheduled = h.frequency.includes(dayOfWeek);
    if (!isScheduled) return false;
    if (h.created_at) {
      const viewDate = startOfDay(selectedDate);
      const creationDate = startOfDay(new Date(h.created_at));
      if (isBefore(viewDate, creationDate)) return false;
    }
    return true;
  });

  const serverCompletedHabitIds = habitLogs
    .filter((log) => log.date === dateStr)
    .map((log) => log.habit_id);

  const isHabitDone = (habitId: number) => {
    if (habitId in optimisticHabitMap) {
      return optimisticHabitMap[habitId];
    }
    return serverCompletedHabitIds.includes(habitId);
  };

  const completedHabitsCount = todaysHabits.filter((h) => isHabitDone(h.id)).length;
  const habitsProgressPct =
    todaysHabits.length > 0 ? Math.round((completedHabitsCount / todaysHabits.length) * 100) : 0;

  // ---------------------------------------------------------
  // 2. FILTRADO DE TAREAS DEL DÍA (con estado optimista)
  // ---------------------------------------------------------
  const todaysTasks = tasks
    .filter((t) => t.date === dateStr && !deletedTaskIds.includes(t.id))
    .map((t) => ({
      ...t,
      completed: t.id in optimisticTaskMap ? optimisticTaskMap[t.id] : t.completed,
    }));

  const totalTasksCount = todaysTasks.length;
  const doneTasksCount = todaysTasks.filter((t) => t.completed).length;
  const pendingTasks = todaysTasks.filter((t) => !t.completed);
  const completedTasks = todaysTasks.filter((t) => t.completed);

  // ---------------------------------------------------------
  // 3. NOTAS DEL DÍA (con Auto-Save Debounce para Móvil)
  // ---------------------------------------------------------
  const todaysNoteContent = notes.find((n) => n.date === dateStr)?.content || '';
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalNote(todaysNoteContent);
    setNoteStatus('idle');
  }, [dateStr, todaysNoteContent]);

  const triggerNoteSave = async (contentToSave: string) => {
    if (contentToSave === todaysNoteContent) return;
    setNoteStatus('saving');
    try {
      await saveDayNote(selectedDate, contentToSave);
      await refreshData();
      setNoteStatus('saved');
      setTimeout(() => setNoteStatus('idle'), 2000);
    } catch (e) {
      console.error('Error guardando nota:', e);
      setNoteStatus('idle');
    }
  };

  const handleNoteChange = (val: string) => {
    setLocalNote(val);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      triggerNoteSave(val);
    }, 1200);
  };

  const handleNoteBlur = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    triggerNoteSave(localNote);
  };

  // ---------------------------------------------------------
  // 4. EVENTOS DE GOOGLE
  // ---------------------------------------------------------
  const todaysEvents = googleEvents.filter((ev) => ev.date === dateStr);

  // ---------------------------------------------------------
  // HANDLERS OPTIMISTAS
  // ---------------------------------------------------------
  const handleToggleHabit = async (habitId: number, isChecked: boolean) => {
    // 1. Cambio visual instantáneo (0ms)
    setOptimisticHabitMap((prev) => ({ ...prev, [habitId]: isChecked }));

    if (isChecked) {
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.65 },
        colors: ['#9381ff', '#b8b8ff', '#ffd8be'],
      });
    }

    // 2. Persistir en segundo plano
    try {
      await toggleHabitLog(habitId, selectedDate, isChecked);
      refreshData();
      onDataChange();
    } catch (e) {
      // Revertir si falla
      setOptimisticHabitMap((prev) => {
        const copy = { ...prev };
        delete copy[habitId];
        return copy;
      });
    }
  };

  const submitNewTask = async () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    setNewTaskTitle('');
    await createTask(trimmed, selectedDate, 'Inbox');
    refreshData();
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitNewTask();
    }
  };

  const handleToggleTask = async (taskId: number, isChecked: boolean) => {
    setOptimisticTaskMap((prev) => ({ ...prev, [taskId]: isChecked }));
    try {
      await toggleTask(taskId, isChecked);
      refreshData();
    } catch (e) {
      setOptimisticTaskMap((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    setDeletedTaskIds((prev) => [...prev, taskId]);
    try {
      await deleteTask(taskId);
      refreshData();
    } catch (e) {
      setDeletedTaskIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

  const handleDeleteGoogleEvent = async (calendarId: string, eventId: string) => {
    if (!calendarId || !activeGoogleToken) {
      alert('No hay conexión activa con Google Calendar. Reconectando...');
      reconnectGoogleCalendar();
      return;
    }
    if (!confirm('¿Eliminar evento de Google Calendar?')) return;

    try {
      await deleteGoogleEvent(activeGoogleToken, calendarId, eventId);
      refreshData();
      onDataChange();
    } catch (e) {
      alert('Error eliminando evento de Google Calendar');
    }
  };

  return (
    <div className="panel-container">
      {!hideHeader && (
        <div className="panel-header">
          <h2 className="panel-date-title">
            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
          </h2>
        </div>
      )}

      {/* 1. SECCIÓN EVENTOS GOOGLE */}
      <section className="panel-section">
        <div className="section-title-row">
          <div className="section-title">
            <CalendarIcon size={17} />
            <span>Eventos</span>
          </div>

          {activeGoogleToken ? (
            <button
              className="section-icon-btn"
              onClick={() => { setEventToEdit(null); setIsAddEventOpen(true); }}
              title="Nuevo evento"
            >
              <Plus size={18} />
            </button>
          ) : (
            <button
              className="google-reconnect-pill"
              onClick={reconnectGoogleCalendar}
              title="Sincronizar Google Calendar"
            >
              <RefreshCw size={12} />
              <span>Conectar Google</span>
            </button>
          )}
        </div>

        <div className="item-list">
          {todaysEvents.length === 0 ? (
            <div className="empty-msg">- No hay eventos -</div>
          ) : (
            todaysEvents.map((ev) => (
              <div
                key={ev.id}
                className="event-card-row clickable-row"
                onClick={() => {
                  setEventToEdit(ev);
                  setIsAddEventOpen(true);
                }}
                title="Click para editar evento"
              >
                <div
                  className="event-card-accent"
                  style={{ borderLeftColor: ev.color || 'var(--color-primary)' }}
                >
                  {ev.time && (
                    <span
                      className="event-time-badge"
                      style={{ color: ev.color || 'var(--color-primary)' }}
                    >
                      {ev.time}
                    </span>
                  )}
                  <span className="item-text event-title-text">{ev.title}</span>
                </div>
                <button
                  className="row-action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation(); // <-- Importante para que borrar no abra el modal
                    handleDeleteGoogleEvent(ev.calendarId, ev.id);
                  }}
                  title="Eliminar evento"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 2. SECCIÓN RUTINAS */}
      <section className="panel-section">
        <div className="section-title-row">
          <div className="section-title">
            <CheckSquare size={17} />
            <span>Rutinas</span>
            {!isFuture && todaysHabits.length > 0 && (
              <span className="section-counter-pill">
                {completedHabitsCount}/{todaysHabits.length}
              </span>
            )}
          </div>
          <button
            className="section-icon-btn muted"
            onClick={() => navigate('/habits')}
            title="Configurar rutinas"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Micro barra de progreso de rutinas */}
        {!isFuture && todaysHabits.length > 0 && (
          <div className="habits-progress-track">
            <div
              className={`habits-progress-fill ${habitsProgressPct === 100 ? 'complete' : ''}`}
              style={{ width: `${habitsProgressPct}%` }}
            />
          </div>
        )}

        {isFuture ? (
          <div className="empty-msg">⏳ No puedes completar rutinas del futuro.</div>
        ) : todaysHabits.length === 0 ? (
          <div className="empty-msg">No hay rutinas programadas para hoy.</div>
        ) : (
          <div className="item-list">
            {todaysHabits.map((habit, index) => {
              const isDone = isHabitDone(habit.id);
              return (
                <label
                  key={habit.id}
                  className={`item-row clickable-row animate-in ${isDone ? 'row-done' : ''}`}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={isDone}
                    onChange={(e) => handleToggleHabit(habit.id, e.target.checked)}
                  />
                  <span className={`item-text ${isDone ? 'completed' : ''}`}>{habit.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. SECCIÓN TAREAS */}
      <section className="panel-section">
        <div className="section-title-row">
          <div className="section-title">
            <ListTodo size={17} />
            <span>Tareas de Hoy</span>
            {totalTasksCount > 0 && (
              <span className="section-counter-pill">
                {doneTasksCount}/{totalTasksCount}
              </span>
            )}
          </div>
        </div>

        <div className="item-list">
          {/* A. TAREAS PENDIENTES */}
          {pendingTasks.map((task) => (
            <div key={task.id} className="item-row task-row">
              <input
                type="checkbox"
                className="custom-checkbox"
                checked={task.completed}
                onChange={(e) => handleToggleTask(task.id, e.target.checked)}
              />
              <button
                type="button"
                className="task-title-btn"
                onClick={() => setTaskToEdit(task)}
                title="Ver notas y detalles"
              >
                <span className="item-text">{task.title}</span>
              </button>
              <button
                className="row-action-btn"
                onClick={() => handleDeleteTask(task.id)}
                title="Eliminar tarea"
              >
                <X size={15} />
              </button>
            </div>
          ))}

          {/* B. ACORDEÓN DE COMPLETADAS */}
          {completedTasks.length > 0 && (
            <button
              type="button"
              className="completed-tasks-toggle"
              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
            >
              {showCompletedTasks ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              <span>
                {showCompletedTasks ? 'Ocultar' : 'Mostrar'} completadas ({completedTasks.length})
              </span>
            </button>
          )}

          {/* C. TAREAS COMPLETADAS (Ahora el click en el texto SÍ abre el modal) */}
          {showCompletedTasks &&
            completedTasks.map((task) => (
              <div key={task.id} className="item-row task-row completed-row">
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={task.completed}
                  onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                />
                <button
                  type="button"
                  className="task-title-btn"
                  onClick={() => setTaskToEdit(task)}
                  title="Ver notas y detalles"
                >
                  <span className="item-text completed">{task.title}</span>
                </button>
                <button
                  className="row-action-btn"
                  onClick={() => handleDeleteTask(task.id)}
                  title="Eliminar tarea"
                >
                  <X size={15} />
                </button>
              </div>
            ))}

          {/* D. INPUT PARA NUEVA TAREA */}
          <div className="new-task-input-row">
            <button
              type="button"
              className="new-task-plus-btn"
              onClick={submitNewTask}
              aria-label="Agregar tarea"
            >
              <Plus size={18} />
            </button>
            <input
              type="text"
              className="new-task-input"
              placeholder="Agregar nueva tarea..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleTaskKeyDown}
              enterKeyHint="done"
            />
          </div>
        </div>
      </section>

      {/* 4. SECCIÓN NOTAS */}
      <section className="panel-section">
        <div className="section-title-row">
          <div className="section-title">
            <PenLine size={17} />
            <span>Notas</span>
          </div>
          {noteStatus === 'saving' && <span className="note-status-badge">Guardando...</span>}
          {noteStatus === 'saved' && (
            <span className="note-status-badge saved">
              <Check size={12} /> Guardado
            </span>
          )}
        </div>
        <textarea
          className="notes-area"
          placeholder="Escribe algo sobre tu día..."
          value={localNote}
          onChange={(e) => handleNoteChange(e.target.value)}
          onBlur={handleNoteBlur}
        />
      </section>

      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => {
          setIsAddEventOpen(false);
          setEventToEdit(null);
        }}
        selectedDate={selectedDate}
        eventToEdit={eventToEdit}
        onSuccess={() => {
          onDataChange();
          refreshData();
        }}
      />
      <TaskDetailModal
        task={taskToEdit}
        isOpen={!!taskToEdit}
        onClose={() => setTaskToEdit(null)}
        onSuccess={refreshData}
      />
    </div>
  );
};