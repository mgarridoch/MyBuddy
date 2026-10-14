import React, { useState } from 'react';
import { X, Save, Camera, Scale } from 'lucide-react';
import { addProgressEntry } from '../../services/statsService';
import '../../pages/Sports/ExercisesPage.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddProgressModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || loading) return;

    setLoading(true);
    try {
      await addProgressEntry(Number(weight), new Date(`${date}T12:00:00`), file || undefined);
      onSuccess();
      onClose();
      setWeight('');
      setFile(null);
      setPreview(null);
    } catch (e) {
      alert('Error guardando registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <form
        className="task-modal-card"
        style={{ maxWidth: '420px' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="task-modal-drag-handle" />

        <div className="task-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={18} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
              Registrar Peso / Progreso
            </h2>
          </div>
          <button type="button" className="task-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="task-modal-body">
          <div className="task-meta-grid">
            <div className="meta-field">
              <label>Peso Corporal (kg)</label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                required
                autoFocus
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ej: 75.5"
              />
            </div>

            <div className="meta-field">
              <label>Fecha</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="meta-field">
            <label>Foto de Progreso (Opcional)</label>
            <label className="file-upload-box" style={{ minHeight: '140px' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {preview ? (
                <div style={{ width: '100%', height: '170px', overflow: 'hidden', borderRadius: '8px' }}>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <>
                  <Camera size={28} color="var(--color-primary)" />
                  <span>Toca para elegir o tomar una foto</span>
                </>
              )}
            </label>
          </div>
        </div>

        <div className="task-modal-footer">
          <div />
          <div className="task-footer-right">
            <button type="button" className="task-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="task-btn-save" disabled={loading || !weight}>
              <Save size={16} />
              <span>{loading ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};