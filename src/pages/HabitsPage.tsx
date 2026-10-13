import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, X, Sparkles, CalendarCheck2 } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { HabitRow } from '../components/Habits/HabitRow';
import {
  createHabit,
  deleteHabit,
  updateHabitFrequency,
  updateHabitName,
} from '../services/habitService';
import { useData } from '../context/DataContext';
import './HabitsPage.css';

const DAYS_REF = [
  { l: 'L', id: 1, full: 'Lun' },
  { l: 'M', id: 2, full: 'Mar' },
  { l: 'X', id: 3, full: 'Mié' },
  { l: 'J', id: 4, full: 'Jue' },
  { l: 'V', id: 5, full: 'Vie' },
  { l: 'S', id: 6, full: 'Sáb' },
  { l: 'D', id: 7, full: 'Dom' },
];

export const HabitsPage: React.FC = () => {
  const navigate = useNavigate();
  const { habits, refreshData } = useData();

  // Estado local optimista para que los clicks en L M X J V S D sean en 0ms
  const [optimisticFreq, setOptimisticFreq] = useState<Record<number, number[]>>({});
  const [optimisticNames, setOptimisticNames] = useState<Record<number, string>>({});
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  // Estado para el formulario de nueva rutina
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFrequency, setNewFrequency] = useState<number[]>([1, 2, 3, 4, 5]);
  const [isSavingNew, setIsSavingNew] = useState(false);

  const visibleHabits = habits
    .filter((h) => !deletedIds.includes(h.id))
    .map((h) => ({
      ...h,
      name: optimisticNames[h.id] ?? h.name,
      frequency: optimisticFreq[h.id] ?? h.frequency,
    }));

  // --- CREAR NUEVA RUTINA ---
  const handleSaveNew = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim() || newFrequency.length === 0 || isSavingNew) return;

    setIsSavingNew(true);
    try {
      await createHabit(newName.trim(), [...newFrequency].sort());
      setNewName('');
      setNewFrequency([1, 2, 3, 4, 5]);
      setIsCreating(false);
      await refreshData();
    } catch (error) {
      alert('Error guardando rutina');
    } finally {
      setIsSavingNew(false);
    }
  };

  // --- CAMBIAR DÍAS (OPTIMISTA) ---
  const handleToggleDay = async (habitId: number, dayId: number) => {
    const habitToUpdate = visibleHabits.find((h) => h.id === habitId);
    if (!habitToUpdate) return;

    const currentFreq = habitToUpdate.frequency;
    const newFreq = currentFreq.includes(dayId)
      ? currentFreq.filter((d) => d !== dayId)
      : [...currentFreq, dayId].sort();

    // Evitamos dejar una rutina con 0 días activos por accidente
    if (newFreq.length === 0) return;

    setOptimisticFreq((prev) => ({ ...prev, [habitId]: newFreq }));

    try {
      await updateHabitFrequency(habitId, newFreq);
      refreshData();
    } catch (error) {
      console.error('Error actualizando frecuencia:', error);
      setOptimisticFreq((prev) => {
        const copy = { ...prev };
        delete copy[habitId];
        return copy;
      });
    }
  };

  // --- RENOMBRAR INLINE (SIN PROMPT DEL NAVEGADOR) ---
  const handleRename = async (habitId: number, updatedName: string) => {
    const clean = updatedName.trim();
    if (!clean) return;

    setOptimisticNames((prev) => ({ ...prev, [habitId]: clean }));
    try {
      await updateHabitName(habitId, clean);
      refreshData();
    } catch (error) {
      console.error('Error renombrando:', error);
      setOptimisticNames((prev) => {
        const copy = { ...prev };
        delete copy[habitId];
        return copy;
      });
    }
  };

  // --- ELIMINAR ---
  const handleDelete = async (habitId: number) => {
    if (!confirm('¿Eliminar esta rutina? Perderás el historial de días completados.')) return;

    setDeletedIds((prev) => [...prev, habitId]);
    try {
      await deleteHabit(habitId);
      refreshData();
    } catch (error) {
      setDeletedIds((prev) => prev.filter((id) => id !== habitId));
    }
  };

  const toggleNewFrequencyDay = (dayId: number) => {
    if (newFrequency.includes(dayId)) {
      if (newFrequency.length > 1) {
        setNewFrequency(newFrequency.filter((id) => id !== dayId));
      }
    } else {
      setNewFrequency([...newFrequency, dayId].sort());
    }
  };

  return (
    <DashboardLayout isFullWidth={true}>
      <div className="habits-page-wrapper">
        {/* CABECERA */}
        <header className="habits-page-header">
          <div className="habits-title-block">
            <button
              type="button"
              className="habits-back-btn"
              onClick={() => navigate('/')}
              title="Volver al calendario"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1>Mis Rutinas</h1>
              <p>Configura qué hábitos quieres trackear cada día de la semana</p>
            </div>
          </div>

          {!isCreating && (
            <button
              type="button"
              className="habits-new-primary-btn"
              onClick={() => setIsCreating(true)}
            >
              <Plus size={18} />
              <span>Nueva rutina</span>
            </button>
          )}
        </header>

        {/* TARJETA CREAR NUEVA RUTINA (INLINE MODERNO) */}
        {isCreating && (
          <form className="habit-create-card animate-in" onSubmit={handleSaveNew}>
            <div className="habit-create-top">
              <Sparkles size={18} color="var(--color-primary)" />
              <input
                autoFocus
                type="text"
                placeholder="Nombre de la rutina (ej: 3H Estudio, Deporte, Leer...)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div className="habit-create-freq-row">
              <div className="freq-presets">
                <span className="freq-label">Frecuencia:</span>
                <button
                  type="button"
                  className={`freq-preset-pill ${
                    newFrequency.length === 7 ? 'active' : ''
                  }`}
                  onClick={() => setNewFrequency([1, 2, 3, 4, 5, 6, 7])}
                >
                  Todos los días
                </button>
                <button
                  type="button"
                  className={`freq-preset-pill ${
                    newFrequency.join(',') === '1,2,3,4,5' ? 'active' : ''
                  }`}
                  onClick={() => setNewFrequency([1, 2, 3, 4, 5])}
                >
                  Lun – Vie
                </button>
                <button
                  type="button"
                  className={`freq-preset-pill ${
                    newFrequency.join(',') === '6,7' ? 'active' : ''
                  }`}
                  onClick={() => setNewFrequency([6, 7])}
                >
                  Finde
                </button>
              </div>

              <div className="days-grid">
                {DAYS_REF.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleNewFrequencyDay(d.id)}
                    className={`day-toggle ${newFrequency.includes(d.id) ? 'active' : ''}`}
                    title={d.full}
                  >
                    {d.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="habit-create-actions">
              <button
                type="button"
                className="task-btn-cancel"
                onClick={() => setIsCreating(false)}
              >
                <X size={15} /> Cancelar
              </button>
              <button
                type="submit"
                className="task-btn-save"
                disabled={!newName.trim() || isSavingNew}
              >
                <Check size={16} />
                <span>{isSavingNew ? 'Guardando...' : 'Crear rutina'}</span>
              </button>
            </div>
          </form>
        )}

        {/* LISTA DE RUTINAS */}
        <div className="habits-list-stack">
          {visibleHabits.length === 0 ? (
            <div className="habits-empty-card">
              <CalendarCheck2 size={42} strokeWidth={1.5} />
              <p>Aún no tienes rutinas configuradas</p>
              <button
                type="button"
                className="habits-new-primary-btn"
                onClick={() => setIsCreating(true)}
              >
                <Plus size={18} /> Crear mi primera rutina
              </button>
            </div>
          ) : (
            visibleHabits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                onToggleDay={handleToggleDay}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};