import { motion } from 'framer-motion';
import { BarChart3, Calendar, CheckCircle, Target, X } from 'lucide-react';
import { useReminderStore } from '../../store/reminderStore';

interface ReminderStatsProps {
  onClose: () => void;
}

export const ReminderStats = ({ onClose }: ReminderStatsProps) => {
  const reminders = useReminderStore(state => state.reminders);

  const totalReminders = reminders.length;
  const completedReminders = reminders.filter(r => r.isCompleted).length;
  const completionRate = totalReminders > 0 ? Math.round((completedReminders / totalReminders) * 100) : 0;
  
  const categoryStats = reminders.reduce((acc, reminder) => {
    const category = reminder.category || 'other';
    if (!acc[category]) {
      acc[category] = { total: 0, completed: 0, color: reminder.color };
    }
    acc[category].total++;
    if (reminder.isCompleted) acc[category].completed++;
    return acc;
  }, {} as Record<string, { total: number; completed: number, color: string }>);

  const typeStats = reminders.reduce((acc, reminder) => {
    const type = reminder.type || 'reminder';
    if (!acc[type]) {
      acc[type] = { total: 0, completed: 0 };
    }
    acc[type].total++;
    if (reminder.isCompleted) acc[type].completed++;
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  const priorityStats = reminders.reduce((acc, reminder) => {
    const priority = reminder.priority || 'medium';
    if (!acc[priority]) {
      acc[priority] = { total: 0, completed: 0 };
    }
    acc[priority].total++;
    if (reminder.isCompleted) acc[priority].completed++;
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-amber-400" />
          <h3 className="text-xl font-bold text-white">إحصائيات التذكيرات</h3>
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

      <div className="grid grid-cols-3 gap-4 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2D1B69]/30 p-4 rounded-lg"
        >
          <div className="text-2xl font-bold text-white">{totalReminders}</div>
          <div className="text-sm text-purple-300">إجمالي التذكيرات</div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#2D1B69]/30 p-4 rounded-lg"
        >
          <div className="text-2xl font-bold text-green-400">{completedReminders}</div>
          <div className="text-sm text-purple-300">مكتملة</div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#2D1B69]/30 p-4 rounded-lg"
        >
          <div className="text-2xl font-bold text-amber-400">{completionRate}%</div>
          <div className="text-sm text-purple-300">نسبة الإنجاز</div>
        </motion.div>
      </div>
      
      {/* إحصائيات الأنواع */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#2D1B69]/30 p-4 rounded-lg"
      >
        <h4 className="text-lg font-bold text-white mb-4">التوزيع حسب النوع</h4>
        <div className="space-y-3">
          {Object.entries(typeStats).map(([type, stats]) => {
            const rate = (stats.completed / stats.total) * 100;
            const typeLabels = {
              reminder: 'تذكير',
              task: 'مهمة',
              appointment: 'موعد',
              event: 'حدث'
            };
            return (
              <div key={type} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white">{typeLabels[type as keyof typeof typeLabels] || type}</span>
                  <span className="text-purple-300">{stats.completed}/{stats.total}</span>
                </div>
                <div className="w-full h-2 bg-[#1A0F3C] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${rate}%` }}
                    className="h-full bg-amber-400"
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* إحصائيات الأولوية */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#2D1B69]/30 p-4 rounded-lg"
      >
        <h4 className="text-lg font-bold text-white mb-4">التوزيع حسب الأولوية</h4>
        <div className="space-y-3">
          {Object.entries(priorityStats).map(([priority, stats]) => {
            const rate = (stats.completed / stats.total) * 100;
            const priorityLabels = {
              low: 'منخفضة',
              medium: 'متوسطة',
              high: 'عالية',
              urgent: 'عاجلة'
            };
            const priorityColors = {
              low: 'bg-blue-400',
              medium: 'bg-yellow-400',
              high: 'bg-orange-400',
              urgent: 'bg-red-400'
            };
            return (
              <div key={priority} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white">{priorityLabels[priority as keyof typeof priorityLabels] || priority}</span>
                  <span className="text-purple-300">{stats.completed}/{stats.total}</span>
                </div>
                <div className="w-full h-2 bg-[#1A0F3C] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${rate}%` }}
                    className={`h-full ${priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-400'}`}
                    transition={{ duration: 1, delay: 0.6 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};