import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import './HabitRow.css';
import type { Habit } from '../../types';

interface HabitRowProps {
  habit: Habit;
  onToggleDay: (habitId: number, dayId: number) => void;
  onDelete: (habitId: number) => void;
  onRename: (habitId: number) => void;
}

export const HabitRow: React.FC<HabitRowProps> = ({ habit, onToggleDay, onDelete, onRename }) => {
  const days = [
    { label: 'L', id: 1 }, { label: 'M', id: 2 }, { label: 'M', id: 3 }, 
    { label: 'J', id: 4 }, { label: 'V', id: 5 }, { label: 'S', id: 6 }, { label: 'D', id: 7 },
  ];

  return (
    <div className="habit-card">
      <div className="habit-header">
        <span className="habit-name">{habit.name}</span>
      </div>

      {/* Selectores de Días */}
      <div className="days-grid">
        {days.map((day) => {
          const isActive = habit.frequency.includes(day.id);
          return (
            <button 
              key={day.id} 
              className={`day-toggle ${isActive ? 'active' : ''}`}
              title={`Activar/Desactivar ${day.label}`}
              onClick={() => onToggleDay(habit.id, day.id)} // <--- AQUI CONECTAMOS EL CLICK
            >
              {day.label}
            </button>
          );
        })}
      </div>

      {/* Botones de Acción */}
      <div className="actions-container">
        <button 
          className="btn-action btn-edit" 
          onClick={() => onRename(habit.id)}
          title="Renombrar rutina"
        >
          <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
             <Pencil size={14} /> Editar
          </div>
        </button>
        
        <button 
          className="btn-action btn-delete" 
          onClick={() => onDelete(habit.id)}
          title="Eliminar rutina"
        >
          <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
             <Trash2 size={14} /> Eliminar
          </div>
        </button>
      </div>
    </div>
  );
};