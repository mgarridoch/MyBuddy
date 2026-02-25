import React, { useState } from 'react';
import { X, Upload, Save, Loader } from 'lucide-react';
import { createExercise } from '../../services/sportService';
import '../../pages/Sports/ExercisesPage.css'; // Reusamos estilos

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateExerciseModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState(''); // Comma separated
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setLoading(true);
    try {
      // Parsear tags
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t !== '');
      
      await createExercise({
        name,
        last_weight: Number(weight) || 0,
        tags: tagsArray
      }, file || undefined);

      // Reset
      setName('');
      setWeight('');
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{height:'auto', maxHeight:'90vh', width:'90%', maxWidth:'500px', flexDirection:'column', padding:'0'}}>
        <div style={{padding:'1.5rem', borderBottom:'1px solid var(--color-border)', display:'flex', justifyContent:'space-between'}}>
          <h2 style={{color:'var(--color-primary)', fontSize:'1.2rem'}}>Nuevo Ejercicio</h2>
          <button onClick={onClose}><X size={24} color="var(--color-text-muted)"/></button>
        </div>

        <form onSubmit={handleSubmit} style={{padding:'1.5rem', overflowY:'auto'}}>
          
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="form-input" autoFocus placeholder="Ej: Press Banca" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Video / GIF (Opcional)</label>
            
            {/* Etiqueta LABEL que actúa como dropzone */}
            <label className="file-upload-box">
              <input type="file" accept="video/*,image/*" onChange={handleFileChange} style={{display:'none'}} />
              
              {/* Icono centrado */}
              <Upload size={32} /> 
              
              {/* Texto */}
              <div style={{fontSize: '0.9rem'}}>
                {file ? (
                  <span style={{color: 'var(--color-primary)', fontWeight: 600}}>{file.name}</span>
                ) : (
                  "Click para subir video o imagen"
                )}
              </div>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Peso Actual (kg)</label>
            <input type="number" className="form-input" placeholder="0" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Tags (separados por coma)</label>
            <input className="form-input" placeholder="Pecho, Barra, Fuerza" value={tags} onChange={e => setTags(e.target.value)} />
          </div>

          <button disabled={loading} type="submit" className="nav-btn" style={{width:'100%', justifyContent:'center', backgroundColor:'var(--color-primary)'}}>
            {loading ? <Loader className="spin" /> : <><Save size={18}/> Guardar Ejercicio</>}
          </button>

        </form>
      </div>
    </div>
  );
};