import React, { useEffect, useState } from 'react';
import { Plus, Search, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getExercises } from '../../services/sportService';
import type { Exercise } from '../../types';
import { CreateExerciseModal } from '../../components/Sports/CreateExerciseModal';
import { ExerciseDetailModal } from '../../components/Sports/ExerciseDetailModal'; // Nuevo
import './ExercisesPage.css';

export const ExercisesPage: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filtered, setFiltered] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null); // Para el detalle

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getExercises();
      setExercises(data);
      setFiltered(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const term = search.toLowerCase();
    const results = exercises.filter(ex => 
      ex.name.toLowerCase().includes(term) || 
      ex.tags.some(t => t.toLowerCase().includes(term))
    );
    setFiltered(results);
  }, [search, exercises]);

  return (
    <div className="exercises-container">
      {/* Header y Search (Igual que antes) */}
      <div className="page-header">
        <div>
          <Link to="/sports" style={{display:'flex', alignItems:'center', gap:'5px', color:'var(--color-text-muted)', marginBottom:'5px', textDecoration:'none'}}>
            <ArrowLeft size={16}/> Volver
          </Link>
          <h1 className="page-title">Biblioteca de ejercicios</h1>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="nav-btn" style={{backgroundColor:'var(--color-primary)'}}>
          <Plus size={20}/> Nuevo
        </button>
      </div>

      <div className="search-container">
        <Search size={20} className="search-icon"/>
        <input 
          className="search-bar" placeholder="Buscar ejercicio..." 
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? <p style={{color:'var(--color-text-muted)'}}>Cargando...</p> : (
        <div className="exercises-grid">
          {filtered.map(ex => (
            <div 
              key={ex.id} 
              className="exercise-card"
              onClick={() => setSelectedExercise(ex)} // <--- ABRIR MODAL
            >
              {/* Solo texto y datos claves */}
              <div>
                <div className="exercise-name">{ex.name}</div>
                <div className="exercise-tags">
                  {ex.tags.slice(0, 3).map(t => (
                    <span key={t} className="tag-badge" style={{fontSize:'0.65rem'}}>{t}</span>
                  ))}
                </div>
              </div>
              
              <div className="exercise-meta">
                <span className="exercise-weight-badge">
                  {ex.last_weight > 0 ? `${ex.last_weight} kg` : '-'}
                </span>
                {/* Indicador visual si tiene video */}
                {ex.video_url && <span style={{fontSize:'0.7rem', color:'var(--color-text-muted)'}}>📹 Video</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR */}
      <CreateExerciseModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={loadData}
      />

      {/* MODAL DETALLE (NUEVO) */}
      <ExerciseDetailModal 
        isOpen={!!selectedExercise}
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
        onUpdate={() => { loadData(); setSelectedExercise(null); }}
      />

    </div>
  );
};