import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar as CalIcon,
  Folder,
  Trash2,
  Save,
  CheckCircle2,
  Circle,
  Plus,
  Tag,
  Sun,
  Sunrise,
  CalendarPlus,
  XCircle,
  AlignLeft,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import type { Task } from '../../types';
import { updateTaskDetails, deleteTask } from '../../services/dailyService';
import { useData } from '../../context/DataContext';
import './TaskDetailModal.css';

interface Props {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TaskDetailModal: React.FC<Props> = ({ task, isOpen, onClose, onSuccess }) => {
  const { allTasks } = useData();

  // Estados del formulario (siempre declarados antes del return condicional)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [completed, setCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Sincronizar cuando cambia la tarea seleccionada
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDate(task.date || '');
      setCategory(task.category && task.category !== 'Inbox' ? task.category : '');
      setCompleted(task.completed);
      setIsCategoryOpen(false);
    }
  }, [task]);

  // 1. Extraer categorías únicas ya existentes
  const availableCategories = useMemo(() => {
    const cats = new Set<string>(['Personal']);
    allTasks.forEach((t) => {
      if (t.category && t.category.trim() && t.category !== 'Inbox') {
        cats.add(t.category.trim());
      }
    });
    return Array.from(cats).sort();
  }, [allTasks]);

  // 2. Filtrar categorías según lo que escribe el usuario
  const filteredCategories = useMemo(() => {
    if (!category.trim()) return availableCategories;
    return availableCategories.filter((c) =>
      c.toLowerCase().includes(category.toLowerCase())
    );
  }, [availableCategories, category]);

  if (!isOpen || !task) return null;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const nextWeekStr = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  const handleSave = async () => {
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await updateTaskDetails(task.id, {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        date: date ? date : null,
        category: category.trim() ? category.trim() : 'Inbox',
        completed,
      });

      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error guardando tarea');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta tarea definitivamente?')) return;
    try {
      await deleteTask(task.id);
      onSuccess();
      onClose();
    } catch (e) {
      alert('Error eliminando tarea');
    }
  };

  const handleSelectCategory = (catName: string) => {
    setCategory(catName);
    setIsCategoryOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="task-modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="task-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* INDICADOR VISUAL DE DRAG EN MÓVIL */}
        <div className="task-modal-drag-handle" />

        {/* HEADER */}
        <div className="task-modal-header">
          <button
            type="button"
            className={`task-status-pill ${completed ? 'is-done' : ''}`}
            onClick={() => setCompleted(!completed)}
          >
            {completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            <span>{completed ? 'Completada' : 'Marcar como lista'}</span>
          </button>

          <button type="button" className="task-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* CUERPO */}
        <div className="task-modal-body">
          {/* TÍTULO */}
          <input
            className={`task-title-input ${completed ? 'completed' : ''}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la tarea..."
            autoFocus
          />

          {/* METADATOS: FECHA Y CATEGORÍA */}
          <div className="task-meta-grid">
            {/* FECHA + PÍLDORAS RÁPIDAS */}
            <div className="meta-field">
              <label>
                <CalIcon size={14} /> Fecha de ejecución
              </label>

              <div className="quick-date-pills">
                <button
                  type="button"
                  className={`q-date-pill ${date === todayStr ? 'active' : ''}`}
                  onClick={() => setDate(todayStr)}
                >
                  <Sun size={12} /> Hoy
                </button>
                <button
                  type="button"
                  className={`q-date-pill ${date === tomorrowStr ? 'active' : ''}`}
                  onClick={() => setDate(tomorrowStr)}
                >
                  <Sunrise size={12} /> Mañana
                </button>
                <button
                  type="button"
                  className={`q-date-pill ${date === nextWeekStr ? 'active' : ''}`}
                  onClick={() => setDate(nextWeekStr)}
                >
                  <CalendarPlus size={12} /> +7d
                </button>
                {date && (
                  <button
                    type="button"
                    className="q-date-pill clear"
                    onClick={() => setDate('')}
                    title="Dejar sin fecha"
                  >
                    <XCircle size={12} /> Sin fecha
                  </button>
                )}
              </div>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* CATEGORÍA / PROYECTO */}
            <div className="meta-field">
              <label>
                <Folder size={14} /> Carpeta / Proyecto
              </label>

              {/* Chips rápidos de carpetas existentes */}
              <div className="quick-date-pills">
                <button
                  type="button"
                  className={`q-date-pill ${!category ? 'active' : ''}`}
                  onClick={() => setCategory('')}
                >
                  Inbox
                </button>
                {availableCategories.slice(0, 3).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`q-date-pill ${category === cat ? 'active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="category-input-wrapper">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setIsCategoryOpen(true);
                  }}
                  onFocus={() => setIsCategoryOpen(true)}
                  onBlur={() => setTimeout(() => setIsCategoryOpen(false), 180)}
                  placeholder="Escribe o elige carpeta (Inbox por defecto)..."
                />

                {isCategoryOpen && (
                  <div className="category-dropdown">
                    <button
                      type="button"
                      className="category-dropdown-item"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectCategory('')}
                    >
                      <Tag size={14} color="var(--color-text-muted)" />
                      <span>Inbox (Sin carpeta)</span>
                    </button>

                    {filteredCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className="category-dropdown-item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectCategory(cat)}
                      >
                        <Tag size={14} color="var(--color-primary)" />
                        <span>{cat}</span>
                      </button>
                    ))}

                    {category.trim() && !availableCategories.includes(category.trim()) && (
                      <button
                        type="button"
                        className="category-dropdown-item create-new"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectCategory(category.trim())}
                      >
                        <Plus size={14} color="var(--color-primary)" />
                        <span>
                          Crear carpeta: <strong>"{category.trim()}"</strong>
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DESCRIPCIÓN */}
          <div className="meta-field">
            <label>
              <AlignLeft size={14} /> Notas y Descripción
            </label>
            <textarea
              className="task-desc-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles, enlaces, subtareas o recordatorios..."
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="task-modal-footer">
          <button type="button" className="task-btn-delete" onClick={handleDelete}>
            <Trash2 size={16} />
            <span>Eliminar</span>
          </button>

          <div className="task-footer-right">
            <button type="button" className="task-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="task-btn-save"
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
            >
              <Save size={16} />
              <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};