import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  Search,
  ArrowUp,
  ArrowDown,
  Dumbbell,
  Sparkles,
} from 'lucide-react';
import type { Exercise, Routine, RoutineExercise } from '../../types';
import {
  getExercises,
  createExercise,
  createRoutine,
  addExerciseToRoutine,
  getRoutineDetails,
  updateRoutine,
  clearRoutineExercises,
} from '../../services/sportService';
import '../../pages/Sports/RoutinesPage.css';

interface Props {
  isOpen: boolean;
  routineToEdit?: Routine | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RoutineBuilderModal: React.FC<Props> = ({
  isOpen,
  routineToEdit,
  onClose,
  onSuccess,
}) => {
  const [routineName, setRoutineName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<Partial<RoutineExercise>[]>([]);

  const [library, setLibrary] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [showMobilePicker, setShowMobilePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingQuickEx, setCreatingQuickEx] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getExercises().then(setLibrary);
    setSearch('');
    setShowMobilePicker(false);

    if (routineToEdit) {
      setRoutineName(routineToEdit.name);
      getRoutineDetails(routineToEdit.id).then((details) => {
        setSelectedExercises(details);
      });
    } else {
      setRoutineName('');
      setSelectedExercises([]);
    }
  }, [isOpen, routineToEdit]);

  const handleAddExercise = (ex: Exercise) => {
    setSelectedExercises((prev) => [
      ...prev,
      {
        exercise_id: ex.id,
        exercise: ex,
        sets: 3,
        reps: '10',
        order_index: prev.length,
      },
    ]);
    setShowMobilePicker(false);
  };

  // Crear ejercicio directamente si lo buscó y no existía en la biblioteca
  const handleQuickCreateExercise = async () => {
    const cleanName = search.trim();
    if (!cleanName || creatingQuickEx) return;
    setCreatingQuickEx(true);
    try {
      const created = await createExercise({
        name: cleanName,
        last_weight: 0,
        tags: [],
      });
      setLibrary((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      handleAddExercise(created);
      setSearch('');
    } catch (e) {
      alert('Error creando ejercicio rápido');
    } finally {
      setCreatingQuickEx(false);
    }
  };

  const handleRemove = (index: number) => {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedExercises.length) return;
    const copy = [...selectedExercises];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    setSelectedExercises(copy);
  };

  const handleUpdateRow = (index: number, field: 'sets' | 'reps', value: string) => {
    setSelectedExercises((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, [field]: field === 'sets' ? Number(value) || 1 : value }
          : item
      )
    );
  };

  const handleSave = async () => {
    if (!routineName.trim()) return alert('Ponle un nombre a la rutina');
    if (selectedExercises.length === 0) return alert('Agrega al menos un ejercicio a la rutina');

    setLoading(true);
    try {
      let currentRoutineId: number;

      if (routineToEdit) {
        await updateRoutine(routineToEdit.id, routineName.trim());
        currentRoutineId = routineToEdit.id;
        await clearRoutineExercises(currentRoutineId);
      } else {
        const newRoutine = await createRoutine(routineName.trim());
        currentRoutineId = newRoutine.id;
      }

      for (let i = 0; i < selectedExercises.length; i++) {
        const item = selectedExercises[i];
        if (item.exercise_id) {
          await addExerciseToRoutine(
            currentRoutineId,
            item.exercise_id,
            i,
            Number(item.sets) || 3,
            item.reps || '10'
          );
        }
      }

      onSuccess();
      onClose();
    } catch (e) {
      alert('Error guardando la rutina');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredLibrary = library.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );
  const exactMatchExists = library.some(
    (e) => e.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div
        className="routine-builder-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <header className="builder-modal-header">
          <input
            className="builder-title-input"
            placeholder="Nombre de la rutina (ej: Empuje / Pierna A)..."
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            autoFocus
          />

          <div className="builder-header-actions">
            <button type="button" className="task-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="task-btn-save"
              disabled={loading || !routineName.trim()}
              onClick={handleSave}
            >
              <Save size={16} />
              <span>{loading ? 'Guardando...' : 'Guardar Rutina'}</span>
            </button>
          </div>
        </header>

        {/* BODY DIVIDIDO: EJERCICIOS DE LA RUTINA (IZQ) + CATÁLOGO SIEMPRE VISIBLE EN PC (DER) */}
        <div className="builder-split-body">
          {/* COLUMNA IZQUIERDA: EJERCICIOS SELECCIONADOS */}
          <div className="builder-selected-pane">
            <div className="builder-pane-title">
              <span>Ejercicios en la rutina ({selectedExercises.length})</span>
              <button
                type="button"
                className="mobile-open-catalog-btn"
                onClick={() => setShowMobilePicker(true)}
              >
                <Plus size={15} /> Agregar ejercicio
              </button>
            </div>

            {selectedExercises.length === 0 ? (
              <div className="builder-empty-box">
                <Dumbbell size={34} strokeWidth={1.5} />
                <p>Elige ejercicios del catálogo para armar el orden de tu entrenamiento.</p>
                <button
                  type="button"
                  className="mobile-open-catalog-btn primary"
                  onClick={() => setShowMobilePicker(true)}
                >
                  <Plus size={16} /> Explorar catálogo
                </button>
              </div>
            ) : (
              <div className="builder-rows-list">
                {selectedExercises.map((item, index) => (
                  <div key={`${item.exercise_id}-${index}`} className="builder-ex-row">
                    {/* Botones de orden arriba/abajo */}
                    <div className="builder-order-btns">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'up')}
                        title="Subir"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <span>#{index + 1}</span>
                      <button
                        type="button"
                        disabled={index === selectedExercises.length - 1}
                        onClick={() => handleMove(index, 'down')}
                        title="Bajar"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>

                    <div className="builder-ex-name">
                      <strong>{item.exercise?.name}</strong>
                      {item.exercise?.last_weight ? (
                        <span>Último peso: {item.exercise.last_weight} kg</span>
                      ) : null}
                    </div>

                    <div className="builder-ex-inputs">
                      <div className="mini-field">
                        <label>Series</label>
                        <input
                          type="number"
                          min={1}
                          value={item.sets}
                          onChange={(e) => handleUpdateRow(index, 'sets', e.target.value)}
                        />
                      </div>

                      <div className="mini-field">
                        <label>Reps</label>
                        <input
                          type="text"
                          value={item.reps}
                          onChange={(e) => handleUpdateRow(index, 'reps', e.target.value)}
                        />
                      </div>

                      <button
                        type="button"
                        className="habit-icon-action danger"
                        onClick={() => handleRemove(index)}
                        title="Quitar de la rutina"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: CATÁLOGO DE EJERCICIOS */}
          <aside className={`builder-catalog-pane ${showMobilePicker ? 'mobile-open' : ''}`}>
            <div className="catalog-search-bar">
              <Search size={16} color="var(--color-text-muted)" />
              <input
                type="text"
                placeholder="Buscar o crear ejercicio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {showMobilePicker && (
                <button type="button" onClick={() => setShowMobilePicker(false)}>
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="catalog-items-scroll">
              {search.trim() && !exactMatchExists && (
                <button
                  type="button"
                  className="catalog-quick-create-btn"
                  onClick={handleQuickCreateExercise}
                  disabled={creatingQuickEx}
                >
                  <Sparkles size={15} />
                  <span>
                    Crear y agregar: <strong>"{search.trim()}"</strong>
                  </span>
                </button>
              )}

              {filteredLibrary.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className="catalog-ex-item"
                  onClick={() => handleAddExercise(ex)}
                >
                  <div className="catalog-ex-text">
                    <span>{ex.name}</span>
                    {ex.last_weight > 0 && <small>{ex.last_weight} kg</small>}
                  </div>
                  <Plus size={16} color="var(--color-primary)" />
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};