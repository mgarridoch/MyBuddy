import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, History, Trophy, AlignLeft, Tag } from 'lucide-react';
import type { Exercise } from '../../types';
import { updateExercise, deleteExercise, getExerciseHistory } from '../../services/sportService';
import '../../pages/Sports/ExercisesPage.css';

interface Props {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const ExerciseDetailModal: React.FC<Props> = ({
  exercise,
  isOpen,
  onClose,
  onUpdate,
}) => {
  // Todos los hooks arriba para respetar las reglas de React
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('0');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');

  const [history, setHistory] = useState<{ date: string; weight: number; reps: number }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (exercise && isOpen) {
      setName(exercise.name);
      setWeight(String(exercise.last_weight || 0));
      setTags((exercise.tags || []).join(', '));
      setNotes(exercise.notes || '');

      // Cargamos el historial automáticamente al abrir para mostrar el progreso de inmediato
      setLoadingHistory(true);
      getExerciseHistory(exercise.id)
        .then(setHistory)
        .catch((err) => console.error(err))
        .finally(() => setLoadingHistory(false));
    }
  }, [exercise, isOpen]);

  if (!exercise || !isOpen) return null;

  const maxWeightPR =
    history.length > 0
      ? Math.max(...history.map((h) => h.weight), Number(weight) || 0)
      : Number(weight) || 0;

  const handleSave = async () => {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await updateExercise(exercise.id, {
        name: name.trim(),
        last_weight: Number(weight) || 0,
        tags: tagsArray,
        notes: notes.trim() || undefined,
      });
      onUpdate();
      onClose();
    } catch (e) {
      alert('Error guardando cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Borrar este ejercicio? Se perderá el historial asociado.')) return;
    try {
      await deleteExercise(exercise.id);
      onUpdate();
      onClose();
    } catch (e) {
      alert('Error borrando ejercicio');
    }
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div
        className="task-modal-card"
        style={{ maxWidth: '540px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="task-modal-drag-handle" />

        {/* HEADER */}
        <div className="task-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
              Detalle del Ejercicio
            </h2>
            {maxWeightPR > 0 && (
              <span className="pr-badge-pill">
                <Trophy size={12} /> PR: {maxWeightPR} kg
              </span>
            )}
          </div>
          <button type="button" className="task-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="task-modal-body">
          {exercise.video_url && (
            <div className="detail-video-container">
              <video src={exercise.video_url} controls loop playsInline />
            </div>
          )}

          <input
            className="task-title-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del ejercicio"
          />

          <div className="task-meta-grid">
            <div className="meta-field">
              <label>Peso Actual (kg)</label>
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            <div className="meta-field">
              <label>
                <Tag size={13} /> Tags (separados por coma)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Pecho, Barra..."
              />
            </div>
          </div>

          <div className="meta-field">
            <label>
              <AlignLeft size={13} /> Notas / Ajustes de máquina
            </label>
            <textarea
              className="task-desc-textarea"
              style={{ minHeight: '70px' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anota altura del asiento, agarre o recordatorios técnicos..."
            />
          </div>

          {/* HISTORIAL DE CARGAS */}
          <div className="history-section-card">
            <div className="history-header-line">
              <History size={15} color="var(--color-primary)" />
              <span>Historial de Sesiones ({history.length})</span>
            </div>

            {loadingHistory ? (
              <p className="history-empty-text">Cargando historial...</p>
            ) : history.length === 0 ? (
              <p className="history-empty-text">Aún no hay entrenamientos registrados.</p>
            ) : (
              <div className="history-scroll-box">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Peso</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 12).map((h, i) => (
                      <tr key={i}>
                        <td>{h.date}</td>
                        <td>
                          <strong>{h.weight} kg</strong>
                        </td>
                        <td>{h.reps > 0 ? `${h.reps} reps` : 'Ajuste manual'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
              disabled={isSaving || !name.trim()}
              onClick={handleSave}
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