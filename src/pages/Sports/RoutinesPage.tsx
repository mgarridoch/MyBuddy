import React, { useEffect, useState } from 'react';
import { Plus, ArrowLeft, Play, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getRoutines } from '../../services/sportService';
import type { Routine } from '../../types';
import { RoutineBuilderModal } from '../../components/Sports/RoutineBuilderModal';
import './RoutinesPage.css';

export const RoutinesPage: React.FC = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getRoutines();
      setRoutines(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="routines-container">
      <div className="page-header">
        <div>
          <Link to="/sports" style={{display:'flex', alignItems:'center', gap:'5px', color:'var(--color-text-muted)', marginBottom:'5px', textDecoration:'none'}}>
            <ArrowLeft size={16}/> Volver
          </Link>
          <h1 className="page-title">Mis Rutinas</h1>
        </div>
        <button onClick={() => setIsBuilderOpen(true)} className="nav-btn" style={{backgroundColor:'var(--color-primary)'}}>
          <Plus size={20}/> Crear
        </button>
      </div>

      {loading ? <p>Cargando...</p> : (
        <div className="routines-list">
          {routines.map(routine => (
            <div key={routine.id} className="routine-card">
              <div className="routine-info">
                <h3>{routine.name}</h3>
                <div className="routine-meta">
                  {/* Aquí podríamos mostrar "5 ejercicios" si hacemos un count en el query */}
                  <span>⏳ ~45 min</span>
                </div>
              </div>
              <div style={{display:'flex', gap:'10px'}}>
                 {/* Botón Editar (Placeholder) */}
                 <button style={{padding:'8px', borderRadius:'50%', border:'1px solid var(--color-border)', color:'var(--color-text-muted)'}}>
                   <Edit size={18}/>
                 </button>
                 {/* Botón Jugar/Empezar */}
                 <button style={{padding:'8px 15px', borderRadius:'20px', backgroundColor:'var(--color-primary)', color:'white', display:'flex', alignItems:'center', gap:'5px', fontWeight:600}}>
                   <Play size={16} fill="white"/> Iniciar
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <RoutineBuilderModal 
        isOpen={isBuilderOpen} 
        onClose={() => setIsBuilderOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};