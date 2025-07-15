import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReminderStore } from '../../store/reminderStore';
import { Reminder } from '../../types/reminders';
import { format, parseISO, isAfter, isBefore, addHours, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Clock, Check, Edit, Trash2, MapPin, Link as LinkIcon, 
  AlertCircle, Bell, Calendar, Target, Flag, Copy,
  ChevronDown, ChevronUp
} from 'lucide-react';

interface RemindersListProps {
  date: Date;
  onEditReminder: (reminder: Reminder) => void;
}

export const RemindersList = ({ date, onEditReminder }: RemindersListProps) => {
  // *** الإصلاح الرئيسي: الاشتراك المباشر في بيانات التذكيرات ***
  const allReminders = useReminderStore(state => state.reminders);
  const { toggleReminderCompletion, deleteReminder, duplicateReminder } = useReminderStore();

  const [expandedReminder, setExpandedReminder] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // *** الإصلاح الرئيسي: استخدام useMemo لإعادة الحساب عند تغير البيانات ***
  const remindersForDate = useMemo(() => 
    allReminders.filter(r => isSameDay(parseISO(r.startTime), date))
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()),
  [allReminders, date]);

  const filteredReminders = useMemo(() => remindersForDate.filter(reminder => {
    if (filter === 'pending') return !reminder.isCompleted;
    if (filter === 'completed') return reminder.isCompleted;
    return true;
  }), [remindersForDate, filter]);
  
  // بقية الكود يبقى كما هو لأنه يعتمد على `filteredReminders` التي أصبحت الآن تفاعلية
  // ... (ReminderCard, ReminderSection, and the return JSX)
  // ... The rest of the component remains the same
  const now = new Date();
  const upcomingReminders = filteredReminders.filter(r => 
    isAfter(parseISO(r.startTime), now) && !r.isCompleted
  );
  const currentReminders = filteredReminders.filter(r => {
    const start = parseISO(r.startTime);
    const end = r.endTime ? parseISO(r.endTime) : addHours(start, 1);
    return !isAfter(start, now) && !isBefore(end, now) && !r.isCompleted;
  });
  const overdueReminders = filteredReminders.filter(r => 
    isBefore(parseISO(r.startTime), now) && !r.isCompleted
  );
  const completedReminders = filteredReminders.filter(r => r.isCompleted);

  const typeIcons = {
    reminder: Bell,
    task: Target,
    appointment: Calendar,
    event: Flag
  };

  const priorityColors = {
    low: 'text-blue-400 bg-blue-500/20',
    medium: 'text-yellow-400 bg-yellow-500/20',
    high: 'text-orange-400 bg-orange-500/20',
    urgent: 'text-red-400 bg-red-500/20'
  };

  const categoryColors = {
    personal: 'bg-blue-500/20 border-blue-500/30',
    work: 'bg-purple-500/20 border-purple-500/30',
    study: 'bg-green-500/20 border-green-500/30',
    health: 'bg-red-500/20 border-red-500/30',
    travel: 'bg-yellow-500/20 border-yellow-500/30',
    meeting: 'bg-indigo-500/20 border-indigo-500/30',
    other: 'bg-gray-500/20 border-gray-500/30'
  };

  const ReminderCard = ({ reminder, section }: { reminder: Reminder; section: string }) => {
    const TypeIcon = typeIcons[reminder.type];
    const isExpanded = expandedReminder === reminder.id;
    const isOverdue = section === 'overdue';
    const isCurrent = section === 'current';

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`
          rounded-xl border backdrop-blur-lg transition-all duration-300
          ${categoryColors[reminder.category] || categoryColors.other}
          ${reminder.isCompleted ? 'opacity-60' : ''}
          ${isOverdue ? 'border-red-500/50 bg-red-500/10' : ''}
          ${isCurrent ? 'border-amber-500/50 bg-amber-500/10' : ''}
          hover:shadow-lg hover:scale-[1.01]
        `}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleReminderCompletion(reminder.id)}
                className={`p-2 rounded-full transition-colors mt-1 ${reminder.isCompleted ? 'bg-green-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
              >
                <Check className="w-4 h-4" />
              </motion.button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <TypeIcon className="w-4 h-4 text-amber-400" />
                  <h3 className={`font-bold text-white ${reminder.isCompleted ? 'line-through' : ''}`}>{reminder.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[reminder.priority]}`}>
                    {reminder.priority === 'low' && 'منخفضة'}
                    {reminder.priority === 'medium' && 'متوسطة'}
                    {reminder.priority === 'high' && 'عالية'}
                    {reminder.priority === 'urgent' && 'عاجلة'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/80">
                  <div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span>{format(parseISO(reminder.startTime), 'HH:mm')}{reminder.endTime && ` - ${format(parseISO(reminder.endTime), 'HH:mm')}`}</span></div>
                  {reminder.location && (<div className="flex items-center gap-1"><MapPin className="w-4 h-4" /><span className="truncate max-w-[100px]">{reminder.location}</span></div>)}
                  {reminder.linkedTaskId && (<div className="flex items-center gap-1"><LinkIcon className="w-4 h-4" /><span>مرتبط</span></div>)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {reminder.priority === 'urgent' && !reminder.isCompleted && (<motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}><AlertCircle className="w-5 h-5 text-red-400" /></motion.div>)}
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setExpandedReminder(isExpanded ? null : reminder.id)} className="p-2 rounded-full hover:bg-white/20 text-white">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onEditReminder(reminder)} className="p-2 rounded-full hover:bg-white/20 text-white"><Edit className="w-4 h-4" /></motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => duplicateReminder(reminder.id)} className="p-2 rounded-full hover:bg-white/20 text-white"><Copy className="w-4 h-4" /></motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => deleteReminder(reminder.id)} className="p-2 rounded-full hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></motion.button>
            </div>
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="mt-4 pt-4 border-t border-white/20">
                {reminder.description && (<div className="mb-3"><h4 className="text-sm font-medium text-white/90 mb-1">الوصف:</h4><p className="text-sm text-white/80">{reminder.description}</p></div>)}
                {reminder.notes && (<div className="mb-3"><h4 className="text-sm font-medium text-white/90 mb-1">ملاحظات:</h4><p className="text-sm text-white/80">{reminder.notes}</p></div>)}
                {reminder.attachments && reminder.attachments.length > 0 && (<div className="mb-3"><h4 className="text-sm font-medium text-white/90 mb-2">المرفقات:</h4><div className="space-y-2">{reminder.attachments.map(attachment => (<motion.a key={attachment.id} href={attachment.url} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.02, x: 5 }} className="flex items-center gap-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><LinkIcon className="w-4 h-4 text-amber-400" /><span className="text-sm text-white">{attachment.name}</span></motion.a>))}</div></div>)}
                <div className="text-xs text-white/60">تم الإنشاء: {format(parseISO(reminder.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  const ReminderSection = ({ title, reminders, section, icon: Icon, color }: { title: string; reminders: Reminder[]; section: string; icon: any; color: string; }) => {
    if (reminders.length === 0) return null;
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${color}`}><Icon className="w-5 h-5" /></div><h3 className="text-lg font-bold text-white">{title}</h3><span className="px-2 py-1 rounded-full bg-white/20 text-white text-sm">{reminders.length}</span></div>
        <div className="space-y-3"><AnimatePresence>{reminders.map(reminder => (<ReminderCard key={reminder.id} reminder={reminder} section={section}/>))}</AnimatePresence></div>
      </motion.div>
    );
  };

  return (
    <div className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl border border-purple-500/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">قائمة التذكيرات</h3>
        <div className="flex items-center bg-[#1A0F3C] rounded-lg p-1">
          {[{ value: 'all', label: 'الكل' }, { value: 'pending', label: 'معلقة' }, { value: 'completed', label: 'مكتملة' }].map(({ value, label }) => (
            <motion.button key={value} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setFilter(value as any)} className={`px-3 py-2 rounded-lg text-sm transition-colors ${filter === value ? 'bg-amber-400 text-purple-900' : 'text-white hover:bg-[#2D1B69]/50'}`}>{label}</motion.button>
          ))}
        </div>
      </div>
      <div className="space-y-8">
        {filteredReminders.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12"><Calendar className="w-16 h-16 text-purple-300 mx-auto mb-4" /><p className="text-purple-300 text-lg">لا توجد تذكيرات لهذا اليوم</p></motion.div>
        ) : (
          <>
            <ReminderSection title="متأخرة" reminders={overdueReminders} section="overdue" icon={AlertCircle} color="bg-red-500/20 text-red-400"/>
            <ReminderSection title="جارية الآن" reminders={currentReminders} section="current" icon={Clock} color="bg-amber-500/20 text-amber-400"/>
            <ReminderSection title="قادمة" reminders={upcomingReminders} section="upcoming" icon={Bell} color="bg-blue-500/20 text-blue-400"/>
            <ReminderSection title="مكتملة" reminders={completedReminders} section="completed" icon={Check} color="bg-green-500/20 text-green-400"/>
          </>
        )}
      </div>
    </div>
  );
};
