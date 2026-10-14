import React, { useState } from 'react';
import { X, Upload, Save, Dumbbell, Tag, AlignLeft } from 'lucide-react';
import { createExercise } from '../../services/sportService';
import '../../pages/Sports/ExercisesPage.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SUGGESTED_TAGS = ['Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazos', 'Core', 'Barra', 'Mancuerna', 'Máquina'];

export const CreateExerciseModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const toggleSuggestedTag = (tag: string) => {
    const current = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (current.includes(tag)) {
      setTags(current.filter((t) => t !== tag).join(', '));
    } else {
      setTags([...current, tag].join(', '));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await createExercise(
        {
          name: name.trim(),
          last_weight: Number(weight) || 0,
          tags: tagsArray,
          notes: notes.trim() || undefined,
        },
        file || undefined
      );

      setName('');
      setWeight('');
      setNotes('');
      setFile(null);
      setTags('');

      onSuccess();
      onClose();
    } catch (error) {
      alert('Error creando ejercicio');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <form
        className="task-modal-card"
        style={{ maxWidth: '500px' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="task-modal-drag-handle" />

        <div className="task-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Dumbbell size={18} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
              Nuevo Ejercicio
            </h2>
          </div>
          <button type="button" className="task-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="task-modal-body">
          <input
            className="task-title-input"
            autoFocus
            required
            placeholder="Nombre (ej: Press Banca Inclinado)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="task-meta-grid">
            <div className="meta-field">
              <label>Peso Inicial / Actual (kg)</label>
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                placeholder="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            <div className="meta-field">
              <label>
                <Tag size={13} /> Grupos / Tags
              </label>
              <input
                type="text"
                placeholder="Pecho, Barra..."
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          {/* Sugerencias rápidas de tags con 1 toque */}
          <div className="quick-date-pills">
            {SUGGESTED_TAGS.map((tag) => {
              const isSelected = tags
                .split(',')
                .map((t) => t.trim().toLowerCase())
                .includes(tag.toLowerCase());
              return (
                <button
                  key={tag}
                  type="button"
                  className={`q-date-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleSuggestedTag(tag)}
                >
                  + {tag}
                </button>
              );
            })}
          </div>

          <div className="meta-field">
            <label>
              <AlignLeft size={13} /> Notas de Técnica (Opcional)
            </label>
            <textarea
              className="task-desc-textarea"
              style={{ minHeight: '70px' }}
              placeholder="Ej: Agarre medio, controlar bajada 2 seg, altura del asiento en 4..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="meta-field">
            <label>Video / GIF de Referencia (Opcional)</label>
            <label className="file-upload-box">
              <input
                type="file"
                accept="video/*,image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Upload size={24} />
              <span>
                {file ? (
                  <strong style={{ color: 'var(--color-primary)' }}>{file.name}</strong>
                ) : (
                  'Toca para subir video o GIF corto'
                )}
              </span>
            </label>
          </div>
        </div>

        <div className="task-modal-footer">
          <div />
          <div className="task-footer-right">
            <button type="button" className="task-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="task-btn-save" disabled={loading || !name.trim()}>
              <Save size={16} />
              <span>{loading ? 'Guardando...' : 'Crear Ejercicio'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};