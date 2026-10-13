import React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  getDay,
  startOfDay,
  isBefore,
  isAfter,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import './CalendarGrid.css';
import { useData } from '../../context/DataContext';

interface CalendarGridProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  refreshTrigger?: number;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  selectedDate,
  onDateSelect,
}) => {
  // Usamos TODOS los datos directamente desde DataContext (Cero llamadas duplicadas a la API)
  const {
    habits,
    habitLogs,
    notes,
    tasks,
    googleEvents,
    currentMonthView,
    setCurrentMonthView,
  } = useData();

  // Rango visual del calendario (Lunes a Domingo)
  const monthStart = startOfMonth(currentMonthView);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // --- CALCULADORA DE PROGRESO EN MEMORIA ---
  const calculateDailyProgress = (day: Date) => {
    const today = startOfDay(new Date());
    if (isAfter(startOfDay(day), today)) return null;

    const dayStr = format(day, 'yyyy-MM-dd');
    let dayOfWeek = getDay(day);
    if (dayOfWeek === 0) dayOfWeek = 7;

    const activeHabits = habits.filter((h) => {
      if (!h.frequency.includes(dayOfWeek)) return false;
      if (h.created_at) {
        const creationDate = startOfDay(new Date(h.created_at));
        if (isBefore(startOfDay(day), creationDate)) return false;
      }
      return true;
    });

    const totalExpected = activeHabits.length;
    if (totalExpected === 0) return null;

    const completedCount = habitLogs.filter(
      (log) => log.date === dayStr && activeHabits.some((h) => h.id === log.habit_id)
    ).length;

    return Math.round((completedCount / totalExpected) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return '#9381ff'; // Violeta (100%)
    if (percentage >= 50) return '#ffd8be';   // Ámbar suave (>=50%)
    return '#ff6b6b';                         // Rojo (<50%)
  };

  const nextMonth = () => setCurrentMonthView(addMonths(currentMonthView, 1));
  const prevMonth = () => setCurrentMonthView(subMonths(currentMonthView, 1));
  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonthView(now);
    onDateSelect(now);
  };

  return (
    <div className="calendar-container">
      {/* CABECERA DEL MES */}
      <div className="calendar-header">
        <button onClick={prevMonth} className="nav-arrow" aria-label="Mes anterior">
          <ChevronLeft size={22} />
        </button>

        <div className="calendar-title-group" onClick={goToCurrentMonth} title="Ir a hoy">
          <span className="month-title">
            {format(currentMonthView, 'MMMM yyyy', { locale: es })}
          </span>
        </div>

        <button onClick={nextMonth} className="nav-arrow" aria-label="Mes siguiente">
          <ChevronRight size={22} />
        </button>
      </div>

      {/* GRILLA DE DÍAS */}
      <div className="calendar-grid">
        {weekDays.map((day) => (
          <div key={day} className="weekday-label">
            {day}
          </div>
        ))}

        {calendarDays.map((day) => {
          const progress = calculateDailyProgress(day);
          const dayStr = format(day, 'yyyy-MM-dd');

          // Eventos de Google del día (desde DataContext)
          const daysEvents = [...googleEvents.filter((e) => e.date === dayStr)];
          daysEvents.sort((a, b) => {
            if (a.isAllDay && !b.isAllDay) return -1;
            if (!a.isAllDay && b.isAllDay) return 1;
            return (a.time || '').localeCompare(b.time || '');
          });

          const hasNote = notes.some((n) => n.date === dayStr && n.content.trim() !== '');
          const dayTasks = tasks.filter((t) => t.date === dayStr);
          const totalTasks = dayTasks.length;
          const completedTasks = dayTasks.filter((t) => t.completed).length;

          const MAX_VISIBLE = 3;
          const visibleEvents = daysEvents.slice(0, MAX_VISIBLE);
          const hiddenCount = daysEvents.length - MAX_VISIBLE;

          const isCurrentMonth = isSameMonth(day, monthStart);
          const isSelected = isSameDay(day, selectedDate);
          const isDayToday = isToday(day);

          return (
            <div
              key={dayStr}
              className={`day-cell ${!isCurrentMonth ? 'inactive' : ''} ${
                isSelected ? 'selected' : ''
              } ${isDayToday ? 'today' : ''}`}
              onClick={() => onDateSelect(day)}
            >
              {/* TOP ROW: Indicadores a la izq + Número del día a la der */}
              <div className="day-cell-top">
                <div className="day-indicators">
                  {hasNote && (
                    <span className="note-indicator" title="Tiene notas">
                      <FileText size={12} />
                    </span>
                  )}

                  {totalTasks > 0 && (
                    <span
                      className={`task-counter-badge ${
                        completedTasks === totalTasks ? 'all-done' : ''
                      }`}
                      title={`${completedTasks} de ${totalTasks} tareas completadas`}
                    >
                      {completedTasks}/{totalTasks}
                    </span>
                  )}
                </div>

                <span className="day-number">{format(day, 'd')}</span>
              </div>

              {/* VISTA DESKTOP: Barras de eventos con texto */}
              <div className="events-list-desktop">
                {visibleEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="event-bar"
                    style={{ backgroundColor: ev.color || 'var(--color-primary)' }}
                    title={`${ev.time ? ev.time + ' ' : ''}${ev.title}`}
                  >
                    {ev.time && <span className="event-bar-time">{ev.time}</span>}
                    <span className="event-bar-title">{ev.title}</span>
                  </div>
                ))}

                {hiddenCount > 0 && <div className="events-more-label">+{hiddenCount} más</div>}
              </div>

              {/* VISTA MÓVIL: Puntos de colores limpios para no romper el ancho de 7 columnas */}
              {daysEvents.length > 0 && (
                <div className="events-dots-mobile">
                  {daysEvents.slice(0, 4).map((ev) => (
                    <span
                      key={ev.id}
                      className="event-dot"
                      style={{ backgroundColor: ev.color || 'var(--color-primary)' }}
                    />
                  ))}
                  {daysEvents.length > 4 && <span className="event-dot-plus">+</span>}
                </div>
              )}

              {/* BARRA DE PROGRESO DE HÁBITOS ABAJO */}
              {isCurrentMonth && progress !== null && (
                <div className="progress-bar-container" title={`${progress}% Rutinas`}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: getProgressColor(progress),
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};