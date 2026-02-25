import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, History } from 'lucide-react';
import type { Exercise } from '../../types';
import { updateExercise, deleteExercise, getExerciseHistory } from '../../services/sportService';
import '../../pages/Sports/ExercisesPage.css';

interface Props {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // Recargar lista principal
}

export const ExerciseDetailModal: React.FC<Props> = ({ exercise, isOpen, onClose, onUpdate }) => {
  if (!exercise || !isOpen) return null;

  // Estados locales para edición
  const [name, setName] = useState(exercise.name);
  const [weight, setWeight] = useState(exercise.last_weight.toString());
  const [tags, setTags] = useState(exercise.tags.join(', '));
  
  // Estados para historial
  const [history, setHistory] = useState<{date: string, weight: number, reps: number}[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Estados de carga/guardado
  const [isSaving, setIsSaving] = useState(false);

  // Reset al abrir
  useEffect(() => {
    setName(exercise.name);
    setWeight(exercise.last_weight.toString());
    setTags(exercise.tags.join(', '));
    setShowHistory(false);
  }, [exercise]);

  // Manejar Guardado
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
      await updateExercise(exercise.id, {
        name,
        last_weight: Number(weight),
        tags: tagsArray
      });
      onUpdate();
      onClose();
    } catch (e) { alert('Error guardando'); }
    finally { setIsSaving(false); }
  };

  // Manejar Borrado
  const handleDelete = async () => {
    if (!confirm('¿Borrar este ejercicio? Se perderá el historial asociado.')) return;
    try {
      await deleteExercise(exercise.id);
      onUpdate();
      onClose();
    } catch (e) { alert('Error borrando'); }
  };

  // Cargar Historial
  const handleLoadHistory = async () => {
    if (showHistory) {
      setShowHistory(false); // Toggle off
      return;
    }
    setLoadingHistory(true);
    try {
      const data = await getExerciseHistory(exercise.id);
      setHistory(data);
      setShowHistory(true);
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{height:'auto', maxHeight:'90vh', overflowY:'auto', flexDirection:'column', padding:'0'}}>
        
        {/* HEADER MODAL */}
        <div style={{padding:'1rem 1.5rem', borderBottom:'1px solid var(--color-border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h2 style={{color:'var(--color-primary)', fontSize:'1.1rem', margin:0}}>Editar Ejercicio</h2>
          <button onClick={onClose}><X size={24} color="var(--color-text-muted)"/></button>
        </div>

        <div style={{padding:'1.5rem'}}>
          
          {/* VIDEO / MEDIA */}
          {exercise.video_url ? (
            <div className="detail-video-container">
              <video src={exercise.video_url} controls loop playsInline />
              {/* Aquí podrías agregar botón para cambiar video en el futuro */}
            </div>
          ) : (
            <div className="detail-video-container" style={{backgroundColor:'var(--color-input-bg)', color:'var(--color-text-muted)', display:'flex', flexDirection:'column', gap:'10px'}}>
              <span>Sin video</span>
              {/* Placeholder para futura funcionalidad de subir video aqui */}
            </div>
          )}

          {/* FORMULARIO EDITABLE */}
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div style={{display:'flex', gap:'1rem'}}>
            <div className="form-group" style={{flex:1}}>
              <label className="form-label">Peso Actual (kg)</label>
              <input type="number" className="form-input" value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
            <div className="form-group" style={{flex:2}}>
              <label className="form-label">Tags</label>
              <input className="form-input" value={tags} onChange={e => setTags(e.target.value)} />
            </div>
          </div>

          {/* BOTONES ACCIÓN */}
          <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
            <button onClick={handleSave} className="nav-btn" style={{flex:1, backgroundColor:'var(--color-primary)', justifyContent:'center'}}>
              {isSaving ? '...' : <><Save size={18}/> Guardar Cambios</>}
            </button>
            <button onClick={handleDelete} className="nav-btn" style={{backgroundColor:'rgba(255, 107, 107, 0.1)', color:'var(--color-danger)', border:'1px solid var(--color-danger)'}}>
              <Trash2 size={18}/>
            </button>
          </div>

          {/* SECCIÓN HISTORIAL */}
          <div className="history-section">
            <button 
              onClick={handleLoadHistory} 
              style={{
                display:'flex', alignItems:'center', gap:'8px', width:'100%', 
                padding:'10px', border:'1px solid var(--color-border)', borderRadius:'8px',
                background:'var(--color-white)', color:'var(--color-text-main)', cursor:'pointer', justifyContent:'center'
              }}
            >
              <History size={18} color="var(--color-primary)"/> 
              {showHistory ? 'Ocultar Historial' : 'Ver Historial de Pesos'}
            </button>

            {loadingHistory && <p style={{textAlign:'center', marginTop:'10px', fontSize:'0.9rem'}}>Cargando...</p>}

            {showHistory && !loadingHistory && (
              history.length > 0 ? (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Peso</th>
                      <th>Reps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td>{h.date}</td>
                        <td>{h.weight} kg</td>
                        <td>{h.reps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{textAlign:'center', marginTop:'10px', fontSize:'0.9rem', color:'var(--color-text-muted)'}}>
                  No hay registros de entrenamiento aún.
                </p>
              )
            )}
          </div>

        </div>
      </div>
    </div>
  );
};