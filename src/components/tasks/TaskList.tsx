// File: src/components/tasks/TaskList.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Check, Trash2, Clock, Calendar, Link as LinkIcon, Paperclip, 
  Flag, ArrowUp, ArrowDown, Briefcase, BookOpen, User, Heart, 
  MoreHorizontal, X, Edit, ExternalLink, ListChecks, Info
} from 'lucide-react';
import { useStore } from '../../store';
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { TaskFilters } from './TaskFilters';
import { TaskForm } from './TaskForm';
import { TaskCalendarView } from './TaskCalendarView';
import { Task } from '../../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const categoryIcons = { personal: User, work: Briefcase, study: BookOpen, health: Heart, other: MoreHorizontal };

const TaskItem = ({ task, onToggle, onDelete, onEdit, onToggleSubTask }: { 
  task: Task; 
  onToggle: () => void; 
  onDelete: () => void;
  onEdit: () => void;
  onToggleSubTask: (parentId: string, subTaskId: string) => void;
}) => {
  const [expandedSection, setExpandedSection] = useState<'description' | 'attachments' | 'subtasks' | null>(null);
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : 1,
    boxShadow: isDragging ? '0 10px 15px -3px rgba(255,160,0,0.2), 0 4px 6px -2px rgba(255,160,0,0.1)' : '0 1px 3px rgba(0,0,0,0.2)',
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = parseISO(dateString);
    if (isToday(date)) return 'اليوم'; if (isTomorrow(date)) return 'غدًا'; if (isYesterday(date)) return 'أمس';
    return format(date, 'dd MMMM yyyy', { locale: ar });
  };
  
  const PriorityIcon = () => {
    switch (task.priority) {
      case 'high': return <ArrowUp className="w-3.5 h-3.5 text-red-400" />;
      case 'medium': return <Flag className="w-3.5 h-3.5 text-amber-400" />;
      case 'low': return <ArrowDown className="w-3.5 h-3.5 text-blue-400" />;
      default: return null;
    }
  };
  
  const CategoryIconComponent = categoryIcons[task.category] || MoreHorizontal;
  const handleAttachmentClick = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
  const handleSubtaskUrlClick = (url?: string) => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); };

  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const taskColorClasses = { red: 'bg-red-500/10 border-red-500/20', amber: 'bg-amber-500/10 border-amber-500/20', green: 'bg-green-500/10 border-green-500/20', blue: 'bg-blue-500/10 border-blue-500/20', purple: 'bg-purple-500/10 border-purple-500/20', pink: 'bg-pink-500/10 border-pink-500/20', indigo: 'bg-indigo-500/10 border-indigo-500/20', teal: 'bg-teal-500/10 border-teal-500/20' };
  const buttonColorClasses = { red: 'bg-red-600 hover:bg-red-500', amber: 'bg-amber-600 hover:bg-amber-500', green: 'bg-green-600 hover:bg-green-500', blue: 'bg-blue-600 hover:bg-blue-500', purple: 'bg-purple-600 hover:bg-purple-500', pink: 'bg-pink-600 hover:bg-pink-500', indigo: 'bg-indigo-600 hover:bg-indigo-500', teal: 'bg-teal-600 hover:bg-teal-500' };

  let taskBgClass = 'bg-purple-900/20 border-purple-800/20';
  if (task.completed) taskBgClass = 'bg-green-500/10 border-green-500/20';
  else if (task.color && taskColorClasses[task.color]) taskBgClass = taskColorClasses[task.color];
  
  let toggleButtonBgClass = 'bg-purple-700 hover:bg-purple-600';
  if (task.completed) toggleButtonBgClass = 'bg-green-500 hover:bg-green-400';
  else if (task.color && buttonColorClasses[task.color]) toggleButtonBgClass = buttonColorClasses[task.color];

  const sectionVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, borderTopWidth: 0 },
    visible: { opacity: 1, height: 'auto', marginTop: '0.75rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', borderTopWidth: '1px', transition: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] } },
  };

  const toggleSection = (section: 'description' | 'attachments' | 'subtasks') => setExpandedSection(prev => (prev === section ? null : section));

  return (
    <motion.div ref={setNodeRef} style={style} {...attributes} layout="position"
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
      className={`flex flex-col rounded-xl backdrop-blur-lg border ${taskBgClass} transition-all duration-300 hover:shadow-2xl hover:border-amber-400/30 overflow-hidden`}
    >
      <div className="flex items-start justify-between p-3.5 sm:p-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <motion.button {...listeners} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9, rotate: -10 }} onClick={onToggle} 
            className={`p-2 rounded-full cursor-grab active:cursor-grabbing mt-1 ${toggleButtonBgClass} transition-colors shrink-0 shadow-lg`}
            title={task.completed ? "إلغاء الإكمال" : "إكمال المهمة"}>
            <Check className={`w-4 h-4 ${task.completed ? 'text-white' : 'text-amber-400'}`} />
          </motion.button>
          <div className="flex-1 min-w-0 pt-0.5">
            <span className={`text-white ${task.completed ? 'line-through opacity-60' : ''} break-words font-medium`}>{task.title}</span>
            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-sm text-purple-300 mt-1.5">
              <div className="flex items-center gap-1.5"> <PriorityIcon /> <CategoryIconComponent className="w-4 h-4 text-purple-300" /> </div>
              {task.dueDate && ( <div className="flex items-center gap-1 text-xs"> <Clock className="w-3.5 h-3.5" /> <span>{formatDate(task.dueDate)}</span> </div> )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 ml-2 shrink-0 mt-1">
          {task.description && (<motion.button title="الوصف" onClick={() => toggleSection('description')} whileHover={{scale:1.1}} whileTap={{scale:0.9}} className={`p-1.5 rounded-full hover:bg-purple-700/50 transition-colors ${expandedSection === 'description' ? 'bg-purple-700/60 text-amber-300' : 'text-purple-300'}`}><Info size={16} /></motion.button>)}
          {task.attachments && task.attachments.length > 0 && (<motion.button title="المرفقات" onClick={() => toggleSection('attachments')} whileHover={{scale:1.1}} whileTap={{scale:0.9}} className={`p-1.5 rounded-full hover:bg-purple-700/50 transition-colors relative ${expandedSection === 'attachments' ? 'bg-purple-700/60 text-amber-300' : 'text-purple-300'}`}><Paperclip size={16} /><span className="absolute -top-0.5 -right-0.5 text-[9px] bg-green-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center animate-pulse">{task.attachments.length}</span></motion.button>)}
          {task.subtasks && task.subtasks.length > 0 && (<motion.button title="المهام الفرعية" onClick={() => toggleSection('subtasks')} whileHover={{scale:1.1}} whileTap={{scale:0.9}} className={`p-1.5 rounded-full hover:bg-purple-700/50 transition-colors relative ${expandedSection === 'subtasks' ? 'bg-purple-700/60 text-amber-300' : 'text-purple-300'}`}><ListChecks size={16} /><span className="absolute -top-0.5 -right-0.5 text-[9px] bg-blue-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">{completedSubtasks}/{totalSubtasks}</span></motion.button>)}
          <motion.button title="تعديل" onClick={onEdit} whileHover={{scale:1.1}} whileTap={{scale:0.9}} className="p-1.5 rounded-full hover:bg-purple-700/50 text-purple-300 transition-colors"><Edit size={16} /></motion.button>
          <motion.button title="حذف" onClick={onDelete} whileHover={{scale:1.1}} whileTap={{scale:0.9}} className="p-1.5 rounded-full hover:bg-red-500/30 text-red-400 transition-colors"><Trash2 size={16} /></motion.button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expandedSection === 'description' && task.description && (<motion.div key="description" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden" className="px-4 bg-black/10 border-purple-700/20"><h4 className="text-xs font-semibold text-purple-200 mb-1 pt-2">الوصف:</h4><p className="text-sm text-purple-300/90 whitespace-pre-wrap break-words leading-relaxed pb-2">{task.description}</p></motion.div>)}
        {expandedSection === 'attachments' && task.attachments && task.attachments.length > 0 && (<motion.div key="attachments" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden" className="px-4 bg-black/10 border-purple-700/20"><h4 className="text-xs font-semibold text-purple-200 mb-1.5 pt-2">المرفقات:</h4><div className="space-y-1.5 pb-2 max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600/50 scrollbar-track-transparent pr-1">{task.attachments.map(att => (<motion.button key={att.id} onClick={() => handleAttachmentClick(att.url)} whileHover={{x:2}} className="w-full flex items-center justify-between p-2 bg-purple-800/30 hover:bg-purple-800/50 rounded-md transition-colors text-left group"><div className="flex items-center gap-2 min-w-0">{att.type === 'link' ? <LinkIcon className="w-4 h-4 text-amber-400 shrink-0" /> : <Paperclip className="w-4 h-4 text-amber-400 shrink-0" />}<span className="text-xs text-purple-100 group-hover:text-amber-300 truncate transition-colors">{att.name}</span></div><ExternalLink className="w-3.5 h-3.5 text-purple-400 group-hover:text-amber-300 shrink-0 transition-colors" /></motion.button>))}</div></motion.div>)}
        {expandedSection === 'subtasks' && task.subtasks && task.subtasks.length > 0 && (<motion.div key="subtasks" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden" className="px-4 bg-black/10 border-purple-700/20"><h4 className="text-xs font-semibold text-purple-200 mb-2 pt-2">المهام الفرعية ({completedSubtasks}/{totalSubtasks}):</h4><div className="space-y-2 pb-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600/50 scrollbar-track-transparent pr-1">{task.subtasks.map((sub, index) => (<motion.div key={sub.id} initial={{opacity:0, y:10}} animate={{opacity:1, y:0, transition:{delay:index*0.05}}} className="flex items-center gap-2.5 group bg-purple-800/30 hover:bg-purple-800/40 p-2 rounded-md transition-colors"><span className="text-xs text-purple-400/90 w-5 text-right shrink-0">{index + 1}.</span><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onToggleSubTask(task.id, sub.id)} className={`p-1.5 rounded-full ${sub.completed ? 'bg-green-500 hover:bg-green-600' : 'bg-purple-600/60 hover:bg-purple-600/80'} shrink-0 transition-colors`}><Check className={`w-3 h-3 ${sub.completed ? 'text-white' : 'text-purple-200'}`} /></motion.button><span className={`text-sm ${sub.completed ? 'line-through text-purple-400/80' : 'text-purple-100'} break-words flex-1`}>{sub.title}</span>{sub.url && (<motion.button title={sub.urlAlias || sub.url} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleSubtaskUrlClick(sub.url)} className="p-1 rounded-full text-amber-400 hover:text-amber-300 opacity-70 group-hover:opacity-100 transition-opacity shrink-0"><LinkIcon className="w-3.5 h-3.5" /></motion.button>)}</motion.div>))}</div></motion.div>)}
      </AnimatePresence>
    </motion.div>
  );
};

export const TaskList = () => {
  const { tasks, toggleTask, deleteTask, reorderTasks, toggleSubTask } = useStore();
  const [filter, setFilter] = useState<'active' | 'completed'>('active');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTaskModal, setEditingTaskModal] = useState<Task | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(() => {
    try {
      const saved = localStorage.getItem('taskViewMode') as 'list' | 'calendar';
      return saved || 'calendar';
    } catch { return 'calendar'; }
  });

  useEffect(() => { try { localStorage.setItem('taskViewMode', viewMode); } catch { /* ignore */ } }, [viewMode]);
  
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor));
  
  const filteredTasks = tasks.filter(task => filter === 'active' ? !task.completed : task.completed);
  
  // للحفاظ على الترتيب الذي يحدده المستخدم، يجب أن نعتمد على ترتيب `tasks` الأصلي
  const sortedTasks = filteredTasks.sort((a, b) => {
    const aIndex = tasks.findIndex(t => t.id === a.id);
    const bIndex = tasks.findIndex(t => t.id === b.id);
    return aIndex - bIndex;
  });
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const updatedTasks = Array.from(tasks);
        const [movedTask] = updatedTasks.splice(oldIndex, 1);
        updatedTasks.splice(newIndex, 0, movedTask);
        reorderTasks(updatedTasks);
      }
    }
  };
  
  const handleOpenFormModal = (taskToEdit: Task | null = null, initialDate?: string) => {
    setEditingTaskModal(taskToEdit);
    let dateForForm = initialDate || taskToEdit?.dueDate || (viewMode === 'calendar' ? format(new Date(), 'yyyy-MM-dd') : undefined);
    setFormInitialDate(dateForForm);
    setShowFormModal(true);
  };

  const handleCloseFormModal = () => { setShowFormModal(false); setEditingTaskModal(null); setFormInitialDate(undefined); };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };

  return (
    <div className="space-y-6 sm:space-y-8 relative">
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">المهام اليومية</motion.h2>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8">
        <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => handleOpenFormModal(null)}
          className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-amber-400 text-purple-900 font-bold flex items-center justify-center gap-2 hover:bg-amber-500 transition-all shadow-lg shadow-amber-500/20 text-sm sm:text-base">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> إضافة مهمة
        </motion.button>
        <div className="flex items-center gap-2 sm:gap-3 p-1.5 bg-purple-900/30 rounded-full">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-full flex items-center gap-2 transition-colors text-sm ${viewMode === 'list' ? 'bg-amber-400 text-purple-900' : 'text-white'}`}><ListChecks className="w-5 h-5" /></motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-full flex items-center gap-2 transition-colors text-sm ${viewMode === 'calendar' ? 'bg-amber-400 text-purple-900' : 'text-white'}`}><Calendar className="w-5 h-5" /></motion.button>
        </div>
      </div>
      {viewMode === 'list' && (
        <>
          <TaskFilters filter={filter} onFilterChange={setFilter} />
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3 sm:space-y-4">
                {sortedTasks.length === 0 ? (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-purple-900/30 backdrop-blur-lg rounded-xl p-8 text-center border border-purple-800/30">
                    <Clock className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                    <p className="text-purple-300 text-lg">{filter === 'active' ? 'لا توجد مهام نشطة حاليًا' : 'لا توجد مهام مكتملة'}</p>
                    {filter === 'active' && (<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleOpenFormModal(null)} className="mt-4 px-4 py-2 rounded-lg bg-amber-400 text-purple-900 font-bold flex items-center gap-2 mx-auto hover:bg-amber-500 transition-colors text-sm"><Plus className="w-4 h-4" /> إضافة مهمة جديدة</motion.button>)}
                  </motion.div>
                ) : (
                  sortedTasks.map((task) => (
                    <TaskItem key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} onEdit={() => handleOpenFormModal(task)} onToggleSubTask={toggleSubTask}/>
                  ))
                )}
              </motion.div>
            </SortableContext>
          </DndContext>
        </>
      )}
      {viewMode === 'calendar' && <TaskCalendarView onOpenFormModal={handleOpenFormModal} />}
      <AnimatePresence>
        {showFormModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[50]"
            onClick={handleCloseFormModal}>
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-gradient-to-br from-[#1A0F3C] to-[#12092e] border border-purple-700/50 shadow-2xl rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 sm:p-5 border-b border-purple-800/50 shrink-0">
                <h3 className="text-lg sm:text-xl font-bold text-white">{editingTaskModal ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</h3>
                <motion.button whileHover={{ scale: 1.1, rotate: 90, backgroundColor: 'rgba(129, 140, 248, 0.1)' }} whileTap={{ scale: 0.9 }} onClick={handleCloseFormModal} className="p-2 rounded-full transition-colors"><X className="w-5 h-5 text-purple-300" /></motion.button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-700 scrollbar-track-purple-900/50">
                <TaskForm task={editingTaskModal} initialDate={formInitialDate} onClose={handleCloseFormModal} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};