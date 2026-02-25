import React, { useEffect, useState } from 'react';
import { Plus, ArrowLeft, Play, Edit, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getRoutines, getRoutineDetails, deleteRoutine } from '../../services/sportService';
import type { Routine } from '../../types';
import { RoutineBuilderModal } from '../../components/Sports/RoutineBuilderModal';
import { useWorkout } from '../../context/WorkoutContext';
import './RoutinesPage.css';

export const RoutinesPage: React.FC = () => {
  const navigate = useNavigate();
  const { startWorkout, activeSession } = useWorkout(); // <-- Para iniciar entreno
  
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados del Modal
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [routineToEdit, setRoutineToEdit] = useState<Routine | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getRoutines();
      setRoutines(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // --- HANDLER: INICIAR ---
  const handleStartRoutine = async (routine: Routine) => {
    if (activeSession) {
      if (!confirm("Ya tienes un entrenamiento en curso. ¿Quieres sobrescribirlo?")) return;
    }
    try {
      const details = await getRoutineDetails(routine.id);
      startWorkout(routine, details);
      navigate('/workout-session');
    } catch (e) { alert("Error cargando la rutina"); }
  };

  // --- HANDLER: ELIMINAR ---
  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta rutina?")) return;
    try {
      await deleteRoutine(id);
      loadData(); // Recargar lista
    } catch (e) { alert("Error eliminando rutina"); }
  };

  // --- HANDLER: EDITAR ---
  const handleEdit = (routine: Routine) => {
    setRoutineToEdit(routine);
    setIsBuilderOpen(true);
  };

  const handleOpenCreate = () => {
    setRoutineToEdit(null); // Asegurarnos que esté vacío para crear una nueva
    setIsBuilderOpen(true);
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
        <button onClick={handleOpenCreate} className="nav-btn" style={{backgroundColor:'var(--color-primary)'}}>
          <Plus size={20}/> Crear
        </button>
      </div>

      {loading ? <p>Cargando...</p> : (
        <div className="routines-list">
          {routines.map(routine => (
            <div key={routine.id} className="routine-card">
              <div className="routine-info">
                <h3>{routine.name}</h3>
              </div>
              <div style={{display:'flex', gap:'10px'}}>
                 
                 {/* BOTÓN ELIMINAR */}
                 <button onClick={() => handleDelete(routine.id)} style={{padding:'8px', borderRadius:'50%', border:'none', background:'transparent', color:'var(--color-danger)', cursor:'pointer'}}>
                   <Trash2 size={18}/>
                 </button>
                 
                 {/* BOTÓN EDITAR */}
                 <button onClick={() => handleEdit(routine)} style={{padding:'8px', borderRadius:'50%', border:'1px solid var(--color-border)', color:'var(--color-text-muted)', cursor:'pointer', background:'transparent'}}>
                   <Edit size={18}/>
                 </button>
                 
                 {/* BOTÓN INICIAR */}
                 <button onClick={() => handleStartRoutine(routine)} style={{padding:'8px 15px', borderRadius:'20px', backgroundColor:'var(--color-primary)', color:'white', display:'flex', alignItems:'center', gap:'5px', fontWeight:600, cursor:'pointer', border:'none'}}>
                   <Play size={16} fill="white"/> Iniciar
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CON PROP DE EDICIÓN */}
      <RoutineBuilderModal 
        isOpen={isBuilderOpen} 
        routineToEdit={routineToEdit} // <-- Pasamos la rutina a editar
        onClose={() => setIsBuilderOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};