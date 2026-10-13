import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { DashboardLayout } from '../../components/DashboardLayout';
import { format, isBefore, isToday, isAfter, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircle2,
  Circle,
  Calendar as CalIcon,
  Folder,
  Plus,
  Inbox,
  AlertCircle,
  Sun,
  CalendarDays,
  AlignLeft,
  FolderPlus,
  Check,
  Sparkles,
} from 'lucide-react';
import { toggleTask, createTask } from '../../services/dailyService';
import { TaskDetailModal } from '../../components/Tasks/TaskDetailModal';
import type { Task } from '../../types';
import './TasksPage.css';

type FilterType = 'all' | 'today' | 'overdue' | 'upcoming' | 'no-date' | 'category';

export const TasksPage: React.FC = () => {
  const { allTasks, refreshData } = useData();

  // Estados de navegación y filtros
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('Inbox');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);

  // Estados del Quick Add (Omnibar)
  const [newTaskInput, setNewTaskInput] = useState('');
  const [quickDateMode, setQuickDateMode] = useState<'auto' | 'today' | 'tomorrow' | 'none'>('auto');
  const [quickCategory, setQuickCategory] = useState<string>('');

  // Crear nueva carpeta/proyecto en vivo
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Optimistic UI para que marcar tareas sea en 0ms
  const [optimisticCompleted, setOptimisticCompleted] = useState<Record<number, boolean>>({});
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);

  // Tareas con estado optimista aplicado
  const tasksWithOptimistic = useMemo(() => {
    return allTasks.map((t) => ({
      ...t,
      completed: t.id in optimisticCompleted ? optimisticCompleted[t.id] : t.completed,
    }));
  }, [allTasks, optimisticCompleted]);

  // 1. EXTRAER CATEGORÍAS ÚNICAS + CREADAS EN SESIÓN
  const categories = useMemo(() => {
    const cats = new Set<string>(['Inbox', ...customCategories]);
    tasksWithOptimistic.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort((a, b) => {
      if (a === 'Inbox') return -1;
      if (b === 'Inbox') return 1;
      return a.localeCompare(b);
    });
  }, [tasksWithOptimistic, customCategories]);

  // Contadores por categoría y por vista
  const counts = useMemo(() => {
    const today = startOfDay(new Date());
    const pending = tasksWithOptimistic.filter((t) => !t.completed);

    const byCategory: Record<string, number> = {};
    categories.forEach((c) => (byCategory[c] = 0));
    pending.forEach((t) => {
      const cat = t.category || 'Inbox';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    return {
      all: pending.length,
      today: pending.filter((t) => t.date && isToday(startOfDay(new Date(t.date + 'T00:00:00'))))
        .length,
      overdue: pending.filter(
        (t) => t.date && isBefore(startOfDay(new Date(t.date + 'T00:00:00')), today)
      ).length,
      upcoming: pending.filter(
        (t) => t.date && isAfter(startOfDay(new Date(t.date + 'T00:00:00')), today)
      ).length,
      noDate: pending.filter((t) => !t.date).length,
      byCategory,
    };
  }, [tasksWithOptimistic, categories]);

  // 2. FILTRADO PRINCIPAL
  const { pendingFiltered, completedFiltered } = useMemo(() => {
    const today = startOfDay(new Date());

    const matchesView = (task: Task) => {
      const cat = task.category || 'Inbox';
      if (activeFilter === 'all') return true;
      if (activeFilter === 'category') return cat === selectedCategory;
      if (activeFilter === 'no-date') return !task.date;

      if (task.date) {
        const taskDate = startOfDay(new Date(task.date + 'T00:00:00'));
        if (activeFilter === 'today') return isToday(taskDate);
        if (activeFilter === 'overdue') return isBefore(taskDate, today);
        if (activeFilter === 'upcoming') return isAfter(taskDate, today);
      }
      return false;
    };

    const matching = tasksWithOptimistic.filter(matchesView);

    // Ordenar por fecha más próxima primero
    const sortByDate = (a: Task, b: Task) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return b.id - a.id;
    };

    return {
      pendingFiltered: matching.filter((t) => !t.completed).sort(sortByDate),
      completedFiltered: matching.filter((t) => t.completed).sort(sortByDate),
    };
  }, [tasksWithOptimistic, activeFilter, selectedCategory]);

  // Agrupación inteligente cuando estamos en "Todas" o en una "Categoría"
  const groupedSections = useMemo(() => {
    if (activeFilter !== 'all' && activeFilter !== 'category') {
      return [{ id: 'single', title: null, items: pendingFiltered }];
    }

    const today = startOfDay(new Date());
    const overdue: Task[] = [];
    const todayList: Task[] = [];
    const upcoming: Task[] = [];
    const noDate: Task[] = [];

    pendingFiltered.forEach((task) => {
      if (!task.date) {
        noDate.push(task);
      } else {
        const d = startOfDay(new Date(task.date + 'T00:00:00'));
        if (isBefore(d, today)) overdue.push(task);
        else if (isToday(d)) todayList.push(task);
        else upcoming.push(task);
      }
    });

    const groups: { id: string; title: string | null; tone?: string; items: Task[] }[] = [];
    if (overdue.length > 0)
      groups.push({ id: 'overdue', title: 'Atrasadas', tone: 'danger', items: overdue });
    if (todayList.length > 0)
      groups.push({ id: 'today', title: 'Hoy', tone: 'today', items: todayList });
    if (upcoming.length > 0)
      groups.push({ id: 'upcoming', title: 'Próximamente', tone: 'future', items: upcoming });
    if (noDate.length > 0)
      groups.push({ id: 'nodate', title: 'Sin Fecha / Algún día', items: noDate });

    return groups;
  }, [pendingFiltered, activeFilter]);

  // 3. HANDLERS
  const handleToggle = async (taskId: number, currentState: boolean) => {
    const nextState = !currentState;
    setOptimisticCompleted((prev) => ({ ...prev, [taskId]: nextState }));
    try {
      await toggleTask(taskId, nextState);
      refreshData();
    } catch (e) {
      setOptimisticCompleted((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
    }
  };

  const resolveTargetDate = (): Date | undefined => {
    if (quickDateMode === 'today') return new Date();
    if (quickDateMode === 'tomorrow') return addDays(new Date(), 1);
    if (quickDateMode === 'none') return undefined;
    // Modo 'auto': si estás en la vista "Hoy", se asigna a Hoy
    if (activeFilter === 'today') return new Date();
    return undefined;
  };

  const resolveTargetCategory = (): string => {
    if (quickCategory) return quickCategory;
    if (activeFilter === 'category') return selectedCategory;
    return 'Inbox';
  };

  const submitQuickAdd = async () => {
    const trimmed = newTaskInput.trim();
    if (!trimmed) return;
    setNewTaskInput('');
    await createTask(trimmed, resolveTargetDate(), resolveTargetCategory());
    refreshData();
  };

  const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitQuickAdd();
    }
  };

  const handleCreateCategory = () => {
    const clean = newCategoryName.trim();
    if (!clean) {
      setIsAddingCategory(false);
      return;
    }
    if (!categories.includes(clean)) {
      setCustomCategories((prev) => [...prev, clean]);
    }
    setSelectedCategory(clean);
    setActiveFilter('category');
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // 4. HELPERS VISUALES
  const getDateBadgeProps = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const taskDate = startOfDay(new Date(dateStr + 'T00:00:00'));
    const today = startOfDay(new Date());

    if (isToday(taskDate)) return { className: 'today', text: 'Hoy' };
    if (isBefore(taskDate, today))
      return { className: 'overdue', text: format(taskDate, 'd MMM', { locale: es }) };
    return { className: 'future', text: format(taskDate, 'd MMM', { locale: es }) };
  };

  const getTitle = () => {
    switch (activeFilter) {
      case 'all':
        return 'Todas las Tareas';
      case 'today':
        return 'Para Hoy';
      case 'overdue':
        return 'Atrasadas';
      case 'upcoming':
        return 'Próximamente';
      case 'no-date':
        return 'Sin Fecha';
      case 'category':
        return selectedCategory;
    }
  };

  const renderTaskRow = (task: Task) => {
    const badge = getDateBadgeProps(task.date);
    const showCatBadge =
      task.category &&
      task.category !== 'Inbox' &&
      !(activeFilter === 'category' && selectedCategory === task.category);

    return (
      <div
        key={task.id}
        className={`slim-task-row ${task.completed ? 'completed' : ''}`}
        onClick={() => setSelectedTaskForEdit(task)}
      >
        <button
          type="button"
          className="slim-check-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle(task.id, task.completed);
          }}
          aria-label="Completar tarea"
        >
          {task.completed ? (
            <CheckCircle2 size={20} className="check-icon done" />
          ) : (
            <Circle size={20} className="check-icon pending" />
          )}
        </button>

        <div className="slim-task-body">
          <div className="slim-task-main-line">
            <span className="slim-task-title">{task.title}</span>
            {task.description && (
              <span className="slim-note-indicator" title={task.description}>
                <AlignLeft size={13} />
              </span>
            )}
          </div>
          {task.description && <p className="slim-task-subtext">{task.description}</p>}
        </div>

        <div className="slim-task-badges">
          {showCatBadge && <span className="slim-cat-pill">{task.category}</span>}
          {badge && (
            <span className={`slim-date-pill ${badge.className}`}>
              <CalIcon size={11} />
              {badge.text}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout isFullWidth={true}>
      <div className="tasks-workspace">
        {/* --- SIDEBAR (DESKTOP) / CHIPS HORIZONTALES (MÓVIL) --- */}
        <aside className="tasks-nav-panel">
          <div className="tasks-nav-group">
            <span className="nav-group-label">Vistas</span>
            <div className="nav-chips-row">
              <button
                className={`task-nav-item ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                <Inbox size={16} />
                <span>Todas</span>
                <span className="task-nav-badge">{counts.all}</span>
              </button>

              <button
                className={`task-nav-item ${activeFilter === 'today' ? 'active' : ''}`}
                onClick={() => setActiveFilter('today')}
              >
                <Sun size={16} />
                <span>Hoy</span>
                {counts.today > 0 && <span className="task-nav-badge">{counts.today}</span>}
              </button>

              <button
                className={`task-nav-item ${activeFilter === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveFilter('upcoming')}
              >
                <CalendarDays size={16} />
                <span>Próximas</span>
                {counts.upcoming > 0 && <span className="task-nav-badge">{counts.upcoming}</span>}
              </button>

              {counts.overdue > 0 && (
                <button
                  className={`task-nav-item danger ${activeFilter === 'overdue' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('overdue')}
                >
                  <AlertCircle size={16} />
                  <span>Atrasadas</span>
                  <span className="task-nav-badge danger">{counts.overdue}</span>
                </button>
              )}

              <button
                className={`task-nav-item ${activeFilter === 'no-date' ? 'active' : ''}`}
                onClick={() => setActiveFilter('no-date')}
              >
                <Sparkles size={16} />
                <span>Sin Fecha</span>
                {counts.noDate > 0 && <span className="task-nav-badge">{counts.noDate}</span>}
              </button>
            </div>
          </div>

          <div className="tasks-nav-group projects-group">
            <div className="nav-group-header">
              <span className="nav-group-label">Proyectos / Carpetas</span>
              <button
                type="button"
                className="add-project-btn"
                onClick={() => setIsAddingCategory(true)}
                title="Nueva carpeta"
              >
                <FolderPlus size={15} />
              </button>
            </div>

            {isAddingCategory && (
              <div className="new-project-inline">
                <input
                  type="text"
                  placeholder="Nombre de carpeta..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateCategory();
                    if (e.key === 'Escape') setIsAddingCategory(false);
                  }}
                  autoFocus
                />
                <button type="button" onClick={handleCreateCategory}>
                  <Check size={14} />
                </button>
              </div>
            )}

            <div className="nav-chips-row">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`task-nav-item ${
                    activeFilter === 'category' && selectedCategory === cat ? 'active' : ''
                  }`}
                  onClick={() => {
                    setActiveFilter('category');
                    setSelectedCategory(cat);
                  }}
                >
                  <Folder size={15} className="folder-icon" />
                  <span className="truncate-text">{cat}</span>
                  {(counts.byCategory[cat] || 0) > 0 && (
                    <span className="task-nav-badge">{counts.byCategory[cat]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* --- PANEL PRINCIPAL DE TAREAS --- */}
        <section className="tasks-board">
          {/* Header compacto */}
          <header className="tasks-board-header">
            <div className="tasks-board-title-wrap">
              <h1>{getTitle()}</h1>
              <span className="tasks-subtitle-pill">{pendingFiltered.length} pendientes</span>
            </div>

            {completedFiltered.length > 0 && (
              <button
                type="button"
                className={`toggle-completed-pill ${showCompleted ? 'active' : ''}`}
                onClick={() => setShowCompleted((prev) => !prev)}
              >
                {showCompleted
                  ? `Ocultar completadas (${completedFiltered.length})`
                  : `Ver completadas (${completedFiltered.length})`}
              </button>
            )}
          </header>

          {/* OMNIBAR DE CREACIÓN RÁPIDA */}
          <div className="task-omnibar">
            <div className="omnibar-input-row">
              <button
                type="button"
                className="omnibar-plus-btn"
                onClick={submitQuickAdd}
                aria-label="Crear tarea"
              >
                <Plus size={18} />
              </button>
              <input
                type="text"
                placeholder={`Nueva tarea en "${getTitle()}"...`}
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                onKeyDown={handleQuickAddKeyDown}
                enterKeyHint="done"
              />
            </div>

            {/* Píldoras rápidas de Fecha y Carpeta al crear */}
            <div className="omnibar-options-row">
              <div className="omnibar-pills">
                <button
                  type="button"
                  className={`omni-pill ${
                    quickDateMode === 'today' ||
                    (quickDateMode === 'auto' && activeFilter === 'today')
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() =>
                    setQuickDateMode((prev) => (prev === 'today' ? 'none' : 'today'))
                  }
                >
                  <Sun size={12} /> Hoy
                </button>
                <button
                  type="button"
                  className={`omni-pill ${quickDateMode === 'tomorrow' ? 'selected' : ''}`}
                  onClick={() =>
                    setQuickDateMode((prev) => (prev === 'tomorrow' ? 'none' : 'tomorrow'))
                  }
                >
                  <CalIcon size={12} /> Mañana
                </button>

                <select
                  className="omni-select"
                  value={quickCategory || (activeFilter === 'category' ? selectedCategory : 'Inbox')}
                  onChange={(e) => setQuickCategory(e.target.value)}
                  aria-label="Seleccionar carpeta"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      📁 {cat}
                    </option>
                  ))}
                </select>
              </div>

              {newTaskInput.trim().length > 0 && (
                <button type="button" className="omnibar-submit-btn" onClick={submitQuickAdd}>
                  Guardar
                </button>
              )}
            </div>
          </div>

          {/* LISTA COMPACTA AGRUPADA */}
          <div className="tasks-scroll-area">
            {pendingFiltered.length === 0 ? (
              <div className="tasks-empty-state">
                <CheckCircle2 size={42} strokeWidth={1.5} />
                <p>Todo al día en esta vista</p>
              </div>
            ) : (
              groupedSections.map((group) => (
                <div key={group.id} className="tasks-section-group">
                  {group.title && (
                    <div className={`tasks-group-header ${group.tone || ''}`}>
                      <span>{group.title}</span>
                      <span className="group-count">{group.items.length}</span>
                    </div>
                  )}
                  <div className="tasks-slim-list">{group.items.map(renderTaskRow)}</div>
                </div>
              ))
            )}

            {/* TAREAS COMPLETADAS */}
            {showCompleted && completedFiltered.length > 0 && (
              <div className="tasks-section-group completed-section">
                <div className="tasks-group-header">
                  <span>Completadas</span>
                  <span className="group-count">{completedFiltered.length}</span>
                </div>
                <div className="tasks-slim-list">{completedFiltered.map(renderTaskRow)}</div>
              </div>
            )}
          </div>
        </section>

        <TaskDetailModal
          task={selectedTaskForEdit}
          isOpen={!!selectedTaskForEdit}
          onClose={() => setSelectedTaskForEdit(null)}
          onSuccess={refreshData}
        />
      </div>
    </DashboardLayout>
  );
};