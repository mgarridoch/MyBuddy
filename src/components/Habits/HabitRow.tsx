import React from 'react';
import './HabitRow.css';

interface HabitRowProps {
  name: string;
  frequency: number[]; // Array de dias, ej: [1, 3, 5] (Lun, Mie, Vie)
}

export const HabitRow: React.FC<HabitRowProps> = ({ name, frequency }) => {
  const days = [
    { label: 'L', id: 1 },
    { label: 'M', id: 2 },
    { label: 'M', id: 3 },
    { label: 'J', id: 4 },
    { label: 'V', id: 5 },
    { label: 'S', id: 6 },
    { label: 'D', id: 7 },
  ];

  return (
    <div className="habit-card">
      <div className="habit-header">
        <span className="habit-name">{name}</span>
      </div>

      {/* Selectores de Días */}
      <div className="days-grid">
        {days.map((day) => {
          const isActive = frequency.includes(day.id);
          return (
            <button 
              key={day.id} 
              className={`day-toggle ${isActive ? 'active' : ''}`}
              title={`Activar ${day.label}`}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      {/* Botones de Acción */}
      <div className="actions-container">
        <button className="btn-action btn-edit">Editar</button>
        <button className="btn-action btn-delete">Eliminar</button>
      </div>
    </div>
  );
};