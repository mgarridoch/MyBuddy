import React, { useState } from 'react';
import { X, Save, Camera } from 'lucide-react';
import { addProgressEntry } from '../../services/statsService';
import '../../pages/Sports/ExercisesPage.css'; // Reusamos estilos de formularios

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddProgressModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Hoy por defecto
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      // Crear preview local
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return alert("Ingresa tu peso");

    setLoading(true);
    try {
      await addProgressEntry(Number(weight), new Date(date), file || undefined);
      onSuccess();
      onClose();
      // Reset
      setWeight('');
      setFile(null);
      setPreview(null);
    } catch (e) { alert("Error guardando"); } 
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{width:'90%', maxWidth:'400px', height:'auto', padding:'0', flexDirection:'column'}}>
        
        <div style={{padding:'1rem', borderBottom:'1px solid var(--color-border)', display:'flex', justifyContent:'space-between'}}>
          <h3 style={{margin:0, color:'var(--color-primary)'}}>Nuevo Registro</h3>
          <button onClick={onClose}><X size={24}/></button>
        </div>

        <form onSubmit={handleSubmit} style={{padding:'1.5rem'}}>
          
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Peso Corporal (kg)</label>
            <input type="number" step="0.1" className="form-input" autoFocus value={weight} onChange={e => setWeight(e.target.value)} placeholder="Ej: 75.5" />
          </div>

          <div className="form-group">
            <label className="form-label">Foto de Progreso (Opcional)</label>
            <label className="file-upload-box" style={{padding:'1rem', minHeight:'150px'}}>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{display:'none'}} />
              
              {preview ? (
                <div style={{width:'100%', height:'200px', overflow:'hidden', borderRadius:'8px'}}>
                  <img src={preview} alt="Preview" style={{width:'100%', height:'100%', objectFit:'contain'}} />
                </div>
              ) : (
                <>
                  <Camera size={30} style={{marginBottom:'10px', color:'var(--color-secondary)'}} />
                  <span style={{fontSize:'0.9rem'}}>Tocar para subir foto</span>
                </>
              )}
            </label>
          </div>

          <button disabled={loading} type="submit" className="modal-action-btn">
            {loading ? 'Guardando...' : <><Save size={18}/> Guardar Registro</>}
          </button>

        </form>
      </div>
    </div>
  );
};