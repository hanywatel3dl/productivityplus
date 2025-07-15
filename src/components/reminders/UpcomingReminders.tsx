import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReminderStore } from '../../store/reminderStore';
import { Reminder } from '../../types/reminders';
import { 
  format, parseISO, differenceInMinutes, differenceInHours, differenceInDays, 
  formatDistanceToNowStrict, isBefore, isValid
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Bell, Clock, AlertCircle, Calendar, Target, Flag,
  ChevronLeft, Timer, Zap
} from 'lucide-react';

export const UpcomingReminders = () => {
  const { getUpcomingReminders, getOverdueReminders, getDetailedTimeUntil, lastUpdateTime } = useReminderStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  // تحديث الوقت كل ثانية للعد التنازلي باستخدام setTimeout بدلاً من setInterval
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const updateTime = () => {
      setCurrentTime(new Date());
      timeoutId = setTimeout(updateTime, 1000);
    };
    
    timeoutId = setTimeout(updateTime, 1000);
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const upcomingReminders = useMemo(() => {
    try {
      return getUpcomingReminders(48) || [];
    } catch (error) {
      console.error('Error getting upcoming reminders:', error);
      return [];
    }
  }, [getUpcomingReminders, currentTime, lastUpdateTime]);

  const overdueReminders = useMemo(() => {
    try {
      return getOverdueReminders() || [];
    } catch (error) {
      console.error('Error getting overdue reminders:', error);
      return [];
    }
  }, [getOverdueReminders, currentTime, lastUpdateTime]);

  const getFormattedTimeUntil = (dateString: string): string => {
    const timeData = getDetailedTimeUntil(dateString);
    
    if (timeData.isOverdue) {
      const parts = [];
      if (timeData.weeks > 0) parts.push(`${timeData.weeks} أسبوع`);
      if (timeData.days > 0) parts.push(`${timeData.days} يوم`);
      if (timeData.hours > 0) parts.push(`${timeData.hours} ساعة`);
      if (timeData.minutes > 0) parts.push(`${timeData.minutes} دقيقة`);
      
      return `متأخر ${parts.slice(0, 2).join(' و ')}`;
    }
    
    const parts = [];
    if (timeData.weeks > 0) parts.push(`${timeData.weeks} أسبوع`);
    if (timeData.days > 0) parts.push(`${timeData.days} يوم`);
    if (timeData.hours > 0) parts.push(`${timeData.hours} ساعة`);
    if (timeData.minutes > 0) parts.push(`${timeData.minutes} دقيقة`);
    if (timeData.seconds > 0 && parts.length === 0) parts.push(`${timeData.seconds} ثانية`);
    
    if (parts.length === 0) return 'الآن';
    return `خلال ${parts.slice(0, 2).join(' و ')}`;
  };

  const getUrgencyColor = (dateString: string) => {
    const timeData = getDetailedTimeUntil(dateString);
    
    if (timeData.isOverdue) return 'text-red-400 bg-red-500/20 border-red-500/30';
    if (timeData.totalSeconds < 1800) return 'text-red-400 bg-red-500/20 border-red-500/30'; // أقل من 30 دقيقة
    if (timeData.totalSeconds < 7200) return 'text-orange-400 bg-orange-500/20 border-orange-500/30'; // أقل من ساعتين
    if (timeData.totalSeconds < 86400) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'; // أقل من يوم
    return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
  };

  const typeIcons: Record<Reminder['type'], React.ElementType> = { 
    reminder: Bell, task: Target, appointment: Calendar, event: Flag
  };
  
  const overdueCount = overdueReminders.length;
  const upcomingSliceCount = Math.max(0, 5 - overdueCount);
  const allReminders = [...overdueReminders, ...upcomingReminders.slice(0, upcomingSliceCount)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl border border-purple-500/20 p-4"
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 relative">
            <Bell className="w-5 h-5 text-amber-400" />
            {overdueReminders.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center"
              >
                <span className="text-[8px] text-white font-bold">{overdueReminders.length}</span>
              </motion.div>
            )}
          </div>
          <h3 className="text-lg font-bold text-white">التذكيرات القادمة</h3>
        </div>
        {overdueReminders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{overdueReminders.length} متأخر</span>
          </motion.div>
        )}
      </div>

      <div className="space-y-3">
        {allReminders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <Clock className="w-12 h-12 text-purple-300 mx-auto mb-3" />
            <p className="text-purple-300">لا توجد تذكيرات قادمة أو متأخرة</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {allReminders.map((reminder, index) => {
              if (!reminder?.startTime) return null;
              
              const TypeIcon = typeIcons[reminder.type] || Bell;
              const timeUntil = getFormattedTimeUntil(reminder.startTime);
              const urgencyClasses = getUrgencyColor(reminder.startTime);
              const timeData = getDetailedTimeUntil(reminder.startTime);
              const isOverdue = timeData.isOverdue;
              const isUrgent = timeData.totalSeconds < 1800 && !isOverdue; // أقل من 30 دقيقة

              return (
                <motion.div
                  key={reminder.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, x: -5 }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden ${
                    isOverdue 
                      ? 'bg-red-500/10 border-red-500/40 hover:bg-red-500/20' 
                      : 'bg-[#1A0F3C]/50 border-purple-500/20 hover:bg-[#1A0F3C]/70'
                  }`}
                >
                  {/* تأثير النبض للتذكيرات العاجلة */}
                  {isUrgent && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10"
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`p-1.5 rounded-lg ${urgencyClasses.split(' ')[1]} relative`}>
                      <TypeIcon className={`w-4 h-4 ${urgencyClasses.split(' ')[0]}`} />
                      {isUrgent && (
                        <motion.div
                          className="absolute -top-1 -right-1"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <Zap className="w-3 h-3 text-orange-400" />
                        </motion.div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">
                        {reminder.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-purple-300">
                          {format(parseISO(reminder.startTime), 'HH:mm')}
                          {reminder.endTime && isValid(parseISO(reminder.endTime)) && 
                            ` - ${format(parseISO(reminder.endTime), 'HH:mm')}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyClasses}`}>
                          {timeUntil}
                        </span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-purple-400" />
                  </div>
                  
                  {/* شريط التقدم للتذكيرات القريبة */}
                  {!isOverdue && timeData.totalSeconds < 7200 && (
                    <motion.div
                      className="mt-2 h-1 bg-purple-900/50 rounded-full overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${Math.max(0, 100 - (timeData.totalSeconds / 7200) * 100)}%` 
                        }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {(upcomingReminders.length > 0 || overdueReminders.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: allReminders.length * 0.05 + 0.2 }}
          className="mt-4 pt-4 border-t border-purple-500/20"
        >
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <div className="text-lg font-bold text-blue-400">
                {upcomingReminders.length}
              </div>
              <div className="text-xs text-blue-300">قادمة</div>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10">
              <div className="text-lg font-bold text-red-400">
                {overdueReminders.length}
              </div>
              <div className="text-xs text-red-300">متأخرة</div>
            </div>
          </div>
        </motion.div>
      )}

      {upcomingReminders.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: allReminders.length * 0.05 + 0.4 }}
          className="mt-4 p-3 rounded-lg bg-gradient-to-l from-amber-500/20 to-orange-500/20 border border-amber-500/30"
        >
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">التذكير التالي</span>
          </div>
          <div className="text-white font-bold truncate">
            {upcomingReminders[0].title}
          </div>
          <div className="text-sm text-amber-300">
            {getFormattedTimeUntil(upcomingReminders[0].startTime)}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
