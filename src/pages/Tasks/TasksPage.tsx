import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { DashboardLayout } from '../../components/DashboardLayout';
import { format, isBefore, isToday, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, Circle, Calendar as CalIcon, Folder, Plus, Inbox, AlertCircle, Sun, CalendarDays } from 'lucide-react';
import { toggleTask, createTask } from '../../services/dailyService';
import './TasksPage.css';

type FilterType = 'all' | 'today' | 'overdue' | 'upcoming' | 'no-date' | 'category';

export const TasksPage: React.FC = () => {
  const { allTasks, refreshData } = useData();
  
  // Estados de UI
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('Inbox');
  const [newTaskInput, setNewTaskInput] = useState('');

  // 1. EXTRAER CATEGORÍAS ÚNICAS
  const categories = useMemo(() => {
    const cats = new Set(allTasks.map(t => t.category || 'Inbox'));
    return Array.from(cats).sort();
  }, [allTasks]);

  // 2. LÓGICA DE FILTRADO MAGICO
  const filteredTasks = useMemo(() => {
    const today = startOfDay(new Date());

    return allTasks.filter(task => {
      // Si la tarea está completada, generalmente la ocultamos a menos que queramos ver un historial.
      // Por ahora, mostraremos todas, pero las CSS las atenuará. (Puedes cambiar esto para ocultarlas).
      
      if (activeFilter === 'all') return !task.completed; // Solo pendientes
      
      if (activeFilter === 'category') return task.category === selectedCategory && !task.completed;

      if (activeFilter === 'no-date') return !task.date && !task.completed;

      if (task.date && !task.completed) {
        const taskDate = startOfDay(new Date(task.date + 'T00:00:00')); // Evitar zona horaria
        
        if (activeFilter === 'today') return isToday(taskDate);
        if (activeFilter === 'overdue') return isBefore(taskDate, today);
        if (activeFilter === 'upcoming') return isAfter(taskDate, today);
      }
      
      return false;
    });
  }, [allTasks, activeFilter, selectedCategory]);

  // Contadores para el Sidebar
  const counts = useMemo(() => {
    const today = startOfDay(new Date());
    const pending = allTasks.filter(t => !t.completed);

    return {
      all: pending.length,
      today: pending.filter(t => t.date && isToday(startOfDay(new Date(t.date + 'T00:00:00')))).length,
      overdue: pending.filter(t => t.date && isBefore(startOfDay(new Date(t.date + 'T00:00:00')), today)).length,
      upcoming: pending.filter(t => t.date && isAfter(startOfDay(new Date(t.date + 'T00:00:00')), today)).length,
      noDate: pending.filter(t => !t.date).length
    };
  }, [allTasks]);

  // 3. HANDLERS
  const handleToggle = async (taskId: number, currentState: boolean) => {
    // Optimistic update visualmente (opcional) pero dependemos del context
    await toggleTask(taskId, !currentState);
    refreshData();
  };

  const handleQuickAdd = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTaskInput.trim()) {
      // Si estamos en un filtro de fecha, le asignamos esa fecha. Si no, sin fecha.
      let targetDate = undefined;
      if (activeFilter === 'today') targetDate = new Date();
      // Si estamos filtrando por categoría, la creamos en esa categoría
      let targetCat = activeFilter === 'category' ? selectedCategory : 'Inbox';

      await createTask(newTaskInput, targetDate, targetCat);
      setNewTaskInput('');
      refreshData();
    }
  };

  // 4. HELPERS VISUALES
  const getDateBadgeProps = (dateStr?: string) => {
    if (!dateStr) return null;
    const taskDate = startOfDay(new Date(dateStr + 'T00:00:00'));
    const today = startOfDay(new Date());

    if (isToday(taskDate)) return { class: 'today', text: 'Hoy' };
    if (isBefore(taskDate, today)) return { class: 'overdue', text: format(taskDate, "d MMM", { locale: es }) };
    return { class: 'future', text: format(taskDate, "d MMM", { locale: es }) }; // Futuro
  };

  const getTitle = () => {
    switch(activeFilter) {
      case 'all': return 'Todas las Tareas';
      case 'today': return 'Para Hoy';
      case 'overdue': return 'Atrasadas';
      case 'upcoming': return 'Próximamente';
      case 'no-date': return 'Algún Día (Sin fecha)';
      case 'category': return `Proyecto: ${selectedCategory}`;
    }
  };

  return (
    <DashboardLayout isFullWidth={true}>
      <div className="tasks-page-container">
        
        {/* SIDEBAR IZQUIERDA */}
        <div className="tasks-sidebar">
          
          <h3 className="sidebar-section-title">Vistas</h3>
          
          <button className={`filter-btn ${activeFilter==='all'?'active':''}`} onClick={() => setActiveFilter('all')}>
            <div style={{display:'flex', gap:'10px'}}><Inbox size={18}/> Todas</div>
            <span className="filter-count">{counts.all}</span>
          </button>

          <button className={`filter-btn ${activeFilter==='today'?'active':''}`} onClick={() => setActiveFilter('today')}>
            <div style={{display:'flex', gap:'10px'}}><Sun size={18}/> Hoy</div>
            <span className="filter-count">{counts.today}</span>
          </button>

          <button className={`filter-btn ${activeFilter==='upcoming'?'active':''}`} onClick={() => setActiveFilter('upcoming')}>
            <div style={{display:'flex', gap:'10px'}}><CalendarDays size={18}/> Próximas</div>
            <span className="filter-count">{counts.upcoming}</span>
          </button>

          {counts.overdue > 0 && (
            <button className={`filter-btn ${activeFilter==='overdue'?'active':''}`} onClick={() => setActiveFilter('overdue')} style={{color: 'var(--color-danger)'}}>
              <div style={{display:'flex', gap:'10px'}}><AlertCircle size={18}/> Atrasadas</div>
              <span className="filter-count" style={{background: 'rgba(255,0,0,0.1)'}}>{counts.overdue}</span>
            </button>
          )}

          <button className={`filter-btn ${activeFilter==='no-date'?'active':''}`} onClick={() => setActiveFilter('no-date')}>
            <div style={{display:'flex', gap:'10px'}}><Folder size={18}/> Sin Fecha</div>
            <span className="filter-count">{counts.noDate}</span>
          </button>

          <h3 className="sidebar-section-title" style={{marginTop:'2rem'}}>Listas / Proyectos</h3>
          
          {categories.map(cat => (
            <button 
              key={cat}
              className={`filter-btn ${activeFilter==='category' && selectedCategory===cat ? 'active':''}`} 
              onClick={() => { setActiveFilter('category'); setSelectedCategory(cat); }}
            >
              <div style={{display:'flex', gap:'10px'}}><Folder size={16} color="var(--color-secondary)"/> {cat}</div>
            </button>
          ))}

        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="tasks-main">
          
          <div className="tasks-header">
            <h1>{getTitle()}</h1>
            <p style={{color: 'var(--color-text-muted)', margin: 0}}>
              {filteredTasks.length} tareas pendientes en esta vista.
            </p>
          </div>

          <div className="tasks-list-scroll">
            
            {/* INPUT QUICK ADD */}
            <div className="quick-add-task">
              <Plus size={20} color="var(--color-primary)"/>
              <input 
                type="text" 
                placeholder={`Agregar tarea en "${getTitle()}"... (Presiona Enter)`}
                value={newTaskInput}
                onChange={e => setNewTaskInput(e.target.value)}
                onKeyDown={handleQuickAdd}
              />
            </div>

            {/* LISTA DE TARJETAS */}
            {filteredTasks.map(task => {
              const badge = getDateBadgeProps(task.date);

              return (
                <div key={task.id} className="task-card">
                  {/* Botón de Checkbox gigante */}
                  <button 
                    onClick={() => handleToggle(task.id, task.completed)}
                    style={{background:'none', border:'none', cursor:'pointer', marginTop:'2px'}}
                  >
                    {task.completed ? <CheckCircle size={24} color="var(--color-primary)"/> : <Circle size={24} color="var(--color-text-muted)"/>}
                  </button>

                  <div className="task-content">
                    <h3 className="task-title">{task.title}</h3>
                    
                    {task.description && (
                      <p className="task-desc-preview">{task.description}</p>
                    )}

                    <div className="task-meta">
                      {/* BADGE DE FECHA */}
                      {badge ? (
                        <span className={`date-badge ${badge.class}`}>
                          <CalIcon size={12}/> {badge.text}
                        </span>
                      ) : (
                        <span className="date-badge" style={{background:'var(--color-bg)', color:'var(--color-text-muted)'}}>
                          Sin Fecha
                        </span>
                      )}

                      {/* BADGE DE CATEGORÍA */}
                      {task.category !== 'Inbox' && (
                        <span className="category-badge">{task.category}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredTasks.length === 0 && (
              <div style={{textAlign:'center', marginTop:'3rem', color:'var(--color-text-muted)'}}>
                <CheckCircle size={48} opacity={0.2} style={{marginBottom:'10px'}}/>
                <p>Todo limpio por aquí.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};