// File: src/components/tasks/TaskForm.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Flag, ArrowUp, ArrowDown, Briefcase, User, BookOpen, Heart, 
  MoreHorizontal, Link as LinkIcon, Paperclip, Plus, X, Check, ExternalLink
} from 'lucide-react';
import { useStore } from '../../store';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { TaskPriority, TaskCategory, Task, SubTask, Attachment } from '../../types';

interface TaskFormProps {
  task?: Task | null;
  onClose: () => void;
  initialDate?: string;
}

interface FormSubtask {
    tempId: string;
    id?: string; 
    title: string;
    completed: boolean;
    parentId?: string;
    url?: string;
    urlAlias?: string;
}

export const TaskForm = ({ task, onClose, initialDate }: TaskFormProps) => {
  const { addTask, updateTask } = useStore();
  
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium');
  const [category, setCategory] = useState<TaskCategory>(task?.category || 'personal');
  const [dueDate, setDueDate] = useState<string>(task?.dueDate || initialDate || '');
  const [color, setColor] = useState<string>(task?.color || '');
  
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [formAttachments, setFormAttachments] = useState<Attachment[]>(task?.attachments || []);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [titleError, setTitleError] = useState('');

  const [formSubtasks, setFormSubtasks] = useState<FormSubtask[]>(
    task?.subtasks?.map(st => ({ 
        tempId: st.id, 
        id: st.id,    
        title: st.title, 
        completed: st.completed,
        url: st.url,
        urlAlias: st.urlAlias,
        parentId: st.parentId
    })) || []
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskUrl, setNewSubtaskUrl] = useState('');
  const [newSubtaskUrlAlias, setNewSubtaskUrlAlias] = useState('');

  const priorities = [
    { value: 'high' as TaskPriority, label: 'عالية', icon: ArrowUp, color: 'red' },
    { value: 'medium' as TaskPriority, label: 'متوسطة', icon: Flag, color: 'amber' },
    { value: 'low' as TaskPriority, label: 'منخفضة', icon: ArrowDown, color: 'blue' }
  ];
  
  const categories = [
    { value: 'personal' as TaskCategory, label: 'شخصي', icon: User },
    { value: 'work' as TaskCategory, label: 'عمل', icon: Briefcase },
    { value: 'study' as TaskCategory, label: 'دراسة', icon: BookOpen },
    { value: 'health' as TaskCategory, label: 'صحة', icon: Heart },
    { value: 'other' as TaskCategory, label: 'أخرى', icon: MoreHorizontal }
  ];
  
  const colors = [
    { value: 'red', label: 'أحمر', class: 'bg-red-500' }, { value: 'amber', label: 'كهرماني', class: 'bg-amber-500' },
    { value: 'green', label: 'أخضر', class: 'bg-green-500' }, { value: 'blue', label: 'أزرق', class: 'bg-blue-500' },
    { value: 'purple', label: 'بنفسجي', class: 'bg-purple-500' }, { value: 'pink', label: 'وردي', class: 'bg-pink-500' },
    { value: 'indigo', label: 'نيلي', class: 'bg-indigo-500' }, { value: 'teal', label: 'أزرق مخضر', class: 'bg-teal-500' }
  ];

  const sanitizeUrl = (url: string): string => {
    if (url && url.trim() !== '' && !/^https?:\/\//i.test(url)) {
      return `https://${url.trim()}`;
    }
    return url.trim();
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('يرجى إدخال عنوان للمهمة'); return;
    }
    
    const now = new Date().toISOString();
    const parentTaskId = task ? task.id : crypto.randomUUID();

    const finalSubtasks: SubTask[] = formSubtasks.map(sub => ({
      id: sub.id && !sub.tempId.startsWith('TEMP_') ? sub.id : crypto.randomUUID(), 
      title: sub.title,
      completed: sub.completed,
      parentId: parentTaskId,
      url: sub.url ? sanitizeUrl(sub.url) : undefined,
      urlAlias: sub.urlAlias,
    }));

    const finalAttachments: Attachment[] = formAttachments.map(att => ({
        ...att,
        url: sanitizeUrl(att.url)
    }));
    
    const taskDataPayload = {
      title, description, priority, category, dueDate, color,
      subtasks: finalSubtasks,
      attachments: finalAttachments, 
    };

    if (task) {
      updateTask(task.id, taskDataPayload);
    } else {
      const newTaskData: Task = {
        id: parentTaskId,
        completed: false, 
        createdAt: now,
        ...taskDataPayload,
      };
      addTask(newTaskData);
    }
    onClose();
  };
  
  const handleAddAttachment = () => {
    if (!attachmentUrl.trim() || !attachmentName.trim()) return;
    const newAttachment: Attachment = {
      id: crypto.randomUUID(), name: attachmentName, type: 'link', 
      url: sanitizeUrl(attachmentUrl), createdAt: new Date().toISOString()
    };
    setFormAttachments([...formAttachments, newAttachment]);
    setAttachmentUrl('');
    setAttachmentName('');
  };
  
  const handleRemoveAttachment = (id: string) => {
    setFormAttachments(formAttachments.filter(a => a.id !== id));
  };
  
  const handleDateSelect = (date: string) => { setDueDate(date); setShowDatePicker(false); };

  const handleAddSubtaskLocal = () => {
    if (!newSubtaskTitle.trim()) return;
    setFormSubtasks([
        ...formSubtasks, 
        { tempId: `TEMP_${crypto.randomUUID()}`, title: newSubtaskTitle, completed: false,
          url: newSubtaskUrl, urlAlias: newSubtaskUrlAlias }
    ]);
    setNewSubtaskTitle(''); setNewSubtaskUrl(''); setNewSubtaskUrlAlias('');
  };

  const handleUpdateSubtaskLocal = (tempId: string, field: keyof FormSubtask, value: string | boolean) => {
    setFormSubtasks(formSubtasks.map(sub => sub.tempId === tempId ? { ...sub, [field]: value } : sub));
  };

  const handleRemoveSubtaskLocal = (tempId: string) => {
    setFormSubtasks(formSubtasks.filter(sub => sub.tempId !== tempId));
  };

  const formVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
  };

  return (
    <motion.form variants={formVariants} initial="hidden" animate="visible" onSubmit={handleSubmit} className="space-y-6">
      <motion.div variants={itemVariants}>
        <label className="block text-sm text-purple-300 mb-2">عنوان المهمة</label>
        <input
          type="text" value={title}
          onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(''); }}
          placeholder="أدخل عنوان المهمة هنا..."
          className={`w-full px-4 py-3 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 transition-all duration-300 ${titleError ? 'focus:ring-red-500 border border-red-500' : 'focus:ring-amber-400'}`}
        />
        {titleError && <p className="mt-1 text-sm text-red-500">{titleError}</p>}
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <label className="block text-sm text-purple-300 mb-2">وصف المهمة (اختياري)</label>
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="أضف وصفًا تفصيليًا للمهمة..."
          className="w-full h-24 px-4 py-3 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none transition-all"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3 p-3 bg-[#2D1B69]/20 rounded-lg border border-purple-700/30">
        <label className="block text-sm font-medium text-purple-200 mb-2">المهام الفرعية</label>
        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-transparent pr-1">
          <AnimatePresence>
            {formSubtasks.map((sub, index) => (
              <motion.div layout key={sub.tempId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
                className="p-2.5 bg-[#221552]/50 rounded-md border border-purple-600/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-purple-400 w-5 text-right shrink-0">{index + 1}.</span>
                  <input type="text" value={sub.title} onChange={(e) => handleUpdateSubtaskLocal(sub.tempId, 'title', e.target.value)} placeholder="عنوان المهمة الفرعية"
                    className="flex-1 bg-transparent text-sm text-white placeholder-purple-400/70 focus:outline-none min-w-0"/>
                  <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleUpdateSubtaskLocal(sub.tempId, 'completed', !sub.completed)}
                    className={`p-1 rounded-full ${sub.completed ? 'bg-green-500' : 'bg-purple-600/50'} shrink-0`} >
                    <Check className={`w-2.5 h-2.5 ${sub.completed ? 'text-white' : 'text-purple-300'}`} />
                  </motion.button>
                  <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleRemoveSubtaskLocal(sub.tempId)}
                    className="p-1 rounded-full text-red-400/70 hover:text-red-400 hover:bg-red-500/20 shrink-0">
                    <X className="w-3 h-3" />
                  </motion.button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1.5 pl-5">
                  <input type="url" value={sub.url || ''} onChange={(e) => handleUpdateSubtaskLocal(sub.tempId, 'url', e.target.value)} placeholder="رابط (اختياري)"
                      className="w-full bg-[#2D1B69]/40 px-2 py-1 rounded-md text-xs text-purple-300 placeholder-purple-400/50 focus:outline-none focus:ring-1 focus:ring-amber-500 min-w-0" />
                  <input type="text" value={sub.urlAlias || ''} onChange={(e) => handleUpdateSubtaskLocal(sub.tempId, 'urlAlias', e.target.value)} placeholder="اسم الرابط (اختياري)"
                      className="w-full bg-[#2D1B69]/40 px-2 py-1 rounded-md text-xs text-purple-300 placeholder-purple-400/50 focus:outline-none focus:ring-1 focus:ring-amber-500 min-w-0" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="pt-3 border-t border-purple-700/20 space-y-2">
          <input type="text" value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="أضف عنوان مهمة فرعية جديدة..."
              className="w-full px-3 py-2 bg-[#2D1B69]/40 rounded-md text-white placeholder-purple-300/70 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input type="url" value={newSubtaskUrl} onChange={(e) => setNewSubtaskUrl(e.target.value)} placeholder="رابط للمهمة الفرعية (اختياري)"
                  className="w-full px-3 py-2 bg-[#2D1B69]/40 rounded-md text-purple-300 placeholder-purple-400/50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" />
              <input type="text" value={newSubtaskUrlAlias} onChange={(e) => setNewSubtaskUrlAlias(e.target.value)} placeholder="اسم الرابط (اختياري)"
                  className="w-full px-3 py-2 bg-[#2D1B69]/40 rounded-md text-purple-300 placeholder-purple-400/50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" />
          </div>
          <motion.button
              type="button"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleAddSubtaskLocal}
              className="w-full px-3 py-2 rounded-md bg-amber-400 text-purple-900 font-bold hover:bg-amber-500 transition-colors flex items-center justify-center gap-1.5 text-sm disabled:bg-amber-500/30 disabled:text-purple-900/50 disabled:cursor-not-allowed"
              disabled={!newSubtaskTitle.trim()}
          >
              <Plus className="w-4 h-4" />
              إضافة مهمة فرعية
          </motion.button>
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <label className="block text-sm text-purple-300 mb-2">الأولوية</label>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {priorities.map((p) => {
            const Icon = p.icon;
            return (
              <motion.button
                key={p.value} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setPriority(p.value)}
                className={`px-2 sm:px-3 py-3 rounded-lg flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm ${priority === p.value ? `bg-${p.color}-500/20 text-${p.color}-400 border border-${p.color}-500/30` : 'bg-[#2D1B69]/30 text-white hover:bg-[#2D1B69]/50'} transition-all duration-200`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{p.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <label className="block text-sm text-purple-300 mb-2">الفئة</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <motion.button
                key={c.value} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setCategory(c.value)}
                className={`px-2 sm:px-3 py-3 rounded-lg flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm ${category === c.value ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : 'bg-[#2D1B69]/30 text-white hover:bg-[#2D1B69]/50'} transition-all duration-200`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{c.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants} className="relative">
        <label className="block text-sm text-purple-300 mb-2">تاريخ الاستحقاق (اختياري)</label>
        <div className="flex gap-3">
          <button type="button" onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex-1 px-4 py-3 bg-[#2D1B69]/30 rounded-lg text-white flex items-center justify-between hover:bg-[#2D1B69]/50 transition-colors text-sm sm:text-base">
            <span>{dueDate ? format(new Date(dueDate), 'EEEE dd MMMM yyyy', { locale: ar }) : 'اختر تاريخًا'}</span>
            <Calendar className="w-5 h-5 text-amber-400" />
          </button>
          {dueDate && (
            <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setDueDate('')} 
              className="p-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
              <X className="w-5 h-5" />
            </motion.button>
          )}
        </div>
        <AnimatePresence>
        {showDatePicker && (
          <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} transition={{duration: 0.2}}
            className="absolute z-10 mt-2 p-4 bg-[#1A0F3C] rounded-lg shadow-lg border border-purple-500/20 w-full sm:w-auto">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4">
              {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                const date = new Date(); date.setDate(date.getDate() + dayOffset);
                const dateStr = format(date, 'yyyy-MM-dd'); const isSelected = dueDate === dateStr;
                return (
                  <motion.button key={dateStr} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => handleDateSelect(dateStr)}
                    className={`p-2 sm:p-3 rounded-lg text-center ${isSelected ? 'bg-amber-400 text-purple-900' : 'bg-[#2D1B69]/30 text-white hover:bg-[#2D1B69]/50'} transition-colors`}>
                    <div className="text-xs">{format(date, 'EEEE', { locale: ar })}</div>
                    <div className="font-bold text-sm sm:text-base">{format(date, 'd', { locale: ar })}</div>
                  </motion.button>
                );
              })}
              <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowDatePicker(false)} className="p-3 rounded-lg bg-purple-900/50 text-white hover:bg-purple-800/70 col-span-full mt-2 transition-colors">
                إغلاق
              </motion.button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <label className="block text-sm text-purple-300 mb-2">لون المهمة (اختياري)</label>
        <div className="flex flex-wrap gap-3 p-3 sm:p-4 bg-[#2D1B69]/30 rounded-lg">
          <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => setColor('')}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${!color ? 'bg-white ring-2 ring-amber-400' : 'bg-[#2D1B69]/50'} transition-all duration-200`}>
            <X className={`w-4 h-4 sm:w-5 sm:h-5 ${!color ? 'text-purple-900' : 'text-purple-300'}`} />
          </motion.button>
          {colors.map((c) => (
            <motion.button key={c.value} type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => setColor(c.value)}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${c.class} ${color === c.value ? 'ring-2 ring-white' : ''} transition-all duration-200`}
            />
          ))}
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <label className="block text-sm text-purple-300 mb-2">المرفقات</label>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <input type="text" value={attachmentName} onChange={(e) => setAttachmentName(e.target.value)} placeholder="اسم المرفق..."
            className="md:col-span-2 px-4 py-3 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm sm:text-base"/>
          <input type="text" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="رابط المرفق..."
            className="md:col-span-2 px-4 py-3 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm sm:text-base"/>
          <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleAddAttachment} className="px-4 py-3 rounded-lg bg-amber-400 text-purple-900 hover:bg-amber-500 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base disabled:bg-amber-400/50 disabled:cursor-not-allowed"
            disabled={!attachmentUrl.trim() || !attachmentName.trim()} >
            <Plus className="w-5 h-5" /> <span>إضافة</span>
          </motion.button>
        </div>
        <AnimatePresence>
        {formAttachments.length > 0 && (
          <motion.div layout className="space-y-2 max-h-40 overflow-y-auto p-3 bg-[#2D1B69]/30 rounded-lg scrollbar-thin scrollbar-thumb-purple-700 scrollbar-track-transparent">
            {formAttachments.map((attachment) => (
              <motion.div layout key={attachment.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="flex items-center justify-between p-3 bg-[#2D1B69]/50 rounded-lg hover:bg-[#2D1B69]/70 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <LinkIcon className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="text-white text-sm truncate">{attachment.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-purple-500/20 text-purple-300 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                    </a>
                    <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => handleRemoveAttachment(attachment.id)} className="p-2 rounded-full hover:bg-red-500/20 text-red-400 transition-colors">
                        <X className="w-4 h-4" />
                    </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
      
      <motion.div variants={itemVariants} className="flex justify-end gap-4 pt-4 border-t border-purple-800/30">
        <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose}
          className="px-6 py-3 rounded-lg bg-[#2D1B69]/50 text-white hover:bg-[#2D1B69] transition-colors">
          إلغاء
        </motion.button>
        <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="px-6 py-3 rounded-lg bg-amber-400 text-purple-900 font-bold hover:bg-amber-500 transition-colors">
          {task ? 'تحديث المهمة' : 'إضافة المهمة'}
        </motion.button>
      </motion.div>
    </motion.form>
  );
};
