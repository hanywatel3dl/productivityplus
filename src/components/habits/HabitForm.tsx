import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Clock, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useHabitStore } from '../../store/habitStore';

// واجهة جديدة لتمثيل الرابط
interface HabitLink {
  id: string;
  name: string;
  url: string;
}

interface HabitFormProps {
  habit?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    frequency: {
      type: 'daily' | 'weekly' | 'monthly';
      days: number[];
    };
    reminderTime?: string;
    startDate?: string;
    endDate?: string; // إضافة تاريخ الانتهاء
    links?: HabitLink[]; // إضافة الروابط
  };
  initialDate?: string;
  onClose: () => void;
}

const COLORS = [
  { id: 'red', value: '#EF4444', name: 'أحمر' },
  { id: 'amber', value: '#F59E0B', name: 'كهرماني' },
  { id: 'blue', value: '#3B82F6', name: 'أزرق' },
  { id: 'purple', value: '#8B5CF6', name: 'بنفسجي' },
  { id: 'pink', value: '#EC4899', name: 'وردي' },
  { id: 'indigo', value: '#6366F1', name: 'نيلي' },
  { id: 'teal', value: '#14B8A6', name: 'أزرق مخضر' }
];

const FREQUENCY_TYPES = [
  { id: 'daily', name: 'يومي' },
  { id: 'weekly', name: 'أسبوعي' },
  { id: 'monthly', name: 'شهري' }
];

const DAYS_OF_WEEK = [
  { id: 0, name: 'الأحد' },
  { id: 1, name: 'الإثنين' },
  { id: 2, name: 'الثلاثاء' },
  { id: 3, name: 'الأربعاء' },
  { id: 4, name: 'الخميس' },
  { id: 5, name: 'الجمعة' },
  { id: 6, name: 'السبت' }
];

export const HabitForm = ({ habit, initialDate, onClose }: HabitFormProps) => {
  const { addHabit, updateHabit } = useHabitStore();
  
  const [name, setName] = useState(habit?.name || '');
  const [color, setColor] = useState(habit?.color || COLORS[0].value);
  const [frequencyType, setFrequencyType] = useState<'daily' | 'weekly' | 'monthly'>(
    habit?.frequency.type || 'daily'
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    habit?.frequency.days || []
  );
  const [reminderTime, setReminderTime] = useState(habit?.reminderTime || '');
  const [startDate, setStartDate] = useState(habit?.startDate || initialDate || new Date().toISOString().split('T')[0]);
  
  // -- حالات جديدة --
  const [endDate, setEndDate] = useState(habit?.endDate || '');
  const [links, setLinks] = useState<HabitLink[]>(habit?.links || []);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  
  const [nameError, setNameError] = useState('');

  // دالة مساعدة لضمان وجود http في الرابط
  const sanitizeUrl = (url: string): string => {
    if (url && url.trim() !== '' && !/^https?:\/\//i.test(url)) {
      return `https://${url.trim()}`;
    }
    return url.trim();
  }

  // دوال التعامل مع الروابط
  const handleAddLink = () => {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
    const newLink: HabitLink = {
      id: crypto.randomUUID(),
      name: newLinkName.trim(),
      url: sanitizeUrl(newLinkUrl),
    };
    setLinks([...links, newLink]);
    setNewLinkName('');
    setNewLinkUrl('');
  };

  const handleRemoveLink = (id: string) => {
    setLinks(links.filter(link => link.id !== id));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setNameError('يرجى إدخال اسم العادة');
      return;
    }
    
    const habitData = {
      name: name.trim(),
      icon: 'check-circle', // Default icon
      color,
      frequency: {
        type: frequencyType,
        days: selectedDays
      },
      reminderTime: reminderTime || undefined,
      startDate,
      endDate: endDate || undefined, // إضافة تاريخ الانتهاء
      links: links, // إضافة الروابط
    };
    
    if (habit) {
      updateHabit(habit.id, habitData);
    } else {
      addHabit(habitData as any); // قد تحتاج لتحديث النوع في الـ store
    }
    
    onClose();
  };
  
  const toggleDay = (dayId: number) => {
    setSelectedDays(prev => 
      prev.includes(dayId)
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">
          {habit ? 'تعديل العادة' : 'إضافة عادة جديدة'}
        </h3>
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 rounded-full hover:bg-purple-800/50 text-purple-300"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>
      
      {/* Task Title */}
      <div>
        <label className="block text-sm text-purple-300 mb-2">اسم العادة</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setNameError('');
          }}
          placeholder="مثال: الورد اليومي"
          className={`w-full px-4 py-3 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 ${
            nameError ? 'focus:ring-red-500 border border-red-500' : 'focus:ring-amber-400'
          }`}
        />
        {nameError && (
          <p className="mt-1 text-sm text-red-500">{nameError}</p>
        )}
      </div>

      {/* Start & End Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-purple-300 mb-2">تاريخ بداية العادة</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 bg-[#2D1B69]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-sm text-purple-300 mb-2">تاريخ الانتهاء (اختياري)</label>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate} // منع اختيار تاريخ قبل البداية
              className="flex-1 px-4 py-3 bg-[#2D1B69]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
              disabled={!startDate}
            />
            {endDate && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setEndDate('')}
                className="p-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
      
      {/* Color Selection */}
      <div>
        <label className="block text-sm text-purple-300 mb-2">اللون</label>
        <div className="flex flex-wrap gap-4">
          {COLORS.map((colorOption) => (
            <motion.button
              key={colorOption.id}
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setColor(colorOption.value)}
              className={`
                w-10 h-10 rounded-full transition-all duration-200
                ${color === colorOption.value ? 'ring-2 ring-white' : ''}
              `}
              style={{ backgroundColor: colorOption.value }}
            />
          ))}
        </div>
      </div>
      
      {/* Frequency Type */}
      <div>
        <label className="block text-sm text-purple-300 mb-2">نوع التكرار</label>
        <div className="grid grid-cols-3 gap-4">
          {FREQUENCY_TYPES.map((type) => (
            <motion.button
              key={type.id}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFrequencyType(type.id as any)}
              className={`
                px-4 py-3 rounded-lg transition-colors
                ${frequencyType === type.id
                  ? 'bg-amber-400 text-purple-900'
                  : 'bg-[#2D1B69]/30 text-white hover:bg-[#2D1B69]/50'}
              `}
            >
              {type.name}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Days Selection */}
      {frequencyType === 'weekly' && (
        <div>
          <label className="block text-sm text-purple-300 mb-2">أيام التكرار</label>
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <motion.button
                key={day.id}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleDay(day.id)}
                className={`
                  p-2 rounded-lg text-center transition-colors text-sm
                  ${selectedDays.includes(day.id)
                    ? 'bg-amber-400 text-purple-900'
                    : 'bg-[#2D1B69]/30 text-white hover:bg-[#2D1B69]/50'}
                `}
              >
                {day.name}
              </motion.button>
            ))}
          </div>
        </div>
      )}
      
      {/* Reminder Time */}
      <div>
        <label className="block text-sm text-purple-300 mb-2">وقت التذكير (اختياري)</label>
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-400" />
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="flex-1 px-4 py-3 bg-[#2D1B69]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* Links Section */}
      <div>
        <label className="block text-sm text-purple-300 mb-2">روابط مفيدة (اختياري)</label>
        <div className="space-y-3 p-3 bg-[#2D1B69]/20 rounded-lg border border-purple-700/30">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input
              type="text"
              value={newLinkName}
              onChange={(e) => setNewLinkName(e.target.value)}
              placeholder="اسم الرابط"
              className="sm:col-span-2 px-3 py-2 bg-[#2D1B69]/40 rounded-md text-white placeholder-purple-300/70 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
            />
            <input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="sm:col-span-2 px-3 py-2 bg-[#2D1B69]/40 rounded-md text-white placeholder-purple-300/70 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
            />
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddLink}
              disabled={!newLinkName.trim() || !newLinkUrl.trim()}
              className="px-4 py-2 rounded-lg bg-amber-400 text-purple-900 hover:bg-amber-500 transition-colors flex items-center justify-center gap-2 text-sm font-semibold disabled:bg-amber-400/50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة</span>
            </motion.button>
          </div>
          
          <AnimatePresence>
            {links.length > 0 && (
              <motion.div layout className="space-y-2 max-h-32 overflow-y-auto pt-3 border-t border-purple-700/20 pr-1 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-transparent">
                {links.map((link) => (
                  <motion.div
                    layout
                    key={link.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center justify-between p-2.5 bg-[#221552]/50 rounded-md border border-purple-600/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <LinkIcon className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-white text-sm truncate">{link.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-purple-500/20 text-purple-300 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRemoveLink(link.id)}
                        className="p-1.5 rounded-full hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t border-purple-800/30">
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="px-6 py-3 rounded-lg bg-[#2D1B69]/50 text-white hover:bg-[#2D1B69] transition-colors"
        >
          إلغاء
        </motion.button>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 rounded-lg bg-amber-400 text-purple-900 font-bold hover:bg-amber-500 transition-colors"
        >
          {habit ? 'تحديث العادة' : 'إضافة العادة'}
        </motion.button>
      </div>
    </form>
  );
};