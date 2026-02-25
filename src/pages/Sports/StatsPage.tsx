import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, Dumbbell, ArrowLeft, Trash2 } from 'lucide-react';
import { getProgressHistory, getStrengthHistory, deleteProgressEntry } from '../../services/statsService';
import { Link } from 'react-router-dom';
import { getExercises } from '../../services/sportService';
import { WeightChart } from '../../components/Stats/WeightChart';
import { DashboardLayout } from '../../components/DashboardLayout';
import { AddProgressModal } from '../../components/Stats/AddProgressModal';
import './StatsPage.css';

export const StatsPage: React.FC = () => {
  const [tab, setTab] = useState<'body' | 'strength'>('body');
  
  // Datos Cuerpo
  const [progressData, setProgressData] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Datos Fuerza
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [strengthData, setStrengthData] = useState<any[]>([]);

  useEffect(() => {
    loadBodyData();
    loadExercises();
  }, []);

  const loadBodyData = async () => {
    const data = await getProgressHistory();

    // Guardar crudos para galería
    setProgressData(data);
  };

  const loadExercises = async () => {
    const exs = await getExercises();
    setExercises(exs);
    if (exs.length > 0) setSelectedExerciseId(exs[0].id.toString());
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm("¿Borrar este registro?")) return;
    try {
      await deleteProgressEntry(id);
      loadBodyData(); // Recargar para que desaparezca
    } catch (e) { alert("Error borrando"); }
  };

  // Cargar gráfico de fuerza cuando cambia el ejercicio seleccionado
  useEffect(() => {
    if (selectedExerciseId) {
      getStrengthHistory(Number(selectedExerciseId)).then(data => {
        setStrengthData(data.map(d => ({ date: d.date, value: d.weight }))); // O d.rm1 si prefieres
      });
    }
  }, [selectedExerciseId]);

  return (
    <DashboardLayout isFullWidth={true}>
      <div className="stats-container">
        
        {/* Header */}
        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'2rem'}}>
          <Link to="/sports" style={{color:'var(--color-text-muted)'}}><ArrowLeft/></Link>
          <h1 className="page-title">Mi Progreso</h1>
        </div>

        {/* TABS */}
        <div className="stats-tabs">
          <button className={`tab-btn ${tab==='body'?'active':''}`} onClick={() => setTab('body')}>
            <TrendingUp size={18}/> Peso Corporal
          </button>
          <button className={`tab-btn ${tab==='strength'?'active':''}`} onClick={() => setTab('strength')}>
            <Dumbbell size={18}/> Fuerza
          </button>
        </div>

        {/* --- PESTAÑA CUERPO --- */}
        {tab === 'body' && (
          <div className="fade-in">
            <div className="chart-card">
              <h3>Evolución de Peso</h3>
              {/* Mapeamos datos para el componente gráfico */}
              <WeightChart data={progressData.map(d => ({date: d.date, value: d.weight}))} />
            </div>

{/* Header de la sección */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'2rem', marginBottom:'1rem'}}>
              <h3>Historial de Registros</h3>
              <button onClick={() => setShowAddModal(true)} className="nav-btn" style={{background:'var(--color-primary)'}}>
                <Plus size={18}/> Registrar
              </button>
            </div>

            {/* Grilla Mixta (Fotos y Solo Textos) */}
            <div className="photos-grid">
              
              {/* Quitamos el .filter(d => d.photo_url) para que salgan TODOS */}
              {progressData.map(entry => (
                <div 
                  key={entry.id} 
                  className="photo-card" 
                  style={{
                    backgroundColor: entry.photo_url ? '#000' : 'var(--color-input-bg)', // Fondo gris si no hay foto
                    border: entry.photo_url ? 'none' : '1px solid var(--color-border)',
                    display: 'flex', flexDirection: 'column'
                  }}
                >
                  
                  {/* SI HAY FOTO */}
                  {entry.photo_url ? (
                    <>
                      <img src={entry.photo_url} alt="Progreso" />
                      <div className="photo-overlay">
                        <span>{entry.date}</span>
                        <strong>{entry.weight} kg</strong>
                      </div>
                    </>
                  ) : (
                    /* SI NO HAY FOTO (Solo peso) */
                    <div style={{
                      flex: 1, display: 'flex', flexDirection: 'column', 
                      alignItems: 'center', justifyContent: 'center', padding: '1rem',
                      color: 'var(--color-text-main)'
                    }}>
                      <span style={{fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '5px'}}>{entry.date}</span>
                      <strong style={{fontSize: '1.8rem', color: 'var(--color-primary)'}}>{entry.weight}</strong>
                      <span style={{fontSize: '0.8rem'}}>kg</span>
                    </div>
                  )}

                  {/* BOTÓN ELIMINAR (Siempre visible) */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEntry(entry.id);
                    }}
                    style={{
                      position: 'absolute', top: '8px', left: '8px', 
                      /* Si hay foto fondo oscuro semitransparente, si no, gris suave */
                      background: entry.photo_url ? 'rgba(0,0,0,0.5)' : 'rgba(255, 107, 107, 0.1)', 
                      border: 'none', borderRadius: '50%',
                      padding: '6px', cursor: 'pointer', color: '#ff6b6b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                    title="Borrar registro"
                  >
                    <Trash2 size={16} />
                  </button>

                </div>
              ))}
              
              {progressData.length === 0 && (
                <p style={{color: 'var(--color-text-muted)', gridColumn: '1 / -1'}}>
                  Aún no tienes registros de peso corporal.
                </p>
              )}
            </div>
          </div>
        )}

        {/* --- PESTAÑA FUERZA --- */}
        {tab === 'strength' && (
          <div className="fade-in">
            <div style={{marginBottom:'1rem'}}>
              <label style={{fontWeight:600, marginRight:'10px'}}>Ejercicio:</label>
              <select 
                className="exercise-select"
                value={selectedExerciseId} 
                onChange={e => setSelectedExerciseId(e.target.value)}
              >
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>

            <div className="chart-card">
              <h3>Progreso en Cargas</h3>
              <WeightChart data={strengthData} color="#ff9f43" unit="kg" />
            </div>
          </div>
        )}

        {/* Modal */}
        <AddProgressModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadBodyData(); // Recargar gráficos y galería
          }}
        />

      </div>
    </DashboardLayout>
  );
};