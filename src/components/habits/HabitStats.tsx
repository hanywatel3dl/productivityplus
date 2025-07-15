import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, Calendar, CheckCircle2, Trophy, Flame } from 'lucide-react';
import { useHabitStore } from '../../store/habitStore';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';

interface HabitStatsProps {
  onClose: () => void;
}

export const HabitStats = ({ onClose }: HabitStatsProps) => {
  const { habits, getHabitStats } = useHabitStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  
  // Get stats for all habits
  const habitsWithStats = habits
    .filter(habit => !habit.archivedAt)
    .map(habit => ({
      habit,
      stats: getHabitStats(habit.id)
    }))
    .sort((a, b) => b.stats.streak.current - a.stats.streak.current);
  
  // Calculate overall stats
  const totalHabits = habitsWithStats.length;
  const activeStreaks = habitsWithStats.filter(h => h.stats.streak.current > 0).length;
  const averageCompletion = habitsWithStats.reduce(
    (acc, h) => acc + h.stats.completionRate, 
    0
  ) / Math.max(1, totalHabits);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center sticky top-0 bg-[#1A0F3C] pb-4 border-b border-purple-800/30">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-amber-400" />
          <h3 className="text-xl font-bold text-white">إحصائيات العادات</h3>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 rounded-full hover:bg-purple-800/50 text-purple-300"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>
      
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#2D1B69]/30 rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-8 h-8 text-amber-400" />
            <div>
              <div className="text-2xl font-bold text-white">{Math.round(averageCompletion)}%</div>
              <div className="text-sm text-purple-300">متوسط الإكمال</div>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#2D1B69]/30 rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-amber-400" />
            <div>
              <div className="text-2xl font-bold text-white">{totalHabits}</div>
              <div className="text-sm text-purple-300">إجمالي العادات</div>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#2D1B69]/30 rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Flame className="w-8 h-8 text-amber-400" />
            <div>
              <div className="text-2xl font-bold text-white">{activeStreaks}</div>
              <div className="text-sm text-purple-300">سلاسل نشطة</div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Period Selection */}
      <div className="flex items-center gap-4 bg-[#2D1B69]/30 rounded-lg p-2">
        {(['week', 'month', 'year'] as const).map((period) => (
          <motion.button
            key={period}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedPeriod(period)}
            className={`
              px-4 py-2 rounded-lg text-sm transition-colors
              ${selectedPeriod === period
                ? 'bg-amber-400 text-purple-900'
                : 'text-white hover:bg-[#2D1B69]/50'}
            `}
          >
            {period === 'week' && 'أسبوع'}
            {period === 'month' && 'شهر'}
            {period === 'year' && 'سنة'}
          </motion.button>
        ))}
      </div>
      
      {/* Habits List with Stats */}
      <div className="space-y-4">
        {habitsWithStats.map(({ habit, stats }) => (
          <motion.div
            key={habit.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#2D1B69]/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: habit.color }}
                >
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{habit.name}</h3>
                  {stats.streak.current > 0 && (
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                      <Flame className="w-4 h-4" />
                      <span>{stats.streak.current} أيام متتالية</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {Math.round(stats.completionRate)}%
                </div>
                <div className="text-sm text-purple-300">نسبة الإكمال</div>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="w-full h-2 bg-[#1A0F3C] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.completionRate}%` }}
                  className="h-full bg-amber-400"
                  transition={{ duration: 1 }}
                />
              </div>
              
              {/* Weekly Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-[#1A0F3C]/50 rounded-lg p-3">
                  <div className="text-lg font-bold text-white">
                    {stats.totalCompletions}
                  </div>
                  <div className="text-sm text-purple-300">إجمالي الإكمال</div>
                </div>
                
                <div className="bg-[#1A0F3C]/50 rounded-lg p-3">
                  <div className="text-lg font-bold text-white">
                    {stats.streak.longest}
                  </div>
                  <div className="text-sm text-purple-300">أطول سلسلة</div>
                </div>
                
                <div className="bg-[#1A0F3C]/50 rounded-lg p-3">
                  <div className="text-lg font-bold text-white">
                    {stats.weeklyProgress.completed}/{stats.weeklyProgress.total}
                  </div>
                  <div className="text-sm text-purple-300">هذا الأسبوع</div>
                </div>
                
                <div className="bg-[#1A0F3C]/50 rounded-lg p-3">
                  <div className="text-lg font-bold text-white">
                    {stats.weeklyProgress.previousWeek}
                  </div>
                  <div className="text-sm text-purple-300">الأسبوع الماضي</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};