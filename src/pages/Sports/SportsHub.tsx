import React, { useState, useEffect } from 'react';
import { Play, Dumbbell, List, BarChart2, X, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getRoutines } from '../../services/sportService';
import type { Routine } from '../../types';
import './SportsHub.css';
import { DashboardLayout } from '../../components/DashboardLayout'; // Importamos el Layout
import { SettingsModal } from '../../components/Settings/SettingsModal'; 
import { useWorkout } from '../../context/WorkoutContext';
import { getRoutineDetails } from '../../services/sportService';

export const SportsHub: React.FC = () => {
  const navigate = useNavigate();
  const [showSelector, setShowSelector] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  const { startWorkout } = useWorkout();
  const { activeSession } = useWorkout();
  
  // Cargar rutinas para el selector
  useEffect(() => {
    if (showSelector) {
      setLoading(true);
      getRoutines().then(setRoutines).finally(() => setLoading(false));
    }
  }, [showSelector]);

  const handleStartRoutine = async (routine: Routine) => {
  setLoading(true);
  try {
    // Cargar los detalles (ejercicios) de la rutina
    const details = await getRoutineDetails(routine.id);
    // Iniciar el contexto
    startWorkout(routine, details);
    // Navegar
    navigate('/workout-session');
  } catch (e) { alert("Error cargando rutina"); } 
  finally { setLoading(false); }
  };

  return (
    <DashboardLayout isFullWidth={true} onOpenSettings={() => setIsSettingsOpen(true)}>
      <div className="sports-hub-container">
      {/* CENTRADO DEL CONTENIDO */}
      <div className="sports-hub-container">
        
        {/* BOTÓN GIGANTE */}
        <div className="hub-hero">
          {activeSession ? (
            // CASO A: YA ESTÁS ENTRENANDO
            <button 
              className="start-workout-btn" 
              style={{background: 'linear-gradient(135deg, #ff9f43, #ff6b6b)'}} // Color distinto (naranja alerta)
              onClick={() => navigate('/workout-session')}
            >
              <Play size={30} fill="white"/> SEGUIR ENTRENANDO
            </button>
          ) : (
            // CASO B: EMPEZAR DE CERO
            <button className="start-workout-btn" onClick={() => setShowSelector(true)}>
              <Play size={30} fill="white"/> ¡ENTRENAR AHORA!
            </button>
          )}
        
        </div>

        {/* MENÚ DE SECCIONES */}
        <div className="hub-menu-grid" style={{marginTop:'3rem'}}>
          
          <Link to="/routines" className="hub-card">
            <div className="hub-icon-box"><List size={24}/></div>
            <span style={{fontWeight:600}}>Mis Rutinas</span>
            <span style={{fontSize:'0.8rem', color:'var(--color-text-muted)'}}>Crear y editar planes</span>
          </Link>

          <Link to="/exercises" className="hub-card">
            <div className="hub-icon-box"><Dumbbell size={24}/></div>
            <span style={{fontWeight:600}}>Biblioteca</span>
            <span style={{fontSize:'0.8rem', color:'var(--color-text-muted)'}}>Ejercicios y videos</span>
          </Link>

          <Link to="/sportstats" className="hub-card" style={{gridColumn: '1 / -1'}}>
            <div className="hub-icon-box"><BarChart2 size={24}/></div>
            <span style={{fontWeight:600}}>Mi Progreso</span>
            <span style={{fontSize:'0.8rem', color:'var(--color-text-muted)'}}>Peso corporal y fotos</span>
          </Link>

        </div>

      {/* MODAL SELECTOR DE RUTINA (Rápido) */}
      {showSelector && (
        <div className="modal-overlay" onClick={() => setShowSelector(false)}>
          <div className="selector-modal-content" style={{height:'auto', maxHeight:'70vh', padding:'0', width:'90%'}} onClick={e => e.stopPropagation()}>
            <div style={{padding:'15px', borderBottom:'1px solid var(--color-border)', display:'flex', justifyContent:'space-between'}}>
              <h3 style={{margin:0}}>Elige una Rutina</h3>
              <button onClick={() => setShowSelector(false)}><X/></button>
            </div>
            
            <div style={{overflowY:'auto', maxHeight:'300px'}}>
              {loading ? <p style={{padding:'20px', textAlign:'center'}}>Cargando...</p> : (
                routines.length > 0 ? routines.map(r => (
                  <div key={r.id} className="routine-selector-item" onClick={() => handleStartRoutine(r)}>
                    <span style={{fontWeight:600}}>{r.name}</span>
                    <ChevronRight color="var(--color-text-muted)"/>
                  </div>
                )) : (
                  <div style={{padding:'20px', textAlign:'center'}}>
                    <p>No tienes rutinas.</p>
                    <Link to="/routines" style={{color:'var(--color-primary)'}}>Crear una aquí</Link>
                  </div>
                )
              )}
              
              {/* Opción de "Entreno Libre" (Sin rutina) - Futuro */}
              <div className="routine-selector-item" style={{borderTop:'2px solid var(--color-bg)'}}>
                <span style={{color:'var(--color-text-muted)', fontStyle:'italic'}}>Entrenamiento Libre (Próximamente)</span>
              </div>
            </div>
          </div>
        </div>
      )}

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      </div>
      </div>
    </DashboardLayout>
  );
};