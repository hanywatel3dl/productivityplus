// src/components/habits/HabitsView.tsx

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Calendar, Bell, Check, Edit3, Trash2, ChevronLeft, ChevronRight,
  Flame, BarChart2, Clock, Trophy, Link as LinkIcon, ExternalLink         
} from 'lucide-react'; // تأكد من استيراد كل الأيقونات
import { format, addDays, subDays, startOfWeek, isSameDay, isAfter, startOfToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useHabitStore } from '../../store/habitStore'; // تأكد من المسار الصحيح للمتجر
import { HabitForm } from './HabitForm'; // تأكد من وجود هذا المكون
import { HabitStats } from './HabitStats'; // تأكد من وجود هذا المكون
import { registerServiceWorker, requestNotificationPermission, sendHabitsToServiceWorker } from '../../utils/notificationManager'; // تأكد من وجود هذا الملف
import { Habit } from '../../types/habits'; // استيراد نوع Habit

export const HabitsView = () => {
  // استخدام `startOfToday()` كقيمة ابتدائية لـ `selectedDate` لضمان عدم وجود `null` في البداية
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null); // تأكد من النوع
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );
  const [direction, setDirection] = useState(0);
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null); // لتوسيع/طي قسم الروابط

  const { 
    habits, 
    toggleHabitCompletion, 
    deleteHabit, 
    getHabitsForDate,
    getHabitStats // هذه الدالة يمكن استخدامها لعرض الإحصائيات التفصيلية في HabitStats.tsx
  } = useHabitStore();
  
  const today = startOfToday(); // اليوم الحالي، بداية اليوم
  
  const handlePrevDay = useCallback(() => {
    setDirection(-1);
    setSelectedDate(prev => subDays(prev, 1));
  }, []); 

  const handleNextDay = useCallback(() => {
    setDirection(1);
    setSelectedDate(prev => addDays(prev, 1));
  }, []); 

  useEffect(() => {
    if (!selectedDate) return; 

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showForm || showStats) return; 

      if (e.key === 'ArrowRight') {
        handlePrevDay();
      } else if (e.key === 'ArrowLeft') {
        if (!isSameDay(selectedDate, today)) { 
          handleNextDay();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePrevDay, handleNextDay, showForm, showStats, selectedDate, today]); 

  const handleHabitAction = (habitId: string, action: 'toggle' | 'edit' | 'delete', dateStr: string) => {
    if(action === 'edit' || action === 'delete') {
        setExpandedHabitId(null);
    }
    switch (action) {
      case 'toggle':
        const habitEntry = getHabitsForDate(dateStr).find(h => h.habit.id === habitId);
        toggleHabitCompletion(habitId, dateStr, !habitEntry?.completed);
        break;
      case 'edit': {
        const habitToEdit = habits.find(h => h.id === habitId);
        if (habitToEdit) setEditingHabit(habitToEdit);
        setShowForm(true);
        break;
      }
      case 'delete':
        if (confirm('هل أنت متأكد من حذف هذه العادة؟')) deleteHabit(habitId);
        break;
    }
  };

  const activeHabits = habits.filter(habit => !habit.archivedAt); 

  useEffect(() => {
    if (typeof window !== 'undefined') {
      registerServiceWorker(); 
      const updateReminders = () => { 
        if (notificationPermission === 'granted') sendHabitsToServiceWorker(activeHabits); 
      };
      updateReminders(); 

      const unsubscribe = useHabitStore.subscribe(
        (state) => state.habits,
        (newHabits) => {
          const newActiveHabits = newHabits.filter(h => !h.archivedAt);
          if (notificationPermission === 'granted') sendHabitsToServiceWorker(newActiveHabits);
        }
      );
      return () => unsubscribe(); 
    }
  }, [notificationPermission, activeHabits]);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const habitsForDate = getHabitsForDate(dateStr); 
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); 
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)); 
  
  // إعدادات Framer Motion
  const proEase = [0.22, 1, 0.36, 1]; 
  const containerVariants = { 
    hidden: { opacity: 0 }, 
    visible: { opacity: 1, transition: { staggerChildren: 0.03 } } 
  };
  const cardVariants = { 
    hidden: { opacity: 0, y: 10, scale: 0.98 }, 
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: proEase } } 
  };
  const dateVariants = {
    enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 20 : -20 }),
    center: { zIndex: 1, opacity: 1, x: 0 },
    exit: (direction: number) => ({ zIndex: 0, opacity: 0, x: direction < 0 ? 20 : -20 }),
  };
  
  const handleRequestPermission = async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        sendHabitsToServiceWorker(activeHabits);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };
  
  const toggleLinksExpansion = (habitId: string) => {
    setExpandedHabitId(prevId => (prevId === habitId ? null : habitId));
  };

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: proEase }}
        className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-3xl p-6 md:p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 md:gap-4">
            <h2 className="text-xl md:text-2xl font-bold text-white">العادات اليومية</h2>
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              onClick={() => setShowStats(true)} 
              className="p-3 rounded-full bg-[#1A0F3C] text-purple-300 hover:bg-[#2D1B69] transition-colors"
            >
              <BarChart2 className="w-5 h-5" />
            </motion.button>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={() => { setEditingHabit(null); setShowForm(true); }} 
            className="px-4 py-3 md:px-5 rounded-full bg-amber-400 text-purple-900 font-bold flex items-center gap-2 hover:bg-amber-500 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline">إضافة عادة</span>
          </motion.button>
        </div>

        {notificationPermission === 'default' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <button 
              onClick={handleRequestPermission} 
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-amber-400/10 text-amber-300 rounded-lg hover:bg-amber-400/20 transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="font-semibold">تفعيل الإشعارات لتذكيرك بالعادات</span>
            </button>
          </motion.div>
        )}
        
        <div className="flex justify-center items-center gap-6 mb-4">
          <motion.button 
            whileHover={{ scale: 1.1 }} 
            whileTap={{ scale: 0.9 }} 
            onClick={handlePrevDay} 
            className="p-2.5 rounded-full bg-[#2D1B69]/50 text-white hover:bg-[#2D1B69]"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
          <div className="relative min-w-[180px] h-8 flex items-center justify-center overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.h3 
                key={format(selectedDate, 'yyyy-MM')} 
                custom={direction} 
                variants={dateVariants} 
                initial="enter" 
                animate="center" 
                exit="exit" 
                transition={{ duration: 0.3, ease: proEase }} 
                className="absolute text-xl md:text-2xl font-bold tracking-wide" 
                style={{ color: '#fbbf24eb' }}
              >
                {format(selectedDate, 'MMMM yyyy', { locale: ar })}
              </motion.h3>
            </AnimatePresence>
          </div>
          <motion.button 
            whileHover={{ scale: 1.1 }} 
            whileTap={{ scale: 0.9 }} 
            onClick={handleNextDay} 
            disabled={isSameDay(selectedDate, today) || isAfter(selectedDate, today)} 
            className="p-2.5 rounded-full bg-[#2D1B69]/50 text-white hover:bg-[#2D1B69] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="grid grid-cols-7 gap-2 md:gap-3 mb-6">
          {weekDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const habitsForDay = getHabitsForDate(dayKey);
            const completedCount = habitsForDay.filter(h => h.completed).length;
            const completionRate = habitsForDay.length > 0 ? (completedCount / habitsForDay.length) : 0;
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDay = isSameDay(day, today);
            const isFuture = isAfter(day, today);
            
            return (
              <motion.button 
                key={dayKey} 
                layout 
                whileHover={!isFuture ? { y: -3 } : {}} 
                whileTap={!isFuture ? { scale: 0.97 } : {}} 
                onClick={() => !isFuture && setSelectedDate(day)} 
                disabled={isFuture} 
                className={`
                  relative flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all duration-300 border-2 ${
                  isFuture
                    ? 'bg-[#1A0F3C]/60 text-gray-600 border-purple-400/10 cursor-not-allowed' 
                    : isSelected
                    ? 'bg-amber-400 text-purple-900 shadow-lg shadow-amber-500/20 border-amber-400' 
                    : `bg-[#1A0F3C]/70 text-purple-200 hover:bg-[#2D1B69] ${isTodayDay ? 'border-amber-400/70' : 'border-transparent'}` 
                }`}
              >
                <span className={`text-xs md:text-sm font-medium ${isSelected ? '' : isTodayDay ? 'text-white' : ''}`}>
                  {format(day, 'EEEE', { locale: ar })}
                </span>
                <span className="text-xl md:text-2xl font-bold">{format(day, 'd')}</span>
                {!isFuture && habitsForDay.length > 0 && ( 
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-full max-w-[40px] h-1.5">
                    <div className="h-full bg-black/20 rounded-full">
                      <motion.div 
                        className="h-full rounded-full" 
                        initial={{ width: 0 }} 
                        animate={{ width: `${completionRate * 100}%` }} 
                        transition={{ duration: 0.6, ease: proEase }} 
                        style={{ backgroundColor: isSelected ? '#2D1B69' : '#f59e0b' }}
                      />
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
        
        <div className="bg-[#1A0F3C]/80 backdrop-blur-sm border border-purple-400/10 rounded-2xl p-6 min-h-[300px] flex flex-col">
          <div className="flex-grow flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div 
                key={dateStr} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }} 
                transition={{ duration: 0.3, ease: proEase }} 
                className="flex-grow flex flex-col"
              >
                {isAfter(selectedDate, today) ? (
                   <div className="flex-grow flex flex-col justify-center items-center text-center">
                    <Calendar className="w-16 h-16 text-purple-300/50 mb-6" />
                    <p className="text-purple-300 mb-6">لا يمكن عرض العادات في المستقبل.</p>
                  </div>
                ) : habitsForDate.length === 0 ? (
                  <div className="flex-grow flex flex-col justify-center items-center text-center">
                    <Calendar className="w-16 h-16 text-purple-300/50 mb-6" />
                    <p className="text-purple-300 mb-6">لا توجد عادات مضافة لهذا اليوم.</p>
                    <motion.button 
                      whileHover={{ scale: 1.05 }} 
                      whileTap={{ scale: 0.95 }} 
                      onClick={() => { setEditingHabit(null); setShowForm(true); }} 
                      className="px-6 py-3 rounded-full bg-amber-400 text-purple-900 font-bold inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      إضافة عادة جديدة
                    </motion.button>
                  </div>
                ) : (
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start" 
                    variants={containerVariants} 
                    initial="hidden" 
                    animate="visible"
                  >
                    {habitsForDate.map(({ habit, completed }) => {
                      // الحصول على السلاسل المحدثة من كائن العادة مباشرة
                      const currentStreak = habit.currentStreak || 0;
                      const longestStreak = habit.bestStreak || 0;
                      
                      return (
                        <motion.div 
                          key={habit.id} 
                          layout 
                          variants={cardVariants} 
                          className={`p-5 rounded-2xl backdrop-blur-lg border transition-all flex flex-col ${
                            completed 
                              ? 'bg-green-500/10 border-green-500/20' 
                              : 'border' 
                          }`} 
                          style={!completed ? { 
                            backgroundColor: `${habit.color}26`, 
                            borderColor: `${habit.color}4D` 
                          } : {}}
                        >
                          <motion.div layout className="flex items-center gap-3 w-full">
                            <motion.button 
                              disabled={isAfter(selectedDate, today)} 
                              whileHover={{ scale: 1.1, rotate: completed ? 0 : 5 }} 
                              whileTap={{ scale: 0.9 }} 
                              onClick={() => handleHabitAction(habit.id, 'toggle', dateStr)} 
                              className="p-3 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed" 
                              style={{ backgroundColor: completed ? '#10B981' : habit.color }}
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.button>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-base font-bold text-white truncate ${completed ? 'line-through opacity-70' : ''}`}>
                                {habit.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {/* عرض السلسلة الحالية مع النار */}
                                {currentStreak > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full" title={`سلسلة حالية: ${currentStreak} أيام`}>
                                    <Flame className="w-3 h-3" />
                                    <span>{currentStreak}</span>
                                  </div>
                                )}
                                {/* عرض أفضل سلسلة مع الكأس */}
                                {longestStreak > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-yellow-200 bg-yellow-400/10 px-2 py-0.5 rounded-full" title={`أفضل سلسلة: ${longestStreak} أيام`}>
                                    <Trophy className="w-3 h-3" />
                                    <span>{longestStreak}</span>
                                  </div>
                                )}
                                {/* عرض تكرار العادة */}
                                {habit.frequency?.type === 'weekly' && (
                                  <div className="flex items-center gap-1 text-xs text-purple-300 bg-purple-400/10 px-2 py-0.5 rounded-full">
                                    <Clock className="w-3 h-3" />
                                    <span>{habit.frequency.days?.length || 0}/أسبوع</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* أزرار الإجراءات */}
                            <div className="flex items-center gap-1">
                              {habit.links && habit.links.length > 0 && (
                                <motion.button 
                                  whileHover={{ scale: 1.1 }} 
                                  whileTap={{ scale: 0.9 }} 
                                  onClick={() => toggleLinksExpansion(habit.id)}
                                  className="relative p-2 rounded-full hover:bg-blue-400/20 text-blue-400"
                                >
                                  <LinkIcon className="w-4 h-4" />
                                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">
                                    {habit.links.length}
                                  </span>
                                </motion.button>
                              )}
                              <motion.button 
                                whileHover={{ scale: 1.1 }} 
                                whileTap={{ scale: 0.9 }} 
                                onClick={() => handleHabitAction(habit.id, 'edit', dateStr)} 
                                className="p-2 rounded-full hover:bg-amber-400/20 text-amber-400"
                              >
                                <Edit3 className="w-4 h-4" />
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.1 }} 
                                whileTap={{ scale: 0.9 }} 
                                onClick={() => handleHabitAction(habit.id, 'delete', dateStr)} 
                                className="p-2 rounded-full hover:bg-red-500/20 text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </motion.div>

                          {/* قسم الروابط القابل للتوسيع */}
                          <AnimatePresence>
                            {expandedHabitId === habit.id && habit.links && habit.links.length > 0 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} 
                                className="w-full overflow-hidden" 
                              >
                                <div className="pt-4 mt-4 border-t border-purple-500/20">
                                  <h4 className="text-sm font-semibold text-purple-300 mb-2">الروابط:</h4>
                                  <div className="space-y-2">
                                    {habit.links.map((link, index) => (
                                      <div 
                                        key={`${habit.id}-link-${index}`}
                                        className="flex items-center justify-between p-2 bg-[#2D1B69]/30 rounded-lg"
                                      >
                                        <span className="text-sm text-white truncate">{link}</span>
                                        <a 
                                          href={link} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="p-1.5 rounded-full hover:bg-purple-500/20 text-purple-300 transition-colors"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* النوافذ المنبثقة */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.3 }} 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
            onClick={() => { setShowForm(false); setEditingHabit(null); }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              transition={{ type: "spring", duration: 0.5 }} 
              className="bg-[#1A0F3C] rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-700 scrollbar-track-transparent" 
              onClick={(e) => e.stopPropagation()}
            >
              <HabitForm 
                habit={editingHabit} 
                initialDate={dateStr} 
                onClose={() => { setShowForm(false); setEditingHabit(null); }} 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showStats && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.3 }} 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
            onClick={() => setShowStats(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              transition={{ type: "spring", duration: 0.5 }} 
              className="bg-[#1A0F3C] rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-700 scrollbar-track-transparent" 
              onClick={(e) => e.stopPropagation()}
            >
              <HabitStats onClose={() => setShowStats(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};