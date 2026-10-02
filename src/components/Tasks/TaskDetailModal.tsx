import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar as CalIcon, Folder, Trash2, Save, CheckCircle, Circle, Plus, Tag } from 'lucide-react';
import type { Task } from '../../types';
import { updateTaskDetails, deleteTask } from '../../services/dailyService';
import { useData } from '../../context/DataContext'; // <-- Para leer categorías existentes
import './TaskDetailModal.css';

interface Props {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TaskDetailModal: React.FC<Props> = ({ task, isOpen, onClose, onSuccess }) => {
  if (!isOpen || !task) return null;

  const { allTasks } = useData();

  // Estados del formulario
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [date, setDate] = useState(task.date || '');
  const [category, setCategory] = useState(task.category && task.category !== 'Inbox' ? task.category : '');
  const [completed, setCompleted] = useState(task.completed);
  const [isSaving, setIsSaving] = useState(false);

  // Estado para abrir/cerrar el menú desplegable
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // 1. Extraer categorías únicas ya existentes en la app
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('Personal');
    
    allTasks.forEach(t => {
      // Agregamos todas las categorías excepto 'Inbox' para no ensuciar la lista
      if (t.category && t.category.trim() && t.category !== 'Inbox') {
        cats.add(t.category.trim());
      }
    });

    return Array.from(cats);
  }, [allTasks]);

  // 2. Filtrar categorías según lo que va escribiendo el usuario
  const filteredCategories = useMemo(() => {
    if (!category.trim()) return availableCategories;
    return availableCategories.filter(c => 
      c.toLowerCase().includes(category.toLowerCase())
    );
  }, [availableCategories, category]);

  // Sincronizar cuando cambia la tarea seleccionada
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setDate(task.date || '');
    setCategory(task.category && task.category !== 'Inbox' ? task.category : '');
    setCompleted(task.completed);
    setIsCategoryOpen(false);
  }, [task]);

    const handleSave = async () => {
        if (!title.trim()) return;
        setIsSaving(true);
        try {
        await updateTaskDetails(task.id, {
            title: title.trim(),
            
            // CORRECCIÓN CLAVE: Enviamos null explícito para que SQL lo borre
            description: description.trim() ? description.trim() : null,
            date: date ? date : null, // <-- Si date es "" o vacío, envía null
            
            category: category.trim() ? category.trim() : 'Inbox',
            completed
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="task-modal-card" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="task-modal-header">
          <button 
            type="button"
            onClick={() => setCompleted(!completed)} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: completed ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
          >
            {completed ? <CheckCircle size={22} color="var(--color-primary)" /> : <Circle size={22} />}
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{completed ? 'Completada' : 'Pendiente'}</span>
          </button>
          
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* CUERPO */}
        <div className="task-modal-body">
          
          {/* TÍTULO */}
          <input 
            className="task-title-input"
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Título de la tarea..."
          />

          {/* METADATOS: FECHA Y CATEGORÍA */}
          <div className="task-meta-grid">
            
            {/* FECHA */}
            <div className="meta-field">
              <label><CalIcon size={16} /> Fecha de ejecución</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
              />
              {date && (
                <button type="button" className="btn-clear-date" onClick={() => setDate('')}>
                  Quitar fecha (Mover a Sin Fecha)
                </button>
              )}
            </div>

            {/* CATEGORÍA / COMBOBOX INTELIGENTE */}
            <div className="meta-field">
              <label><Folder size={16} /> Carpeta / Proyecto</label>
              
              <div className="category-input-wrapper">
                <input 
                  type="text" 
                  value={category} 
                  onChange={e => {
                    setCategory(e.target.value);
                    setIsCategoryOpen(true);
                  }}
                  onFocus={() => setIsCategoryOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setIsCategoryOpen(false), 200);
                  }}
                  // CAMBIO: Placeholder descriptivo
                  placeholder="Sin proyecto (Inbox)..."
                />

                {/* DESPLEGABLE FLOTANTE */}
                {isCategoryOpen && (
                  <div className="category-dropdown">
                    {/* Lista de sugerencias existentes */}
                    {filteredCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        className="category-dropdown-item"
                        onMouseDown={e => e.preventDefault()} // Evita que se cierre por el onBlur antes del click
                        onClick={() => handleSelectCategory(cat)}
                      >
                        <Tag size={14} color="var(--color-secondary)" />
                        <span>{cat}</span>
                      </button>
                    ))}

                    {/* Opción si escribió algo nuevo que no existe aún */}
                    {category.trim() && !availableCategories.includes(category.trim()) && (
                      <button
                        type="button"
                        className="category-dropdown-item"
                        style={{ borderTop: '1px dashed var(--color-border)' }}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleSelectCategory(category.trim())}
                      >
                        <Plus size={14} color="var(--color-primary)" />
                        <span>Crear: <strong>"{category.trim()}"</strong></span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* DESCRIPCIÓN */}
          <div className="meta-field">
            <label>Notas y Descripción</label>
            <textarea 
              className="task-desc-textarea"
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalles, enlaces, instrucciones o recordatorios..."
            />
          </div>

        </div>

        {/* FOOTER */}
        <div className="task-modal-footer">
          <button 
            type="button"
            onClick={handleDelete}
            style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
          >
            <Trash2 size={18} /> Eliminar
          </button>

          <button 
            type="button"
            onClick={handleSave} 
            disabled={isSaving}
            className="nav-btn"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '8px 18px' }}
          >
            <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

      </div>
    </div>
  );
};