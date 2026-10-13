import React, { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import './HabitRow.css';
import type { Habit } from '../../types';

interface HabitRowProps {
  habit: Habit;
  onToggleDay: (habitId: number, dayId: number) => void;
  onDelete: (habitId: number) => void;
  onRename: (habitId: number, newName: string) => void;
}

const DAYS = [
  { label: 'L', id: 1, name: 'Lunes' },
  { label: 'M', id: 2, name: 'Martes' },
  { label: 'X', id: 3, name: 'Miércoles' },
  { label: 'J', id: 4, name: 'Jueves' },
  { label: 'V', id: 5, name: 'Viernes' },
  { label: 'S', id: 6, name: 'Sábado' },
  { label: 'D', id: 7, name: 'Domingo' },
];

export const HabitRow: React.FC<HabitRowProps> = ({
  habit,
  onToggleDay,
  onDelete,
  onRename,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(habit.name);

  const getFrequencyLabel = (freq: number[]) => {
    if (freq.length === 7) return 'Todos los días';
    if (freq.join(',') === '1,2,3,4,5') return 'Lunes a Viernes';
    if (freq.join(',') === '6,7') return 'Fines de semana';
    return `${freq.length} días / sem`;
  };

  const submitRename = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== habit.name) {
      onRename(habit.id, trimmed);
    } else {
      setDraftName(habit.name);
    }
    setIsEditingName(false);
  };

  return (
    <div className="habit-card">
      {/* IZQUIERDA: Nombre + Subtítulo de frecuencia */}
      <div className="habit-header">
        {isEditingName ? (
          <div className="habit-inline-edit">
            <input
              autoFocus
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') {
                  setDraftName(habit.name);
                  setIsEditingName(false);
                }
              }}
              onBlur={submitRename}
            />
            <button type="button" className="inline-icon-btn save" onMouseDown={submitRename}>
              <Check size={15} />
            </button>
            <button
              type="button"
              className="inline-icon-btn"
              onMouseDown={() => {
                setDraftName(habit.name);
                setIsEditingName(false);
              }}
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <div
            className="habit-title-group"
            onClick={() => {
              setDraftName(habit.name);
              setIsEditingName(true);
            }}
            title="Click para renombrar"
          >
            <span className="habit-name">{habit.name}</span>
            <span className="habit-freq-badge">{getFrequencyLabel(habit.frequency)}</span>
          </div>
        )}
      </div>

      {/* CENTRO: Selectores de Días (L M X J V S D) */}
      <div className="habit-controls-right">
        <div className="days-grid">
          {DAYS.map((day) => {
            const isActive = habit.frequency.includes(day.id);
            return (
              <button
                key={day.id}
                type="button"
                className={`day-toggle ${isActive ? 'active' : ''}`}
                title={day.name}
                onClick={() => onToggleDay(habit.id, day.id)}
              >
                {day.label}
              </button>
            );
          })}
        </div>

        {/* DERECHA: Botones de Acción compactos */}
        <div className="actions-container">
          <button
            type="button"
            className="habit-icon-action"
            onClick={() => {
              setDraftName(habit.name);
              setIsEditingName(true);
            }}
            title="Renombrar rutina"
          >
            <Pencil size={15} />
          </button>

          <button
            type="button"
            className="habit-icon-action danger"
            onClick={() => onDelete(habit.id)}
            title="Eliminar rutina"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};