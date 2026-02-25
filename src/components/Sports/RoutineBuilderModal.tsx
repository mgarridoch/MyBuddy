import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Search } from 'lucide-react';
import type { Exercise, RoutineExercise } from '../../types';
import { getExercises, createRoutine, addExerciseToRoutine,  } from '../../services/sportService';
import '../../pages/Sports/RoutinesPage.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RoutineBuilderModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  // Estado Rutina
  const [routineName, setRoutineName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<Partial<RoutineExercise>[]>([]);
  
  // Estado Biblioteca (para elegir)
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false); // Toggle para mostrar lista de elección

  const [loading, setLoading] = useState(false);

  // Cargar biblioteca al abrir
  useEffect(() => {
    if (isOpen) {
      setRoutineName('');
      setSelectedExercises([]);
      getExercises().then(setLibrary);
    }
  }, [isOpen]);

  // Agregar ejercicio a la lista temporal
  const handleAddExercise = (ex: Exercise) => {
    setSelectedExercises([
      ...selectedExercises,
      {
        exercise_id: ex.id,
        exercise: ex, // Guardamos objeto completo para mostrar nombre
        sets: 3, // Default
        reps: '10',
        order_index: selectedExercises.length
      }
    ]);
    setShowPicker(false);
    setSearch('');
  };

  // Remover de lista temporal
  const handleRemove = (index: number) => {
    const newList = [...selectedExercises];
    newList.splice(index, 1);
    setSelectedExercises(newList);
  };

  // Actualizar Sets/Reps
  const handleUpdateRow = (index: number, field: 'sets'|'reps', value: string) => {
    const newList = [...selectedExercises];
    // @ts-ignore
    newList[index][field] = value;
    setSelectedExercises(newList);
  };

  // GUARDAR TODO
  const handleSave = async () => {
    if (!routineName) return alert("Ponle nombre a la rutina");
    if (selectedExercises.length === 0) return alert("Agrega al menos un ejercicio");

    setLoading(true);
    try {
      // 1. Crear Rutina Cabecera
      const newRoutine = await createRoutine(routineName);

      // 2. Crear Relaciones (Loop)
      // Nota: Idealmente usaríamos una transacción o insert masivo, pero loop simple funciona para MVP
      for (let i = 0; i < selectedExercises.length; i++) {
        const item = selectedExercises[i];
        if (item.exercise_id) {
          await addExerciseToRoutine(newRoutine.id, item.exercise_id, i, item.sets, item.reps);
          // Faltaría actualizar sets/reps custom, pero addExerciseToRoutine usa defaults.
          // FIX RÁPIDO: Actualizar addExerciseToRoutine en sportService para aceptar sets/reps
          // (Te dejaré la tarea de actualizar el servicio, o usaré defaults por ahora)
        }
      }

      onSuccess();
      onClose();
    } catch (e) { alert('Error guardando'); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  const filteredLibrary = library.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{height:'90vh', flexDirection:'column', padding:'0'}}>
        
        {/* HEADER */}
        <div style={{padding:'1rem', borderBottom:'1px solid var(--color-border)', display:'flex', justifyContent:'space-between'}}>
          <input 
            className="form-input" 
            placeholder="Nombre de Rutina (ej: Pierna A)" 
            value={routineName} onChange={e => setRoutineName(e.target.value)}
            style={{fontSize:'1.2rem', fontWeight:700, border:'none', background:'transparent', padding:'0'}}
          />
          <div style={{display:'flex', gap:'10px'}}>
             <button onClick={handleSave} className="nav-btn" style={{backgroundColor:'var(--color-primary)'}}>
               {loading ? '...' : <><Save size={18}/> Guardar</>}
             </button>
             <button onClick={onClose}><X size={24} color="var(--color-text-muted)"/></button>
          </div>
        </div>

        <div style={{display:'flex', flex:1, overflow:'hidden'}}>
          
          {/* COLUMNA IZQ: LISTA DE RUTINA */}
          <div style={{flex:1, padding:'1rem', overflowY:'auto', backgroundColor:'var(--color-bg)'}}>
            {selectedExercises.length === 0 ? (
              <p style={{textAlign:'center', color:'var(--color-text-muted)', marginTop:'50px'}}>
                Tu rutina está vacía. <br/> Agrega ejercicios desde la derecha.
              </p>
            ) : (
              selectedExercises.map((item, index) => (
                <div key={index} className="routine-exercise-row">
                  <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1}}>
                    <span style={{color:'var(--color-text-muted)', fontSize:'0.8rem'}}>#{index+1}</span>
                    <span style={{fontWeight:600}}>{item.exercise?.name}</span>
                  </div>
                  
                  <div className="row-inputs">
                    <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                       <label style={{fontSize:'0.6rem'}}>Sets</label>
                       <input 
                         className="small-input" type="number" style={{color:'var(--color-text-main)'}}
                         value={item.sets} onChange={e => handleUpdateRow(index, 'sets', e.target.value)}
                       />
                    </div>
                    <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                       <label style={{fontSize:'0.6rem'}}>Reps</label>
                       <input 
                         className="small-input" type="text" style={{color:'var(--color-text-main)'}}
                         value={item.reps} onChange={e => handleUpdateRow(index, 'reps', e.target.value)}
                       />
                    </div>
                    <button onClick={() => handleRemove(index)} style={{color:'var(--color-danger)'}}><Trash2 size={18}/></button>
                  </div>
                </div>
              ))
            )}
            
            {/* BOTÓN AGREGAR (Móvil o Desktop) */}
            <button 
              onClick={() => setShowPicker(true)}
              style={{
                width:'100%', padding:'15px', border:'2px dashed var(--color-secondary)',
                borderRadius:'var(--radius-md)', color:'var(--color-primary)', fontWeight:600,
                marginTop:'20px', cursor:'pointer', background:'transparent'
              }}
            >
              + Agregar Ejercicio
            </button>
          </div>

          {/* COLUMNA DER (O MODAL EN MÓVIL): SELECTOR */}
          {showPicker && (
            <div style={{
              width:'300px', borderLeft:'1px solid var(--color-border)', 
              display:'flex', flexDirection:'column', backgroundColor:'var(--color-white)',
              position: window.innerWidth < 768 ? 'fixed' : 'relative', // Fullscreen en móvil
              top:0, bottom:0, right:0, left: window.innerWidth < 768 ? 0 : 'auto',
              zIndex: 2100
            }}>
              <div style={{padding:'10px', borderBottom:'1px solid var(--color-border)', display:'flex', gap:'5px'}}>
                <Search size={18} color="var(--color-text-muted)"/>
                <input 
                  autoFocus
                  placeholder="Buscar ejercicio..." 
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{border:'none', outline:'none', width:'100%', background:'transparent', color:'var(--color-text-main)'}}
                />
                <button onClick={() => setShowPicker(false)}><X size={18}/></button>
              </div>
              
              <div style={{flex:1, overflowY:'auto'}}>
                {filteredLibrary.map(ex => (
                  <div key={ex.id} className="exercise-picker-item" onClick={() => handleAddExercise(ex)}>
                    <span>{ex.name}</span>
                    <Plus size={16} color="var(--color-secondary)"/>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};