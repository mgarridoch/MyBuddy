import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, 
  subMonths, isToday, getDay, startOfDay, isBefore, parseISO 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './CalendarGrid.css';

// Importamos servicios y tipos
import { getMyHabits, getRangeLogs } from '../../services/habitService';
import type { Habit } from '../../types';

interface CalendarGridProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  refreshTrigger: number; 
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ selectedDate, onDateSelect, refreshTrigger }) => {
  const [currentMonthView, setCurrentMonthView] = useState(new Date());
  
  // DATOS REALES
  const [habits, setHabits] = useState<Habit[]>([]);
  const [monthLogs, setMonthLogs] = useState<{ habit_id: number; date: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Definir rango visual del calendario
  const monthStart = startOfMonth(currentMonthView);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

  // --- CARGAR DATOS AL CAMBIAR DE MES ---
  useEffect(() => {
    const fetchCalendarData = async () => {
      setLoading(true);
      try {
        // 1. Traemos las definiciones de hábitos
        const userHabits = await getMyHabits();
        setHabits(userHabits);

        // 2. Traemos los logs SOLO de lo que se ve en pantalla (optimización)
        const logs = await getRangeLogs(startDate, endDate);
        setMonthLogs(logs);

      } catch (error) {
        console.error("Error cargando calendario:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [currentMonthView, refreshTrigger]); // Se recarga si cambias de mes (click en flechitas) o si cambia refreshTrigger


  // --- CALCULADORA DE PROGRESO ---
  const calculateDailyProgress = (day: Date) => {
    // Si es futuro, no mostrar barra
    if (day > new Date()) return null;

    const dayStr = format(day, 'yyyy-MM-dd');
    let dayOfWeek = getDay(day); 
    if (dayOfWeek === 0) dayOfWeek = 7; // Ajuste Domingo

    // A. Calcular TOTAL esperado para este día
    const activeHabits = habits.filter(h => {
      // 1. ¿Toca hoy según frecuencia?
      if (!h.frequency.includes(dayOfWeek)) return false;
      // 2. ¿Ya existía el hábito en esta fecha?
      if (h.created_at) {
        const creationDate = startOfDay(new Date(h.created_at));
        if (isBefore(day, creationDate)) return false;
      }
      return true;
    });

    const totalExpected = activeHabits.length;

    // Si no había nada que hacer ese día, no mostramos barra (o retornamos null)
    if (totalExpected === 0) return null;

    // B. Calcular COMPLETADOS
    // Filtramos los logs que coincidan con la fecha Y pertenezcan a los hábitos activos
    const completedCount = monthLogs.filter(log => 
      log.date === dayStr && activeHabits.some(h => h.id === log.habit_id)
    ).length;

    // C. Porcentaje
    return Math.round((completedCount / totalExpected) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return '#9381ff'; // Violeta (Perfecto)
    if (percentage >= 50) return '#ffd8be';   // Beige (Medio)
    return '#ff6b6b';                         // Rojo (Bajo)
  };

  const nextMonth = () => setCurrentMonthView(addMonths(currentMonthView, 1));
  const prevMonth = () => setCurrentMonthView(subMonths(currentMonthView, 1));

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={prevMonth} className="nav-arrow"><ChevronLeft size={24} /></button>
        <span className="month-title">{format(currentMonthView, 'MMMM yyyy', { locale: es })}</span>
        <button onClick={nextMonth} className="nav-arrow"><ChevronRight size={24} /></button>
      </div>

      <div className="calendar-grid">
        {weekDays.map(day => <div key={day} className="weekday-label">{day}</div>)}

        {calendarDays.map((day) => {
          const progress = calculateDailyProgress(day);
          
          return (
            <div 
              key={day.toString()}
              className={`day-cell 
                ${!isSameMonth(day, monthStart) ? 'inactive' : ''} 
                ${isSameDay(day, selectedDate) ? 'selected' : ''} 
                ${isToday(day) ? 'today' : ''}
              `}
              onClick={() => onDateSelect(day)}
            >
              <span className="day-number">{format(day, 'd')}</span>
              
              {/* Solo mostrar barra si el cálculo retornó un número (no null) */}
              {isSameMonth(day, monthStart) && progress !== null && (
                <div className="progress-bar-container" title={`${progress}% Completado`}>
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${progress}%`, 
                      backgroundColor: getProgressColor(progress)
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