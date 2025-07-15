import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, Book, CheckSquare, Timer, Filter, ChevronLeft, ChevronRight, Activity, Repeat } from 'lucide-react';
import { useStore } from '../../store';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays, addDays, startOfWeek, endOfWeek, isSameDay, endOfDay, startOfDay } from 'date-fns'; // Added isSameDay, endOfDay, startOfDay
import { ar } from 'date-fns/locale';
import { ProductivityChart } from './charts/ProductivityChart';
import { RecoveryChart } from './charts/RecoveryChart';
import { PrayerChart } from './charts/PrayerChart';
import { QuranChart } from './charts/QuranChart';
import { TasksChart } from './charts/TasksChart';
import { PomodoroChart } from './charts/PomodoroChart';
import { HabitsChart } from './charts/HabitsChart';

type TimeRange = 'day' | 'week' | 'month' | 'year';

export const AnalyticsView = () => {
  const { 
    calendar, 
    prayers, 
    quranProgress, 
    tasks, 
    focusSessions // Use focusSessions (which now stores 1-min segments)
  } = useStore();
  
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const getDateRange = () => {
    const today = new Date();
    let start, end;

    switch (timeRange) {
      case 'day':
        start = startOfDay(currentDate); 
        end = endOfDay(currentDate);
        // For 'day' range, if currentDate is in future, set to today
        if (currentDate > today) {
            start = startOfDay(today);
            end = endOfDay(today);
        }
        break;
      case 'week':
        start = startOfWeek(currentDate, { weekStartsOn: 0 }); 
        end = endOfWeek(currentDate, { weekStartsOn: 0 });   
        break;
      case 'month':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case 'year':
        start = new Date(currentDate.getFullYear(), 0, 1);
        end = new Date(currentDate.getFullYear(), 11, 31);
        break;
      default: // Default to week
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
        end = endOfWeek(currentDate, { weekStartsOn: 0 });
    }
    
    // Ensure end date is not in the future for ranges other than 'day'
    if (end > today && timeRange !== 'day') { 
        end = today;
    }
    // If start somehow ended up after end (e.g. future date selected for 'week' or 'month')
    if (start > end) {
        start = end; // or set to today, depending on desired behavior
    }


    return { start, end };
  };
  
  const dateRange = getDateRange();

  const goToPrevious = () => {
    setCurrentDate(prev => {
      switch (timeRange) {
        case 'day': return subDays(prev, 1);
        case 'week': return subDays(prev, 7);
        case 'month': return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
        case 'year': return new Date(prev.getFullYear() - 1, 0, 1);
        default: return prev;
      }
    });
  };
  
  const goToNext = () => {
    const today = new Date();
    setCurrentDate(prev => {
      let nextCandidate: Date;
      switch (timeRange) {
        case 'day': nextCandidate = addDays(prev, 1); break;
        case 'week': nextCandidate = addDays(prev, 7); break;
        case 'month': nextCandidate = new Date(prev.getFullYear(), prev.getMonth() + 1, 1); break;
        case 'year': nextCandidate = new Date(prev.getFullYear() + 1, 0, 1); break;
        default: return prev;
      }
      
      // Prevent navigating past today for day range.
      if (timeRange === 'day' && nextCandidate > today) return today;
  
      // For week and month, if the start of the next period is beyond today, don't move.
      if (timeRange === 'week' && startOfWeek(nextCandidate, { weekStartsOn: 0 }) > today) return prev; 
      if (timeRange === 'month' && startOfMonth(nextCandidate) > today) return prev;
      
      // For year, allow future years, or restrict if desired:
      // if (timeRange === 'year' && nextCandidate.getFullYear() > today.getFullYear()) return prev;
      
      return nextCandidate;
    });
  };
  
  const isNextDisabled = () => {
    const today = new Date();
    // const { end: currentRangeEnd } = getDateRange(); // Get the potentially adjusted end of the current range // Not needed with new logic

    switch (timeRange) {
        case 'day': 
            return isSameDay(currentDate, today) || currentDate > today;
        case 'week': 
            // Disable if the start of the *next* week is after today
            // OR if the current week is already today's week (and thus its end is today or past)
            const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
            if (isSameDay(currentWeekStart, startOfWeek(today, { weekStartsOn: 0 }))) return true;
            const nextWeekStart = startOfWeek(addDays(currentDate, 7), { weekStartsOn: 0 });
            return nextWeekStart > today;
        case 'month':
            // Disable if the start of the *next* month is after today
            // OR if the current month is already today's month
            const currentMonthStart = startOfMonth(currentDate);
            if (isSameDay(currentMonthStart, startOfMonth(today))) return true;
            const nextMonthStart = startOfMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
            return nextMonthStart > today;
        case 'year': 
            // Disable if the current year is today's year or in the future
            return currentDate.getFullYear() >= today.getFullYear();
        default: 
            return false;
    }
  };


  const getFormattedDateRangeTitle = () => {
    const { start, end } = dateRange; 
    if (timeRange === 'year') {
      return format(start, 'yyyy', { locale: ar });
    }
    if (timeRange === 'month') {
      return format(start, 'MMMM yyyy', { locale: ar });
    }
    if (timeRange === 'week') {
      const formattedStartDay = format(start, 'd', { locale: ar });
      const formattedEndDay = format(end, 'd', { locale: ar });
      const formattedStartMonthYear = format(start, 'MMMM yyyy', { locale: ar });
      const formattedEndMonthYear = format(end, 'MMMM yyyy', { locale: ar });
      const formattedStartMonth = format(start, 'MMMM', { locale: ar });


      if (start.getFullYear() !== end.getFullYear()) {
        return `${formattedStartDay} ${formattedStartMonthYear} - ${formattedEndDay} ${formattedEndMonthYear}`;
      } else if (start.getMonth() !== end.getMonth()) {
        return `${formattedStartDay} ${formattedStartMonth} - ${formattedEndDay} ${formattedEndMonthYear}`;
      }
      return `${formattedStartDay} - ${formattedEndDay} ${formattedEndMonthYear}`;
    }
    if (timeRange === 'day') {
      return format(start, 'EEEE, d MMMM yyyy', { locale: ar }); 
    }
    return format(start, 'MMMM yyyy', { locale: ar }); // Fallback
  };

  return (
    <div className="space-y-8" ref={containerRef}>
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-amber-400"
      >
        التحليلات
      </motion.h2>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-4">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToPrevious}
            className="p-2 rounded-full bg-[#2D1B69] text-white hover:bg-[#3D2B79] transition-colors"
            aria-label="النطاق الزمني السابق"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
          
          <span className="text-white font-medium px-4 tabular-nums min-w-[200px] text-center">
            {getFormattedDateRangeTitle()}
          </span>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToNext}
            className="p-2 rounded-full bg-[#2D1B69] text-white hover:bg-[#3D2B79] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isNextDisabled()}
            aria-label="النطاق الزمني التالي"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
        </div>
        
        <div className="flex items-center gap-2 bg-[#1A0F3C] rounded-lg p-1">
          {(['day', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
            <motion.button
              key={range}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setTimeRange(range);
                // setCurrentDate(new Date()); // Optional: reset to today when range type changes
              }}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                timeRange === range
                  ? 'bg-amber-400 text-[#1A0F3C]'
                  : 'text-white hover:bg-[#2D1B69]'
              }`}
            >
              {range === 'day' && 'يومي'}
              {range === 'week' && 'أسبوعي'}
              {range === 'month' && 'شهري'}
              {range === 'year' && 'سنوي'}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-6">
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${activeTab === 'all' ? 'bg-amber-400 text-[#1A0F3C]' : 'bg-[#1A0F3C] text-white hover:bg-[#2D1B69]'}`}>جميع التحليلات</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('productivity')} className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'productivity' ? 'bg-amber-400 text-[#1A0F3C]' : 'bg-[#1A0F3C] text-white hover:bg-[#2D1B69]'}`}><Activity className="w-4 h-4" />الإنتاجية</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('recovery')} className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'recovery' ? 'bg-amber-400 text-[#1A0F3C]' : 'bg-[#1A0F3C] text-white hover:bg-[#2D1B69]'}`}><CalendarIcon className="w-4 h-4" />التعافي</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('prayers')} className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'prayers' ? 'bg-amber-400 text-[#1A0F3C]' : 'bg-[#1A0F3C] text-white hover:bg-[#2D1B69]'}`}><Clock className="w-4 h-4" />الصلوات</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('quran')} className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'quran' ? 'bg-amber-400 text-[#1A0F3C]' : 'bg-[#1A0F3C] text-white hover:bg-[#2D1B69]'}`}><Book className="w-4 h-4" />القرآن</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'tasks' ? 'bg-amber-400 text-[#1A0F3C]' : 'bg-[#1A0F3C] text-white hover:bg-[#2D1B69]'}`}><CheckSquare className="w-4 h-4" />المهام</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('pomodoro')} className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'pomodoro' ? 'bg-amber-400 text-[#1A0F3C]' : 'bg-[#1A0F3C] text-white hover:bg-[#2D1B69]'}`}><Timer className="w-4 h-4" />بومودورو</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('habits')} className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'habits' ? 'bg-amber-400 text-[#1A0F3C]' : 'bg-[#1A0F3C] text-white hover:bg-[#2D1B69]'}`}><Repeat className="w-4 h-4" />العادات</motion.button>
        </div>
        
        <div className="space-y-8">
          {(activeTab === 'all' || activeTab === 'productivity') && (
            <ProductivityChart 
              focusSessions={focusSessions || []} 
              dateRange={dateRange}
              timeRange={timeRange}
            />
          )}
          
          {(activeTab === 'all' || activeTab === 'recovery') && (
            <RecoveryChart 
              calendar={calendar || []} 
              dateRange={dateRange}
              timeRange={timeRange}
            />
          )}
          
          {(activeTab === 'all' || activeTab === 'prayers') && (
            <PrayerChart 
              prayers={prayers || []} 
              dateRange={dateRange}
              timeRange={timeRange}
            />
          )}
          
          {(activeTab === 'all' || activeTab === 'quran') && (
            <QuranChart 
              quranProgress={quranProgress || []} 
              dateRange={dateRange}
              timeRange={timeRange}
            />
          )}
          
          {(activeTab === 'all' || activeTab === 'tasks') && (
            <TasksChart 
              tasks={tasks || []} 
              dateRange={dateRange}
              timeRange={timeRange}
            />
          )}
          
          {(activeTab === 'all' || activeTab === 'pomodoro') && (
            <PomodoroChart 
              focusSessions={focusSessions || []} 
              dateRange={dateRange}
              timeRange={timeRange}
            />
          )}

          {(activeTab === 'all' || activeTab === 'habits') && (
            <HabitsChart 
              dateRange={dateRange}
              timeRange={timeRange}
            />
          )}
        </div>
      </div>
    </div>
  );
};
