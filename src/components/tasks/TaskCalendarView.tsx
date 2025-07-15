// File: src/components/tasks/TaskCalendarView.tsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import { ar } from 'date-fns/locale';
import { format, isToday, parseISO, isSameDay } from 'date-fns';
import { useStore } from '../../store';
import {
  Plus, Calendar, Check, Flag, ArrowUp, ArrowDown, Paperclip, X,
  ExternalLink, Link as LinkIcon, Edit, ListChecks, Info,
  BookOpen, User, Briefcase, Heart, MoreHorizontal
} from 'lucide-react';
import { Task, SubTask, TaskPriority, TaskCategory } from '../../types';
import 'react-day-picker/dist/style.css';

const categoryIconsCalendar = {
  personal: User,
  work: Briefcase,
  study: BookOpen,
  health: Heart,
  other: MoreHorizontal
};

// --- MODIFIED dayPickerClassNames for Calendar Styles ---
const dayPickerClassNames = {
  root: 'bg-[#2D1B69]/30 backdrop-blur-xl rounded-xl p-3 md:p-4 text-white text-sm border border-purple-700/30 shadow-lg w-full',
  caption: 'flex items-center justify-center mb-2 sm:mb-3',
  caption_label: 'text-base sm:text-lg font-bold mx-2 text-purple-100',
  nav: 'flex items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-3 px-1 sm:px-2',
  nav_button: 'p-1.5 sm:p-2 rounded-full bg-purple-800/70 text-purple-200 hover:bg-purple-700/90 hover:scale-[1.03] active:scale-95 transition-all duration-200 ease-in-out',
  table: 'w-full border-collapse text-center text-xs sm:text-sm',
  head_row: 'border-b border-purple-700/50',
  head_cell: 'py-2 sm:py-2.5 font-bold text-xs sm:text-sm text-amber-400',
  row: '',
  cell: 'p-0.5 sm:p-1 relative',
  day: 'rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center mx-auto text-sm font-medium !text-purple-50 cursor-pointer transition-all duration-200 ease-in-out hover:bg-[rgba(245,158,11,0.2)] hover:scale-[1.04] focus:outline-none focus:ring-1 focus:ring-amber-400 focus:ring-opacity-70',
  day_selected: '!bg-[#f59e0b] !text-white font-bold shadow-md shadow-amber-600/25 scale-100 hover:!bg-opacity-90 hover:scale-[1.02] transition-all duration-200 ease-in-out',
  day_today: 'border-2 !border-red-500 !text-red-300 font-bold',
  day_outside: 'text-purple-500/50 opacity-50 hover:bg-transparent hover:scale-100 !text-purple-400/60',
  day_disabled: 'text-purple-500/30 opacity-40 hover:bg-transparent hover:scale-100 !text-purple-400/40',
  day_hasTasks: '!bg-[#f59e0b]/50 hover:!bg-[#f59e0b]/65 !text-white font-semibold hover:scale-[1.04]',
  day_hasAllTasksCompleted: '!bg-[#22c55e]/50 hover:!bg-[#22c55e]/65 !text-white font-semibold hover:scale-[1.04]',
};
// --- END MODIFIED dayPickerClassNames ---

interface TaskCalendarViewProps {
  onOpenFormModal: (task: Task | null, initialDate?: string) => void;
}

export const TaskCalendarView = ({ onOpenFormModal }: TaskCalendarViewProps) => {
  const { tasks, getTasksForDate, toggleTask, deleteTask, toggleSubTask } = useStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expandedCalendarItem, setExpandedCalendarItem] = useState<{ taskId: string, section: 'description' | 'attachments' | 'subtasks' } | null>(null);

  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const tasksColumnRef = useRef<HTMLDivElement>(null);

  const formattedDateForFiltering = format(selectedDate, 'yyyy-MM-dd');
  const displayDate = format(selectedDate, 'EEEE dd MMMM yyyy', { locale: ar });
  const tasksForDate = getTasksForDate(formattedDateForFiltering);

  useEffect(() => {
    if (calendarWrapperRef.current && tasksColumnRef.current) {
      const timer = setTimeout(() => {
        if (calendarWrapperRef.current && tasksColumnRef.current) {
          const calendarHeight = calendarWrapperRef.current.offsetHeight;
          tasksColumnRef.current.style.maxHeight = `${calendarHeight}px`;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedDate, tasksForDate]);

  const modifiers = {
    hasTasks: (date: Date) => {
      const tasksOnThisDate = tasks.filter(t =>
        t && typeof t.completed === 'boolean' && t.dueDate && isSameDay(parseISO(t.dueDate), date)
      );
      return tasksOnThisDate.length > 0 && tasksOnThisDate.some(t => !t.completed);
    },
    hasAllTasksCompleted: (date: Date) => {
      const tasksOnThisDate = tasks.filter(t =>
        t && typeof t.completed === 'boolean' && t.dueDate && isSameDay(parseISO(t.dueDate), date)
      );
      if (tasksOnThisDate.length === 0) return false;
      return tasksOnThisDate.every(t => t.completed);
    }
  };

  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return <ArrowUp className="w-3 h-3 text-red-400/90" />;
      case 'medium': return <Flag className="w-3 h-3 text-amber-400/90" />;
      case 'low': return <ArrowDown className="w-3 h-3 text-blue-400/90" />;
      default: return null;
    }
  };

  const getCategoryIcon = (category: TaskCategory) => {
    const Icon = categoryIconsCalendar[category] || MoreHorizontal;
    return <Icon className="w-3 h-3 text-purple-300/80" />;
  };

  const handleAttachmentClick = (url: string) => window.open(url, '_blank');
  const handleSubtaskUrlClick = (url?: string) => { if (url) window.open(url, '_blank'); };

  const toggleCalendarItemSection = (taskId: string, section: 'description' | 'attachments' | 'subtasks') => {
    setExpandedCalendarItem(prev =>
      (prev?.taskId === taskId && prev?.section === section) ? null : { taskId, section }
    );
  };

  const sectionVariantsCal = {
    hidden: { opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, borderTopWidth: 0 },
    visible: {
      opacity: 1,
      height: 'auto',
      marginTop: '0.5rem',
      paddingTop: '0.5rem',
      paddingBottom: '0.5rem',
      borderTopWidth: '1px',
      transition: { duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }
    },
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4 sm:gap-6 items-start">
        <div ref={calendarWrapperRef} className="w-full lg:w-auto flex justify-center lg:justify-self-start">
          <div className="w-full max-w-xs sm:max-w-sm md:max-w-[370px]">
            <DayPicker
              locale={ar} mode="single" selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              classNames={dayPickerClassNames}
              modifiers={modifiers}
              modifiersClassNames={{
                hasTasks: dayPickerClassNames.day_hasTasks,
                hasAllTasksCompleted: dayPickerClassNames.day_hasAllTasksCompleted,
              }}
              showOutsideDays
              fixedWeeks
            />
          </div>
        </div>

        <div
          ref={tasksColumnRef}
          className="bg-[#2D1B69]/40 backdrop-blur-xl rounded-xl p-3.5 sm:p-4 md:p-5 flex flex-col border border-purple-700/30 shadow-lg"
          style={{ minHeight: '400px' }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-5 gap-2 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {isToday(selectedDate) ? 'مهام اليوم' : displayDate}
              </h3>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={() => onOpenFormModal(null, format(selectedDate, 'yyyy-MM-dd'))}
              className="w-full sm:w-auto px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg bg-amber-400 text-purple-900 font-bold flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-amber-500 transition-colors text-xs sm:text-sm"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              إضافة مهمة
            </motion.button>
          </div>

          <div className="space-y-2 sm:space-y-2.5 flex-1 overflow-y-auto pr-1 sm:pr-1.5 scrollbar-thin scrollbar-thumb-purple-600/70 scrollbar-track-transparent scrollbar-thumb-rounded-full">
            {tasksForDate.length === 0 ? (
              <div className="text-center py-8 flex flex-col items-center justify-center h-full">
                <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-purple-300/70 mx-auto mb-3 sm:mb-4" />
                <p className="text-purple-300/90 text-sm sm:text-base">لا توجد مهام لهذا اليوم</p>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => onOpenFormModal(null, format(selectedDate, 'yyyy-MM-dd'))}
                  className="mt-4 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-amber-400/90 text-purple-900 font-bold flex items-center gap-1.5 sm:gap-2 mx-auto hover:bg-amber-500 transition-colors text-xs sm:text-sm"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  إضافة مهمة جديدة
                </motion.button>
              </div>
            ) : (
              <AnimatePresence>
                {tasksForDate.map((task) => {
                  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
                  const totalSubtasks = task.subtasks?.length || 0;

                  const calendarTaskColorClasses: Record<string, string> = {
                    red: 'bg-red-700/20 border-red-600/30 hover:border-red-500/40', amber: 'bg-amber-700/20 border-amber-600/30 hover:border-amber-500/40',
                    green: 'bg-green-700/20 border-green-600/30 hover:border-green-500/40', blue: 'bg-blue-700/20 border-blue-600/30 hover:border-blue-500/40',
                    purple: 'bg-purple-700/20 border-purple-600/30 hover:border-purple-500/40', pink: 'bg-pink-700/20 border-pink-600/30 hover:border-pink-500/40',
                    indigo: 'bg-indigo-700/20 border-indigo-600/30 hover:border-indigo-500/40', teal: 'bg-teal-700/20 border-teal-600/30 hover:border-teal-500/40',
                  };
                  const calendarButtonColorClasses: Record<string, string> = {
                    red: 'bg-red-500 hover:bg-red-400', amber: 'bg-amber-500 hover:bg-amber-400',
                    green: 'bg-green-500 hover:bg-green-400', blue: 'bg-blue-500 hover:bg-blue-400',
                    purple: 'bg-purple-500 hover:bg-purple-400', pink: 'bg-pink-500 hover:bg-pink-400',
                    indigo: 'bg-indigo-500 hover:bg-indigo-400', teal: 'bg-teal-500 hover:bg-teal-400',
                  };

                  let taskBgClass = 'bg-purple-800/30 border-purple-700/30 hover:border-purple-600/40';
                  if (task.completed) {
                    taskBgClass = 'bg-green-700/25 border-green-600/35 hover:border-green-500/45';
                  } else if (task.color && calendarTaskColorClasses[task.color]) {
                    taskBgClass = calendarTaskColorClasses[task.color];
                  }

                  let toggleButtonBgClass = 'bg-purple-600 hover:bg-purple-500';
                  let toggleButtonIconClass = 'text-amber-300';
                  if (task.completed) {
                    toggleButtonBgClass = 'bg-green-500 hover:bg-green-400';
                    toggleButtonIconClass = 'text-white';
                  } else if (task.color && calendarButtonColorClasses[task.color]) {
                    toggleButtonBgClass = calendarButtonColorClasses[task.color];
                    toggleButtonIconClass = 'text-white';
                  }

                  return (
                    <motion.div
                      key={task.id} layout
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      // *** FIX APPLIED HERE: Re-added 'overflow-hidden' to create a clean "reveal" animation and fix the visual glitch with rounded corners. ***
                      className={`rounded-xl backdrop-blur-md border ${taskBgClass} transition-all duration-200 shadow-md hover:shadow-lg group overflow-hidden`}
                    >
                      <div className="flex items-start justify-between p-2.5 sm:p-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                            className={`p-1.5 rounded-full transition-colors mt-0.5 ${toggleButtonBgClass} shrink-0`}
                          >
                            <Check className={`w-3 h-3 ${toggleButtonIconClass}`} />
                          </motion.button>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <span className={`text-white text-sm ${task.completed ? "line-through opacity-60" : ""} block break-words font-medium group-hover:text-amber-300 transition-colors`}>
                              {task.title}
                            </span>
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-purple-300/80 mt-1">
                              {getPriorityIcon(task.priority)}
                              {getCategoryIcon(task.category)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 ml-1 mt-0.5">
                          {task.description && (
                            <motion.button title="الوصف" onClick={(e) => { e.stopPropagation(); toggleCalendarItemSection(task.id, 'description') }}
                              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} transition={{ duration: 0.15 }}
                              className={`p-1 rounded-full hover:bg-purple-700/50 transition-colors ${expandedCalendarItem?.taskId === task.id && expandedCalendarItem?.section === 'description' ? 'bg-purple-700/60 text-amber-300' : 'text-purple-300/80'}`}>
                              <Info size={14} />
                            </motion.button>
                          )}
                          {task.attachments && task.attachments.length > 0 && (
                            <motion.button title="المرفقات" onClick={(e) => { e.stopPropagation(); toggleCalendarItemSection(task.id, 'attachments') }}
                              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} transition={{ duration: 0.15 }}
                              className={`p-1 rounded-full hover:bg-purple-700/50 transition-colors relative ${expandedCalendarItem?.taskId === task.id && expandedCalendarItem?.section === 'attachments' ? 'bg-purple-700/60 text-amber-300' : 'text-purple-300/80'}`}>
                              <Paperclip size={14} />
                              {task.attachments.length > 0 &&
                                <span className="absolute -top-0.5 -right-0.5 text-[8px] bg-green-500 text-white rounded-full w-3 h-3 flex items-center justify-center">
                                  {task.attachments.length}
                                </span>
                              }
                            </motion.button>
                          )}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <motion.button title="المهام الفرعية" onClick={(e) => { e.stopPropagation(); toggleCalendarItemSection(task.id, 'subtasks') }}
                              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} transition={{ duration: 0.15 }}
                              className={`p-1 rounded-full hover:bg-purple-700/50 transition-colors relative ${expandedCalendarItem?.taskId === task.id && expandedCalendarItem?.section === 'subtasks' ? 'bg-purple-700/60 text-amber-300' : 'text-purple-300/80'}`}>
                              <ListChecks size={14} />
                              <span className="absolute -top-0.5 -right-0.5 text-[8px] bg-blue-500 text-white rounded-full w-3 h-3 flex items-center justify-center">
                                {completedSubtasks}/{totalSubtasks}
                              </span>
                            </motion.button>
                          )}
                          <motion.button title="تعديل" onClick={(e) => { e.stopPropagation(); onOpenFormModal(task, task.dueDate); }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} transition={{ duration: 0.15 }} className="p-1 rounded-full hover:bg-purple-700/50 text-purple-300/80 transition-colors"> <Edit size={14} /> </motion.button>
                          <motion.button title="حذف" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} transition={{ duration: 0.15 }} className="p-1 rounded-full hover:bg-red-500/30 text-red-400/80 transition-colors"> <X size={14} /> </motion.button>
                        </div>
                      </div>
                      <AnimatePresence initial={false}>
                        {expandedCalendarItem?.taskId === task.id && expandedCalendarItem?.section === 'description' && task.description && (
                          <motion.div key={`cal-desc-${task.id}`} variants={sectionVariantsCal} initial="hidden" animate="visible" exit="hidden"
                            className="px-3 pb-2 bg-black/10 border-t border-purple-700/20">
                            <h5 className="text-xs font-medium text-purple-200 my-1">الوصف:</h5>
                            <p className="text-xs text-purple-300/80 whitespace-pre-wrap break-words leading-relaxed">{task.description}</p>
                          </motion.div>
                        )}
                        {expandedCalendarItem?.taskId === task.id && expandedCalendarItem?.section === 'attachments' && task.attachments && task.attachments.length > 0 && (
                          <motion.div key={`cal-attach-${task.id}`} variants={sectionVariantsCal} initial="hidden" animate="visible" exit="hidden"
                            className="px-3 pb-2 bg-black/10 border-t border-purple-700/20">
                            <h5 className="text-xs font-medium text-purple-200 my-1">المرفقات:</h5>
                            <div className="space-y-1 max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600/40 scrollbar-track-transparent pr-0.5">
                              {task.attachments.map(att => (
                                <button key={att.id} onClick={(e) => { e.stopPropagation(); handleAttachmentClick(att.url); }}
                                  className="w-full flex items-center justify-between p-1.5 bg-purple-800/20 hover:bg-purple-800/40 rounded-md transition-colors text-left group"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {att.type === 'link' ? <LinkIcon className="w-3 h-3 text-amber-400 shrink-0" /> : <Paperclip className="w-3 h-3 text-amber-400 shrink-0" />}
                                    <span className="text-[11px] text-purple-200 group-hover:text-amber-300 truncate transition-colors">{att.name}</span>
                                  </div>
                                  <ExternalLink className="w-2.5 h-2.5 text-purple-400 group-hover:text-amber-300 shrink-0 transition-colors" />
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                        {expandedCalendarItem?.taskId === task.id && expandedCalendarItem?.section === 'subtasks' && task.subtasks && task.subtasks.length > 0 && (
                          <motion.div key={`cal-sub-${task.id}`} variants={sectionVariantsCal} initial="hidden" animate="visible" exit="hidden"
                            className="px-3 pb-2 bg-black/10 border-t border-purple-700/20">
                            <h5 className="text-xs font-medium text-purple-200 my-1">المهام الفرعية ({completedSubtasks}/{totalSubtasks}):</h5>
                            <div className="space-y-1.5 max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600/40 scrollbar-track-transparent pr-0.5">
                              {task.subtasks.map((sub, index) => (
                                <div key={sub.id} className="flex items-center gap-1.5 group bg-purple-800/20 hover:bg-purple-800/30 p-1.5 rounded-md transition-colors">
                                  <span className="text-[10px] text-purple-400/80 w-4 text-right shrink-0">{index + 1}.</span>
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={{ duration: 0.15 }} onClick={(e) => { e.stopPropagation(); toggleSubTask(task.id, sub.id); }}
                                    className={`p-1 rounded-full ${sub.completed ? 'bg-green-500' : 'bg-purple-600/50'} shrink-0`}
                                  > <Check className={`w-2.5 h-2.5 ${sub.completed ? 'text-white' : 'text-purple-300'}`} /> </motion.button>
                                  <span className={`text-xs ${sub.completed ? 'line-through text-purple-400/70' : 'text-purple-200'} flex-1 break-words`}>{sub.title}</span>
                                  {sub.url && <motion.button title={sub.urlAlias || sub.url} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={{ duration: 0.15 }} onClick={(e) => { e.stopPropagation(); handleSubtaskUrlClick(sub.url); }}
                                    className="p-0.5 rounded text-amber-400 hover:text-amber-300 opacity-60 group-hover:opacity-100 transition-opacity shrink-0"
                                  > <LinkIcon size={12} /> </motion.button>}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
