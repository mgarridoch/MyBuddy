import React, { useEffect, useState } from 'react';
import { Plus, ArrowLeft, Play, Edit3, Trash2, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRoutines, getRoutineDetails, deleteRoutine } from '../../services/sportService';
import type { Routine, RoutineExercise } from '../../types';
import { RoutineBuilderModal } from '../../components/Sports/RoutineBuilderModal';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useWorkout } from '../../context/WorkoutContext';
import './RoutinesPage.css';

export const RoutinesPage: React.FC = () => {
  const navigate = useNavigate();
  const { startWorkout, activeSession } = useWorkout();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineExercisesMap, setRoutineExercisesMap] = useState<
    Record<number, RoutineExercise[]>
  >({});
  const [loading, setLoading] = useState(true);

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [routineToEdit, setRoutineToEdit] = useState<Routine | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getRoutines();
      setRoutines(data);

      // Cargamos en paralelo los ejercicios de cada rutina para mostrarlos como vista previa
      const detailsEntries = await Promise.all(
        data.map(async (r) => {
          try {
            const details = await getRoutineDetails(r.id);
            return [r.id, details] as const;
          } catch {
            return [r.id, []] as const;
          }
        })
      );
      setRoutineExercisesMap(Object.fromEntries(detailsEntries));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRoutine = async (routine: Routine) => {
    if (activeSession) {
      if (!confirm('Ya tienes un entrenamiento en curso. ¿Quieres reemplazarlo por esta rutina?')) {
        return;
      }
    }
    try {
      const details = routineExercisesMap[routine.id] || (await getRoutineDetails(routine.id));
      if (!details || details.length === 0) {
        alert('Agrega al menos un ejercicio a esta rutina antes de iniciarla.');
        handleEdit(routine);
        return;
      }
      startWorkout(routine, details);
      navigate('/workout-session');
    } catch (e) {
      alert('Error cargando la rutina');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta rutina?')) return;
    try {
      setRoutines((prev) => prev.filter((r) => r.id !== id));
      await deleteRoutine(id);
    } catch (e) {
      alert('Error eliminando rutina');
      loadData();
    }
  };

  const handleEdit = (routine: Routine) => {
    setRoutineToEdit(routine);
    setIsBuilderOpen(true);
  };

  const handleOpenCreate = () => {
    setRoutineToEdit(null);
    setIsBuilderOpen(true);
  };

  return (
    <DashboardLayout isFullWidth={true}>
      <div className="routines-page-wrapper">
        {/* HEADER */}
        <header className="routines-header-card">
          <div className="routines-header-left">
            <button
              type="button"
              className="habits-back-btn"
              onClick={() => navigate('/sports')}
              title="Volver a Deporte"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1>Mis Rutinas</h1>
              <p>Diseña tus planes de entrenamiento, series y repeticiones</p>
            </div>
          </div>

          <button type="button" className="habits-new-primary-btn" onClick={handleOpenCreate}>
            <Plus size={18} />
            <span>Nueva Rutina</span>
          </button>
        </header>

        {/* LISTA DE RUTINAS */}
        {loading ? (
          <div className="routines-empty-state">Cargando tus rutinas...</div>
        ) : routines.length === 0 ? (
          <div className="routines-empty-state">
            <Dumbbell size={42} strokeWidth={1.5} />
            <p>Todavía no tienes ninguna rutina armada</p>
            <button type="button" className="habits-new-primary-btn" onClick={handleOpenCreate}>
              <Plus size={18} /> Crear mi primera rutina
            </button>
          </div>
        ) : (
          <div className="routines-cards-grid">
            {routines.map((routine) => {
              const exList = routineExercisesMap[routine.id] || [];
              const totalSets = exList.reduce((acc, item) => acc + (Number(item.sets) || 0), 0);

              return (
                <div key={routine.id} className="routine-modern-card">
                  <div className="routine-card-top" onClick={() => handleEdit(routine)}>
                    <div>
                      <h3>{routine.name}</h3>
                      <span className="routine-sub-count">
                        {exList.length} ejercicios · {totalSets} series totales
                      </span>
                    </div>

                    <div className="routine-top-icons" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="habit-icon-action"
                        onClick={() => handleEdit(routine)}
                        title="Editar rutina"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        className="habit-icon-action danger"
                        onClick={() => handleDelete(routine.id)}
                        title="Eliminar rutina"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Chips de vista previa de ejercicios */}
                  <div className="routine-preview-chips" onClick={() => handleEdit(routine)}>
                    {exList.length === 0 ? (
                      <span className="empty-ex-chip">Sin ejercicios asignados (toca para editar)</span>
                    ) : (
                      exList.slice(0, 5).map((item, idx) => (
                        <span key={idx} className="ex-preview-chip">
                          {item.exercise?.name} <strong>{item.sets}×{item.reps}</strong>
                        </span>
                      ))
                    )}
                    {exList.length > 5 && (
                      <span className="ex-preview-chip more">+{exList.length - 5} más</span>
                    )}
                  </div>

                  <div className="routine-card-footer">
                    <button
                      type="button"
                      className="routine-start-full-btn"
                      onClick={() => handleStartRoutine(routine)}
                    >
                      <Play size={16} fill="currentColor" />
                      <span>Iniciar Entrenamiento</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <RoutineBuilderModal
          isOpen={isBuilderOpen}
          routineToEdit={routineToEdit}
          onClose={() => setIsBuilderOpen(false)}
          onSuccess={loadData}
        />
      </div>
    </DashboardLayout>
  );
};