import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Save, X } from 'lucide-react';
import { HabitRow } from '../components/Habits/HabitRow';
// Importamos las nuevas funciones del servicio
import { getMyHabits, createHabit, deleteHabit, updateHabitFrequency, updateHabitName } from '../services/habitService';
import type { Habit } from '../types';

export const HabitsPage: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para el formulario de creación
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFrequency, setNewFrequency] = useState<number[]>([1, 2, 3, 4, 5]); 

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const data = await getMyHabits();
      setHabits(data);
    } catch (error) {
      console.error('Error cargando rutinas:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGICA DE CREACIÓN ---
  const handleSaveNew = async () => {
    if (!newName.trim()) return;
    try {
      await createHabit(newName, newFrequency);
      setNewName('');
      setIsCreating(false);
      loadHabits(); 
    } catch (error) {
      alert('Error guardando rutina');
    }
  };

  // --- LOGICA DE EDICIÓN (Interactive Row) ---
  
  // 1. Cambiar días (Click en los botones L M M...)
  const handleToggleDay = async (habitId: number, dayId: number) => {
    // Buscamos el hábito en el estado actual
    const habitToUpdate = habits.find(h => h.id === habitId);
    if (!habitToUpdate) return;

    // Calculamos la nueva frecuencia
    let newFreq = [];
    if (habitToUpdate.frequency.includes(dayId)) {
      newFreq = habitToUpdate.frequency.filter(d => d !== dayId); // Quitar
    } else {
      newFreq = [...habitToUpdate.frequency, dayId].sort(); // Agregar
    }

    // Actualización OPTIMISTA (Actualizamos la UI antes de la BD para que se sienta rápido)
    const updatedHabits = habits.map(h => h.id === habitId ? { ...h, frequency: newFreq } : h);
    setHabits(updatedHabits);

    // Guardar en BD
    try {
      await updateHabitFrequency(habitId, newFreq);
    } catch (error) {
      console.error("Error actualizando frecuencia", error);
      loadHabits(); // Revertir si falla
    }
  };

  // 2. Renombrar (Click en Editar)
  const handleRename = async (habitId: number) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Usamos un prompt nativo simple para editar el nombre
    const newNameInput = prompt("Nuevo nombre para la rutina:", habit.name);
    
    if (newNameInput && newNameInput.trim() !== "" && newNameInput !== habit.name) {
      // Actualizar UI
      const updatedHabits = habits.map(h => h.id === habitId ? { ...h, name: newNameInput } : h);
      setHabits(updatedHabits);

      // Guardar en BD
      try {
        await updateHabitName(habitId, newNameInput);
      } catch (error) {
        console.error("Error renombrando", error);
        loadHabits();
      }
    }
  };

  // 3. Eliminar (Click en Eliminar)
  const handleDelete = async (habitId: number) => {
    if (confirm('¿Estás seguro de eliminar esta rutina? Perderás el historial asociado.')) {
      try {
        // UI Optimista
        setHabits(habits.filter(h => h.id !== habitId));
        // BD call
        await deleteHabit(habitId);
      } catch (error) {
        loadHabits();
      }
    }
  };

  // --- RENDER ---
  
  // Helper para el formulario de NUEVA rutina
  const toggleNewFrequencyDay = (dayId: number) => {
    if (newFrequency.includes(dayId)) {
      setNewFrequency(newFrequency.filter(id => id !== dayId));
    } else {
      setNewFrequency([...newFrequency, dayId]);
    }
  };
  const daysRef = [{l:'L',id:1},{l:'M',id:2},{l:'M',id:3},{l:'J',id:4},{l:'V',id:5},{l:'S',id:6},{l:'D',id:7}];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-secondary)', padding: '2rem' }}>
      <div style={{
        maxWidth: '800px', margin: '0 auto', backgroundColor: 'var(--color-bg)',
        borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            <ArrowLeft size={20} /> Volver
          </Link>
          <h1 style={{ textAlign: 'center', color: 'var(--color-primary)', marginTop: '1rem' }}>Tus rutinas</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? <p>Cargando...</p> : habits.map(habit => (
            // AQUI USAMOS EL COMPONENTE INTERACTIVO
            <HabitRow 
              key={habit.id} 
              habit={habit}
              onToggleDay={handleToggleDay}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* FORMULARIO DE CREACIÓN */}
        {isCreating ? (
          <div style={{
            marginTop: '2rem', padding: '1.5rem', border: '2px solid var(--color-primary)',
            borderRadius: 'var(--radius-md)', backgroundColor: 'white'
          }}>
            <h3 style={{color: 'var(--color-primary)', marginBottom: '10px'}}>Nueva Rutina</h3>
            <input 
              autoFocus type="text" placeholder="Ej: Meditar 5 minutos" 
              value={newName} onChange={e => setNewName(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid #ccc', fontSize: '1rem' }}
            />
            <p style={{marginTop: '10px', fontSize: '0.9rem', color: '#666'}}>Días activos:</p>
            
            <div className="days-grid" style={{marginTop: '10px'}}>
              {daysRef.map(d => (
                <button 
                  key={d.id} onClick={() => toggleNewFrequencyDay(d.id)}
                  className={`day-toggle ${newFrequency.includes(d.id) ? 'active' : ''}`}
                >
                  {d.l}
                </button>
              ))}
            </div>
            
            <div style={{display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'flex-end'}}>
              <button onClick={() => setIsCreating(false)} style={{display:'flex', alignItems:'center', gap: '5px', color: '#666'}}>
                <X size={18}/> Cancelar
              </button>
              <button onClick={handleSaveNew} style={{
                backgroundColor: 'var(--color-primary)', color: 'white', padding: '8px 16px',
                borderRadius: 'var(--radius-sm)', display:'flex', alignItems:'center', gap: '5px'
              }}>
                <Save size={18}/> Guardar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsCreating(true)} style={{
            marginTop: '2rem', width: '100%', padding: '1rem', backgroundColor: 'transparent',
            border: '2px dashed var(--color-secondary)', borderRadius: 'var(--radius-md)',
            color: 'var(--color-primary)', fontSize: '1rem', fontWeight: 600,
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'
          }}>
            <Plus size={20} /> Agregar nueva rutina
          </button>
        )}
      </div>
    </div>
  );
};