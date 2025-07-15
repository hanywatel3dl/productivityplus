import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, BookOpen, CheckSquare, Clock } from 'lucide-react';
import { useStore } from '../store';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isAfter, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';

const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const Calendar = () => {
  const { calendar, markDayCompleted, getDayStats } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const calendarRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start, end });

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => {
    const nextMonth = addMonths(currentDate, 1);
    if (!isAfter(nextMonth, today)) {
      setCurrentDate(nextMonth);
    }
  };

  const handleDayClick = (date: Date) => {
    if (isAfter(date, today)) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const stats = getDayStats(dateStr);
    markDayCompleted(dateStr, !stats.completed);
  };

  const handleDayHover = (date: string, event: React.MouseEvent) => {
    if (!calendarRef.current) return;
    
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const calendarRect = calendarRef.current.getBoundingClientRect();
    
    // Calculate position relative to the calendar container
    const x = rect.left + rect.width / 2 - calendarRect.left;
    const y = rect.top - calendarRect.top - 5; // Position above the day
    
    setHoveredDate(date);
    setTooltipPosition({ x, y });
  };

  return (
    <div ref={calendarRef} className="relative bg-[#1A0F3C]/80 backdrop-blur-lg rounded-2xl p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-amber-500">التقويم</h2>
        <div className="flex gap-4 items-center">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevMonth}
            className="p-2 rounded-full bg-[#2D1B69] text-white hover:bg-[#3D2B79] transition-colors duration-300"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
          <span className="text-white font-tajawal text-lg">
            {format(currentDate, 'MMMM yyyy', { locale: ar })}
          </span>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNextMonth}
            disabled={isAfter(addMonths(currentDate, 1), today)}
            className={`p-2 rounded-full transition-colors duration-300 ${
              isAfter(addMonths(currentDate, 1), today)
                ? 'bg-[#2D1B69]/50 text-gray-500 cursor-not-allowed'
                : 'bg-[#2D1B69] text-white hover:bg-[#3D2B79]'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {days.map((day) => (
          <div key={day} className="text-center text-purple-300 font-tajawal">
            {day}
          </div>
        ))}
        
        {Array.from({ length: start.getDay() }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}
        
        {daysInMonth.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const stats = getDayStats(dateStr);
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isFutureDate = isAfter(date, today);
          const isToday = isSameDay(date, today);
          
          return (
            <div key={dateStr} className="relative">
              <motion.button
                whileHover={{ scale: isFutureDate ? 1 : 1.05 }}
                whileTap={{ scale: isFutureDate ? 1 : 0.95 }}
                onMouseEnter={(e) => handleDayHover(dateStr, e)}
                onMouseLeave={() => setHoveredDate(null)}
                className={`
                  relative aspect-square w-full rounded-xl flex items-center justify-center text-lg font-medium
                  transition-all duration-300 ease-in-out
                  ${!isCurrentMonth ? 'opacity-40' : ''}
                  ${isFutureDate ? 'opacity-30 cursor-not-allowed' : ''}
                  ${isToday ? 'ring-2 ring-amber-500' : ''}
                  ${stats.completed
                    ? 'bg-amber-500 text-[#1A0F3C] shadow-lg'
                    : 'bg-[#2D1B69]/50 text-white hover:bg-[#3D2B79]/70'}
                `}
                onClick={() => !isFutureDate && handleDayClick(date)}
                disabled={isFutureDate}
              >
                {stats.completed ? <Check className="w-6 h-6" /> : date.getDate()}
              </motion.button>
              
              {hoveredDate === dateStr && (
                <div 
                  className="absolute z-50 w-48 p-3 rounded-lg bg-[#1A0F3C] shadow-xl border border-purple-500/20 backdrop-blur-lg"
                  style={{
                    left: '50%',
                    bottom: 'calc(100% + 10px)',
                    transform: 'translateX(-50%)',
                    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))'
                  }}
                >
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span className="text-purple-200">الصلوات:</span>
                      </div>
                      <span className="text-white">{getDayStats(hoveredDate).prayers}/5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-500" />
                        <span className="text-purple-200">القرآن:</span>
                      </div>
                      <span className="text-white">{getDayStats(hoveredDate).quranPages.length} صفحات</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-amber-500" />
                        <span className="text-purple-200">المهام:</span>
                      </div>
                      <span className="text-white">{getDayStats(hoveredDate).tasks} مهام</span>
                    </div>
                  </div>
                  
                  {/* Triangle pointer */}
                  <div 
                    className="absolute w-4 h-4 bg-[#1A0F3C] border-r border-b border-purple-500/20 transform rotate-45"
                    style={{
                      left: '50%',
                      bottom: '-8px',
                      marginLeft: '-8px'
                    }}
                  ></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};